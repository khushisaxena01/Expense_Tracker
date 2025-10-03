# Expense Tracker - Enterprise-Grade Financial Management Platform

A **production-ready financial management system** with **enterprise-level security**, comprehensive authentication, and advanced analytics. Track income, expenses, and financial health with **bank-grade security measures**.

---

##  Features

###  Authentication & Security (Complete)
- **JWT Authentication** with access & refresh tokens
- **Token Management** (blacklisting, rotation, refresh mechanism)
- **Account Security** (lockout after failed attempts, session management)
- **Password Security** (bcrypt hashing, complexity validation, history tracking)
- **Multi-device Logout** support
- **Rate Limiting** (auth-specific & general API)
- **Input Sanitization** (XSS, NoSQL injection prevention)
- **Security Headers** (Helmet.js, CORS, CSP)
- **Audit Logging** (login history, IP tracking, device fingerprinting)

###  Core Backend APIs (Complete)
- **Income Management** (CRUD, filtering, search, Excel export)
- **Expense Management** (CRUD, filtering, search, Excel export)
- **Dashboard Analytics** (financial health, trends, category breakdown)
- **User Management** (profile, preferences, settings)
- **Soft Delete** with audit trails
- **Data Integrity** validation with cryptographic hashing
- **Duplicate Detection** for transactions
- **Budget Alerts** & savings goal tracking

###  Advanced Features (Complete)
- **Monthly/Weekly Trends** analysis
- **Category & Source Breakdown** with aggregations
- **Recurring Income** tracking with auto-calculation
- **Tax Tracking** (taxable income, net amounts)
- **Payment Method** tracking
- **Merchant Information** storage
- **Tags System** for organization
- **Client/Employer** information management

###  Database (Complete)
- **MongoDB** with optimized indexing
- **Enhanced Models** (User, Income, Expense)
- **Field Validation** with security patterns
- **Compound Indexes** for query optimization
- **Virtual Fields** for computed values
- **Pre-save Hooks** for data processing
- **Connection Pooling** & retry logic
- **Graceful Shutdown** handling

###  File Management (Complete)
- **Secure File Upload** (Multer with validation)
- **File Type Validation** & size limits
- **Path Traversal Protection**
- **Automatic Cleanup** of temporary files
- **Excel Export** with enhanced formatting
- **Profile Image Upload** support

---

##  Tech Stack

### Backend (Complete)
- **Runtime:** Node.js v16+
- **Framework:** Express.js 4.19
- **Database:** MongoDB 8.5 (Mongoose ODM)
- **Authentication:** JWT (jsonwebtoken 9.0)
- **Security:** 
  - Helmet.js 7.1
  - express-rate-limit 7.4
  - express-mongo-sanitize 2.2
  - express-validator 7.0
  - hpp 0.2
  - xss 1.0
- **File Processing:** 
  - Multer 1.4
  - XLSX 0.18
- **Password Hashing:** bcryptjs 2.4

### Frontend (In Progress)
- React.js with Vite
- React Router DOM
- Axios for API calls

### AI Service (Planned)
- Python (Flask/FastAPI)
- ML models for forecasting

---

##  Project Structure

```
Expense_Tracker/
├── backend/                    #  Complete
│   ├── config/
│   │   └── db.js              # Enhanced DB connection with retry logic
│   ├── models/
│   │   ├── User.js            # Enhanced with security features
│   │   ├── Expense.js         # With data integrity hashing
│   │   └── Income.js          # Tax tracking & recurring support
│   ├── controllers/
│   │   ├── authController.js  # JWT, refresh tokens, logout
│   │   ├── dashboardController.js  # Analytics & trends
│   │   ├── expenseController.js    # CRUD with budget alerts
│   │   └── incomeController.js     # Tax tracking & goals
│   ├── middleware/
│   │   ├── authMiddleware.js       # JWT validation & refresh
│   │   ├── validation.js           # Input sanitization & validation
│   │   └── uploadMiddleware.js     # Secure file handling
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── dashboardRoutes.js
│   │   ├── expenseRoutes.js
│   │   └── incomeRoutes.js
│   ├── uploads/                    # File storage (profiles, documents, exports)
│   ├── logs/                       # Application logs
│   ├── .env                        # Environment configuration
│   ├── server.js                   # Express app with security middleware
│   └── package.json
├── frontend/                   # 🔄 In Progress
│   ├── src/
│   ├── public/
│   └── package.json
├── ai-service/                 # 📋 Planned
├── package.json                # Root coordinator
└── README.md
```

---

##  Setup & Installation

### Prerequisites
- Node.js >= 16.0.0
- MongoDB Atlas account or local MongoDB
- npm or yarn

### 1. Clone Repository
```bash
git clone https://github.com/khushisaxena01/Expense_Tracker.git
cd Expense_Tracker
```
### 2. Install Dependencies
```bash
# Install all dependencies (root, backend, frontend)
npm run install:all

# Or install individually
npm install           # Root
cd backend && npm install
cd ../frontend && npm install
```
### 3. Backend Configuration
Create backend/.env file:
```
env# Database
MONGO_URI=your_mongodb_connection_string
DB_NAME=expense_tracker

# Server
PORT=3000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
API_VERSION=v1

# JWT Security
JWT_SECRET=your_super_secret_jwt_key
JWT_REFRESH_SECRET=your_refresh_token_secret
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Password Security
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_TIME_MINUTES=30
PASSWORD_MIN_LENGTH=8

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX_REQUESTS=5

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
MAX_FILES_PER_REQUEST=5
```
### 4. Create Required Directories
```
bashmkdir -p backend/logs backend/uploads/profiles backend/uploads/documents backend/uploads/exports backend/uploads/temp
```
### 5. Run Application
```
bash# Development mode (both frontend & backend)
npm run start:dev

# Backend only
npm run server:dev

# Frontend only
npm run client:dev

# Production mode
npm run server:prod
```
### 6. Verify Installation
```
bash# Check backend health
npm run health
# or
curl http://localhost:3000/health
```
--- 

## Security Implementation

### Phase 1: Authentication & Authorization 

- JWT token security (access + refresh tokens)
- Token blacklisting & rotation
- Password hashing with bcrypt (12 rounds)
- Password complexity validation
- Account lockout mechanism
- Input validation & sanitization
- XSS & NoSQL injection prevention

### Phase 2: API Security 

- Rate limiting (general & auth-specific)
- Request slowdown for brute force protection
- CORS configuration
- Security headers (Helmet.js)
- CSRF protection (planned)

### Phase 3: Database Security 

- Connection security (SSL, auth source)
- Error handling without data leaks
- Data integrity hashing
- Soft delete with audit trails
- Field-level encryption (planned)


##  API Endpoints

### Authentication
```
POST   /api/v1/auth/register          # User registration
POST   /api/v1/auth/login             # User login
POST   /api/v1/auth/refresh-token     # Refresh access token
GET    /api/v1/auth/getUser           # Get user profile
POST   /api/v1/auth/logout            # Logout (blacklist token)
POST   /api/v1/auth/logout-all        # Logout from all devices
POST   /api/v1/auth/change-password   # Change password
POST   /api/v1/auth/upload-profile-image  # Upload profile image
```
### Income
```
POST   /api/v1/income/add             # Add income
GET    /api/v1/income/get             # Get all incomes (with filters)
GET    /api/v1/income/:id             # Get single income
PUT    /api/v1/income/:id             # Update income
DELETE /api/v1/income/:id             # Delete income
GET    /api/v1/income/download/excel  # Export to Excel
```
### Expense
```
POST   /api/v1/expense/add            # Add expense
GET    /api/v1/expense/get            # Get all expenses (with filters)
GET    /api/v1/expense/:id            # Get single expense
PUT    /api/v1/expense/:id            # Update expense
DELETE /api/v1/expense/:id            # Delete expense
GET    /api/v1/expense/download/excel # Export to Excel
```
### Dashboard
```
GET    /api/v1/dashboard              # Get dashboard analytics
GET    /api/v1/dashboard/summary      # Get quick summary
System
GET    /health                         # Health check
GET    /api-docs                       # API documentation
```

### Testing
```
bash# Run tests
npm test

# Watch mode
npm run test:watch

# Health check
npm run health
```

## Performance Features

- Parallel Query Execution for dashboard analytics
- MongoDB Aggregation Pipeline for complex queries
- Compound Indexes for optimal query performance
- Lean Queries for reduced memory usage
- Connection Pooling with configurable pool size
- Request Compression with gzip
- Automatic File Cleanup for temporary files


## Security Best Practices Implemented

- Authentication: JWT with short-lived access tokens (1h) and long-lived refresh tokens (7d)
- Password Policy: Minimum 8 characters, requires uppercase, lowercase, number, and special character
- Account Lockout: 5 failed attempts = 30-minute lockout
- Rate Limiting: 100 requests per 15 minutes (general), 5 per 15 minutes (auth)
- Input Validation: All inputs sanitized and validated before processing
- SQL/NoSQL Injection: Prevented via express-mongo-sanitize and validation
- XSS Protection: All user inputs sanitized with xss library
- CORS: Configured to allow only trusted origins
- Security Headers: CSP, HSTS, X-Frame-Options, etc. via Helmet
- Audit Logging: All security events logged with IP and timestamp


## Roadmap

 Completed ✅

- Backend API architecture
- User authentication (JWT)
- Token refresh mechanism
- Account lockout & security
- Income/Expense CRUD operations
- Dashboard analytics
- Data validation & sanitization
- File upload system
- Excel export functionality
- Rate limiting & security headers
- Audit logging
- Database optimization

In Progress 🔄

- React frontend UI
- Dashboard visualizations
- Responsive design

Planned 📋

- CSRF protection middleware
- Field-level encryption for PII
- Email notifications
- Two-factor authentication (2FA)
- AI-powered expense forecasting
- Investment projections
- Anomaly detection
- Admin dashboard
- Mobile app (React Native/PWA)
- Cloud deployment (Azure/AWS)
- CI/CD pipeline
