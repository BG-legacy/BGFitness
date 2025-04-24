import React, { useState } from 'react';
import { convertWeight, feetInchesToCm, cmToFeetInches, formatHeight, formatWeight } from '../utils/unitConverters';
import '../styles/UnitConverter.css';

const UnitConverter = () => {
  const [weightValues, setWeightValues] = useState({
    kg: 70,
    lbs: 154.3,
  });

  const [heightValues, setHeightValues] = useState({
    cm: 170,
    feet: 5,
    inches: 7,
  });

  const handleWeightChange = e => {
    const { name, value } = e.target;
    const numValue = parseFloat(value) || 0;

    if (name === 'kg') {
      const lbs = convertWeight(numValue, 'kg', 'lbs');
      setWeightValues({
        kg: numValue,
        lbs: parseFloat(lbs.toFixed(1)),
      });
    } else {
      const kg = convertWeight(numValue, 'lbs', 'kg');
      setWeightValues({
        kg: parseFloat(kg.toFixed(1)),
        lbs: numValue,
      });
    }
  };

  const handleHeightCmChange = e => {
    const cm = parseFloat(e.target.value) || 0;
    const { feet, inches } = cmToFeetInches(cm);

    setHeightValues({
      cm,
      feet,
      inches,
    });
  };

  const handleHeightFtInChange = e => {
    const { name, value } = e.target;
    const numValue = parseInt(value) || 0;

    const newValues = {
      ...heightValues,
      [name]: numValue,
    };

    const cm = feetInchesToCm(newValues.feet, newValues.inches);

    setHeightValues({
      ...newValues,
      cm: parseFloat(cm.toFixed(1)),
    });
  };

  return (
    <div className="unit-converter">
      <h2>Unit Converter</h2>

      <div className="converter-section">
        <h3>Weight Converter</h3>
        <div className="converter-row">
          <div className="converter-input">
            <label>Kilograms (kg)</label>
            <input type="number" name="kg" value={weightValues.kg} onChange={handleWeightChange} min="0" step="0.1" />
          </div>

          <div className="converter-equals">=</div>

          <div className="converter-input">
            <label>Pounds (lbs)</label>
            <input type="number" name="lbs" value={weightValues.lbs} onChange={handleWeightChange} min="0" step="0.1" />
          </div>
        </div>

        <div className="formatted-output">
          <p>
            {formatWeight(weightValues.kg, 'kg')} = {formatWeight(weightValues.lbs, 'lbs')}
          </p>
        </div>
      </div>

      <div className="converter-section">
        <h3>Height Converter</h3>
        <div className="converter-row">
          <div className="converter-input">
            <label>Centimeters (cm)</label>
            <input type="number" name="cm" value={heightValues.cm} onChange={handleHeightCmChange} min="0" step="0.1" />
          </div>

          <div className="converter-equals">=</div>

          <div className="converter-imperial">
            <div className="feet-input">
              <label>Feet</label>
              <input type="number" name="feet" value={heightValues.feet} onChange={handleHeightFtInChange} min="0" max="10" />
            </div>

            <div className="inches-input">
              <label>Inches</label>
              <input type="number" name="inches" value={heightValues.inches} onChange={handleHeightFtInChange} min="0" max="11" />
            </div>
          </div>
        </div>

        <div className="formatted-output">
          <p>
            {formatHeight(heightValues.cm, 'cm')} = {formatHeight({ feet: heightValues.feet, inches: heightValues.inches }, 'ft')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default UnitConverter;
