/**
 * Utility functions for fitness-related calculations and formatting
 */

/**
 * Calculates Total Daily Energy Expenditure (TDEE) using the Mifflin-St Jeor Equation
 * @param {Object} params - User parameters
 * @param {number} params.weight - Weight in kg
 * @param {number} params.height - Height in cm
 * @param {number} params.age - Age in years
 * @param {string} params.gender - 'male' or 'female'
 * @param {string} params.activityLevel - Activity level: 'sedentary', 'light', 'moderate', 'active', 'very_active'
 * @returns {number} TDEE in calories
 */
const calculateTDEE = ({ weight, height, age, gender, activityLevel }) => {
    // Validate input parameters
    if (!weight || !height || !age || !gender || !activityLevel) {
        throw new Error('Missing required parameters for TDEE calculation');
    }

    // Activity level multipliers
    const activityMultipliers = {
        sedentary: 1.2,      // Little or no exercise
        light: 1.375,        // Light exercise/sports 1-3 days/week
        moderate: 1.55,      // Moderate exercise/sports 3-5 days/week
        active: 1.725,       // Hard exercise/sports 6-7 days/week
        very_active: 1.9     // Very hard exercise/sports & physical job or training twice per day
    };

    // Calculate BMR using Mifflin-St Jeor Equation
    let bmr;
    if (gender.toLowerCase() === 'male') {
        bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
        bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    // Calculate TDEE by multiplying BMR with activity level
    const multiplier = activityMultipliers[activityLevel.toLowerCase()];
    if (!multiplier) {
        throw new Error('Invalid activity level provided');
    }

    return Math.round(bmr * multiplier);
};

/**
 * Formats workout plan from OpenAI response into a structured format
 * @param {Object} openAIResponse - Raw response from OpenAI
 * @returns {Object} Formatted workout plan
 */
const formatWorkoutPlan = (openAIResponse) => {
    try {
        const plan = {
            title: openAIResponse.title || 'Workout Plan',
            description: openAIResponse.description || '',
            duration: openAIResponse.duration || '8 weeks',
            schedule: [],
            exercises: []
        };

        // Format weekly schedule
        if (openAIResponse.schedule) {
            plan.schedule = openAIResponse.schedule.map(day => ({
                day: day.day,
                focus: day.focus,
                exercises: day.exercises.map(ex => ({
                    name: ex.name,
                    sets: ex.sets,
                    reps: ex.reps,
                    rest: ex.rest,
                    notes: ex.notes || ''
                }))
            }));
        }

        // Format exercise library
        if (openAIResponse.exercises) {
            plan.exercises = openAIResponse.exercises.map(ex => ({
                name: ex.name,
                type: ex.type,
                muscleGroup: ex.muscleGroup,
                equipment: ex.equipment,
                instructions: ex.instructions,
                videoUrl: ex.videoUrl || ''
            }));
        }

        return plan;
    } catch (error) {
        throw new Error(`Error formatting workout plan: ${error.message}`);
    }
};

/**
 * Formats nutrition plan into a structured daily meal plan with macros
 * @param {Object} openAIResponse - Raw response from OpenAI
 * @returns {Object} Formatted nutrition plan
 */
const formatNutritionPlan = (openAIResponse) => {
    try {
        const plan = {
            dailyCalories: openAIResponse.dailyCalories || 0,
            macros: {
                protein: openAIResponse.macros?.protein || 0,
                carbs: openAIResponse.macros?.carbs || 0,
                fats: openAIResponse.macros?.fats || 0
            },
            meals: []
        };

        // Format daily meals
        if (openAIResponse.meals) {
            plan.meals = openAIResponse.meals.map(meal => ({
                name: meal.name,
                time: meal.time,
                calories: meal.calories,
                macros: {
                    protein: meal.macros?.protein || 0,
                    carbs: meal.macros?.carbs || 0,
                    fats: meal.macros?.fats || 0
                },
                ingredients: meal.ingredients || [],
                instructions: meal.instructions || ''
            }));
        }

        return plan;
    } catch (error) {
        throw new Error(`Error formatting nutrition plan: ${error.message}`);
    }
};

module.exports = {
    calculateTDEE,
    formatWorkoutPlan,
    formatNutritionPlan
}; 