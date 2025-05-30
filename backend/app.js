/**
 * Main Express application configuration file
 * This file sets up the core Express server with middleware, routes, and error handling
 */

// Load environment variables from .env file
require('dotenv').config();

// Import required dependencies
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const errorHandler = require('./middleware/errorHandler');
const mobileDetect = require('./middleware/mobileDetect');
const workoutRoutes = require('./routes/workoutRoutes');
const downloadRoutes = require('./routes/download');
const diagnosticsRoutes = require('./routes/diagnostics');

// Initialize Express application
const app = express();

/**
 * Performance Middleware
 * These middleware functions optimize performance and security
 * Try-catch blocks ensure the app works even if modules aren't installed yet
 */
try {
  // Compression middleware to reduce response size
  const compression = require('compression');
  app.use(compression({
    level: 6, // Balance between compression and CPU usage
    threshold: 1024, // Only compress responses larger than 1KB
  }));
  console.log('Compression middleware enabled');
} catch (error) {
  console.warn('Compression middleware not available:', error.message);
}

try {
  // Security headers with Helmet
  const helmet = require('helmet');
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP in development for easier testing
  }));
  console.log('Helmet middleware enabled');
} catch (error) {
  console.warn('Helmet middleware not available:', error.message);
}

/**
 * Middleware Configuration
 * These middleware functions process requests before they reach route handlers
 */
// Define allowed origins - use environment variable if available, or default to hardcoded values
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : [
      'http://localhost:3000', 
      'https://bg-fitness-seven.vercel.app',
      'capacitor://localhost', 
      'ionic://localhost',
      'http://localhost',
      'http://localhost:8100',
      // Add Render domain
      'https://bgfitness.onrender.com',
      // Allow mobile app requests
      'capacitor://bgfitness',
      'bgfitness://*',
      // Allow all origins in development
      '*'
    ];

// Configure CORS middleware
app.use(cors({
  origin: true, // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allowed request headers
  credentials: true, // Allow credentials (cookies, authorization headers)
  exposedHeaders: ['Content-Type', 'Authorization'] // Expose these headers to client
}));

// Increase JSON parse limit for request bodies but set reasonable limits
app.use(express.json({ 
  limit: '2mb', // Limit payload size to prevent abuse
  strict: true // Only parse arrays and objects
})); 

app.use(express.urlencoded({ 
  extended: true,
  limit: '2mb' // Consistent with JSON limit
}));

// Add mobile detection middleware
app.use(mobileDetect);

/**
 * Session Configuration
 * Sets up user session management with secure cookie settings
 */
app.use(session({
  secret: process.env.SESSION_SECRET || 'bg-fitness-session-secret', // Secret key for session encryption
  resave: false, // Don't save session if unmodified
  saveUninitialized: true, // Save new sessions
  cookie: { 
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    maxAge: 30 * 60 * 1000 // Session expires after 30 minutes
  }
}));

/**
 * Route Configuration
 * Mounts different route handlers for various API endpoints
 */
app.use('/api/workout', workoutRoutes); // Workout-related endpoints
app.use('/api/download', downloadRoutes); // File download endpoints
app.use('/api/diagnostics', diagnosticsRoutes); // Diagnostics endpoints

// Make allowedOrigins available to the app
app.set('allowedOrigins', allowedOrigins);

// Global error handling middleware
app.use(errorHandler);

/**
 * 404 Handler
 * Catches any requests to undefined routes and returns a 404 response
 */
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: {
            status: 404,
            message: 'Route not found'
        }
    });
});

// Export the configured Express application
module.exports = app; 