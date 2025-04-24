/**
 * Utility functions for calculating TDEE and calories
 */

/**
 * Calculate Basal Metabolic Rate (BMR) using the Mifflin-St Jeor Equation
 * @param {number} weight - Weight in kg
 * @param {number} height - Height in cm
 * @param {number} age - Age in years
 * @param {string} gender - 'male' or 'female'
 * @returns {number} BMR in calories per day
 */
export const calculateBMR = (weight, height, age, gender) => {
  if (gender.toLowerCase() === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
};

/**
 * Calculate Total Daily Energy Expenditure (TDEE)
 * @param {number} bmr - Basal Metabolic Rate
 * @param {string} activityLevel - Activity level ('sedentary', 'light', 'moderate', 'active', 'very')
 * @returns {number} TDEE in calories per day
 */
export const calculateTDEE = (bmr, activityLevel) => {
  const activityMultipliers = {
    sedentary: 1.2, // Little or no exercise
    light: 1.375, // Light exercise 1-3 days/week
    moderate: 1.55, // Moderate exercise 3-5 days/week
    active: 1.725, // Hard exercise 6-7 days/week
    very: 1.9, // Very hard exercise & physical job or training twice a day
  };

  const multiplier = activityMultipliers[activityLevel.toLowerCase()] || 1.2;
  return Math.round(bmr * multiplier);
};

/**
 * Calculate calories needed based on goal
 * @param {number} tdee - Total Daily Energy Expenditure
 * @param {string} goal - 'lose', 'maintain', or 'gain'
 * @param {number} rate - Rate of weight change (percentage as decimal)
 * @returns {number} Calories per day
 */
export const calculateCaloriesByGoal = (tdee, goal, rate = 0.2) => {
  switch (goal.toLowerCase()) {
    case 'lose':
      return Math.round(tdee * (1 - rate));
    case 'gain':
      return Math.round(tdee * (1 + rate));
    case 'maintain':
    default:
      return tdee;
  }
};

/**
 * Generate a complete calorie calculation with macronutrient breakdown
 * @param {Object} userData - User data for calculations
 * @param {number} userData.weight - Weight in kg
 * @param {number} userData.height - Height in cm
 * @param {number} userData.age - Age in years
 * @param {string} userData.gender - 'male' or 'female'
 * @param {string} userData.activityLevel - Activity level
 * @param {string} userData.goal - 'lose', 'maintain', or 'gain'
 * @param {number} userData.rate - Rate of change (optional)
 * @returns {Object} Calorie and macronutrient data
 */
export const calculateNutrition = userData => {
  const { weight, height, age, gender, activityLevel, goal, rate } = userData;

  const bmr = calculateBMR(weight, height, age, gender);
  const tdee = calculateTDEE(bmr, activityLevel);
  const dailyCalories = calculateCaloriesByGoal(tdee, goal, rate);

  // Basic macro calculation (can be adjusted based on specific diet requirements)
  const protein = Math.round((dailyCalories * 0.3) / 4); // 30% calories from protein, 4 calories per gram
  const fat = Math.round((dailyCalories * 0.3) / 9); // 30% calories from fat, 9 calories per gram
  const carbs = Math.round((dailyCalories * 0.4) / 4); // 40% calories from carbs, 4 calories per gram

  return {
    bmr,
    tdee,
    dailyCalories,
    macros: {
      protein,
      fat,
      carbs,
    },
  };
};
