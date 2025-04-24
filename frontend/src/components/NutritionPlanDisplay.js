import React, { useState } from 'react';
import './NutritionPlanDisplay.css';

const NutritionPlanDisplay = ({ nutritionPlan }) => {
  const [selectedTab, setSelectedTab] = useState('meals');

  if (!nutritionPlan) return null;

  return (
    <div className="nutrition-plan-display">
      <header className="plan-header">
        <h2>{nutritionPlan.title}</h2>
        <p className="plan-description">{nutritionPlan.description}</p>
        {nutritionPlan.dailyCalories && (
          <div className="plan-meta">
            <span className="calories-badge">{nutritionPlan.dailyCalories} calories per day</span>
          </div>
        )}
      </header>

      {nutritionPlan.macros && (
        <div className="macros-overview">
          <div className="macro-item">
            <span className="macro-value">{nutritionPlan.macros.protein}g</span>
            <span className="macro-label">Protein</span>
          </div>
          <div className="macro-item">
            <span className="macro-value">{nutritionPlan.macros.carbs}g</span>
            <span className="macro-label">Carbs</span>
          </div>
          <div className="macro-item">
            <span className="macro-value">{nutritionPlan.macros.fat}g</span>
            <span className="macro-label">Fat</span>
          </div>
          {nutritionPlan.macros.fiber && (
            <div className="macro-item">
              <span className="macro-value">{nutritionPlan.macros.fiber}g</span>
              <span className="macro-label">Fiber</span>
            </div>
          )}
        </div>
      )}

      <div className="nutrition-tabs">
        <button className={`tab-button ${selectedTab === 'meals' ? 'active' : ''}`} onClick={() => setSelectedTab('meals')}>
          Meal Plan
        </button>
        {nutritionPlan.weeklyMealPlan && (
          <button className={`tab-button ${selectedTab === 'weekly' ? 'active' : ''}`} onClick={() => setSelectedTab('weekly')}>
            Weekly Overview
          </button>
        )}
        {nutritionPlan.groceryList && nutritionPlan.groceryList.length > 0 && (
          <button className={`tab-button ${selectedTab === 'grocery' ? 'active' : ''}`} onClick={() => setSelectedTab('grocery')}>
            Grocery List
          </button>
        )}
        {nutritionPlan.hydration && (
          <button className={`tab-button ${selectedTab === 'hydration' ? 'active' : ''}`} onClick={() => setSelectedTab('hydration')}>
            Hydration
          </button>
        )}
        {nutritionPlan.supplementRecommendations && nutritionPlan.supplementRecommendations.length > 0 && (
          <button className={`tab-button ${selectedTab === 'supplements' ? 'active' : ''}`} onClick={() => setSelectedTab('supplements')}>
            Supplements
          </button>
        )}
      </div>

      {selectedTab === 'meals' && nutritionPlan.meals && nutritionPlan.meals.length > 0 && (
        <section className="meals-section">
          <div className="meals-list">
            {nutritionPlan.meals.map((meal, index) => (
              <div className="meal-card" key={index}>
                <div className="meal-header">
                  <h4 className="meal-name">{meal.name}</h4>
                  <div className="meal-meta">
                    <span className="meal-time">{meal.time}</span>
                    {meal.calories && <span className="meal-calories">{meal.calories} calories</span>}
                  </div>
                </div>

                <div className="meal-content">
                  <div className="ingredients-section">
                    <h5>Ingredients</h5>
                    <ul className="ingredients-list">
                      {Array.isArray(meal.ingredients) &&
                        meal.ingredients.length > 0 &&
                        (typeof meal.ingredients[0] === 'string'
                          ? meal.ingredients.map((ingredient, i) => (
                              <li key={i} className="ingredient-item">
                                {ingredient}
                              </li>
                            ))
                          : meal.ingredients.map((ingredient, i) => (
                              <li key={i} className="ingredient-item">
                                <span className="ingredient-name">{ingredient.name}</span>
                                <span className="ingredient-amount">{ingredient.amount}</span>
                                {ingredient.calories && <span className="ingredient-calories">{ingredient.calories} cal</span>}
                              </li>
                            )))}
                    </ul>
                  </div>

                  <div className="instructions-section">
                    {meal.preparationInstructions && (
                      <div className="instruction-group">
                        <h5>Preparation</h5>
                        <p>{meal.preparationInstructions}</p>
                      </div>
                    )}

                    {meal.cookingInstructions && (
                      <div className="instruction-group">
                        <h5>Cooking</h5>
                        <p>{meal.cookingInstructions}</p>
                      </div>
                    )}

                    {meal.instructions && !meal.preparationInstructions && !meal.cookingInstructions && (
                      <div className="instruction-group">
                        <h5>Instructions</h5>
                        <p>{meal.instructions}</p>
                      </div>
                    )}
                  </div>

                  {meal.nutritionalInfo && (
                    <div className="nutrition-details">
                      <h5>Nutrition Facts</h5>
                      <div className="nutrition-facts">
                        <div className="nutrition-fact">
                          <span className="fact-label">Protein</span>
                          <span className="fact-value">{meal.nutritionalInfo.protein}g</span>
                        </div>
                        <div className="nutrition-fact">
                          <span className="fact-label">Carbs</span>
                          <span className="fact-value">{meal.nutritionalInfo.carbs}g</span>
                        </div>
                        <div className="nutrition-fact">
                          <span className="fact-label">Fat</span>
                          <span className="fact-value">{meal.nutritionalInfo.fat}g</span>
                        </div>
                        {meal.nutritionalInfo.fiber && (
                          <div className="nutrition-fact">
                            <span className="fact-label">Fiber</span>
                            <span className="fact-value">{meal.nutritionalInfo.fiber}g</span>
                          </div>
                        )}
                      </div>

                      {meal.nutritionalInfo.vitamins && meal.nutritionalInfo.vitamins.length > 0 && (
                        <div className="vitamins-minerals">
                          <h6>Key Vitamins</h6>
                          <div className="tags">
                            {meal.nutritionalInfo.vitamins.map((vitamin, i) => (
                              <span key={i} className="tag vitamin-tag">
                                {vitamin}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {meal.nutritionalInfo.minerals && meal.nutritionalInfo.minerals.length > 0 && (
                        <div className="vitamins-minerals">
                          <h6>Key Minerals</h6>
                          <div className="tags">
                            {meal.nutritionalInfo.minerals.map((mineral, i) => (
                              <span key={i} className="tag mineral-tag">
                                {mineral}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {selectedTab === 'weekly' && nutritionPlan.weeklyMealPlan && (
        <section className="weekly-plan-section">
          <div className="weekly-grid">
            {Object.entries(nutritionPlan.weeklyMealPlan).map(([day, meals]) => (
              <div className="day-card" key={day}>
                <h4 className="day-name">{day.charAt(0).toUpperCase() + day.slice(1)}</h4>
                <ul className="day-meals">
                  {meals.map((meal, i) => (
                    <li key={i}>{meal}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {selectedTab === 'grocery' && nutritionPlan.groceryList && nutritionPlan.groceryList.length > 0 && (
        <section className="grocery-section">
          <div className="grocery-content">
            <h3>Grocery List</h3>
            <ul className="grocery-list">
              {nutritionPlan.groceryList.map((item, index) => (
                <li key={index} className="grocery-item">
                  <input type="checkbox" id={`grocery-${index}`} />
                  <label htmlFor={`grocery-${index}`}>{item}</label>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {selectedTab === 'hydration' && nutritionPlan.hydration && (
        <section className="hydration-section">
          <div className="hydration-content">
            <h3>Hydration Plan</h3>
            <div className="water-intake">
              <h4>Daily Water Intake</h4>
              <p className="intake-amount">{nutritionPlan.hydration.dailyWaterIntake}</p>
            </div>

            {nutritionPlan.hydration.recommendedDrinks && nutritionPlan.hydration.recommendedDrinks.length > 0 && (
              <div className="recommended-drinks">
                <h4>Recommended Drinks</h4>
                <ul>
                  {nutritionPlan.hydration.recommendedDrinks.map((drink, index) => (
                    <li key={index}>{drink}</li>
                  ))}
                </ul>
              </div>
            )}

            {nutritionPlan.hydration.avoidDrinks && nutritionPlan.hydration.avoidDrinks.length > 0 && (
              <div className="avoid-drinks">
                <h4>Drinks to Avoid</h4>
                <ul>
                  {nutritionPlan.hydration.avoidDrinks.map((drink, index) => (
                    <li key={index}>{drink}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {selectedTab === 'supplements' && nutritionPlan.supplementRecommendations && nutritionPlan.supplementRecommendations.length > 0 && (
        <section className="supplements-section">
          <div className="supplements-content">
            <h3>Supplement Recommendations</h3>
            <ul className="supplements-list">
              {nutritionPlan.supplementRecommendations.map((supplement, index) => (
                <li key={index}>{supplement}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {nutritionPlan.notes && nutritionPlan.notes.length > 0 && (
        <section className="notes-section">
          <h3>Notes</h3>
          <ul className="notes-list">
            {nutritionPlan.notes.map((note, index) => (
              <li key={index}>{note}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default NutritionPlanDisplay;
