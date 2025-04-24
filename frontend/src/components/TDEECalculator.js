import React, { useState, useEffect, useCallback } from 'react';
import { calculateBMR, calculateTDEE, calculateCaloriesByGoal } from '../utils/calculators';
import { convertWeight, feetInchesToCm } from '../utils/unitConverters';
import '../styles/TDEECalculator.css';

const TDEECalculator = () => {
  const [formData, setFormData] = useState({
    weight: 70,
    height: 170,
    age: 30,
    gender: 'male',
    activityLevel: 'moderate',
    goal: 'maintain',
    rate: 0.2,
  });

  const [units, setUnits] = useState({
    weight: 'kg',
    height: 'cm',
  });

  const [heightImperial, setHeightImperial] = useState({
    feet: 5,
    inches: 7,
  });

  const [results, setResults] = useState(null);

  const calculateResults = useCallback(() => {
    const { weight, height, age, gender, activityLevel, goal, rate } = formData;

    // Calculate BMR using the Mifflin-St Jeor Equation
    const bmr = calculateBMR(weight, height, age, gender);

    // Calculate TDEE based on activity level
    const tdee = calculateTDEE(bmr, activityLevel);

    // Calculate target calories based on goal
    const targetCalories = calculateCaloriesByGoal(tdee, goal, rate);

    // Determine macros (simple calculation - can be customized)
    const protein = Math.round((targetCalories * 0.3) / 4); // 30% protein (4 calories per gram)
    const fat = Math.round((targetCalories * 0.3) / 9); // 30% fat (9 calories per gram)
    const carbs = Math.round((targetCalories * 0.4) / 4); // 40% carbs (4 calories per gram)

    setResults({
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      targetCalories: Math.round(targetCalories),
      macros: { protein, fat, carbs },
    });
  }, [formData]);

  // Calculate results when form data changes
  useEffect(() => {
    // Only calculate if we have valid inputs
    if (formData.weight && formData.height && formData.age && formData.weight !== '' && formData.height !== '' && formData.age !== '') {
      calculateResults();
    }
  }, [calculateResults, formData]);

  // Handle unit conversion for height
  useEffect(() => {
    if (units.height === 'ft') {
      // Convert cm to feet/inches when switching to imperial
      const heightInCm = formData.height;
      const totalInches = heightInCm / 2.54;
      const feet = Math.floor(totalInches / 12);
      const inches = Math.round(totalInches % 12);
      setHeightImperial({ feet, inches });
    } else {
      // Convert feet/inches to cm when switching to metric
      const { feet, inches } = heightImperial;
      const heightInCm = feetInchesToCm(feet, inches);
      setFormData(prev => ({ ...prev, height: Math.round(heightInCm) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units.height]); // Only run when unit type changes - intentionally excluding formData.height and heightImperial to prevent infinite loops

  // Handle unit conversion for weight
  useEffect(() => {
    // Skip the initial render
    const newWeight = convertWeight(formData.weight, units.weight === 'kg' ? 'lbs' : 'kg', units.weight);
    setFormData(prev => ({ ...prev, weight: Math.round(newWeight) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units.weight]); // Only run when unit type changes - intentionally excluding formData.weight to prevent infinite loops

  const handleInputChange = e => {
    const { name, value } = e.target;
    // Ensure we're working with a valid number or empty string
    const processedValue = value === '' ? '' : name === 'weight' || name === 'height' || name === 'age' ? Number(value) : value;

    setFormData(prev => ({
      ...prev,
      [name]: processedValue,
    }));
  };

  const handleImperialHeightChange = e => {
    const { name, value } = e.target;
    // Allow empty string or convert to number
    const processedValue = value === '' ? '' : Number(value);

    const newHeightImperial = {
      ...heightImperial,
      [name]: processedValue,
    };
    setHeightImperial(newHeightImperial);

    // Only update height in cm if both feet and inches have valid values
    if (newHeightImperial.feet !== '' && newHeightImperial.inches !== '') {
      const heightInCm = feetInchesToCm(Number(newHeightImperial.feet), Number(newHeightImperial.inches));
      setFormData(prev => ({ ...prev, height: Math.round(heightInCm) }));
    }
  };

  const handleUnitChange = e => {
    const { name, value } = e.target;
    setUnits(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="tdee-calculator">
      <h2>TDEE Calculator</h2>

      <div className="form-section">
        <div className="form-group">
          <label>
            Weight:
            <div className="input-with-unit">
              <input type="number" name="weight" value={formData.weight} onChange={handleInputChange} placeholder="Enter weight" />
              <select name="weight" value={units.weight} onChange={handleUnitChange}>
                <option value="kg">kg</option>
                <option value="lbs">lbs</option>
              </select>
            </div>
          </label>
        </div>

        <div className="form-group">
          <label>Height:</label>
          {units.height === 'cm' ? (
            <div className="input-with-unit">
              <input type="number" name="height" value={formData.height} onChange={handleInputChange} placeholder="Enter height" />
              <select name="height" value={units.height} onChange={handleUnitChange}>
                <option value="cm">cm</option>
                <option value="ft">ft/in</option>
              </select>
            </div>
          ) : (
            <div className="imperial-height">
              <div className="feet-input">
                <input type="number" name="feet" value={heightImperial.feet} onChange={handleImperialHeightChange} placeholder="Feet" />
                <span>ft</span>
              </div>
              <div className="inches-input">
                <input
                  type="number"
                  name="inches"
                  value={heightImperial.inches}
                  onChange={handleImperialHeightChange}
                  placeholder="Inches"
                />
                <span>in</span>
              </div>
              <select name="height" value={units.height} onChange={handleUnitChange}>
                <option value="cm">cm</option>
                <option value="ft">ft/in</option>
              </select>
            </div>
          )}
        </div>

        <div className="form-group">
          <label>
            Age:
            <input type="number" name="age" value={formData.age} onChange={handleInputChange} placeholder="Enter age" />
          </label>
        </div>

        <div className="form-group">
          <label>
            Gender:
            <select name="gender" value={formData.gender} onChange={handleInputChange}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </label>
        </div>

        <div className="form-group">
          <label>
            Activity Level:
            <select name="activityLevel" value={formData.activityLevel} onChange={handleInputChange}>
              <option value="sedentary">Sedentary (little or no exercise)</option>
              <option value="light">Light (exercise 1-3 days/week)</option>
              <option value="moderate">Moderate (exercise 3-5 days/week)</option>
              <option value="active">Active (exercise 6-7 days/week)</option>
              <option value="very">Very Active (intense exercise daily)</option>
            </select>
          </label>
        </div>

        <div className="form-group">
          <label>
            Goal:
            <select name="goal" value={formData.goal} onChange={handleInputChange}>
              <option value="lose">Lose Weight</option>
              <option value="maintain">Maintain Weight</option>
              <option value="gain">Gain Weight</option>
            </select>
          </label>
        </div>

        {formData.goal !== 'maintain' && (
          <div className="form-group">
            <label>
              Rate:
              <select name="rate" value={formData.rate} onChange={handleInputChange}>
                <option value="0.1">Slow (10% deficit/surplus)</option>
                <option value="0.2">Moderate (20% deficit/surplus)</option>
                <option value="0.3">Aggressive (30% deficit/surplus)</option>
              </select>
            </label>
          </div>
        )}
      </div>

      {results && (
        <div className="results-section">
          <h3>Your Results</h3>
          <div className="result-card">
            <div className="result-item">
              <h4>BMR:</h4>
              <p>{results.bmr} calories/day</p>
              <small>Calories your body needs at complete rest</small>
            </div>

            <div className="result-item">
              <h4>TDEE:</h4>
              <p>{results.tdee} calories/day</p>
              <small>Total calories burned daily with activity</small>
            </div>

            <div className="result-item highlight">
              <h4>{formData.goal === 'maintain' ? 'Maintenance' : formData.goal === 'lose' ? 'Weight Loss' : 'Weight Gain'} Calories:</h4>
              <p>{results.targetCalories} calories/day</p>
              <small>Daily calorie target to {formData.goal} weight</small>
            </div>
          </div>

          <div className="macros-section">
            <h4>Recommended Macronutrients:</h4>
            <div className="macro-container">
              <div className="macro-item">
                <div className="macro-circle protein">
                  <span>{results.macros.protein}g</span>
                </div>
                <p>Protein</p>
              </div>
              <div className="macro-item">
                <div className="macro-circle fat">
                  <span>{results.macros.fat}g</span>
                </div>
                <p>Fat</p>
              </div>
              <div className="macro-item">
                <div className="macro-circle carbs">
                  <span>{results.macros.carbs}g</span>
                </div>
                <p>Carbs</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TDEECalculator;
