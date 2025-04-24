/**
 * Download Routes Module
 * This file handles the generation and download of workout and nutrition plans
 * Supports both PDF and CSV formats
 */

const express = require('express');
const router = express.Router();
const { generatePDF, generateCSV, cleanupTempFile } = require('../utils/exportUtils');
const { formatWorkoutPlan, formatNutritionPlan } = require('../utils/fitnessUtils');
const fs = require('fs');

/**
 * GET /download
 * Downloads a workout or nutrition plan in the specified format
 * 
 * Query Parameters:
 * @param {string} type - 'workout' or 'nutrition'
 * @param {string} format - 'pdf' or 'csv'
 * @param {Object} params - Additional parameters for plan generation
 * 
 * Response:
 * - Streams the generated file to the client
 * - Sets appropriate content type and disposition headers
 * - Cleans up temporary files after streaming
 */
router.get('/', async (req, res) => {
    try {
        const { type, format, ...params } = req.query;

        // Validate query parameters
        if (!type || !format) {
            return res.status(400).json({ error: 'Missing required parameters: type and format' });
        }

        if (!['workout', 'nutrition'].includes(type)) {
            return res.status(400).json({ error: 'Invalid type. Must be "workout" or "nutrition"' });
        }

        if (!['pdf', 'csv'].includes(format)) {
            return res.status(400).json({ error: 'Invalid format. Must be "pdf" or "csv"' });
        }

        // Generate plan based on type
        let plan;
        if (type === 'workout') {
            // Sample workout plan structure
            const sampleWorkoutResponse = {
                title: 'Custom Workout Plan',
                description: 'Generated based on your preferences',
                duration: '8 weeks',
                schedule: [
                    {
                        day: 'Monday',
                        focus: 'Upper Body',
                        exercises: [
                            {
                                name: 'Bench Press',
                                sets: 3,
                                reps: 10,
                                rest: '60s',
                                notes: 'Focus on form'
                            },
                            {
                                name: 'Pull-ups',
                                sets: 3,
                                reps: 8,
                                rest: '60s',
                                notes: 'Use assistance if needed'
                            }
                        ]
                    },
                    {
                        day: 'Wednesday',
                        focus: 'Lower Body',
                        exercises: [
                            {
                                name: 'Squats',
                                sets: 4,
                                reps: 8,
                                rest: '90s',
                                notes: 'Maintain proper depth'
                            },
                            {
                                name: 'Deadlifts',
                                sets: 3,
                                reps: 6,
                                rest: '120s',
                                notes: 'Focus on form'
                            }
                        ]
                    }
                ]
            };
            plan = formatWorkoutPlan(sampleWorkoutResponse);
        } else {
            // Sample nutrition plan structure
            const sampleNutritionResponse = {
                dailyCalories: 2000,
                macros: {
                    protein: 150,
                    carbs: 200,
                    fats: 50
                },
                meals: [
                    {
                        name: 'Breakfast',
                        time: '8:00 AM',
                        calories: 500,
                        macros: {
                            protein: 30,
                            carbs: 50,
                            fats: 15
                        },
                        ingredients: ['Oatmeal', 'Protein Powder', 'Banana'],
                        instructions: 'Mix ingredients and enjoy'
                    },
                    {
                        name: 'Lunch',
                        time: '12:00 PM',
                        calories: 600,
                        macros: {
                            protein: 40,
                            carbs: 60,
                            fats: 20
                        },
                        ingredients: ['Chicken Breast', 'Brown Rice', 'Broccoli'],
                        instructions: 'Grill chicken, cook rice, steam broccoli'
                    }
                ]
            };
            plan = formatNutritionPlan(sampleNutritionResponse);
        }

        // Generate the file in the requested format
        const filePath = format === 'pdf' 
            ? await generatePDF(plan, type)
            : await generateCSV(plan, type);

        // Set appropriate headers for file download
        const contentType = format === 'pdf' ? 'application/pdf' : 'text/csv';
        const extension = format === 'pdf' ? 'pdf' : 'csv';
        const filename = `${type}_plan.${extension}`;

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Stream the file to the response
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

        // Clean up the temporary file after streaming
        fileStream.on('end', () => {
            cleanupTempFile(filePath);
        });

        // Handle streaming errors
        fileStream.on('error', (err) => {
            console.error('Error streaming file:', err);
            cleanupTempFile(filePath);
            res.status(500).json({ error: 'Error streaming file' });
        });

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Error generating download file' });
    }
});

module.exports = router; 