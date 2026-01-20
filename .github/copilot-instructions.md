# JobPost Website - Development Instructions

## Project Overview
JobPost is a full-stack web application where workers and employers can meet. The platform enables users to post jobs, search for opportunities, and manage applications.

## Technology Stack
- **Backend**: Node.js with Express.js
- **Frontend**: React with TypeScript
- **Database**: MongoDB
- **Authentication**: JWT-based
- **API**: RESTful

## Project Structure
```
jobpost/
├── backend/          # Express.js server
├── frontend/         # React application
└── README.md         # Project documentation
```

## Setup Instructions

### 1. Backend Setup
- Navigate to `backend/` directory
- Install dependencies: `npm install`
- Configure environment variables in `.env`
- Required: MongoDB connection string, JWT secret, server port

### 2. Frontend Setup
- Navigate to `frontend/` directory
- Install dependencies: `npm install`
- Start development server: `npm start`

### 3. Running the Application
- Backend runs on `http://localhost:5000`
- Frontend runs on `http://localhost:3000`

## Features to Implement
- User authentication (employer/worker)
- Job posting and management
- Job search and filtering
- Job applications
- User profiles
- Application management dashboard

## Development Notes
- Follow RESTful API conventions
- Use environment variables for sensitive data
- Implement proper error handling
- Add input validation
- Use JWT for secure authentication
