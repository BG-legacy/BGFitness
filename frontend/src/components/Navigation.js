import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Navigation.css';

const Navigation = () => {
  return (
    <nav className="navigation">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          BGFitness
        </Link>
        <div className="nav-links">
          <Link to="/workout" className="nav-link">
            Workout
          </Link>
          <Link to="/nutrition" className="nav-link">
            Nutrition
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
