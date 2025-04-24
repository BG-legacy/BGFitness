/**
 * Main Application Component
 * This file serves as the root component of the React application
 * It handles routing, navigation, and responsive layout management
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import WorkoutPlan from './components/WorkoutPlan';
import NutritionPlan from './components/NutritionPlan';
import UtilityDemo from './pages/UtilityDemo';
import LandingPage from './pages/LandingPage';
import './styles/App.css';

function App() {
  // State management for application navigation and responsive design
  const [activeTab, setActiveTab] = useState('utilities'); // Current active tab in the dashboard
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768); // Mobile device detection
  const [menuOpen, setMenuOpen] = useState(false); // Mobile menu state

  /**
   * Effect hook to handle window resize events
   * Updates mobile detection and closes mobile menu on larger screens
   */
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  /**
   * Toggles the mobile menu open/closed state
   */
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  /**
   * Handles navigation tab changes
   * @param {string} tab - The tab to navigate to
   */
  const handleNavClick = tab => {
    setActiveTab(tab);
    if (isMobile) {
      setMenuOpen(false);
    }
  };

  /**
   * Dashboard Component
   * Renders the main application interface with sidebar navigation and content area
   */
  const Dashboard = () => (
    <div className="App">
      {/* Mobile Header with Menu Toggle */}
      {isMobile && (
        <div className="mobile-header">
          <div className="logo">
            BG<span>Fitness</span>
          </div>
          <button className="menu-toggle" onClick={toggleMenu}>
            <span className={`hamburger ${menuOpen ? 'open' : ''}`}></span>
          </button>
        </div>
      )}

      <div className={`app-container ${menuOpen ? 'menu-open' : ''}`}>
        {/* Sidebar Navigation */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="logo">
              BG<span>Fitness</span>
            </div>
          </div>
          <nav className="side-nav">
            <button className={activeTab === 'workout' ? 'active' : ''} onClick={() => handleNavClick('workout')}>
              <span className="icon">💪</span>
              <span className="text">Workout Plans</span>
            </button>
            <button className={activeTab === 'nutrition' ? 'active' : ''} onClick={() => handleNavClick('nutrition')}>
              <span className="icon">🥗</span>
              <span className="text">Nutrition Plans</span>
            </button>
            <button className={activeTab === 'utilities' ? 'active' : ''} onClick={() => handleNavClick('utilities')}>
              <span className="icon">🛠️</span>
              <span className="text">Utilities</span>
            </button>
          </nav>
          <div className="sidebar-footer">
            <p>© 2025 BGFitness</p>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="main-content">
          <div className="page-header">
            <h1>
              {activeTab === 'workout' && 'Workout Plans'}
              {activeTab === 'nutrition' && 'Nutrition Plans'}
              {activeTab === 'utilities' && 'Fitness Utilities'}
            </h1>
            <p className="subtitle">
              {activeTab === 'workout' && 'Build your perfect workout routine'}
              {activeTab === 'nutrition' && 'Create personalized nutrition plans'}
              {activeTab === 'utilities' && 'Tools to enhance your fitness journey'}
            </p>
          </div>

          {/* Dynamic Content Rendering */}
          <div className="content-container">
            {activeTab === 'workout' && <WorkoutPlan />}
            {activeTab === 'nutrition' && <NutritionPlan />}
            {activeTab === 'utilities' && <UtilityDemo />}
          </div>
        </main>
      </div>
    </div>
  );

  /**
   * Main Router Configuration
   * Defines the application routes and their corresponding components
   */
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/home" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
