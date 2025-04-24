/**
 * Server Entry Point
 * This file is responsible for starting the Express server and handling the application's runtime
 */

// Import the configured Express application from app.js
const app = require('./app');

// Set the port number, using environment variable if available, otherwise default to 3001
const PORT = process.env.PORT || 3001;

// Start the server and listen for incoming requests
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Backend hosted at https://bgfitness.onrender.com`);
}); 