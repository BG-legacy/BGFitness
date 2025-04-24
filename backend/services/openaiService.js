const OpenAI = require('openai');
const config = require('../config/openai');
const retryWithBackoff = require('../utils/retry');

// Simple in-memory cache
const responseCache = new Map();
const CACHE_TTL = 300000; // 5 minutes (300000 ms)

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
        // Continue with more aggressive repairs
    }
    
    // Fix 3: Handle common syntax errors
    fixedJSON = fixedJSON
        // Fix trailing commas
        .replace(/,(\s*[\}\]])/g, '$1')
        // Add missing quotes around property names
        .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3')
        // Fix missing closing brackets for nested objects
        .replace(/"\s*:\s*{(?![^{]*})/g, (match) => {
            return match + '}';
        });
    
    // Try parsing after syntax fixes
    try {
        return JSON.parse(fixedJSON);
    } catch (e) {
        // Last resort: Try to extract and parse the most complete JSON object
        const extractedMatch = fixedJSON.match(/{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*}/);
        if (extractedMatch) {
            try {
                return JSON.parse(extractedMatch[0]);
            } catch (finalError) {
                throw new Error(`Could not repair JSON: ${finalError.message}`);
            }
        }
        
        throw new Error('Failed to repair severely malformed JSON');
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

    sanitizeInput(input) {
        // Remove any potentially malicious content
        const sanitized = {};
        for (const [key, value] of Object.entries(input)) {
            if (typeof value === 'string') {
                // Special handling for level and duration to preserve values exactly
                if (key === 'level') {
                    sanitized[key] = value; // Preserve level exactly as entered
                } else {
                    // Remove HTML tags and limit length
                    sanitized[key] = value
                        .replace(/<[^>]*>/g, '')
                        .substring(0, 1000);
                }
            } else if (Array.isArray(value)) {
                // Sanitize array elements
                sanitized[key] = value.map(item => 
                    typeof item === 'string' 
                        ? item.replace(/<[^>]*>/g, '').substring(0, 100)
                        : item
                );
            } else {
                // For duration and other non-string values, preserve as is
                sanitized[key] = value;
            }
        }
        return sanitized;
    }

    async generateResponse(prompt, systemMessage, isMobile = false) {
        const sanitizedPrompt = this.sanitizeInput(prompt);
        
        // Check if this is a workout request - if so, add randomness to avoid caching
        const isWorkoutRequest = systemMessage.includes('workout plan generator');
        
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
        if (!isWorkoutRequest && responseCache.has(cacheKey)) {
            const cachedItem = responseCache.get(cacheKey);
            if (Date.now() - cachedItem.timestamp < CACHE_TTL) {
                console.log('Cache hit, returning cached response');
                return cachedItem.data;
            } else {
                // Cache expired, remove it
                responseCache.delete(cacheKey);
            }
        }

        const makeApiCall = async () => {
            try {
                // Get client with appropriate timeout
                const client = this.getClient(isMobile);
                
                // Simplified prompt structure for faster processing
                const simplifiedPrompt = {};
                const importantFields = ['weight', 'height', 'age', 'goal', 'activityLevel', 'dietaryRestrictions', 
                                         'fitnessGoal', 'level', 'duration', 'equipment', 'restrictions'];
                for (const field of importantFields) {
                    if (sanitizedPrompt[field] !== undefined) {
                        simplifiedPrompt[field] = sanitizedPrompt[field];
                    }
                }
                
                // For mobile clients, set a smaller max_tokens to speed up response time
                const maxTokens = isMobile ? Math.min(config.maxTokens, 1000) : config.maxTokens;
                
                const response = await client.chat.completions.create({
                    model: config.model,
                    messages: [
                        { role: 'system', content: systemMessage },
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
                
                // Use our advanced JSON repair function
                try {
                    return repairAndParseJSON(responseText);
                } catch (parseError) {
                    console.error('JSON parsing error after repair attempts:', parseError.message);
                    
                    // Fallback: Create a minimal valid response with just the essential fields
                    // This ensures the client gets something usable even if the full response is corrupted
                    return {
                        title: "Generated Plan",
                        description: "A basic plan was generated, but some details may be missing due to technical issues.",
                        dailyCalories: 2000,
                        macros: {
                            protein: 150,
                            carbs: 200,
                            fat: 70,
                            fiber: 30
                        },
                        meals: [
                            {
                                name: "Basic Meal",
                                time: "8:00 AM",
                                calories: 500,
                                ingredients: [
                                    {
                                        name: "Protein Source",
                                        amount: "100g",
                                        calories: 200
                                    },
                                    {
                                        name: "Carbs Source",
                                        amount: "100g",
                                        calories: 200
                                    }
                                ],
                                nutritionalInfo: {
                                    protein: 30,
                                    carbs: 50,
                                    fat: 15,
                                    fiber: 5
                                }
                            }
                        ],
                        notes: ["This is a fallback plan due to data processing issues. Please try again later."]
                    };
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
            
            // Cache the result
            responseCache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });
            
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
}

module.exports = new OpenAIService(); 