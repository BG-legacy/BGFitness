const openaiService = require('../services/openaiService');
const { workoutSystemPrompt } = require('../ai/prompts');
const PDFDocument = require('pdfkit');

// Store recent workouts to avoid repetition (in-memory storage for simplicity)
// In a production environment, this should be stored in a database
const recentWorkouts = new Map();
const MAX_HISTORY_SIZE = 5; // Keep track of last 5 workouts per user
const WORKOUT_HISTORY_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

class WorkoutController {
    async generateWorkoutPlan(input, res = null) {
        try {
            // Get or create workout history for this user
            // For now, we'll use a simple hash of the input as a user identifier
            // In production, use actual user IDs from authentication
            const userKey = JSON.stringify(input).split('').reduce((a, b) => {
                a = ((a << 5) - a) + b.charCodeAt(0);
                return a & a;
            }, 0);
            
            // Get user's workout history or create empty array
            let userWorkoutHistory = [];
            if (recentWorkouts.has(userKey)) {
                const historyData = recentWorkouts.get(userKey);
                if (Date.now() - historyData.timestamp < WORKOUT_HISTORY_TTL) {
                    userWorkoutHistory = historyData.workouts || [];
                }
            }
            
            // Create a modified input with workout history
            const inputWithHistory = {
                ...input,
                previousWorkouts: userWorkoutHistory.map(workout => ({
                    title: workout.title,
                    exercises: workout.exercises ? workout.exercises.map(ex => ex.name) : []
                }))
            };
            
            // Detect if request is from mobile
            const isMobile = input.isMobile || false;
            
            // Additional optimization - send specific equipment and restrictions
            if (input.equipment) {
                inputWithHistory.availableEquipment = Array.isArray(input.equipment) ? 
                    input.equipment : [input.equipment];
            }
            
            if (input.restrictions) {
                inputWithHistory.exerciseRestrictions = Array.isArray(input.restrictions) ? 
                    input.restrictions : [input.restrictions];
            }
            
            // If express response object is provided, stream the response
            if (res) {
                return await openaiService.generateResponse(inputWithHistory, workoutSystemPrompt, isMobile, res);
            }
            
            // Otherwise generate normally
            const response = await openaiService.generateResponse(inputWithHistory, workoutSystemPrompt, isMobile);
            
            // Ensure we preserve the exact user input values
            if (input.duration) {
                response.duration = parseInt(input.duration);
            }
            
            if (input.level) {
                response.difficultyLevel = input.level;
            }
            
            // Update workout history
            userWorkoutHistory.unshift(response);
            if (userWorkoutHistory.length > MAX_HISTORY_SIZE) {
                userWorkoutHistory = userWorkoutHistory.slice(0, MAX_HISTORY_SIZE);
            }
            
            // Save updated history
            recentWorkouts.set(userKey, {
                workouts: userWorkoutHistory,
                timestamp: Date.now()
            });
            
            return response;
        } catch (error) {
            console.error('Error generating workout plan:', error);
            
            // If streaming, handle error in response
            if (res && !res.headersSent) {
                return res.status(500).json({
                    error: true,
                    errorMessage: 'Failed to generate workout plan',
                    errorDetails: error.message
                });
            }
            
            throw new Error('Failed to generate workout plan');
        }
    }

    async downloadWorkoutPlan(format, workoutPlan) {
        try {
            if (format === 'pdf') {
                const doc = new PDFDocument();
                const chunks = [];
                
                doc.on('data', chunk => chunks.push(chunk));
                
                // Add content to PDF
                doc.fontSize(24).text(workoutPlan.title || 'Advanced Workout Plan', { align: 'center' });
                doc.moveDown();
                
                doc.fontSize(12).text(workoutPlan.description || '');
                doc.moveDown();
                
                doc.fontSize(14).text(`Duration: ${workoutPlan.duration} minutes | Difficulty: ${workoutPlan.difficultyLevel || 'Standard'}`);
                doc.moveDown();
                
                if (workoutPlan.schedule && workoutPlan.schedule.length > 0) {
                    doc.fontSize(16).text('Schedule:', { underline: true });
                    workoutPlan.schedule.forEach(day => {
                        doc.fontSize(12).text(`• ${day}`);
                    });
                    doc.moveDown();
                }
                
                // Warmup Section
                if (workoutPlan.warmup && workoutPlan.warmup.length > 0) {
                    doc.fontSize(16).text('Warm-up:', { underline: true });
                    workoutPlan.warmup.forEach(exercise => {
                        doc.fontSize(14).text(exercise.name);
                        doc.fontSize(12).text(`Duration: ${exercise.duration}`);
                        doc.fontSize(12).text(`Instructions: ${exercise.instructions}`);
                        doc.moveDown(0.5);
                    });
                    doc.moveDown();
                }
                
                // Main Exercises
                doc.fontSize(16).text('Exercises:', { underline: true });
                doc.moveDown();
                
                if (workoutPlan.exercises && workoutPlan.exercises.length > 0) {
                    workoutPlan.exercises.forEach((exercise, index) => {
                        doc.fontSize(14).text(`${index + 1}. ${exercise.name}`);
                        doc.fontSize(12).text(`Sets: ${exercise.sets} | Reps: ${exercise.reps} | Rest: ${exercise.rest}`);
                        
                        if (exercise.tempo) {
                            doc.text(`Tempo: ${exercise.tempo}`);
                        }
                        
                        doc.text(`Instructions: ${exercise.instructions}`);
                        
                        if (exercise.muscleGroups && exercise.muscleGroups.length > 0) {
                            doc.text(`Target muscles: ${exercise.muscleGroups.join(', ')}`);
                        }
                        
                        if (exercise.equipment && exercise.equipment.length > 0) {
                            doc.text(`Equipment: ${exercise.equipment.join(', ')}`);
                        }
                        
                        if (exercise.alternatives && exercise.alternatives.length > 0) {
                            doc.text(`Alternatives: ${exercise.alternatives.join(', ')}`);
                        }
                        
                        if (exercise.progressionTips) {
                            doc.text(`Progression: ${exercise.progressionTips}`);
                        }
                        
                        doc.moveDown();
                    });
                }
                
                // Cooldown Section
                if (workoutPlan.cooldown && workoutPlan.cooldown.length > 0) {
                    doc.fontSize(16).text('Cool-down:', { underline: true });
                    workoutPlan.cooldown.forEach(exercise => {
                        doc.fontSize(14).text(exercise.name);
                        doc.fontSize(12).text(`Duration: ${exercise.duration}`);
                        doc.fontSize(12).text(`Instructions: ${exercise.instructions}`);
                        doc.moveDown(0.5);
                    });
                    doc.moveDown();
                }
                
                // Progression Plan
                if (workoutPlan.progressionPlan) {
                    doc.fontSize(16).text('4-Week Progression Plan:', { underline: true });
                    doc.moveDown(0.5);
                    
                    if (workoutPlan.progressionPlan.week1) {
                        doc.fontSize(12).text(`Week 1: ${workoutPlan.progressionPlan.week1}`);
                    }
                    
                    if (workoutPlan.progressionPlan.week2) {
                        doc.fontSize(12).text(`Week 2: ${workoutPlan.progressionPlan.week2}`);
                    }
                    
                    if (workoutPlan.progressionPlan.week3) {
                        doc.fontSize(12).text(`Week 3: ${workoutPlan.progressionPlan.week3}`);
                    }
                    
                    if (workoutPlan.progressionPlan.week4) {
                        doc.fontSize(12).text(`Week 4: ${workoutPlan.progressionPlan.week4}`);
                    }
                    
                    doc.moveDown();
                }
                
                // Notes
                if (workoutPlan.notes && workoutPlan.notes.length > 0) {
                    doc.fontSize(16).text('Notes:', { underline: true });
                    workoutPlan.notes.forEach(note => {
                        doc.fontSize(12).text(`• ${note}`);
                    });
                }
                
                // Wait for PDF generation to complete
                await new Promise((resolve) => {
                    doc.on('end', resolve);
                    doc.end();
                });
                
                return Buffer.concat(chunks);
            } else if (format === 'csv') {
                // Implement CSV generation logic for the enhanced workout plan
                let csvContent = 'Exercise,Sets,Reps,Rest,Muscle Groups,Equipment\n';
                
                if (workoutPlan.exercises && workoutPlan.exercises.length > 0) {
                    workoutPlan.exercises.forEach(exercise => {
                        const muscleGroups = exercise.muscleGroups ? exercise.muscleGroups.join('+') : '';
                        const equipment = exercise.equipment ? exercise.equipment.join('+') : '';
                        
                        csvContent += `"${exercise.name}","${exercise.sets}","${exercise.reps}","${exercise.rest}","${muscleGroups}","${equipment}"\n`;
                    });
                }
                
                return csvContent;
            }
        } catch (error) {
            console.error('Error generating download file:', error);
            throw new Error('Failed to generate download file');
        }
    }
}

module.exports = new WorkoutController(); 