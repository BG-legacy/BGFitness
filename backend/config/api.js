/**
 * API Configuration Settings
 * Provides consistent API configuration across all client platforms
 */

// Environment-based API configuration
const config = {
  // Base URLs for different environments
  development: {
    serverUrl: process.env.API_URL || 'http://localhost:3001',
    timeout: 30000, // 30 seconds
    retryAttempts: 3
  },
  production: {
    serverUrl: 'https://bgfitness.onrender.com',
    timeout: 30000,
    retryAttempts: 3
  },
  // Mobile-specific configurations
  mobile: {
    serverUrl: 'https://bgfitness.onrender.com',
    timeout: 45000, // Longer timeout for mobile networks
    retryAttempts: 5
  }
};

// Get current environment
const env = process.env.NODE_ENV || 'development';

// Export the configuration for the current environment
module.exports = {
  ...config[env],
  // Export environment type for conditional logic
  environment: env,
  // Utility function to get full API URL for a specific endpoint
  getApiUrl: (endpoint) => {
    // For production and mobile, always use the Render URL
    const baseUrl = env === 'development' 
      ? (process.env.API_URL || config[env].serverUrl)
      : 'https://bgfitness.onrender.com';
    
    return `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  }
}; 