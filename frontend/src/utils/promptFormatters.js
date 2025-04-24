/**
 * Utility functions for formatting AI prompts
 */

/**
 * Format user data into a structured prompt for fitness plan generation
 * @param {Object} userData - User's fitness data
 * @returns {string} Formatted prompt string
 */
export const formatFitnessPlanPrompt = userData => {
  const {
    name,
    age,
    gender,
    weight,
    weightUnit = 'kg',
    height,
    heightUnit = 'cm',
    fitnessLevel,
    fitnessGoals,
    targetWeight,
    timeFrame,
    healthConditions = [],
    dietaryRestrictions = [],
    equipment = [],
    exercisePreferences = [],
    availableTime,
  } = userData;

  // Format health conditions and restrictions as a string
  const formattedConditions =
    healthConditions.length > 0 ? `Health conditions: ${healthConditions.join(', ')}.` : 'No specific health conditions.';

  const formattedDiet =
    dietaryRestrictions.length > 0 ? `Dietary restrictions: ${dietaryRestrictions.join(', ')}.` : 'No specific dietary restrictions.';

  // Format exercise equipment and preferences
  const formattedEquipment = equipment.length > 0 ? `Available equipment: ${equipment.join(', ')}.` : 'No specific equipment available.';

  const formattedPreferences =
    exercisePreferences.length > 0 ? `Exercise preferences: ${exercisePreferences.join(', ')}.` : 'No specific exercise preferences.';

  return `
Create a personalized fitness plan for ${name}, a ${age}-year-old ${gender.toLowerCase()}.

Physical profile:
- Weight: ${weight} ${weightUnit}
- Height: ${height} ${heightUnit}
- Current fitness level: ${fitnessLevel}
- Goals: ${fitnessGoals}
- Target weight: ${targetWeight} ${weightUnit}
- Desired timeframe: ${timeFrame}

Health information:
- ${formattedConditions}
- ${formattedDiet}

Exercise details:
- ${formattedEquipment}
- ${formattedPreferences}
- Available time for workouts: ${availableTime} per session

Please provide a comprehensive fitness plan including:
1. Weekly workout schedule
2. Nutrition recommendations
3. Specific exercises with sets, reps, and progression
4. Estimated timeline for achieving goals
5. Recommended supplements (if appropriate)
6. Tips for staying motivated
`.trim();
};

/**
 * Format user data into a structured prompt for nutrition plan generation
 * @param {Object} userData - User's nutrition data
 * @returns {string} Formatted prompt string
 */
export const formatNutritionPlanPrompt = userData => {
  const {
    name,
    age,
    gender,
    weight,
    weightUnit = 'kg',
    height,
    heightUnit = 'cm',
    activityLevel,
    dietaryRestrictions = [],
    allergies = [],
    foodPreferences = [],
    dislikedFoods = [],
    nutritionGoals,
    mealsPerDay,
    cookingSkill,
    budget,
  } = userData;

  // Format dietary restrictions and allergies
  const formattedRestrictions =
    dietaryRestrictions.length > 0 ? `Dietary restrictions: ${dietaryRestrictions.join(', ')}.` : 'No specific dietary restrictions.';

  const formattedAllergies = allergies.length > 0 ? `Food allergies: ${allergies.join(', ')}.` : 'No food allergies.';

  // Format food preferences and dislikes
  const formattedPreferences =
    foodPreferences.length > 0 ? `Food preferences: ${foodPreferences.join(', ')}.` : 'No specific food preferences.';

  const formattedDislikes = dislikedFoods.length > 0 ? `Disliked foods: ${dislikedFoods.join(', ')}.` : 'No specific food dislikes.';

  return `
Create a personalized nutrition plan for ${name}, a ${age}-year-old ${gender.toLowerCase()}.

Physical profile:
- Weight: ${weight} ${weightUnit}
- Height: ${height} ${heightUnit}
- Activity level: ${activityLevel}
- Nutrition goals: ${nutritionGoals}

Dietary information:
- ${formattedRestrictions}
- ${formattedAllergies}
- ${formattedPreferences}
- ${formattedDislikes}
- Meals per day: ${mealsPerDay}
- Cooking skill level: ${cookingSkill}
- Budget level: ${budget}

Please provide a comprehensive nutrition plan including:
1. Daily calorie and macronutrient targets
2. Weekly meal plan with recipes
3. Grocery shopping list
4. Meal prep suggestions
5. Recommended supplements (if appropriate)
6. Tips for adhering to the plan
`.trim();
};

/**
 * Format data for debugging or display purposes
 * @param {Object} data - Any data object to format
 * @returns {string} Formatted data string
 */
export const formatDebugOutput = data => {
  try {
    return JSON.stringify(data, null, 2);
  } catch (error) {
    return `Error formatting data: ${error.message}`;
  }
};
