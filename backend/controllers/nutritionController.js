const openaiService = require('../services/openaiService');
const { nutritionSystemPrompt } = require('../ai/prompts');
const PDFDocument = require('pdfkit');

class NutritionController {
    async generateMealPlan(input, res = null) {
        try {
            // Detect if request is from mobile
            const isMobile = input.isMobile || false;
            
            // Pre-calculate nutrition estimates to improve accuracy and speed
            this.addNutritionEstimates(input);
            
            // Optimize input data to reduce processing time
            const optimizedInput = this.optimizeInputForSpeed(input);
            
            // If express response object is provided, stream the response
            if (res) {
                return await openaiService.generateResponse(optimizedInput, nutritionSystemPrompt, isMobile, res);
            }
            
            // Regular non-streaming response
            return await openaiService.generateResponse(optimizedInput, nutritionSystemPrompt, isMobile);
            
        } catch (error) {
            console.error('Error generating meal plan:', error);
            
            // If streaming, handle error in response
            if (res && !res.headersSent) {
                return res.status(500).json({
                    error: true,
                    errorMessage: 'Failed to generate meal plan',
                    errorDetails: error.message
                });
            }
            
            throw new Error('Failed to generate meal plan');
        }
    }
    
    /**
     * Optimize input data to reduce AI processing time
     */
    optimizeInputForSpeed(input) {
        const optimized = {...input};
        
        // Remove any unnecessary data that could slow down processing
        const essentialFields = [
            'weight', 'height', 'age', 'goal', 'activityLevel', 
            'dietaryRestrictions', 'estimatedCalories', 'estimatedMacros',
            'mealStructure', 'isMobile'
        ];
        
        // Create a clean input object with only essential fields
        const cleanInput = {};
        essentialFields.forEach(field => {
            if (optimized[field] !== undefined) {
                cleanInput[field] = optimized[field];
            }
        });
        
        // Add flags to further optimize AI response
        cleanInput.quickResponse = true;
        cleanInput.prioritizeAccuracy = true;
        
        return cleanInput;
    }
    
    /**
     * Generate a unique key for a user based on their input
     */
    generateUserKey(input) {
        const { weight, height, age, goal, activityLevel, dietaryRestrictions = [] } = input;
        const restrictionsKey = Array.isArray(dietaryRestrictions) 
            ? dietaryRestrictions.sort().join('-')
            : '';
            
        return `${weight}-${height}-${age}-${goal}-${activityLevel}-${restrictionsKey}`;
    }
    
    /**
     * Pre-calculate nutrition estimates for faster and more accurate results
     */
    addNutritionEstimates(input) {
        if (input.weight && input.height && input.age) {
            // Add estimated calories if not already present
            if (!input.estimatedCalories) {
                input.estimatedCalories = this.calculateEstimatedCalories(input);
            }
            
            // Add estimated macros if not already present
            if (!input.estimatedMacros) {
                const macros = this.generateDefaultMacros(input);
                input.estimatedMacros = macros;
            }
            
            // Add prepared meal structure for quicker response
            input.mealStructure = this.generateBasicMeals(input);
        }
    }
    
    calculateEstimatedCalories(input) {
        // Simple BMR calculation with activity factor
        const { weight, height, age, activityLevel, goal } = input;
        let bmr = 10 * weight + 6.25 * height - 5 * age + 5;
        
        // Activity multipliers
        const multipliers = {
            sedentary: 1.2,
            light: 1.375,
            moderate: 1.55,
            active: 1.725,
            very_active: 1.9
        };
        
        let calories = Math.round(bmr * (multipliers[activityLevel] || 1.375));
        
        // Adjust for goal
        if (goal === 'weight_loss') {
            calories *= 0.85; // 15% deficit
        } else if (goal === 'muscle_gain') {
            calories *= 1.15; // 15% surplus
        }
        
        return Math.round(calories);
    }
    
    generateDefaultMacros(input) {
        const { weight, goal } = input;
        const calories = this.calculateEstimatedCalories(input);
        
        // Protein based on bodyweight
        const protein = Math.round(weight * (goal === 'muscle_gain' ? 2.2 : 1.8));
        
        // Fat - minimum 20% of calories
        const fat = Math.round((calories * 0.25) / 9);
        
        // Remaining calories from carbs
        const carbs = Math.round((calories - (protein * 4 + fat * 9)) / 4);
        
        return {
            protein,
            carbs,
            fat,
            fiber: Math.round(carbs * 0.3) // ~30% of carbs as fiber
        };
    }
    
    generateBasicMeals(input) {
        const calories = this.calculateEstimatedCalories(input);
        const macros = this.generateDefaultMacros(input);
        
        // Create a balanced meal distribution that follows common patterns
        return [
            {
                name: "Breakfast",
                time: "8:00 AM",
                calories: Math.round(calories * 0.25),
                ingredients: [
                    { name: "Protein Source", amount: "serving", calories: 150 },
                    { name: "Complex Carbs", amount: "serving", calories: 150 },
                    { name: "Healthy Fats", amount: "serving", calories: 100 }
                ],
                nutritionalInfo: {
                    protein: Math.round(macros.protein * 0.25),
                    carbs: Math.round(macros.carbs * 0.25),
                    fat: Math.round(macros.fat * 0.25)
                }
            },
            {
                name: "Lunch",
                time: "12:30 PM",
                calories: Math.round(calories * 0.35),
                ingredients: [
                    { name: "Protein Source", amount: "serving", calories: 200 },
                    { name: "Complex Carbs", amount: "serving", calories: 200 },
                    { name: "Vegetables", amount: "serving", calories: 50 }
                ],
                nutritionalInfo: {
                    protein: Math.round(macros.protein * 0.35),
                    carbs: Math.round(macros.carbs * 0.35),
                    fat: Math.round(macros.fat * 0.35)
                }
            },
            {
                name: "Dinner",
                time: "6:30 PM",
                calories: Math.round(calories * 0.3),
                ingredients: [
                    { name: "Protein Source", amount: "serving", calories: 200 },
                    { name: "Complex Carbs", amount: "serving", calories: 150 },
                    { name: "Vegetables", amount: "serving", calories: 50 }
                ],
                nutritionalInfo: {
                    protein: Math.round(macros.protein * 0.3),
                    carbs: Math.round(macros.carbs * 0.3),
                    fat: Math.round(macros.fat * 0.3)
                }
            },
            {
                name: "Snack",
                time: "3:00 PM",
                calories: Math.round(calories * 0.1),
                ingredients: [
                    { name: "Protein Source", amount: "serving", calories: 100 },
                    { name: "Healthy Fats", amount: "serving", calories: 100 }
                ],
                nutritionalInfo: {
                    protein: Math.round(macros.protein * 0.1),
                    carbs: Math.round(macros.carbs * 0.1),
                    fat: Math.round(macros.fat * 0.1)
                }
            }
        ];
    }
    
    async downloadMealPlan(format, mealPlan) {
        try {
            if (format === 'pdf') {
                const doc = new PDFDocument();
                const chunks = [];
                
                doc.on('data', chunk => chunks.push(chunk));
                
                // Add content to PDF
                doc.fontSize(24).text(mealPlan.title || 'Advanced Meal Plan', { align: 'center' });
                doc.moveDown();
                
                doc.fontSize(12).text(mealPlan.description || '');
                doc.moveDown();
                
                // Daily Nutrition Overview
                doc.fontSize(16).text('Daily Nutrition Overview:', { underline: true });
                doc.fontSize(12).text(`Daily Calories: ${mealPlan.dailyCalories} kcal`);
                
                if (mealPlan.macros) {
                    doc.fontSize(12).text(`Protein: ${mealPlan.macros.protein}g | Carbs: ${mealPlan.macros.carbs}g | Fat: ${mealPlan.macros.fat}g | Fiber: ${mealPlan.macros.fiber || '0'}g`);
                }
                
                doc.moveDown();
                
                // Hydration Section
                if (mealPlan.hydration) {
                    doc.fontSize(16).text('Hydration:', { underline: true });
                    doc.fontSize(12).text(`Daily Water Intake: ${mealPlan.hydration.dailyWaterIntake || 'N/A'}`);
                    
                    if (mealPlan.hydration.recommendedDrinks && mealPlan.hydration.recommendedDrinks.length > 0) {
                        doc.fontSize(12).text('Recommended Drinks:');
                        mealPlan.hydration.recommendedDrinks.forEach(drink => {
                            doc.fontSize(12).text(`• ${drink}`);
                        });
                    }
                    
                    if (mealPlan.hydration.avoidDrinks && mealPlan.hydration.avoidDrinks.length > 0) {
                        doc.fontSize(12).text('Drinks to Avoid:');
                        mealPlan.hydration.avoidDrinks.forEach(drink => {
                            doc.fontSize(12).text(`• ${drink}`);
                        });
                    }
                    
                    doc.moveDown();
                }
                
                // Meals Section
                doc.fontSize(16).text('Detailed Meal Plan:', { underline: true });
                doc.moveDown();
                
                if (mealPlan.meals && mealPlan.meals.length > 0) {
                    mealPlan.meals.forEach((meal, index) => {
                        doc.fontSize(14).text(`${index + 1}. ${meal.name} (${meal.time})`);
                        doc.fontSize(12).text(`Calories: ${meal.calories} kcal`);
                        
                        doc.moveDown(0.5);
                        doc.fontSize(12).text('Ingredients:');
                        
                        if (Array.isArray(meal.ingredients) && meal.ingredients.length > 0) {
                            if (typeof meal.ingredients[0] === 'string') {
                                // Handle old format (string array)
                                meal.ingredients.forEach(ingredient => {
                                    doc.fontSize(12).text(`• ${ingredient}`);
                                });
                            } else {
                                // Handle new format (object array)
                                meal.ingredients.forEach(ingredient => {
                                    doc.fontSize(12).text(`• ${ingredient.name} - ${ingredient.amount} (${ingredient.calories} kcal)`);
                                });
                            }
                        }
                        
                        doc.moveDown(0.5);
                        
                        if (meal.preparationInstructions) {
                            doc.fontSize(12).text(`Preparation: ${meal.preparationInstructions}`);
                        }
                        
                        if (meal.cookingInstructions) {
                            doc.fontSize(12).text(`Cooking: ${meal.cookingInstructions}`);
                        }
                        
                        // Support for older format
                        if (meal.instructions) {
                            doc.fontSize(12).text(`Instructions: ${meal.instructions}`);
                        }
                        
                        doc.moveDown(0.5);
                        doc.fontSize(12).text('Nutritional Information:');
                        
                        if (meal.nutritionalInfo) {
                            doc.fontSize(12).text(`Protein: ${meal.nutritionalInfo.protein}g | Carbs: ${meal.nutritionalInfo.carbs}g | Fat: ${meal.nutritionalInfo.fat}g`);
                            
                            if (meal.nutritionalInfo.fiber) {
                                doc.fontSize(12).text(`Fiber: ${meal.nutritionalInfo.fiber}g`);
                            }
                            
                            if (meal.nutritionalInfo.vitamins && meal.nutritionalInfo.vitamins.length > 0) {
                                doc.fontSize(12).text(`Key Vitamins: ${meal.nutritionalInfo.vitamins.join(', ')}`);
                            }
                            
                            if (meal.nutritionalInfo.minerals && meal.nutritionalInfo.minerals.length > 0) {
                                doc.fontSize(12).text(`Key Minerals: ${meal.nutritionalInfo.minerals.join(', ')}`);
                            }
                        }
                        
                        doc.moveDown();
                    });
                }
                
                // Weekly Meal Plan
                if (mealPlan.weeklyMealPlan) {
                    doc.fontSize(16).text('Weekly Meal Plan Overview:', { underline: true });
                    doc.moveDown(0.5);
                    
                    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                    
                    days.forEach(day => {
                        if (mealPlan.weeklyMealPlan[day] && mealPlan.weeklyMealPlan[day].length > 0) {
                            doc.fontSize(14).text(day.charAt(0).toUpperCase() + day.slice(1) + ':');
                            mealPlan.weeklyMealPlan[day].forEach(mealItem => {
                                doc.fontSize(12).text(`• ${mealItem}`);
                            });
                            doc.moveDown(0.5);
                        }
                    });
                    
                    doc.moveDown();
                }
                
                // Grocery List
                if (mealPlan.groceryList && mealPlan.groceryList.length > 0) {
                    doc.fontSize(16).text('Grocery List:', { underline: true });
                    mealPlan.groceryList.forEach(item => {
                        doc.fontSize(12).text(`• ${item}`);
                    });
                    doc.moveDown();
                }
                
                // Supplement Recommendations
                if (mealPlan.supplementRecommendations && mealPlan.supplementRecommendations.length > 0) {
                    doc.fontSize(16).text('Supplement Recommendations:', { underline: true });
                    mealPlan.supplementRecommendations.forEach(supplement => {
                        doc.fontSize(12).text(`• ${supplement}`);
                    });
                    doc.moveDown();
                }
                
                // Notes
                if (mealPlan.notes && mealPlan.notes.length > 0) {
                    doc.fontSize(16).text('Notes:', { underline: true });
                    mealPlan.notes.forEach(note => {
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
                // Implement CSV generation logic for the enhanced meal plan
                let csvContent = 'Meal,Time,Calories,Protein,Carbs,Fat\n';
                
                if (mealPlan.meals && mealPlan.meals.length > 0) {
                    mealPlan.meals.forEach(meal => {
                        const protein = meal.nutritionalInfo ? meal.nutritionalInfo.protein : '';
                        const carbs = meal.nutritionalInfo ? meal.nutritionalInfo.carbs : '';
                        const fat = meal.nutritionalInfo ? meal.nutritionalInfo.fat : '';
                        
                        csvContent += `"${meal.name}","${meal.time}","${meal.calories}","${protein}","${carbs}","${fat}"\n`;
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

module.exports = new NutritionController(); 