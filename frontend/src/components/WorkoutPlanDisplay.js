import React, { useState } from 'react';
import './WorkoutPlanDisplay.css';

const WorkoutPlanDisplay = ({ workoutPlan }) => {
  const [selectedTab, setSelectedTab] = useState('exercises');

  if (!workoutPlan) return null;

  // Format workout duration to preserve exact user input
  const formatDuration = (duration) => {
    if (duration === undefined || duration === null) return '';
    // Display duration exactly as it appears in the data
    return `${duration} minutes`;
  };

  // Format difficulty level to preserve exact user input
  const formatDifficulty = (level) => {
    if (!level) return '';
    // Display level exactly as it appears in the data
    return level;
  };

  return (
    <div className="workout-plan-display">
      <header className="plan-header">
        <h2>{workoutPlan.title}</h2>
        <p className="plan-description">{workoutPlan.description}</p>
        <div className="plan-meta">
          <span className="duration-badge">{formatDuration(workoutPlan.duration)}</span>
          {workoutPlan.difficultyLevel && (
            <span className="difficulty-badge">{formatDifficulty(workoutPlan.difficultyLevel)}</span>
          )}
        </div>
      </header>

      {workoutPlan.schedule && workoutPlan.schedule.length > 0 && (
        <div className="schedule-section">
          <h3>Schedule</h3>
          <div className="schedule-days">
            {workoutPlan.schedule.map((day, index) => (
              <span className="schedule-day" key={index}>
                {day}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="workout-tabs">
        <button className={`tab-button ${selectedTab === 'exercises' ? 'active' : ''}`} onClick={() => setSelectedTab('exercises')}>
          Exercises
        </button>
        {workoutPlan.warmup && workoutPlan.warmup.length > 0 && (
          <button className={`tab-button ${selectedTab === 'warmup' ? 'active' : ''}`} onClick={() => setSelectedTab('warmup')}>
            Warm-up
          </button>
        )}
        {workoutPlan.cooldown && workoutPlan.cooldown.length > 0 && (
          <button className={`tab-button ${selectedTab === 'cooldown' ? 'active' : ''}`} onClick={() => setSelectedTab('cooldown')}>
            Cool-down
          </button>
        )}
        {workoutPlan.progressionPlan && (
          <button className={`tab-button ${selectedTab === 'progression' ? 'active' : ''}`} onClick={() => setSelectedTab('progression')}>
            Progression
          </button>
        )}
      </div>

      {selectedTab === 'exercises' && (
        <section className="exercises-section">
          <div className="exercises-list">
            {workoutPlan.exercises &&
              workoutPlan.exercises.map((exercise, index) => (
                <div className="exercise-card" key={index}>
                  <div className="exercise-header">
                    <h4 className="exercise-name">{exercise.name}</h4>
                    <div className="exercise-metrics">
                      <span className="metric">{exercise.sets} sets</span>
                      <span className="metric">{exercise.reps} reps</span>
                      <span className="metric">{exercise.rest} rest</span>
                      {exercise.tempo && <span className="metric">Tempo: {exercise.tempo}</span>}
                    </div>
                  </div>
                  <p className="exercise-instructions">{exercise.instructions}</p>

                  <div className="exercise-details">
                    {exercise.muscleGroups && exercise.muscleGroups.length > 0 && (
                      <div className="detail-group">
                        <h5>Muscle Groups:</h5>
                        <div className="tags">
                          {exercise.muscleGroups.map((muscle, i) => (
                            <span className="tag muscle-tag" key={i}>
                              {muscle}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {exercise.equipment && exercise.equipment.length > 0 && (
                      <div className="detail-group">
                        <h5>Equipment:</h5>
                        <div className="tags">
                          {exercise.equipment.map((item, i) => (
                            <span className="tag equipment-tag" key={i}>
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {exercise.alternatives && exercise.alternatives.length > 0 && (
                      <div className="detail-group">
                        <h5>Alternatives:</h5>
                        <div className="tags">
                          {exercise.alternatives.map((alt, i) => (
                            <span className="tag alternative-tag" key={i}>
                              {alt}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {exercise.progressionTips && (
                    <div className="progression-tips">
                      <h5>Progression Tips:</h5>
                      <p>{exercise.progressionTips}</p>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </section>
      )}

      {selectedTab === 'warmup' && workoutPlan.warmup && (
        <section className="warmup-section">
          <div className="warmup-exercises">
            {workoutPlan.warmup.map((exercise, index) => (
              <div className="warmup-card" key={index}>
                <h4>{exercise.name}</h4>
                <p>
                  <strong>Duration:</strong> {exercise.duration}
                </p>
                <p>{exercise.instructions}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {selectedTab === 'cooldown' && workoutPlan.cooldown && (
        <section className="cooldown-section">
          <div className="cooldown-exercises">
            {workoutPlan.cooldown.map((exercise, index) => (
              <div className="cooldown-card" key={index}>
                <h4>{exercise.name}</h4>
                <p>
                  <strong>Duration:</strong> {exercise.duration}
                </p>
                <p>{exercise.instructions}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {selectedTab === 'progression' && workoutPlan.progressionPlan && (
        <section className="progression-section">
          <div className="progression-weeks">
            {workoutPlan.progressionPlan.week1 && (
              <div className="progression-week">
                <h4>Week 1</h4>
                <p>{workoutPlan.progressionPlan.week1}</p>
              </div>
            )}
            {workoutPlan.progressionPlan.week2 && (
              <div className="progression-week">
                <h4>Week 2</h4>
                <p>{workoutPlan.progressionPlan.week2}</p>
              </div>
            )}
            {workoutPlan.progressionPlan.week3 && (
              <div className="progression-week">
                <h4>Week 3</h4>
                <p>{workoutPlan.progressionPlan.week3}</p>
              </div>
            )}
            {workoutPlan.progressionPlan.week4 && (
              <div className="progression-week">
                <h4>Week 4</h4>
                <p>{workoutPlan.progressionPlan.week4}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {workoutPlan.notes && workoutPlan.notes.length > 0 && (
        <section className="notes-section">
          <h3>Notes</h3>
          <ul className="notes-list">
            {workoutPlan.notes.map((note, index) => (
              <li key={index}>{note}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default WorkoutPlanDisplay;
