require('dotenv').config();

module.exports = {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-3.5-turbo-0125',
    maxTokens: 1500,
    temperature: 0.5,
    retryConfig: {
        maxRetries: 2,
        initialDelay: 500,
        maxDelay: 5000,
        backoffFactor: 2,
    },
    timeout: 30000,
}; 