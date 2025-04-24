import React from 'react';
import '../styles/FormInput.css';

const FormInput = ({
  label,
  type = 'text',
  name,
  value,
  onChange,
  error,
  placeholder,
  required = false,
  options,
  isLoading = false,
  min,
  max,
}) => {
  const renderInput = () => {
    switch (type) {
      case 'select':
        return (
          <select
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            className={`form-input ${error ? 'error' : ''}`}
            disabled={isLoading}
          >
            <option value="">Select an option</option>
            {options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      case 'radio':
        return (
          <div className="radio-group">
            {options.map(option => (
              <label key={option.value} className="radio-label">
                <input
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={value === option.value}
                  onChange={onChange}
                  disabled={isLoading}
                />
                {option.label}
              </label>
            ))}
          </div>
        );
      default:
        return (
          <input
            type={type}
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`form-input ${error ? 'error' : ''}`}
            required={required}
            disabled={isLoading}
            min={min}
            max={max}
          />
        );
    }
  };

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={name} className="form-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      {renderInput()}
      {error && <div className="error-message">{error}</div>}
      {isLoading && <div className="loading-spinner" />}
    </div>
  );
};

export default FormInput;
