/**
 * Nutrition Plan Component
 * This component handles the generation of personalized nutrition plans
 * Features a form for user input and displays the generated meal plan
 */

import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';
import useForm from '../hooks/useForm';
import FormInput from './FormInput';
import ErrorMessage from './ErrorMessage';
import NutritionPlanDisplay from './NutritionPlanDisplay';
import ExportButton from './ExportButton';
import '../styles/NutritionPlanDisplay.css';

const NutritionPlan = () => {
  // API hook for making requests and handling responses
  const { data, loading, error, fetchData } = useApi();
  const [validationErrors, setValidationErrors] = useState({});

  // Form state management using custom hook
  const { formData, handleChange } = useForm({
    weight: '70',
    height: '170',
    age: '30',
    goal: '',
    activityLevel: '',
    dietaryRestrictions: [],
  });

  /**
   * Validates form data against backend requirements
   * @returns {boolean} Whether the form data is valid
   */
  const validateForm = () => {
    const errors = {};
    const weight = parseFloat(formData.weight);
    const height = parseFloat(formData.height);
    const age = parseInt(formData.age, 10);

    if (isNaN(weight) || weight < 30 || weight > 300) {
      errors.weight = 'Weight must be between 30 and 300 kg';
    }

    if (isNaN(height) || height < 100 || height > 250) {
      errors.height = 'Height must be between 100 and 250 cm';
    }

    if (isNaN(age) || age < 18 || age > 100) {
      errors.age = 'Age must be between 18 and 100';
    }

    if (!formData.goal) {
      errors.goal = 'Goal is required';
    }

    if (!formData.activityLevel) {
      errors.activityLevel = 'Activity level is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handles form submission
   * Makes API request to generate nutrition plan
   * @param {Event} e - Form submission event
   */
  const handleSubmit = async e => {
    e.preventDefault();

    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    try {
      // Convert string values to numbers for validation
      const processedData = {
        ...formData,
        weight: parseFloat(formData.weight),
        height: parseFloat(formData.height),
        age: parseInt(formData.age, 10),
      };

      await fetchData('/nutrition', 'POST', processedData);
    } catch (err) {
      console.error('Error generating nutrition plan:', err);
    }
  };

  // Goal options for the select input
  const goalOptions = [
    { value: 'weight_loss', label: 'Weight Loss' },
    { value: 'muscle_gain', label: 'Muscle Gain' },
    { value: 'maintenance', label: 'Maintenance' },
  ];

  // Activity level options for the select input
  const activityOptions = [
    { value: 'sedentary', label: 'Sedentary' },
    { value: 'light', label: 'Light' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'active', label: 'Active' },
    { value: 'very_active', label: 'Very Active' },
  ];

  return (
    <div className="nutrition-plan">
      <h2>Generate Nutrition Plan</h2>

      {/* Nutrition Plan Generation Form */}
      <form onSubmit={handleSubmit}>
        {/* Weight Input */}
        <FormInput
          label="Weight (kg)"
          type="number"
          name="weight"
          value={formData.weight}
          onChange={handleChange}
          placeholder="Enter weight"
          required
        />

        {/* Height Input */}
        <FormInput
          label="Height (cm)"
          type="number"
          name="height"
          value={formData.height}
          onChange={handleChange}
          placeholder="Enter height"
          required
        />

        {/* Age Input */}
        <FormInput
          label="Age"
          type="number"
          name="age"
          value={formData.age}
          onChange={handleChange}
          placeholder="Enter age (18-100)"
          required
          error={validationErrors.age}
          min={18}
          max={100}
        />

        {/* Goal Selection */}
        <FormInput
          label="Goal"
          type="select"
          name="goal"
          value={formData.goal}
          onChange={handleChange}
          options={goalOptions}
          required
          error={validationErrors.goal}
        />

        {/* Activity Level Selection */}
        <FormInput
          label="Activity Level"
          type="select"
          name="activityLevel"
          value={formData.activityLevel}
          onChange={handleChange}
          options={activityOptions}
          required
          error={validationErrors.activityLevel}
        />

        {/* Submit Button */}
        <button type="submit" disabled={loading}>
          {loading ? 'Generating...' : 'Generate Plan'}
        </button>
      </form>

      {/* Error Message Display */}
      <ErrorMessage message={error} onRetry={handleSubmit} />

      {/* Generated Nutrition Plan Display */}
      {data && (
        <div className="nutrition-plan-result">
          <h3>Your Nutrition Plan</h3>
          <NutritionPlanDisplay nutritionPlan={data} />
          {data && <ExportButton data={data} type="nutrition" filename="nutrition-plan" />}
        </div>
      )}
    </div>
  );
};

export default NutritionPlan;
