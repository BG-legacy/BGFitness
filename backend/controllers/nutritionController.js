const openaiService = require('../services/openaiService');
const { nutritionSystemPrompt } = require('../ai/prompts');
const PDFDocument = require('pdfkit');

// In-memory cache for fallback meal plans
const fallbackPlansCache = new Map();
const FALLBACK_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

class NutritionController {
    async generateMealPlan(input, res = null) {
        try {
            // Detect if request is from mobile
            const isMobile = input.isMobile || false;
            
            // Generate a cache key for fallback plans
            const userKey = this.generateUserKey(input);
            
            // Pre-calculate nutrition estimates to improve accuracy and speed
            this.addNutritionEstimates(input);
            
            // If express response object is provided, stream the response
            if (res) {
                try {
                    return await openaiService.generateResponse(input, nutritionSystemPrompt, isMobile, res);
                } catch (error) {
                    // Check if we need to use fallback
                    if (error.message === 'nutrition_fallback_needed' || error.message.includes('timeout')) {
                        console.log('Using fallback meal plan for streaming response');
                        const fallbackPlan = this.getFallbackMealPlan(input, userKey);
                        
                        // Send fallback plan as streaming response
                        this.sendFallbackStreamingResponse(fallbackPlan, res);
                        return { fallback: true };
                    }
                    
                    // Re-throw other errors
                    throw error;
                }
            }
            
            // Regular non-streaming response
            try {
                // Generate the meal plan with the mobile flag
                const response = await openaiService.generateResponse(input, nutritionSystemPrompt, isMobile);
                
                // Cache the successful result for fallback use
                this.cacheMealPlanForFallback(response, userKey);
                
                return response;
            } catch (error) {
                // Handle timeout or other errors with fallback
                if (error.message.includes('timeout') || error.message === 'nutrition_fallback_needed') {
                    console.log('Using fallback meal plan for regular response');
                    return this.getFallbackMealPlan(input, userKey);
                }
                
                // Re-throw other errors
                throw error;
            }
        } catch (error) {
            console.error('Error generating meal plan:', error);
            
            // If streaming, handle error in response
            if (res && !res.headersSent) {
                // Try to send a fallback plan even for unexpected errors
                try {
                    const fallbackPlan = this.createFallbackMealPlan(input);
                    return res.json(fallbackPlan);
                } catch (fbError) {
                    // If even fallback fails, return basic error
                    return res.status(500).json({
                        error: true,
                        errorMessage: 'Failed to generate meal plan',
                        errorDetails: error.message
                    });
                }
            }
            
            throw new Error('Failed to generate meal plan');
        }
    }
    
    /**
     * Send a fallback plan as a streaming response
     */
    sendFallbackStreamingResponse(fallbackPlan, res) {
        try {
            // Send a single chunk response with fallback data
            res.setHeader('Content-Type', 'application/json');
            res.write(JSON.stringify({
                streaming: false,
                fallback: true,
                complete: fallbackPlan
            }));
            res.end();
        } catch (error) {
            console.error('Error sending fallback streaming response:', error);
            if (!res.headersSent) {
                res.status(500).json({
                    error: true,
                    errorMessage: 'Failed to generate meal plan'
                });
            } else {
                try { res.end(); } catch (e) { }
            }
        }
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
    
    /**
     * Cache a successful meal plan for fallback use
     */
    cacheMealPlanForFallback(mealPlan, userKey) {
        if (!mealPlan || !userKey) return;
        
        fallbackPlansCache.set(userKey, {
            plan: mealPlan,
            timestamp: Date.now()
        });
    }
    
    /**
     * Get a fallback meal plan from cache or create a new one
     */
    getFallbackMealPlan(input, userKey) {
        // Check if we have a cached fallback plan for this user
        if (fallbackPlansCache.has(userKey)) {
            const cachedItem = fallbackPlansCache.get(userKey);
            if (Date.now() - cachedItem.timestamp < FALLBACK_CACHE_TTL) {
                console.log('Using cached fallback meal plan');
                return cachedItem.plan;
            }
        }
        
        // Create a new fallback plan
        return this.createFallbackMealPlan(input);
    }
    
    // Helper function to create a fallback meal plan when API fails
    createFallbackMealPlan(input) {
        const { weight, height, age, goal, activityLevel, dietaryRestrictions = [] } = input;
        
        // Calculate estimated daily calories based on user metrics
        let baseCalories = 0;
        
        // Basic BMR calculation using Mifflin-St Jeor Equation
        if (age && weight && height) {
            // BMR = 10 * weight(kg) + 6.25 * height(cm) - 5 * age(y) + 5
            baseCalories = 10 * weight + 6.25 * height - 5 * age + 5;
            
            // Apply activity multiplier
            const activityMultipliers = {
                sedentary: 1.2,
                light: 1.375,
                moderate: 1.55,
                active: 1.725,
                very_active: 1.9
            };
            
            const multiplier = activityMultipliers[activityLevel] || 1.375;
            baseCalories = Math.round(baseCalories * multiplier);
            
            // Adjust for goal
            if (goal === 'weight_loss') {
                baseCalories = Math.round(baseCalories * 0.85); // 15% deficit
            } else if (goal === 'muscle_gain') {
                baseCalories = Math.round(baseCalories * 1.15); // 15% surplus
            }
        } else {
            // Default value if user metrics incomplete
            baseCalories = 2200;
        }
        
        // Calculate macros based on goal
        let protein = 0, carbs = 0, fat = 0;
        
        if (goal === 'weight_loss') {
            // Higher protein, lower carb for weight loss
            protein = Math.round(weight * 2.2); // ~2.2g per kg bodyweight
            fat = Math.round(weight * 1); // ~1g per kg bodyweight
            carbs = Math.round((baseCalories - (protein * 4 + fat * 9)) / 4);
        } else if (goal === 'muscle_gain') {
            // Higher overall with emphasis on protein and carbs
            protein = Math.round(weight * 2); // ~2g per kg bodyweight
            carbs = Math.round(weight * 4); // ~4g per kg bodyweight
            fat = Math.round((baseCalories - (protein * 4 + carbs * 4)) / 9);
        } else {
            // Balanced approach for maintenance
            protein = Math.round(weight * 1.8); // ~1.8g per kg bodyweight
            carbs = Math.round(weight * 3); // ~3g per kg bodyweight
            fat = Math.round((baseCalories - (protein * 4 + carbs * 4)) / 9);
        }
        
        // Ensure fat doesn't go below healthy minimum
        if (fat < Math.round(weight * 0.5)) {
            fat = Math.round(weight * 0.5);
            // Recalculate carbs to maintain calorie goal
            carbs = Math.round((baseCalories - (protein * 4 + fat * 9)) / 4);
        }
        
        // Handle dietary restrictions
        const hasRestrictions = Array.isArray(dietaryRestrictions) && dietaryRestrictions.length > 0;
        const isVegetarian = hasRestrictions && dietaryRestrictions.some(r => 
            r.toLowerCase().includes('vegetarian'));
        const isVegan = hasRestrictions && dietaryRestrictions.some(r => 
            r.toLowerCase().includes('vegan'));
        const isGlutenFree = hasRestrictions && dietaryRestrictions.some(r => 
            r.toLowerCase().includes('gluten'));
        const isLactoseFree = hasRestrictions && dietaryRestrictions.some(r => 
            r.toLowerCase().includes('lactose') || r.toLowerCase().includes('dairy'));
        
        // Adjust protein sources based on restrictions
        const proteinSources = [];
        
        if (isVegan) {
            proteinSources.push(
                { name: "Tofu", amount: "150g", calories: 120 },
                { name: "Tempeh", amount: "100g", calories: 165 },
                { name: "Lentils", amount: "200g (cooked)", calories: 230 },
                { name: "Chickpeas", amount: "200g (cooked)", calories: 240 }
            );
        } else if (isVegetarian) {
            proteinSources.push(
                { name: "Eggs", amount: "3 large", calories: 210 },
                { name: "Greek Yogurt", amount: "200g", calories: 130 },
                { name: "Cottage Cheese", amount: "200g", calories: 160 },
                { name: "Tofu", amount: "150g", calories: 120 }
            );
        } else {
            proteinSources.push(
                { name: "Chicken Breast", amount: "150g", calories: 165 },
                { name: "Salmon", amount: "150g", calories: 210 },
                { name: "Lean Beef", amount: "150g", calories: 180 },
                { name: "Tuna", amount: "150g (canned in water)", calories: 130 }
            );
        }
        
        // Adjust carb sources based on restrictions
        const carbSources = [];
        
        if (isGlutenFree) {
            carbSources.push(
                { name: "Brown Rice", amount: "200g (cooked)", calories: 220 },
                { name: "Sweet Potato", amount: "200g", calories: 180 },
                { name: "Quinoa", amount: "150g (cooked)", calories: 180 },
                { name: "Gluten-Free Oats", amount: "80g (dry)", calories: 300 }
            );
        } else {
            carbSources.push(
                { name: "Brown Rice", amount: "200g (cooked)", calories: 220 },
                { name: "Whole Grain Bread", amount: "2 slices", calories: 160 },
                { name: "Oatmeal", amount: "80g (dry)", calories: 300 },
                { name: "Sweet Potato", amount: "200g", calories: 180 }
            );
        }
        
        // Create basic meals with appropriate options based on restrictions
        const breakfast = {
            name: "Breakfast",
            time: "8:00 AM",
            calories: Math.round(baseCalories * 0.25),
            ingredients: [
                isVegan || isVegetarian ? 
                    { name: "Plant-Based Yogurt", amount: "200g", calories: 120 } :
                    { name: "Greek Yogurt", amount: "200g", calories: 130 },
                { name: "Berries", amount: "100g", calories: 50 },
                { name: "Chia Seeds", amount: "15g", calories: 80 },
                isGlutenFree ? 
                    { name: "Gluten-Free Oats", amount: "50g", calories: 190 } :
                    { name: "Oatmeal", amount: "50g", calories: 190 }
            ],
            preparationInstructions: "Mix all ingredients in a bowl. For overnight oats, prepare the night before and refrigerate.",
            cookingInstructions: "No cooking required if using pre-cooked oats. Otherwise, cook oats according to package instructions.",
            nutritionalInfo: {
                protein: Math.round(protein * 0.25),
                carbs: Math.round(carbs * 0.25),
                fat: Math.round(fat * 0.25),
                fiber: Math.round(carbs * 0.25 * 0.3),
                vitamins: ["Vitamin C", "Vitamin D", "B-vitamins"],
                minerals: ["Calcium", "Iron", "Potassium"]
            }
        };
        
        const lunch = {
            name: "Lunch",
            time: "12:30 PM",
            calories: Math.round(baseCalories * 0.35),
            ingredients: [
                isVegan ? proteinSources[0] : (isVegetarian ? proteinSources[1] : proteinSources[0]),
                carbSources[0],
                { name: "Mixed Vegetables", amount: "200g", calories: 70 },
                { name: "Olive Oil", amount: "15ml", calories: 120 }
            ],
            preparationInstructions: "Chop vegetables into bite-sized pieces. Prepare protein according to type.",
            cookingInstructions: isVegan || isVegetarian ? 
                "Stir-fry vegetables and plant protein with olive oil and seasonings." :
                "Grill protein and steam vegetables. Serve with cooked rice or grain of choice.",
            nutritionalInfo: {
                protein: Math.round(protein * 0.35),
                carbs: Math.round(carbs * 0.35),
                fat: Math.round(fat * 0.35),
                fiber: Math.round(carbs * 0.35 * 0.3),
                vitamins: ["Vitamin A", "Vitamin C", "B-vitamins"],
                minerals: ["Iron", "Zinc", "Magnesium"]
            }
        };
        
        const dinner = {
            name: "Dinner",
            time: "6:30 PM",
            calories: Math.round(baseCalories * 0.3),
            ingredients: [
                isVegan ? proteinSources[1] : (isVegetarian ? proteinSources[0] : proteinSources[1]), 
                carbSources[1],
                { name: "Green Leafy Vegetables", amount: "150g", calories: 50 },
                { name: "Healthy Oil/Fat", amount: "15ml", calories: 120 }
            ],
            preparationInstructions: "Wash and chop vegetables. Prepare protein based on type chosen.",
            cookingInstructions: "Cook protein with minimal oil. Steam or roast vegetables to preserve nutrients.",
            nutritionalInfo: {
                protein: Math.round(protein * 0.3),
                carbs: Math.round(carbs * 0.3),
                fat: Math.round(fat * 0.3),
                fiber: Math.round(carbs * 0.3 * 0.3),
                vitamins: ["Vitamin K", "Vitamin E", "B-vitamins"],
                minerals: ["Calcium", "Magnesium", "Potassium"]
            }
        };
        
        const snack = {
            name: "Snack",
            time: "3:00 PM",
            calories: Math.round(baseCalories * 0.1),
            ingredients: [
                isLactoseFree ? 
                    { name: "Nuts", amount: "30g", calories: 180 } :
                    { name: "Greek Yogurt", amount: "100g", calories: 60 },
                { name: "Fruit", amount: "1 medium piece", calories: 80 }
            ],
            preparationInstructions: "Wash fruit and portion nuts or yogurt.",
            cookingInstructions: "No cooking required.",
            nutritionalInfo: {
                protein: Math.round(protein * 0.1),
                carbs: Math.round(carbs * 0.1),
                fat: Math.round(fat * 0.1),
                fiber: Math.round(carbs * 0.1 * 0.3),
                vitamins: ["Vitamin C", "Vitamin E"],
                minerals: ["Magnesium", "Potassium"]
            }
        };
        
        // Create the meal plan with restrictions in mind
        const restrictionsStr = Array.isArray(dietaryRestrictions) ? 
            dietaryRestrictions.join(', ') : 
            (typeof dietaryRestrictions === 'string' ? dietaryRestrictions : '');
            
        const titleSuffix = restrictionsStr ? 
            ` (${restrictionsStr})` : '';
            
        return {
            title: `${goal.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())} Nutrition Plan${titleSuffix}`,
            description: `A quick-response nutrition plan designed to support your ${goal.replace('_', ' ')} goal${restrictionsStr ? ', while respecting your dietary restrictions' : ''}.`,
            dailyCalories: baseCalories,
            macros: {
                protein: protein,
                carbs: carbs,
                fat: fat,
                fiber: Math.round(carbs * 0.3) // Estimate fiber as 30% of carbs
            },
            meals: [breakfast, lunch, dinner, snack],
            hydration: {
                dailyWaterIntake: "2-3 liters",
                recommendedDrinks: ["Water", "Green Tea", "Black Coffee (in moderation)"],
                avoidDrinks: ["Sugary Sodas", "Alcohol", "High-Calorie Coffee Drinks"]
            },
            weeklyMealPlan: {
                monday: ["Breakfast: Oatmeal Bowl", "Lunch: Protein with Rice", "Dinner: Protein with Vegetables"],
                tuesday: ["Breakfast: Smoothie Bowl", "Lunch: Protein Wrap", "Dinner: Stir-Fry"],
                wednesday: ["Breakfast: Yogurt Parfait", "Lunch: Grain Bowl", "Dinner: Protein with Sweet Potato"],
                thursday: ["Breakfast: Oatmeal with Fruit", "Lunch: Protein Salad", "Dinner: One-Pot Meal"],
                friday: ["Breakfast: Toast with Toppings", "Lunch: Leftovers", "Dinner: Protein with Grain"],
                saturday: ["Breakfast: Weekend Special", "Lunch: Meal Out (within macros)", "Dinner: Homemade Healthy Option"],
                sunday: ["Breakfast: Prep Day Special", "Lunch: Meal Prep", "Dinner: Meal Prep"]
            },
            groceryList: [
                "Protein Sources (based on restrictions)",
                "Complex Carbohydrates (based on restrictions)",
                "Vegetables (variety of colors)",
                "Fruits (seasonal options)",
                "Healthy Fats (nuts, seeds, oils)",
                "Seasonings and Spices"
            ],
            notes: [
                "This is a quick-response meal plan. For a more detailed plan, please try again later.",
                "Adjust portion sizes to match your specific calorie needs.",
                "Stay hydrated throughout the day.",
                "Meal timing can be adjusted to fit your schedule."
            ],
            supplementRecommendations: [
                isVegan ? "Vitamin B12 - Essential for vegans" : "",
                "Vitamin D - Especially if limited sun exposure",
                "Omega-3 - For heart and brain health",
                "Protein supplement - If struggling to meet protein goals through food alone"
            ].filter(Boolean),
            // Add fallback indicator
            fallback: true
        };
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