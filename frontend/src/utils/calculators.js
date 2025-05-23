/**
 * Utility functions for calculating TDEE and calories
 */

/**
 * Calculate Basal Metabolic Rate (BMR) using the Harris-Benedict equation
 * @param {number} weight - Weight in kg
 * @param {number} height - Height in cm
 * @param {number} age - Age in years
 * @param {string} gender - 'male' or 'female'
 * @returns {number} BMR in calories
 */
export const calculateBMR = (weight, height, age, gender) => {
  const validatedWeight = validateNumber(weight, 'Weight');
  const validatedHeight = validateNumber(height, 'Height');
  const validatedAge = validateNumber(age, 'Age');

  if (gender.toLowerCase() === 'male') {
    return 66.5 + 13.75 * validatedWeight + 5 * validatedHeight - 6.76 * validatedAge;
  } else {
    return 655.1 + 9.6 * validatedWeight + 1.8 * validatedHeight - 4.7 * validatedAge;
  }
};

/**
 * Calculate Total Daily Energy Expenditure (TDEE)
 * @param {number} bmr - Basal Metabolic Rate
 * @param {string} activityLevel - Activity level description
 * @returns {number} TDEE in calories
 */
export const calculateTDEE = (bmr, activityLevel) => {
  const validatedBMR = validateNumber(bmr, 'BMR');
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    veryActive: 1.9,
  };

  const multiplier = activityMultipliers[activityLevel.toLowerCase()];
  if (!multiplier) {
    throw new Error('Invalid activity level');
  }

  return Math.round(validatedBMR * multiplier);
};

/**
 * Calculate daily calorie needs based on goal
 * @param {number} tdee - Total Daily Energy Expenditure
 * @param {string} goal - Weight goal ('lose', 'maintain', 'gain')
 * @param {number} [rate=0.5] - Rate of weight change in kg per week
 * @returns {number} Daily calorie target
 */
export const calculateCaloriesByGoal = (tdee, goal, rate = 0.5) => {
  const validatedTDEE = validateNumber(tdee, 'TDEE');
  const validatedRate = validateNumber(rate, 'Rate');

  let calorieAdjustment;
  switch (goal.toLowerCase()) {
    case 'lose': {
      calorieAdjustment = (-7700 * validatedRate) / 7;
      break;
    }
    case 'maintain': {
      calorieAdjustment = 0;
      break;
    }
    case 'gain': {
      calorieAdjustment = (7700 * validatedRate) / 7;
      break;
    }
    default: {
      throw new Error('Invalid goal');
    }
  }

  return Math.round(validatedTDEE + calorieAdjustment);
};

/**
 * Validate that a number is valid and positive
 * @param {number} value - The value to validate
 * @param {string} name - The name of the value for error messages
 * @returns {number} The validated number
 * @throws {Error} If the value is invalid
 */
const validateNumber = (value, name) => {
  const num = Number(value);
  if (isNaN(num) || num <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
  return num;
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
