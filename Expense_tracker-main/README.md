# Expense Tracker

A full-stack expense management system built using the **MERN stack** that enables users to efficiently track their expenses and income, 
view insightful analytics, and manage financial transaction, all within a secure and user-friendly interface.

Key features include **JWT-based authentication**, **protected routes**, **real-time dashboard analytics**, and **image upload support** for transaction records. 
The frontend is crafted with **React.js** and **Tailwind CSS**, while the backend leverages **Node.js**, **Express**, and **MongoDB**, following a clean **MVC architecture**.

## Features

### Backend
User authentication (JWT)
Expense & Income management
File upload functionality
RESTful API endpoints
MongoDB database integration
Secure password hashing

### Frontend
Responsive dashboard with analytics
Interactive charts for financial data
Expense/Income creation and management
User authentication flows (Login/Signup)
Protected routes
Form validation
Image upload for transactions

## Tech Stack

### Frontend
React.js
Vite
Chart.js (for visualizations)
Axios (for API calls)
React Router
Tailwind CSS (or similar utility-first CSS)

### Backend
Node.js
Express.js
MongoDB (with Mongoose)
JSON Web Tokens (JWT)
Multer (for file uploads)
Bcrypt (for password hashing)

## Installation

### Prerequisites
Node.js (v16 or higher)
MongoDB (local or cloud instance)
Git

### Steps
1. Clone the repository:
   
bash
   git clone https://github.com/your-username/expense-tracker.git
   cd expense-tracker
   

2. Install backend dependencies:
   
bash
   cd backend
   npm install
   

3. Install frontend dependencies:
   
bash
   cd ../frontend
   npm install
   

4. Set up environment variables:
   - Create a .env file in the backend folder with:
     
     MONGODB_URI=your_mongodb_connection_string
     JWT_SECRET=your_jwt_secret_key
     PORT=5000
     

## Running the Application

1. Start the backend server:
   
bash
   cd backend
   npm start
   

2. Start the frontend development server:
   
bash
   cd ../frontend
   npm run dev
   

3. Open your browser and navigate to:
   
   http://localhost:3000
   

## Configuration

### Backend Configuration
Database: Update MONGODB_URI in .env
Authentication: Set JWT_SECRET in .env
Port: Change PORT in .env if needed

### Frontend Configuration
API base URL can be modified in src/utils/apiPath.js
Chart configurations can be adjusted in the respective chart components

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/auth/register | POST | User registration |
| /api/auth/login | POST | User login |
| /api/expenses | GET | Get all expenses |
| /api/expenses | POST | Create new expense |
| /api/incomes | GET | Get all incomes |
| /api/incomes | POST | Create new income |
| /api/dashboard | GET | Get dashboard analytics |

(Complete API documentation can be found in the backend/routes directory)
