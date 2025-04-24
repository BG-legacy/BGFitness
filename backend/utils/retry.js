const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const retryWithBackoff = async (fn, config) => {
    const { maxRetries, initialDelay, maxDelay, backoffFactor } = config;
    let attempt = 0;
    let delayTime = initialDelay;

    while (attempt <= maxRetries) {
        try {
            return await fn();
        } catch (error) {
            if (attempt === maxRetries) {
                throw error;
            }

            // Calculate next delay with exponential backoff
            delayTime = Math.min(delayTime * backoffFactor, maxDelay);
            await delay(delayTime);
            attempt++;
        }
    }
};

module.exports = retryWithBackoff; 