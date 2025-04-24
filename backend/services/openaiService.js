const OpenAI = require('openai');
const config = require('../config/openai');
const retryWithBackoff = require('../utils/retry');
const { PassThrough } = require('stream');

// LRU Cache implementation for better memory management
class LRUCache {
    constructor(maxSize = 100) {
        this.cache = new Map();
        this.maxSize = maxSize;
    }

    get(key) {
        if (!this.cache.has(key)) return undefined;
        
        // Get the value and refresh the entry in the cache
        const value = this.cache.get(key);
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }

    set(key, value) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.maxSize) {
            // Delete the oldest entry (the first one in the Map)
            this.cache.delete(this.cache.keys().next().value);
        }
        this.cache.set(key, value);
    }

    has(key) {
        return this.cache.has(key);
    }

    delete(key) {
        this.cache.delete(key);
    }

    clear() {
        this.cache.clear();
    }
}

// Initialize LRU cache with the configured max size
const responseCache = new LRUCache(config.cache.maxSize || 100);
const CACHE_TTL = config.cache.ttl || 300000; // 5 minutes (300000 ms)

// Set higher timeouts for mobile clients
const MOBILE_TIMEOUT = 30000; // Reduced from 60000 to 30000 (30 seconds for mobile)
const STANDARD_TIMEOUT = config.timeout || 20000; // Reduced from 30000 to 20000 (20 seconds default)

/**
 * Advanced JSON repair function to handle common JSON parsing errors
 * @param {string} jsonString - The potentially malformed JSON string
 * @return {object} - Parsed JSON object
 */
function repairAndParseJSON(jsonString) {
    // If it's already valid JSON, just return the parsed object
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        // Continue with repair attempts
    }
    
    let repairedJSON = jsonString;
    
    // Fix 1: Remove any text before the first { and after the last }
    const firstBrace = repairedJSON.indexOf('{');
    const lastBrace = repairedJSON.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
        repairedJSON = repairedJSON.substring(firstBrace, lastBrace + 1);
        
        // Try parsing after initial cleanup
        try {
            return JSON.parse(repairedJSON);
        } catch (e) {
            // Continue with more repairs
        }
    }
    
    // Fix 2: Handle strings that might be missing quotes
    // This is a common issue with OpenAI responses
    let fixedJSON = repairedJSON;
    
    // Look for obvious unclosed string patterns
    const stringPropRegex = /"([^"]+)":\s*"([^"]*?)(?=,|\n|\r|\})/g;
    fixedJSON = fixedJSON.replace(stringPropRegex, (match, prop, value) => {
        return `"${prop}": "${value}"`;
    });
    
    // Try parsing after string fixes
    try {
        return JSON.parse(fixedJSON);
    } catch (e) {
        // Try more aggressive repairs
        
        // Fix 3: Handle unquoted property names
        const unquotedPropRegex = /(\b[a-zA-Z0-9_]+\b):/g;
        fixedJSON = fixedJSON.replace(unquotedPropRegex, '"$1":');
        
        // Try parsing after more aggressive fixes
        try {
            return JSON.parse(fixedJSON);
        } catch (e) {
            // If all else fails, throw the error
            throw new Error(`Unable to parse JSON: ${e.message}`);
        }
    }
}

class OpenAIService {
    constructor() {
        this.client = new OpenAI({
            apiKey: config.apiKey,
            timeout: STANDARD_TIMEOUT,
        });
    }

    // Create a new OpenAI client with appropriate timeout
    getClient(isMobile = false) {
        const timeout = isMobile ? MOBILE_TIMEOUT : STANDARD_TIMEOUT;
        return new OpenAI({
            apiKey: config.apiKey,
            timeout: timeout,
            maxRetries: isMobile ? 3 : config.retryConfig.maxRetries || 2,
        });
    }

    // Sanitize input to prevent prompt injection and improve accuracy
    sanitizeInput(input) {
        if (!input) return {};
        
        const sanitized = { ...input };
        
        // Remove any potentially harmful content or unneeded fields
        delete sanitized.systemPrompt; // Prevent overriding system prompt
        
        // Normalize input for consistency
        if (sanitized.fitnessGoal) {
            sanitized.fitnessGoal = sanitized.fitnessGoal.trim();
        }
        
        if (sanitized.level) {
            sanitized.level = sanitized.level.toLowerCase().trim();
        }
        
        // Ensure duration is a number
        if (sanitized.duration) {
            sanitized.duration = parseInt(sanitized.duration, 10) || 30;
        }
        
        return sanitized;
    }

    /**
     * Generate a response from OpenAI with streaming support
     * @param {Object} prompt - Input data for the request
     * @param {String} systemMessage - System message to guide the AI
     * @param {Boolean} isMobile - Flag for mobile-optimized responses
     * @param {Object} res - Optional Express response object for streaming
     * @returns {Promise<Object>} - Response data or stream
     */
    async generateResponse(prompt, systemMessage, isMobile = false, res = null) {
        const sanitizedPrompt = this.sanitizeInput(prompt);
        
        // Check if this is a workout request
        const isWorkoutRequest = systemMessage.includes('workout plan generator');
        // Define isNutritionRequest variable to fix errors (always false since nutrition is removed)
        const isNutritionRequest = false;
        
        // Optimize system message for faster processing and better accuracy
        const optimizedSystemMessage = this.optimizePrompt(systemMessage, sanitizedPrompt);
        
        // Generate cache key based on prompt and system message
        const cacheKey = JSON.stringify({
            prompt: sanitizedPrompt,
            systemMessage,
            model: config.model,
            // Add randomness for workout requests to ensure variety
            random: isWorkoutRequest ? Date.now() + Math.random() : undefined
        });
        
        // Skip cache for workout requests and if disableCaching flag is set
        const useCache = config.cache.enabled && 
                        !isWorkoutRequest && 
                        !res &&
                        !sanitizedPrompt.disableCaching;
        
        // Check cache first - optimized caching
        if (useCache) {
            const cachedItem = responseCache.get(cacheKey);
            if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_TTL) {
                console.log('Cache hit, returning cached response');
                
                // If streaming, we need to simulate streaming with the cached response
                if (res && config.streaming) {
                    return this.streamCachedResponse(cachedItem.data, res);
                }
                
                return cachedItem.data;
            }
        }

        // Handle streaming response if response object is provided
        if (res && config.streaming) {
            return this.streamResponse(sanitizedPrompt, optimizedSystemMessage, isMobile, res);
        }

        const makeApiCall = async () => {
            try {
                // Get client with appropriate timeout
                const timeout = isMobile ? MOBILE_TIMEOUT : STANDARD_TIMEOUT;
                
                const client = new OpenAI({
                    apiKey: config.apiKey,
                    timeout: timeout,
                    maxRetries: isMobile ? 3 : config.retryConfig.maxRetries || 2,
                });
                
                // Simplified prompt structure for faster processing
                const simplifiedPrompt = {};
                
                const fields = ['weight', 'height', 'age', 'goal', 'activityLevel', 'dietaryRestrictions', 
                    'fitnessGoal', 'level', 'duration', 'equipment', 'restrictions',
                    'workoutType', 'previousWorkouts', 'preferences'];
                    
                for (const field of fields) {
                    if (sanitizedPrompt[field] !== undefined) {
                        simplifiedPrompt[field] = sanitizedPrompt[field];
                    }
                }

                // For nutrition requests, use optimized token settings
                const maxTokens = config.maxTokens || 2000;
                
                // For nutrition, use optimized temperature for balance of speed and accuracy
                const temperature = config.temperature || 0.4;
                
                // Try with the primary model first
                try {
                    // Use different model settings for nutrition
                    const modelToUse = config.fallbackModel;
                    
                    const response = await client.chat.completions.create({
                        model: modelToUse,
                        messages: [
                            { role: 'system', content: optimizedSystemMessage },
                            { role: 'user', content: JSON.stringify(simplifiedPrompt) }
                        ],
                        max_tokens: maxTokens,
                        temperature: temperature,
                        response_format: { type: 'json_object' }
                    });
                    
                    // Skip verbose logging in production for performance
                    if (process.env.NODE_ENV !== 'production') {
                        console.log('OpenAI raw response:', response.choices[0].message.content.substring(0, 200) + '...');
                    }
                    
                    // Get the full response text
                    const responseText = response.choices[0].message.content;
                    
                    // Parse and validate the JSON response
                    try {
                        const parsedResponse = repairAndParseJSON(responseText);
                        return parsedResponse;
                    } catch (jsonError) {
                        throw new Error(`Failed to parse response: ${jsonError.message}`);
                    }
                } catch (primaryModelError) {
                    // If primary model fails, fall back to the backup model
                    // Skip this step for nutrition as we're already using the fallback model
                    if (isNutritionRequest) {
                        throw primaryModelError; // Just propagate the error for nutrition
                    }
                    
                    console.warn(`Primary model failed: ${primaryModelError.message}. Falling back to ${config.fallbackModel}`);
                    
                    const fallbackResponse = await client.chat.completions.create({
                        model: config.fallbackModel,
                        messages: [
                            { role: 'system', content: optimizedSystemMessage },
                            { role: 'user', content: JSON.stringify(simplifiedPrompt) }
                        ],
                        max_tokens: maxTokens,
                        temperature: temperature,
                        response_format: { type: 'json_object' }
                    });
                    
                    const fallbackResponseText = fallbackResponse.choices[0].message.content;
                    
                    try {
                        const parsedFallbackResponse = repairAndParseJSON(fallbackResponseText);
                        return parsedFallbackResponse;
                    } catch (jsonError) {
                        throw new Error(`Failed to parse fallback response: ${jsonError.message}`);
                    }
                }
            } catch (error) {
                console.error('OpenAI processing error:', error.message);
                throw new Error(`Error processing data: ${error.message}`);
            }
        };

        // Configure retry with shorter delays for nutrition
        const retryConfig = isNutritionRequest ? 
            { 
                maxRetries: 2, 
                initialDelay: 500, 
                maxDelay: 2000, 
                backoffFactor: 1.2 
            } : (isMobile ? 
            { 
                maxRetries: 4, 
                initialDelay: 1000, 
                maxDelay: 10000, 
                backoffFactor: 1.5 
            } : config.retryConfig);

        try {
            // Get response with retry mechanism
            const result = await retryWithBackoff(makeApiCall, retryConfig);
            
            // Cache the result if caching is enabled
            if (config.cache.enabled && !isWorkoutRequest && !sanitizedPrompt.disableCaching) {
                responseCache.set(cacheKey, {
                    data: result,
                    timestamp: Date.now()
                });
            }
            
            return result;
        } catch (error) {
            console.error('Failed after multiple retries:', error.message);
            
            // For nutrition, return an error message (no fallback mechanism)
            if (isNutritionRequest) {
                console.log('Nutrition request failed after retries');
                return {
                    error: true,
                    errorType: "timeout",
                    errorMessage: "The nutrition request took too long to process. Please try again."
                };
            }
            
            // Return a simplified response that won't break the client UI
            return {
                title: "Connection Error",
                description: "Unable to generate content due to connection issues. Please try again later when your internet connection is more stable.",
                error: true,
                errorType: "network"
            };
        }
    }

    /**
     * Stream a cached response to the client
     * @param {Object} cachedData - The cached response data
     * @param {Object} res - Express response object
     */
    async streamCachedResponse(cachedData, res) {
        try {
            // Set up streaming headers
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-cache');
            
            // Send a complete response with the cached data, but marked as from cache
            res.write(JSON.stringify({
                streaming: false,
                fromCache: true,
                complete: cachedData
            }));
            
            res.end();
            
            return { streaming: false, fromCache: true, complete: true };
        } catch (error) {
            console.error('Error streaming cached response:', error);
            
            // Handle error gracefully
            if (!res.headersSent) {
                res.status(500).json({
                    error: true,
                    errorType: 'streaming',
                    errorMessage: 'Error streaming cached response'
                });
            } else {
                try {
                    res.end();
                } catch (e) {
                    console.error('Failed to end response stream:', e);
                }
            }
            
            return { streaming: false, error: true };
        }
    }

    /**
     * Stream response from OpenAI directly to client
     * @param {Object} prompt - Input data
     * @param {String} systemMessage - System message
     * @param {Boolean} isMobile - Whether the request is from mobile
     * @param {Object} res - Express response object
     * @returns {Promise<void>}
     */
    async streamResponse(prompt, systemMessage, isMobile, res) {
        try {
            console.log('Starting streaming response');
            
            // Get client with appropriate timeout
            const timeout = isMobile ? MOBILE_TIMEOUT : STANDARD_TIMEOUT;
            
            const client = new OpenAI({
                apiKey: config.apiKey,
                timeout: timeout,
                maxRetries: 1, // Only retry once for streaming
            });
            
            // Build optimized message structure
            const messages = [
                {
                    role: 'system',
                    content: systemMessage
                },
                {
                    role: 'user',
                    content: JSON.stringify(prompt)
                }
            ];
            
            const fields = ['weight', 'height', 'age', 'goal', 'activityLevel', 'dietaryRestrictions', 
                'fitnessGoal', 'level', 'duration', 'equipment', 'restrictions',
                'workoutType', 'previousWorkouts', 'preferences'];
            
            // Optimize token usage for faster response
            const maxTokens = isMobile ? config.mobileMaxTokens || 1000 : config.maxTokens || 2000;
            
            // Use the configured model
            const modelToUse = config.model;
            
            // Start the stream
            const stream = await client.chat.completions.create({
                model: modelToUse,
                messages: messages,
                max_tokens: maxTokens,
                temperature: config.temperature,
                stream: true,
            });
            
            // Send appropriate headers
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            
            let fullContent = '';
            
            // Process the stream
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                    fullContent += content;
                    res.write(`data: ${JSON.stringify({ content })}\n\n`);
                }
            }
            
            // End the response
            res.write('data: [DONE]\n\n');
            res.end();
            
            console.log('Streaming completed successfully');
            
            // Try to parse the full content as JSON
            let parsedContent;
            try {
                parsedContent = repairAndParseJSON(fullContent);
            } catch (err) {
                console.warn('Failed to parse streaming response as JSON:', err.message);
                
                // Invalid JSON response might still be useful as text - don't attempt to cache
                return;
            }
            
            return;
        } catch (error) {
            console.error('Error in streaming response:', error);
            
            // Handle errors without crashing
            if (!res.headersSent) {
                res.status(500).json({
                    error: true,
                    message: 'Error generating streaming response',
                    details: error.message
                });
            } else {
                // If headers already sent, try to send an error event
                try {
                    res.write(`data: ${JSON.stringify({ error: true, message: error.message })}\n\n`);
                    res.end();
                } catch (e) {
                    console.error('Failed to send error in stream:', e);
                }
            }
        }
    }

    /**
     * Optimize prompts for faster processing and better accuracy
     * @param {String} systemMessage - Original system message
     * @param {Object} prompt - User input data
     * @returns {String} - Optimized system message
     */
    optimizePrompt(systemMessage, prompt) {
        // If it's a workout prompt, optimize for workout generation
        if (systemMessage.includes('workout plan generator')) {
            // Extract key information for context
            const level = prompt.level || 'intermediate';
            const duration = prompt.duration || 45;
            const goal = prompt.fitnessGoal || 'general fitness';
            
            // Add explicit instructions for avoiding repetition
            if (prompt.previousWorkouts && Array.isArray(prompt.previousWorkouts) && prompt.previousWorkouts.length > 0) {
                const recentExercises = new Set();
                
                // Extract recent exercise names from previous workouts
                prompt.previousWorkouts.forEach(workout => {
                    if (workout.exercises && Array.isArray(workout.exercises)) {
                        workout.exercises.forEach(exercise => {
                            if (typeof exercise === 'string') {
                                recentExercises.add(exercise.toLowerCase());
                            }
                        });
                    }
                });
                
                if (recentExercises.size > 0) {
                    const avoidExercisesStr = Array.from(recentExercises).join(', ');
                    return `${systemMessage}\n\nIMPORTANT: Create a ${level} level workout focused on ${goal} that takes about ${duration} minutes. AVOID using these recently used exercises: ${avoidExercisesStr}. Use entirely different exercises for similar muscle groups.`;
                }
            }
            
            // Default optimization with explicit parameters
            return `${systemMessage}\n\nIMPORTANT: Create a ${level} level workout focused on ${goal} that takes about ${duration} minutes. Ensure exercises are varied, effective, and aligned with the goal.`;
        }
        
        // Default case - return original
        return systemMessage;
    }
}

module.exports = new OpenAIService(); 