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
const MOBILE_TIMEOUT = 60000; // 60 seconds for mobile
const STANDARD_TIMEOUT = config.timeout || 30000; // Default 30 seconds

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
        
        // Check if this is a workout request - if so, add randomness to avoid caching
        const isWorkoutRequest = systemMessage.includes('workout plan generator');
        
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
        
        // Check cache first - optimized caching
        // Skip cache for workout requests to ensure variety
        if (config.cache.enabled && !isWorkoutRequest && !res) { // Don't use cache for streaming
            const cachedItem = responseCache.get(cacheKey);
            if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_TTL) {
                console.log('Cache hit, returning cached response');
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
                const client = this.getClient(isMobile);
                
                // Simplified prompt structure for faster processing
                const simplifiedPrompt = {};
                const importantFields = ['weight', 'height', 'age', 'goal', 'activityLevel', 'dietaryRestrictions', 
                                         'fitnessGoal', 'level', 'duration', 'equipment', 'restrictions',
                                         'workoutType', 'previousWorkouts', 'preferences'];
                for (const field of importantFields) {
                    if (sanitizedPrompt[field] !== undefined) {
                        simplifiedPrompt[field] = sanitizedPrompt[field];
                    }
                }
                
                // For mobile clients, set a smaller max_tokens to speed up response time
                const maxTokens = isMobile ? Math.min(config.maxTokens, 800) : config.maxTokens;
                
                // Try with the primary model first
                try {
                    const response = await client.chat.completions.create({
                        model: config.model,
                        messages: [
                            { role: 'system', content: optimizedSystemMessage },
                            { role: 'user', content: JSON.stringify(simplifiedPrompt) }
                        ],
                        max_tokens: maxTokens,
                        temperature: config.temperature,
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
                    console.warn(`Primary model failed: ${primaryModelError.message}. Falling back to ${config.fallbackModel}`);
                    
                    const fallbackResponse = await client.chat.completions.create({
                        model: config.fallbackModel,
                        messages: [
                            { role: 'system', content: optimizedSystemMessage },
                            { role: 'user', content: JSON.stringify(simplifiedPrompt) }
                        ],
                        max_tokens: maxTokens,
                        temperature: config.temperature,
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

        // Configure retry with longer delays for mobile
        const retryConfig = isMobile ? 
            { 
                maxRetries: 4, 
                initialDelay: 1000, 
                maxDelay: 10000, 
                backoffFactor: 1.5 
            } : config.retryConfig;

        try {
            // Get response with retry mechanism
            const result = await retryWithBackoff(makeApiCall, retryConfig);
            
            // Cache the result if caching is enabled
            if (config.cache.enabled && !isWorkoutRequest) {
                responseCache.set(cacheKey, {
                    data: result,
                    timestamp: Date.now()
                });
            }
            
            return result;
        } catch (error) {
            console.error('Failed after multiple retries:', error.message);
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
     * Stream OpenAI response directly to client
     * @param {Object} prompt - Input data
     * @param {String} systemMessage - System message
     * @param {Boolean} isMobile - Mobile optimization flag
     * @param {Object} res - Express response object
     */
    async streamResponse(prompt, systemMessage, isMobile, res) {
        try {
            // Set up streaming headers
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Transfer-Encoding', 'chunked');

            // Create stream variables
            let jsonBuffer = '';
            let isJsonComplete = false;
            
            // Get client with appropriate timeout
            const client = this.getClient(isMobile);
            
            // Simplified prompt for faster processing
            const simplifiedPrompt = {};
            const importantFields = ['weight', 'height', 'age', 'goal', 'activityLevel', 
                                     'dietaryRestrictions', 'fitnessGoal', 'level', 'duration', 
                                     'equipment', 'restrictions', 'workoutType', 'previousWorkouts'];
            
            for (const field of importantFields) {
                if (prompt[field] !== undefined) {
                    simplifiedPrompt[field] = prompt[field];
                }
            }

            // For mobile clients, set a smaller max_tokens to speed up response time
            const maxTokens = isMobile ? Math.min(config.maxTokens, 800) : config.maxTokens;
            
            // Create the streaming request
            const stream = await client.chat.completions.create({
                model: config.model,
                messages: [
                    { role: 'system', content: systemMessage },
                    { role: 'user', content: JSON.stringify(simplifiedPrompt) }
                ],
                max_tokens: maxTokens,
                temperature: config.temperature,
                response_format: { type: 'json_object' },
                stream: true
            });

            // Start with a JSON opening bracket
            res.write('{\n');
            res.write('"streaming": true,\n');
            res.write('"chunks": [\n');
            
            let isFirstChunk = true;
            
            // Process the stream
            for await (const chunk of stream) {
                if (chunk.choices[0]?.delta?.content) {
                    const content = chunk.choices[0].delta.content;
                    
                    // Append to the JSON buffer
                    jsonBuffer += content;
                    
                    // Send chunk to client
                    if (!isFirstChunk) {
                        res.write(',\n');
                    }
                    
                    res.write(JSON.stringify({ content }));
                    isFirstChunk = false;
                }
            }
            
            // Send closing tags for streaming
            res.write('\n],\n');
            
            // Try to parse the complete JSON response
            try {
                const parsedResponse = repairAndParseJSON(jsonBuffer);
                
                // Add the complete JSON to the response
                res.write('"complete": ');
                res.write(JSON.stringify(parsedResponse));
                res.write('\n}');
                
                // Mark JSON as complete
                isJsonComplete = true;
            } catch (jsonError) {
                console.error('Error parsing streaming JSON:', jsonError);
                
                // Send error information
                res.write('"error": true,\n');
                res.write('"errorType": "parsing",\n');
                res.write('"errorMessage": "Failed to parse streaming response"\n}');
            }
            
            // End the response
            res.end();
            
            // Return status for internal tracking
            return { streaming: true, complete: isJsonComplete };
        } catch (error) {
            console.error('Streaming error:', error);
            
            // If headers haven't been sent yet, send an error response
            if (!res.headersSent) {
                res.status(500).json({
                    error: true,
                    errorType: 'streaming',
                    errorMessage: 'Error streaming AI response'
                });
            } else {
                // Otherwise, try to gracefully end the stream with an error
                try {
                    res.write(',\n"error": true,\n');
                    res.write('"errorType": "streaming",\n');
                    res.write('"errorMessage": "Error during streaming"\n}');
                    res.end();
                } catch (e) {
                    // Last resort - just end the response
                    try {
                        res.end();
                    } catch (finalError) {
                        console.error('Failed to end response stream:', finalError);
                    }
                }
            }
            
            return { streaming: true, error: true };
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
        
        // If it's a nutrition prompt, optimize for meal planning
        if (systemMessage.includes('meal plan generator')) {
            // Extract key information
            const restrictions = prompt.dietaryRestrictions || [];
            const goal = prompt.goal || 'healthy eating';
            
            // Create specific constraints
            const restrictionsStr = Array.isArray(restrictions) ? 
                restrictions.join(', ') : 
                (typeof restrictions === 'string' ? restrictions : '');
                
            if (restrictionsStr) {
                return `${systemMessage}\n\nIMPORTANT: Create a meal plan focused on ${goal} that strictly adheres to these dietary restrictions: ${restrictionsStr}. Ensure all meals comply with these restrictions while providing complete nutrition.`;
            }
            
            return `${systemMessage}\n\nIMPORTANT: Create a nutritionally complete meal plan focused on ${goal}. Include exact portions and ensure macronutrient balance.`;
        }
        
        // Default case - return original
        return systemMessage;
    }
}

module.exports = new OpenAIService(); 