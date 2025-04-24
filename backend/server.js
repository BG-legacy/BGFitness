/**
 * Server Entry Point
 * This file is responsible for starting the Express server and handling the application's runtime
 */

// Import the configured Express application from app.js
const app = require('./app');

// Set the port number, using environment variable if available, otherwise default to 3001
const PORT = process.env.PORT || 3001;

// Display startup information
console.log('==================================');
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Node Version: ${process.version}`);
console.log('==================================');

// Create HTTP server with improved error handling
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Backend hosted at https://bgfitness.onrender.com`);
    
    // Log available endpoints for easier debugging
    console.log('Available API endpoints:');
    console.log('- /api/workout - Workout generation endpoints');
    console.log('- /api/nutrition - Nutrition plan endpoints');
    console.log('- /api/download - File download endpoints');
    console.log('- /api/diagnostics - System diagnostics endpoints');
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

// Handle uncaught exceptions to prevent crashes
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Keep server running despite uncaught exception
});

// Add a basic health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
}); 