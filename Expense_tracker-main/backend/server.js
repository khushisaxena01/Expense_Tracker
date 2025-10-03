require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const mongoSanitize = require("express-mongo-sanitize");
const hpp = require("hpp");
const slowDown = require("express-slow-down");
const mongoose = require("mongoose");
const path = require("path");


const { connectDB } = require("./config/db");
const { sanitizeInput } = require("./middleware/validation");
const authRoutes = require("./routes/authRoutes");
const incomeRoutes = require("./routes/incomeRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

const app = express();

// Trust proxy settings (for production deployment)
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// Enhanced Security Middlewares
app.use(helmet({
  contentSecurityPolicy: process.env.HELMET_CSP_ENABLED === 'true' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  } : false,
  crossOriginEmbedderPolicy: false,
  // Additional security headers
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));

// Prevent MongoDB Injection
app.use(mongoSanitize({
  replaceWith: '_'
}));

// Prevent HTTP Parameter Pollution
app.use(hpp({
  whitelist: ['page', 'limit', 'sort', 'category', 'source', 'startDate', 'endDate']
}));

// Enhanced Rate limiting
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS === 'true',
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
    });
  }
});

app.use(generalLimiter);

// Enhanced slow down for brute force protection
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: Math.floor((parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100) * 0.5), // Start slowing after 50% of limit
  delayMs: () => 500,
  maxDelayMs: 20000,
  skipSuccessfulRequests: true
});
app.use(speedLimiter);

// Enhanced CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGIN ? 
      process.env.CORS_ORIGIN.split(',') : 
      [process.env.CLIENT_URL || 'http://localhost:3000'];
    
    // Allow requests with no origin (mobile apps, postman, etc.) in development
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      const error = new Error('Not allowed by CORS');
      error.status = 403;
      callback(error);
    }
  },
  credentials: process.env.CORS_CREDENTIALS === 'true',
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type", 
    "Authorization", 
    "X-Requested-With",
    "Accept",
    "Origin",
    "Access-Control-Request-Method",
    "Access-Control-Request-Headers"
  ],
  exposedHeaders: ["X-Total-Count", "X-Page-Count", "X-Rate-Limit-Remaining"],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Body parsing middleware with enhanced security
app.use(express.json({ 
  limit: process.env.MAX_REQUEST_SIZE || '10mb',
  type: 'application/json',
  verify: (req, res, buf) => {
    // Store raw body for webhook verification if needed
    req.rawBody = buf;
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.MAX_REQUEST_SIZE || '10mb',
  parameterLimit: 50
}));

// Global input sanitization (applied after body parsing)
app.use(sanitizeInput);

// Security logging middleware
if (process.env.ENABLE_SECURITY_LOGS === 'true') {
  app.use((req, res, next) => {
    const suspiciousPatterns = [
      /(<script|javascript:|vbscript:|onload=|onerror=)/i,
      /(\$ne|\$gt|\$lt|\$where)/i,
      /(union|select|insert|delete|drop|create|alter)/i
    ];
    
    const checkSuspicious = (obj) => {
      if (typeof obj === 'string') {
        return suspiciousPatterns.some(pattern => pattern.test(obj));
      }
      if (typeof obj === 'object' && obj !== null) {
        return Object.values(obj).some(checkSuspicious);
      }
      return false;
    };
    
    if (checkSuspicious(req.body) || checkSuspicious(req.query)) {
      console.warn('🔒 Suspicious request detected:', {
        ip: req.ip,
        method: req.method,
        url: req.originalUrl,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
    }
    
    next();
  });
}

// Health check endpoint with enhanced monitoring
if (process.env.HEALTH_CHECK_ENABLED === 'true') {
  app.get(process.env.HEALTH_CHECK_PATH || '/health', async (req, res) => {
    const healthCheck = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.API_VERSION || 'v1',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
      }
    };
    
    try {
      // Check database connection
      if (mongoose.connection.readyState === 1) {
        healthCheck.database = 'Connected';
        
        // Optional: Quick database ping
        const dbPing = await mongoose.connection.db.admin().ping();
        healthCheck.databasePing = dbPing.ok === 1 ? 'OK' : 'FAILED';
      } else {
        healthCheck.database = 'Disconnected';
        healthCheck.status = 'DEGRADED';
      }
      
      // Check critical environment variables
      const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];
      const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
      
      if (missingEnvVars.length > 0) {
        healthCheck.status = 'CRITICAL';
        healthCheck.missingEnvVars = missingEnvVars;
      }
      
      const statusCode = healthCheck.status === 'OK' ? 200 : 
                        healthCheck.status === 'DEGRADED' ? 200 : 503;
      
      res.status(statusCode).json(healthCheck);
    } catch (error) {
      healthCheck.status = 'ERROR';
      healthCheck.error = error.message;
      res.status(503).json(healthCheck);
    }
  });
}

// Connect to Database
connectDB();

// API Routes with versioning and enhanced middleware integration
const API_VERSION = process.env.API_VERSION || 'v1';

app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/income`, incomeRoutes);
app.use(`/api/${API_VERSION}/expense`, expenseRoutes);
app.use(`/api/${API_VERSION}/dashboard`, dashboardRoutes);

// Serve static uploads with enhanced security
app.use("/uploads", 
  // Security headers for file serving
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "same-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin" }
  }),
  // Basic authentication check for sensitive files
  (req, res, next) => {
    // You can add logic here to check if user is authenticated for certain file types
    if (req.path.includes('sensitive') || req.path.includes('private')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to sensitive files'
      });
    }
    next();
  },
  express.static(path.join(__dirname, process.env.UPLOAD_PATH || "uploads"), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
      // Set security headers for static files
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      
      // Prevent execution of uploaded files
      if (path.endsWith('.html') || path.endsWith('.js')) {
        res.setHeader('Content-Type', 'text/plain');
      }
    }
  })
);

// API Documentation endpoint
if (process.env.ENABLE_SWAGGER === 'true') {
  app.get(process.env.API_DOCS_PATH || '/api-docs', (req, res) => {
    res.json({ 
      message: 'Expense Tracker API Documentation',
      version: API_VERSION,
      lastUpdated: new Date().toISOString(),
      security: {
        authentication: 'JWT Bearer Token',
        rateLimiting: 'Yes',
        cors: 'Configured',
        inputSanitization: 'Yes'
      },
      endpoints: {
        auth: {
          base: `/api/${API_VERSION}/auth`,
          endpoints: {
            'POST /register': 'User registration',
            'POST /login': 'User login',
            'POST /refresh-token': 'Refresh access token',
            'GET /getUser': 'Get user profile',
            'POST /logout': 'User logout',
            'POST /upload-profile-image': 'Upload profile image'
          }
        },
        income: {
          base: `/api/${API_VERSION}/income`,
          endpoints: {
            'POST /add': 'Add new income',
            'GET /get': 'Get all incomes',
            'PUT /:id': 'Update income',
            'DELETE /:id': 'Delete income',
            'GET /download/excel': 'Download income Excel'
          }
        },
        expense: {
          base: `/api/${API_VERSION}/expense`,
          endpoints: {
            'POST /add': 'Add new expense',
            'GET /get': 'Get all expenses',
            'PUT /:id': 'Update expense',
            'DELETE /:id': 'Delete expense',
            'GET /download/excel': 'Download expense Excel'
          }
        },
        dashboard: {
          base: `/api/${API_VERSION}/dashboard`,
          endpoints: {
            'GET /': 'Get dashboard data',
            'GET /summary': 'Get dashboard summary'
          }
        }
      }
    });
  });
}

// Root endpoint with enhanced API information
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Expense Tracker API',
    status: 'Running',
    version: API_VERSION,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    security: {
      helmet: 'Enabled',
      cors: 'Configured',
      rateLimiting: 'Active',
      inputSanitization: 'Active'
    },
    endpoints: {
      auth: `/api/${API_VERSION}/auth`,
      income: `/api/${API_VERSION}/income`,
      expense: `/api/${API_VERSION}/expense`,
      dashboard: `/api/${API_VERSION}/dashboard`,
      health: process.env.HEALTH_CHECK_PATH || '/health',
      docs: process.env.ENABLE_SWAGGER === 'true' ? (process.env.API_DOCS_PATH || '/api-docs') : null
    }
  });
});

// 404 handler for unknown routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `The requested endpoint ${req.originalUrl} does not exist`,
    availableEndpoints: {
      auth: `/api/${API_VERSION}/auth`,
      income: `/api/${API_VERSION}/income`,
      expense: `/api/${API_VERSION}/expense`,
      dashboard: `/api/${API_VERSION}/dashboard`
    }
  });
});

// Enhanced Global error handler
app.use((error, req, res, next) => {
  // Log error with context
  const errorContext = {
    message: error.message,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    stack: error.stack
  };
  
  console.error('🔥 Global Error Handler:', errorContext);
  
  // Security logging for potential attacks
  if (process.env.ENABLE_SECURITY_LOGS === 'true') {
    const securityErrors = ['ValidationError', 'JsonWebTokenError', 'MongoError'];
    if (securityErrors.includes(error.name) || error.status === 403) {
      console.warn('🔒 Security-related error:', errorContext);
    }
  }
  
  // Handle specific error types
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'Invalid input data',
      details: Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }))
    });
  }
  
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Authentication Error',
      message: 'Invalid token - please log in again'
    });
  }
  
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token Expired',
      message: 'Session expired - please log in again'
    });
  }
  
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'Invalid ID',
      message: 'Invalid resource ID format'
    });
  }
  
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return res.status(409).json({
      success: false,
      error: 'Duplicate Entry',
      message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
    });
  }
  
  if (error.message && error.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      error: 'CORS Error',
      message: 'Cross-origin request not allowed'
    });
  }
  
  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'Payload Too Large',
      message: `Request size exceeds limit of ${process.env.MAX_REQUEST_SIZE || '10mb'}`
    });
  }
  
  // Default error response
  const statusCode = error.status || error.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.status(statusCode).json({
    success: false,
    error: statusCode === 500 ? 'Internal Server Error' : error.name || 'Error',
    message: statusCode === 500 && isProduction ? 
      'Something went wrong on our end' : 
      error.message,
    ...((!isProduction || process.env.VERBOSE_LOGGING === 'true') && { 
      details: error.message,
      stack: error.stack 
    })
  });
});

// Enhanced server startup with comprehensive logging
const PORT = process.env.PORT || 3000;

const startServer = () => {
  const server = app.listen(PORT, () => {
    console.log('\n🚀 ================================');
    console.log(`✅ Expense Tracker API Server`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Server URL: http://localhost:${PORT}/`);
    console.log(`🔗 API Base: http://localhost:${PORT}/api/${API_VERSION}/`);
    console.log(`📊 Version: ${API_VERSION}`);
    
    if (process.env.HEALTH_CHECK_ENABLED === 'true') {
      console.log(`🏥 Health Check: http://localhost:${PORT}${process.env.HEALTH_CHECK_PATH || '/health'}`);
    }
    
    if (process.env.ENABLE_SWAGGER === 'true') {
      console.log(`📚 API Docs: http://localhost:${PORT}${process.env.API_DOCS_PATH || '/api-docs'}`);
    }
    
    console.log(`📁 Uploads: http://localhost:${PORT}/uploads/`);
    console.log('🔐 Security Features:');
    console.log('   • Helmet (Security Headers)');
    console.log('   • CORS Protection');
    console.log('   • Rate Limiting');
    console.log('   • Request Size Limits');
    console.log('   • Input Sanitization');
    console.log('   • MongoDB Injection Prevention');
    console.log('   • Parameter Pollution Prevention');
    console.log('🚀 ================================\n');
  });
  
  // Enhanced graceful shutdown
  const gracefulShutdown = (signal) => {
    console.log(`\n🔄 ${signal} received, initiating graceful shutdown...`);
    
    server.close(() => {
      console.log('✅ HTTP server closed');
      
      mongoose.connection.close(false, () => {
        console.log('✅ MongoDB connection closed');
        console.log('👋 Goodbye!');
        process.exit(0);
      });
    });
    
    // Force close after 30 seconds
    setTimeout(() => {
      console.error('❌ Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);
  };
  
  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
  });
};

startServer();