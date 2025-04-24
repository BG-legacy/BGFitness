import { useState } from 'react';

/**
 * Custom hook for handling form state and changes
 * @param {Object} initialValues - Initial state for form fields
 * @returns {Object} Form state and handlers
 */
const useForm = (initialValues = {}) => {
  const [formData, setFormData] = useState(initialValues);

  // Handle input changes
  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Reset form to initial values
  const resetForm = () => {
    setFormData(initialValues);
  };

  // Set form field values
  const setFieldValue = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return {
    formData,
    handleChange,
    resetForm,
    setFieldValue,
    setFormData,
  };
};

export default useForm;
