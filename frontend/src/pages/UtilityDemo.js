/**
 * Utility Demo Page Component
 * This page showcases various fitness-related utility tools
 * Features a tabbed interface for switching between different utility components
 */

import React, { useState } from 'react';
import TDEECalculator from '../components/TDEECalculator';
import UnitConverter from '../components/UnitConverter';
import PromptFormatter from '../components/PromptFormatter';
import '../styles/UtilityDemo.css';

const UtilityDemo = () => {
  // State to track the currently active utility tab
  const [activeTab, setActiveTab] = useState('tdee');

  /**
   * Array of available utility tools
   * Each utility has:
   * - id: unique identifier
   * - title: display name
   * - icon: emoji representation
   * - description: detailed explanation
   * - component: React component to render
   */
  const utilities = [
    {
      id: 'tdee',
      title: 'TDEE Calculator',
      icon: '🔥',
      description:
        'Calculate your Total Daily Energy Expenditure (TDEE) - the number of calories you burn each day based on your activity level. Use this to determine your calorie needs for weight loss, maintenance, or gain.',
      component: <TDEECalculator />,
    },
    {
      id: 'converter',
      title: 'Unit Converter',
      icon: '⚖️',
      description:
        'Easily convert between metric and imperial measurements for weight (kg/lbs) and height (cm/ft-in). Perfect for international users who need to switch between measurement systems.',
      component: <UnitConverter />,
    },
    {
      id: 'formatter',
      title: 'AI Prompt Formatter',
      icon: '🤖',
      description:
        'Format your fitness and nutrition data into structured prompts for AI-powered plan generation. Create detailed, personalized inputs that will help generate higher quality results.',
      component: <PromptFormatter />,
    },
  ];

  // Find the currently selected utility
  const currentUtility = utilities.find(utility => utility.id === activeTab);

  return (
    <div className="utility-demo">
      {/* Tab Navigation */}
      <div className="utility-tabs-container">
        <div className="utility-tabs">
          {utilities.map(utility => (
            <button key={utility.id} className={activeTab === utility.id ? 'active' : ''} onClick={() => setActiveTab(utility.id)}>
              <span className="tab-icon">{utility.icon}</span>
              <span className="tab-text">{utility.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Utility Content Area */}
      <div className="utility-content">
        <div className="utility-section">
          {/* Utility Header with Icon and Description */}
          <div className="utility-intro">
            <div className="utility-icon">{currentUtility.icon}</div>
            <h2>{currentUtility.title}</h2>
            <p>{currentUtility.description}</p>
          </div>
          {/* Dynamic Component Rendering */}
          <div className="utility-component">{currentUtility.component}</div>
        </div>
      </div>
    </div>
  );
};

export default UtilityDemo;
