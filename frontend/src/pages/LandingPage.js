/**
 * Landing Page Component
 * This is the entry point of the application that users see when they first visit
 * Features an animated welcome screen with a call-to-action button
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/LandingPage.css';

const LandingPage = () => {
  // Navigation hook for programmatic routing
  const navigate = useNavigate();

  // State to control animation timing
  const [animationComplete, setAnimationComplete] = useState(false);

  /**
   * Effect hook to trigger animation after component mount
   * Sets a timer to mark animation as complete after 500ms
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimationComplete(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  /**
   * Handles the enter button click
   * Navigates the user to the main dashboard
   */
  const handleEnter = () => {
    navigate('/home');
  };

  return (
    <div className="landing-page">
      <div className={`landing-content ${animationComplete ? 'animated' : ''}`}>
        {/* Hero Image Section */}
        <div className="image-container">
          <img
            src="/images/fitness-banner.png"
            alt="BG Fitness"
            className="placeholder-image"
            onError={e => {
              e.target.onerror = null;
              e.target.src = 'https://placehold.co/600x400/000000/FFD700?text=BG+Fitness';
            }}
          />
        </div>

        {/* Tagline Section */}
        <div className="tagline">
          <h2>Transform Your Body. Transform Your Life.</h2>
        </div>

        {/* Call-to-Action Button */}
        <button className="enter-button" onClick={handleEnter} aria-label="Enter BG Fitness">
          Enter
          <span className="button-glow"></span>
        </button>
      </div>
    </div>
  );
};

export default LandingPage;
