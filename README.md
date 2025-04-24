# BGFitness

A modern fitness application that helps users track their workouts, manage their fitness goals, and stay motivated on their fitness journey.

## Project Overview

BGFitness is a full-stack web application built with a modern tech stack, featuring a React frontend and Node.js/Express backend. The application provides users with tools to track their fitness progress, set goals, and maintain a healthy lifestyle.

## Tech Stack

### Frontend
- React 19.1.0
- React Router DOM 7.5.1
- Axios for API calls
- FontAwesome for icons
- TailwindCSS for styling
- jsPDF for PDF generation
- Testing: Jest, React Testing Library

### Backend
- Node.js
- Express.js 4.18.2
- OpenAI API integration
- PDFKit for PDF generation
- Testing: Jest, Supertest
- ESLint for code quality

## Project Structure

### Frontend (`/frontend`)
```
frontend/
├── public/          # Static files
├── src/             # Source code
├── .eslintrc.json   # ESLint configuration
├── .prettierrc      # Prettier configuration
└── package.json     # Frontend dependencies
```

### Backend (`/backend`)
```
backend/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middleware/      # Custom middleware
├── routes/          # API routes
├── services/        # Business logic
├── utils/           # Utility functions
├── ai/              # AI-related functionality
├── __tests__/       # Test files
├── app.js           # Express application setup
├── server.js        # Server entry point
└── package.json     # Backend dependencies
```

## Development Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key (for AI features)

### Installation

1. Clone the repository
```bash
git clone [repository-url]
```

2. Install backend dependencies
```bash
cd backend
npm install
```

3. Install frontend dependencies
```bash
cd ../frontend
npm install
```

### Running the Application

1. Start the backend server
```bash
cd backend
npm run dev
```

2. Start the frontend development server
```bash
cd frontend
npm start
```

The application will be available at `http://localhost:3000`

## Testing

### Frontend Testing
```bash
cd frontend
npm test
```

### Backend Testing
```bash
cd backend
npm test
```

## Development Notes

### Key Features
- User authentication and authorization
- Workout tracking and management
- Goal setting and progress monitoring
- PDF report generation
- AI-powered fitness recommendations

### Development Challenges
- Integration of OpenAI API for personalized recommendations
- PDF generation and formatting
- State management across multiple components
- Real-time data synchronization
- Cross-browser compatibility

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Author

Made by Bernard Ginn

## License

This project is licensed under the MIT License - see the LICENSE file for details.