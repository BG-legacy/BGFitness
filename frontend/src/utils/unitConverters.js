/**
 * Utility functions for unit conversions
 */

/**
 * Convert weight between kg and lbs
 * @param {number} value - The weight value to convert
 * @param {string} from - Source unit ('kg' or 'lbs')
 * @param {string} to - Target unit ('kg' or 'lbs')
 * @returns {number} Converted weight
 */
export const convertWeight = (value, from, to) => {
  if (from === to) return value;

  if (from === 'kg' && to === 'lbs') {
    return value * 2.20462;
  } else if (from === 'lbs' && to === 'kg') {
    return value / 2.20462;
  }

  return value;
};

/**
 * Convert height between cm and inches/feet
 * @param {number} value - Height value to convert
 * @param {string} from - Source unit ('cm' or 'in')
 * @param {string} to - Target unit ('cm' or 'in')
 * @returns {number} Converted height
 */
export const convertHeight = (value, from, to) => {
  if (from === to) return value;

  if (from === 'cm' && to === 'in') {
    return value / 2.54;
  } else if (from === 'in' && to === 'cm') {
    return value * 2.54;
  }

  return value;
};

/**
 * Convert feet and inches to cm
 * @param {number} feet - Feet component of height
 * @param {number} inches - Inches component of height
 * @returns {number} Height in cm
 */
export const feetInchesToCm = (feet, inches) => {
  const totalInches = feet * 12 + inches;
  return totalInches * 2.54;
};

/**
 * Convert cm to feet and inches
 * @param {number} cm - Height in centimeters
 * @returns {Object} Object containing feet and inches
 */
export const cmToFeetInches = cm => {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);

  return { feet, inches };
};

/**
 * Format height for display based on unit
 * @param {number|Object} height - Height value or object {feet, inches}
 * @param {string} unit - Unit for display ('cm' or 'ft')
 * @returns {string} Formatted height string
 */
export const formatHeight = (height, unit) => {
  if (unit === 'cm') {
    return `${Math.round(height)} cm`;
  } else if (unit === 'ft') {
    if (typeof height === 'object' && 'feet' in height && 'inches' in height) {
      return `${height.feet}'${height.inches}"`;
    } else {
      const { feet, inches } = cmToFeetInches(height);
      return `${feet}'${inches}"`;
    }
  }
  return `${height}`;
};

/**
 * Format weight for display based on unit
 * @param {number} weight - Weight value
 * @param {string} unit - Unit for display ('kg' or 'lbs')
 * @returns {string} Formatted weight string
 */
export const formatWeight = (weight, unit) => {
  const roundedWeight = Math.round(weight * 10) / 10; // Round to 1 decimal
  return unit === 'kg' ? `${roundedWeight} kg` : `${roundedWeight} lbs`;
};
