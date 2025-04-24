const mockMealPlan = {
  dailyCalories: 2500,
  macros: {
    protein: 150,
    carbs: 300,
    fats: 80
  },
  meals: [
    {
      name: 'Breakfast',
      time: '08:00',
      calories: 600,
      macros: {
        protein: 30,
        carbs: 80,
        fats: 20
      },
      ingredients: ['Oatmeal', 'Banana', 'Almonds'],
      instructions: 'Mix ingredients and enjoy'
    }
  ]
};

const mockWorkoutPlan = {
  title: 'Strength Training Program',
  description: 'A comprehensive strength training program for intermediate lifters',
  duration: '8 weeks',
  schedule: [
    {
      day: 'Monday',
      focus: 'Upper Body',
      exercises: [
        {
          name: 'Bench Press',
          sets: 4,
          reps: 8,
          rest: '90s',
          notes: 'Focus on form'
        }
      ]
    }
  ],
  exercises: [
    {
      name: 'Bench Press',
      type: 'Compound',
      muscleGroup: 'Chest',
      equipment: ['Barbell', 'Bench'],
      instructions: 'Lie on bench, grip bar, lower to chest, press up',
      videoUrl: 'https://example.com/bench-press'
    }
  ]
};

class MockOpenAIService {
  constructor() {
    this.client = {
      chat: {
        completions: {
          create: jest.fn().mockImplementation((params) => {
            const userContent = JSON.parse(params.messages[1].content);
            if (userContent.fitnessGoal) {
              return Promise.resolve({
                choices: [{
                  message: {
                    content: JSON.stringify(mockWorkoutPlan)
                  }
                }]
              });
            }
            return Promise.resolve({
              choices: [{
                message: {
                  content: JSON.stringify(mockMealPlan)
                }
              }]
            });
          })
        }
      }
    };
  }

  sanitizeInput(input) {
    return input;
  }

  async generateResponse(prompt, systemMessage) {
    if (prompt.fitnessGoal) {
      return mockWorkoutPlan;
    }
    return mockMealPlan;
  }
}

module.exports = new MockOpenAIService(); 