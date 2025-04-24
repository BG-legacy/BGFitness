import React, { useState } from 'react';
import { formatFitnessPlanPrompt, formatNutritionPlanPrompt, formatDebugOutput } from '../utils/promptFormatters';
import '../styles/PromptFormatter.css';

const PromptFormatter = () => {
  const [formData, setFormData] = useState({
    name: 'John Doe',
    age: 30,
    gender: 'male',
    weight: 85,
    weightUnit: 'kg',
    height: 180,
    heightUnit: 'cm',
    fitnessLevel: 'Intermediate',
    fitnessGoals: 'Build muscle and improve endurance',
    targetWeight: 80,
    timeFrame: '3 months',
    activityLevel: 'Moderately active',
    nutritionGoals: 'Balanced diet with focus on protein',
    mealsPerDay: 4,
    cookingSkill: 'Intermediate',
    budget: 'Medium',
    healthConditions: ['None'],
    dietaryRestrictions: ['No dairy'],
    allergies: ['Peanuts'],
    foodPreferences: ['Chicken', 'Fish', 'Rice', 'Vegetables'],
    dislikedFoods: ['Mushrooms', 'Olives'],
    equipment: ['Dumbbells', 'Resistance bands', 'Pull-up bar'],
    exercisePreferences: ['Strength training', 'HIIT'],
    availableTime: '45-60 minutes',
  });

  const [promptType, setPromptType] = useState('fitness');
  const [formattedPrompt, setFormattedPrompt] = useState('');

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleListChange = e => {
    const { name, value } = e.target;
    // Split by comma and trim whitespace
    const list = value
      .split(',')
      .map(item => item.trim())
      .filter(item => item !== '');
    setFormData(prev => ({
      ...prev,
      [name]: list,
    }));
  };

  const generatePrompt = () => {
    if (promptType === 'fitness') {
      const prompt = formatFitnessPlanPrompt(formData);
      setFormattedPrompt(prompt);
    } else if (promptType === 'nutrition') {
      const prompt = formatNutritionPlanPrompt(formData);
      setFormattedPrompt(prompt);
    } else if (promptType === 'debug') {
      const debugOutput = formatDebugOutput(formData);
      setFormattedPrompt(debugOutput);
    }
  };

  return (
    <div className="prompt-formatter">
      <h2>AI Prompt Formatter</h2>
      <p>Format your data into structured prompts for AI generation</p>

      <div className="controls">
        <div className="prompt-type-selector">
          <label>Select Prompt Type:</label>
          <div className="button-group">
            <button className={promptType === 'fitness' ? 'active' : ''} onClick={() => setPromptType('fitness')}>
              Fitness Plan
            </button>
            <button className={promptType === 'nutrition' ? 'active' : ''} onClick={() => setPromptType('nutrition')}>
              Nutrition Plan
            </button>
            <button className={promptType === 'debug' ? 'active' : ''} onClick={() => setPromptType('debug')}>
              Debug Output
            </button>
          </div>
        </div>

        <div className="form-container">
          <div className="form-section">
            <h3>Personal Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Name:</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Age:</label>
                <input type="number" name="age" value={formData.age} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Gender:</label>
                <select name="gender" value={formData.gender} onChange={handleChange}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Weight:</label>
                <div className="input-with-unit">
                  <input type="number" name="weight" value={formData.weight} onChange={handleChange} />
                  <select name="weightUnit" value={formData.weightUnit} onChange={handleChange}>
                    <option value="kg">kg</option>
                    <option value="lbs">lbs</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Height:</label>
                <div className="input-with-unit">
                  <input type="number" name="height" value={formData.height} onChange={handleChange} />
                  <select name="heightUnit" value={formData.heightUnit} onChange={handleChange}>
                    <option value="cm">cm</option>
                    <option value="in">in</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Fitness Details</h3>
            <div className="form-group">
              <label>Fitness Level:</label>
              <select name="fitnessLevel" value={formData.fitnessLevel} onChange={handleChange}>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            <div className="form-group">
              <label>Fitness Goals:</label>
              <input type="text" name="fitnessGoals" value={formData.fitnessGoals} onChange={handleChange} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Target Weight:</label>
                <input type="number" name="targetWeight" value={formData.targetWeight} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Time Frame:</label>
                <input type="text" name="timeFrame" value={formData.timeFrame} onChange={handleChange} />
              </div>
            </div>

            <div className="form-group">
              <label>Activity Level:</label>
              <select name="activityLevel" value={formData.activityLevel} onChange={handleChange}>
                <option value="Sedentary">Sedentary</option>
                <option value="Lightly active">Lightly active</option>
                <option value="Moderately active">Moderately active</option>
                <option value="Very active">Very active</option>
                <option value="Extremely active">Extremely active</option>
              </select>
            </div>

            <div className="form-group">
              <label>Available Time for Workouts:</label>
              <input type="text" name="availableTime" value={formData.availableTime} onChange={handleChange} />
            </div>
          </div>

          <div className="form-section">
            <h3>Health & Dietary Information</h3>
            <div className="form-group">
              <label>Health Conditions (comma separated):</label>
              <input type="text" name="healthConditions" value={formData.healthConditions.join(', ')} onChange={handleListChange} />
            </div>

            <div className="form-group">
              <label>Dietary Restrictions (comma separated):</label>
              <input type="text" name="dietaryRestrictions" value={formData.dietaryRestrictions.join(', ')} onChange={handleListChange} />
            </div>

            <div className="form-group">
              <label>Allergies (comma separated):</label>
              <input type="text" name="allergies" value={formData.allergies.join(', ')} onChange={handleListChange} />
            </div>

            <div className="form-group">
              <label>Food Preferences (comma separated):</label>
              <input type="text" name="foodPreferences" value={formData.foodPreferences.join(', ')} onChange={handleListChange} />
            </div>

            <div className="form-group">
              <label>Disliked Foods (comma separated):</label>
              <input type="text" name="dislikedFoods" value={formData.dislikedFoods.join(', ')} onChange={handleListChange} />
            </div>
          </div>

          <div className="form-section">
            <h3>Exercise & Equipment</h3>
            <div className="form-group">
              <label>Available Equipment (comma separated):</label>
              <input type="text" name="equipment" value={formData.equipment.join(', ')} onChange={handleListChange} />
            </div>

            <div className="form-group">
              <label>Exercise Preferences (comma separated):</label>
              <input type="text" name="exercisePreferences" value={formData.exercisePreferences.join(', ')} onChange={handleListChange} />
            </div>
          </div>

          <div className="form-section">
            <h3>Nutrition Details</h3>
            <div className="form-group">
              <label>Nutrition Goals:</label>
              <input type="text" name="nutritionGoals" value={formData.nutritionGoals} onChange={handleChange} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Meals Per Day:</label>
                <select name="mealsPerDay" value={formData.mealsPerDay} onChange={handleChange}>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="6">6</option>
                </select>
              </div>

              <div className="form-group">
                <label>Cooking Skill:</label>
                <select name="cookingSkill" value={formData.cookingSkill} onChange={handleChange}>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              <div className="form-group">
                <label>Budget:</label>
                <select name="budget" value={formData.budget} onChange={handleChange}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="generate-button-container">
          <button className="generate-button" onClick={generatePrompt}>
            Generate Prompt
          </button>
        </div>

        {formattedPrompt && (
          <div className="prompt-output">
            <h3>Formatted {promptType === 'debug' ? 'Debug Output' : 'Prompt'}</h3>
            <pre>{formattedPrompt}</pre>
            <div className="copy-button-container">
              <button className="copy-button" onClick={() => navigator.clipboard.writeText(formattedPrompt)}>
                Copy to Clipboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptFormatter;
