/**
 * Main Express application configuration file
 * This file sets up the core Express server with middleware, routes, and error handling
 */

// Import required dependencies
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const errorHandler = require('./middleware/errorHandler');
const workoutRoutes = require('./routes/workoutRoutes');
const nutritionRoutes = require('./routes/nutritionRoutes');
const downloadRoutes = require('./routes/download');

// Initialize Express application
const app = express();

/**
 * Middleware Configuration
 * These middleware functions process requests before they reach route handlers
 */
app.use(cors({
  origin: ['http://localhost:3000', 'https://bg-fitness-seven.vercel.app'], // Allow requests from frontend servers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allowed request headers
  credentials: true // Allow credentials (cookies, authorization headers)
}));
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

/**
 * Session Configuration
 * Sets up user session management with secure cookie settings
 */
app.use(session({
  secret: 'bg-fitness-session-secret', // Secret key for session encryption
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
app.use('/api/nutrition', nutritionRoutes); // Nutrition-related endpoints
app.use('/api/download', downloadRoutes); // File download endpoints

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