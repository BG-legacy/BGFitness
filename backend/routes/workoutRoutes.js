/**
 * Workout Routes Module
 * This file defines the API endpoints for workout-related operations
 * Handles workout plan generation and download functionality
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const workoutController = require('../controllers/workoutController');

/**
 * Input Validation Middleware
 * Validates the workout plan request body with the following rules:
 * - fitnessGoal: Required string
 * - level: Required string
 * - duration: Required - accept as provided to preserve exact value
 * - equipment: Optional array
 * - restrictions: Optional array
 */
const validateWorkoutInput = [
    body('fitnessGoal').isString().notEmpty().withMessage('Fitness goal is required'),
    body('level').isString().notEmpty().withMessage('Fitness level is required'),
    // Accept duration as is - don't transform it, to preserve user's exact input
    body('duration').notEmpty().withMessage('Duration is required'),
    body('equipment').isArray().optional(),
    body('restrictions').isArray().optional(),
];

/**
 * POST /api/workout
 * Generates a personalized workout plan based on user input
 * Validates input, generates plan, and stores it in session for download
 */
router.post('/', validateWorkoutInput, async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        // Preserve the original input values
        const workoutInput = {
            ...req.body,
            // Ensure duration and level are preserved exactly as submitted
            duration: req.body.duration,
            level: req.body.level,
            // Pass mobile detection to controller
            isMobile: req.isMobile || false
        };
        
        const workoutPlan = await workoutController.generateWorkoutPlan(workoutInput);
        
        // Store the workout plan in session for download route
        req.session.workoutPlan = workoutPlan;
        
        res.json(workoutPlan);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/workout/stream
 * Streams a personalized workout plan response directly to client
 * Uses SSE (Server-Sent Events) for real-time updates
 */
router.post('/stream', validateWorkoutInput, async (req, res, next) => {
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
        const workoutInput = {
            ...req.body,
            duration: req.body.duration,
            level: req.body.level,
            isMobile: req.isMobile || false
        };
        
        // Call controller with res object for streaming
        await workoutController.generateWorkoutPlan(workoutInput, res);
        
        // Note: The response is handled in the controller
    } catch (error) {
        // Only send error if headers haven't been sent
        if (!res.headersSent) {
            next(error);
        } else {
            console.error('Error during workout streaming:', error);
        }
    }
});

/**
 * GET /api/workout/download/:format
 * Downloads the generated workout plan in the specified format (PDF or CSV)
 * Retrieves the plan from session or request body
 */
router.get('/download/:format', async (req, res, next) => {
    try {
        const { format } = req.params;
        if (!['pdf', 'csv'].includes(format)) {
            return res.status(400).json({ error: 'Invalid format. Must be pdf or csv' });
        }
        
        // Get workout plan from session or from request body
        const workoutPlan = req.session.workoutPlan || req.body.workoutPlan;
        
        if (!workoutPlan) {
            return res.status(400).json({ error: 'No workout plan data available. Generate a plan first.' });
        }
        
        const file = await workoutController.downloadWorkoutPlan(format, workoutPlan);
        res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=workout-plan.${format}`);
        res.send(file);
    } catch (error) {
        next(error);
    }
});

module.exports = router; 