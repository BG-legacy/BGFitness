/**
 * Workout Plan Component
 * This component handles the generation of personalized workout plans
 * Features a form for user input and displays the generated plan
 */

import React from 'react';
import { useApi } from '../hooks/useApi';
import useForm from '../hooks/useForm';
import FormInput from './FormInput';
import ErrorMessage from './ErrorMessage';
import WorkoutPlanDisplay from './WorkoutPlanDisplay';
import ExportButton from './ExportButton';
import '../styles/WorkoutPlanDisplay.css';

const WorkoutPlan = () => {
  // API hook for making requests and handling responses
  const { data, loading, error, fetchData } = useApi();

  // Form state management using custom hook
  const { formData, handleChange } = useForm({
    fitnessGoal: '',
    level: '',
    duration: 30,
    equipment: [],
    restrictions: [],
  });

  /**
   * Handles form submission
   * Makes API request to generate workout plan
   * @param {Event} e - Form submission event
   */
  const handleSubmit = async e => {
    e.preventDefault();
    
    // Send the raw form data to preserve exact input values
    try {
      await fetchData('/workout', 'POST', {
        ...formData,
        // Ensure duration is passed as entered by the user
        duration: formData.duration,
        // Preserve the exact fitness level text as entered
        level: formData.level
      });
    } catch (err) {
      console.error('Error generating workout plan:', err);
    }
  };

  // Custom handler for duration to ensure it's stored as entered
  const handleDurationChange = e => {
    const value = e.target.value;
    handleChange({
      target: {
        name: 'duration',
        value: value, // Store as string to preserve exactly what user entered
      },
    });
  };

  // Fitness level options for the select input
  const levelOptions = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
  ];

  return (
    <div className="workout-plan">
      <h2>Generate Workout Plan</h2>

      {/* Workout Plan Generation Form */}
      <form onSubmit={handleSubmit}>
        {/* Fitness Goal Input */}
        <FormInput
          label="Fitness Goal"
          type="text"
          name="fitnessGoal"
          value={formData.fitnessGoal}
          onChange={handleChange}
          placeholder="Enter your fitness goal"
          required
        />

        {/* Fitness Level Selection */}
        <FormInput
          label="Fitness Level"
          type="select"
          name="level"
          value={formData.level}
          onChange={handleChange}
          options={levelOptions}
          required
        />

        {/* Workout Duration Input */}
        <FormInput
          label="Duration (minutes)"
          type="number"
          name="duration"
          value={formData.duration}
          onChange={handleDurationChange}
          placeholder="Enter duration"
          required
        />

        {/* Submit Button */}
        <button type="submit" disabled={loading}>
          {loading ? 'Generating...' : 'Generate Plan'}
        </button>
      </form>

      {/* Error Message Display */}
      <ErrorMessage message={error} onRetry={handleSubmit} />

      {/* Generated Workout Plan Display */}
      {data && (
        <div className="workout-plan-result">
          <h3>Your Workout Plan</h3>
          <WorkoutPlanDisplay workoutPlan={data} />
          {data && <ExportButton data={data} type="workout" filename="workout-plan" />}
        </div>
      )}
    </div>
  );
};

export default WorkoutPlan;
