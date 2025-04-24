import React from 'react';
import Card from '../../components/Card/Card.js';
import Button from '../../components/Button/Button.js';
import './Home.css';

const Home = () => {
  return (
    <div className="home-container">
      <h1>Welcome to BG Fitness</h1>
      <div className="home-content">
        <Card title="Get Started">
          <p>Start your fitness journey today with our personalized workout plans and nutrition tracking.</p>
          <div className="button-group">
            <Button variant="primary">Create Account</Button>
            <Button variant="outline">Learn More</Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Home;
