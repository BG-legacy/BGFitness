require('dotenv').config();

module.exports = {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
    fallbackModel: 'gpt-3.5-turbo-0125',
    maxTokens: 1200,
    temperature: 0.3,
    retryConfig: {
        maxRetries: 3,
        initialDelay: 300,
        maxDelay: 3000,
        backoffFactor: 1.5,
    },
    timeout: 30000,
    streaming: true,
    cache: {
        enabled: true,
        ttl: 300000,
        maxSize: 100,
    }
}; 