/**
 * Nutrition Routes Module
 * This file defines the API endpoints for nutrition-related operations
 * Handles meal plan generation and download functionality
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const nutritionController = require('../controllers/nutritionController');

/**
 * Timeout middleware for nutrition routes
 * Ensures routes respond within specified timeframe
 */
const timeoutMiddleware = (req, res, next) => {
    // Set a short timeout for nutrition routes - 15 seconds
    const TIMEOUT = 15000;
    
    // Create a timeout that will respond with a 408 Request Timeout if triggered
    const timeoutId = setTimeout(() => {
        if (!res.headersSent) {
            console.log('Nutrition route timed out - sending fallback response');
            
            // Get input from request body
            const input = req.body;
            
            // Generate fallback meal plan directly from the controller
            try {
                const fallbackPlan = nutritionController.createFallbackMealPlan(input);
                res.json({
                    ...fallbackPlan,
                    timeout: true,
                    message: "Response was taking too long, so we generated a quick plan for you. Try again later for a more detailed plan."
                });
            } catch (error) {
                res.status(408).json({
                    error: true,
                    errorType: "timeout",
                    errorMessage: "Request timed out. Please try again later."
                });
            }
        }
    }, TIMEOUT);
    
    // Clear the timeout when the response is sent
    res.on('finish', () => {
        clearTimeout(timeoutId);
    });
    
    next();
};

/**
 * Input Validation Middleware
 * Validates the meal plan request body with the following rules:
 * - weight: Required float between 30 and 300 kg
 * - height: Required float between 100 and 250 cm
 * - age: Required integer between 18 and 100
 * - goal: Required string
 * - activityLevel: Required string
 * - dietaryRestrictions: Optional array
 */
const validateNutritionInput = [
    body('weight').isFloat({ min: 30, max: 300 }).withMessage('Weight must be between 30 and 300 kg'),
    body('height').isFloat({ min: 100, max: 250 }).withMessage('Height must be between 100 and 250 cm'),
    body('age').isInt({ min: 18, max: 100 }).withMessage('Age must be between 18 and 100'),
    body('goal').isString().notEmpty().withMessage('Goal is required'),
    body('activityLevel').isString().notEmpty().withMessage('Activity level is required'),
    body('dietaryRestrictions').isArray().optional(),
];

/**
 * POST /api/nutrition
 * Generates a personalized meal plan based on user input
 * Validates input, generates plan, and stores it in session for download
 */
router.post('/', timeoutMiddleware, validateNutritionInput, async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        // Add mobile detection info to the request
        const nutritionInput = {
            ...req.body,
            // Pass mobile detection to controller
            isMobile: req.isMobile || false
        };
        
        // Set a short timeout for the request
        const mealPlan = await nutritionController.generateMealPlan(nutritionInput);
        
        // Store the meal plan in session for download route
        req.session.mealPlan = mealPlan;
        
        res.json(mealPlan);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/nutrition/stream
 * Streams a personalized meal plan response directly to client
 * Uses streaming for real-time updates and faster perceived performance
 */
router.post('/stream', timeoutMiddleware, validateNutritionInput, async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        // Setup headers for streaming
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        // Prepare input with mobile detection
        const nutritionInput = {
            ...req.body,
            isMobile: req.isMobile || false
        };
        
        // Call controller with res object for streaming
        await nutritionController.generateMealPlan(nutritionInput, res);
        
        // Note: The response is handled in the controller
    } catch (error) {
        // Only send error if headers haven't been sent
        if (!res.headersSent) {
            next(error);
        } else {
            console.error('Error during meal plan streaming:', error);
        }
    }
});

/**
 * GET /api/nutrition/download/:format
 * Downloads the generated meal plan in the specified format (PDF or CSV)
 * Retrieves the plan from session or request body
 */
router.get('/download/:format', async (req, res, next) => {
    try {
        const { format } = req.params;
        if (!['pdf', 'csv'].includes(format)) {
            return res.status(400).json({ error: 'Invalid format. Must be pdf or csv' });
        }
        
        // Get meal plan from session or from request body
        const mealPlan = req.session.mealPlan || req.body.mealPlan;
        
        if (!mealPlan) {
            return res.status(400).json({ error: 'No meal plan data available. Generate a plan first.' });
        }
        
        const file = await nutritionController.downloadMealPlan(format, mealPlan);
        res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=meal-plan.${format}`);
        res.send(file);
    } catch (error) {
        next(error);
    }
});

module.exports = router; 