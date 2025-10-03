const { body, validationResult, query, param, header } = require('express-validator');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

// ============================================
// ENHANCED VALIDATION MIDDLEWARE
// Integrated with existing auth system
// ============================================

// Sanitize and validate input data
const sanitizeInput = (req, res, next) => {
    // Remove any keys that start with '$' or contain '.'
    req.body = mongoSanitize.sanitize(req.body);
    req.query = mongoSanitize.sanitize(req.query);
    req.params = mongoSanitize.sanitize(req.params);
    
    // XSS protection for string fields
    const sanitizeObject = (obj) => {
        for (let key in obj) {
            if (typeof obj[key] === 'string') {
                obj[key] = xss(obj[key]);
            } else if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                sanitizeObject(obj[key]);
            } else if (Array.isArray(obj[key])) {
                obj[key] = obj[key].map(item => 
                    typeof item === 'string' ? xss(item) : item
                );
            }
        }
    };
    
    sanitizeObject(req.body);
    sanitizeObject(req.query);
    
    next();
};

// Enhanced validation error handler
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: errors.array().map(error => ({
                field: error.path || error.param,
                message: error.msg,
                value: error.value,
                location: error.location
            }))
        });
    }
    next();
};

// ============================================
// RATE LIMITING MIDDLEWARE
// ============================================

// Authentication rate limiting (stricter)
const authRateLimit = rateLimit({
    windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 5,
    message: {
        success: false,
        message: 'Too many authentication attempts from this IP. Please try again later.',
        retryAfter: Math.ceil((parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 900000) / 60000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: 'Too many authentication attempts. Please try again later.',
            retryAfter: Math.ceil((parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 900000) / 60000)
        });
    }
});

// General API rate limiting
const apiRateLimit = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
        success: false,
        message: 'Too many requests from this IP. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS === 'true'
});

// Slow down repeated requests
const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 2, // allow 2 requests per windowMs without delay
    delayMs: () => 500, // add 500ms delay per request after delayAfter
    maxDelayMs: 20000, // maximum delay of 20 seconds
});

// ============================================
// USER AUTHENTICATION VALIDATION
// ============================================

// User Registration Validation (matches your authController)
const validateUserRegistration = [
    body('fullName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Full name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage('Full name can only contain letters, spaces, hyphens, and apostrophes')
        .custom((value) => {
            if (value.trim().length === 0) {
                throw new Error('Full name cannot be empty or just spaces');
            }
            return true;
        }),
    
    body('email')
        .isEmail()
        .normalizeEmail({
            gmail_remove_dots: false,
            gmail_remove_subaddress: false,
            outlookdotcom_remove_subaddress: false,
            yahoo_remove_subaddress: false,
            icloud_remove_subaddress: false
        })
        .withMessage('Please provide a valid email address')
        .isLength({ max: 100 })
        .withMessage('Email must not exceed 100 characters')
        .custom((value) => {
            // Additional email validation
            const domain = value.split('@')[1];
            if (domain && (domain.includes('..') || domain.startsWith('.') || domain.endsWith('.'))) {
                throw new Error('Invalid email domain format');
            }
            return true;
        }),
    
    body('password')
        .isLength({ 
            min: parseInt(process.env.PASSWORD_MIN_LENGTH) || 8, 
            max: 128 
        })
        .withMessage(`Password must be between ${process.env.PASSWORD_MIN_LENGTH || 8} and 128 characters`)
        .custom((value) => {
            const requireSpecial = process.env.PASSWORD_REQUIRE_SPECIAL === 'true';
            
            const checks = {
                lowercase: /[a-z]/.test(value),
                uppercase: /[A-Z]/.test(value),
                number: /\d/.test(value),
                special: requireSpecial ? /[@$!%*?&]/.test(value) : true
            };
            
            const failedChecks = [];
            if (!checks.lowercase) failedChecks.push('one lowercase letter');
            if (!checks.uppercase) failedChecks.push('one uppercase letter');
            if (!checks.number) failedChecks.push('one number');
            if (!checks.special && requireSpecial) failedChecks.push('one special character (@$!%*?&)');
            
            if (failedChecks.length > 0) {
                throw new Error(`Password must contain: ${failedChecks.join(', ')}`);
            }
            
            return true;
        }),
    
    body('profileImageUrl')
        .optional()
        .isURL({
            protocols: ['http', 'https'],
            require_protocol: true,
            require_host: true,
            require_valid_protocol: true
        })
        .withMessage('Profile image must be a valid URL with http or https protocol')
        .isLength({ max: 500 })
        .withMessage('Profile image URL must not exceed 500 characters'),
    
    handleValidationErrors
];

// User Login Validation (matches your authController)
const validateUserLogin = [
    body('email')
        .isEmail()
        .normalizeEmail({
            gmail_remove_dots: false,
            gmail_remove_subaddress: false
        })
        .withMessage('Please provide a valid email address')
        .isLength({ min: 1, max: 100 })
        .withMessage('Email must be between 1 and 100 characters'),
    
    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 1, max: 128 })
        .withMessage('Password must be between 1 and 128 characters')
        .custom((value) => {
            if (typeof value !== 'string') {
                throw new Error('Password must be a string');
            }
            return true;
        }),
    
    handleValidationErrors
];

// ============================================
// EXPENSE VALIDATION (matches your expenseController)
// ============================================

const validateExpense = [
    body('category')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Category must be between 1 and 50 characters')
        .matches(/^[a-zA-Z0-9\s\-_&()]+$/)
        .withMessage('Category can only contain letters, numbers, spaces, hyphens, underscores, and parentheses')
        .custom((value) => {
            if (value.trim().length === 0) {
                throw new Error('Category cannot be empty or just spaces');
            }
            return true;
        }),
    
    body('amount')
        .isFloat({ min: 0.01, max: 999999999.99 })
        .withMessage('Amount must be a positive number between 0.01 and 999,999,999.99')
        .custom((value) => {
            const amount = parseFloat(value);
            const decimalPlaces = (amount.toString().split('.')[1] || '').length;
            if (decimalPlaces > 2) {
                throw new Error('Amount can have maximum 2 decimal places');
            }
            return true;
        }),
    
    body('date')
        .isISO8601()
        .withMessage('Please provide a valid date in ISO format (YYYY-MM-DD)')
        .custom((value) => {
            const date = new Date(value);
            const now = new Date();
            const maxFutureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            const minPastDate = new Date(now.getTime() - 10 * 365 * 24 * 60 * 60 * 1000);
            
            if (date > maxFutureDate) {
                throw new Error('Expense date cannot be more than 7 days in the future');
            }
            if (date < minPastDate) {
                throw new Error('Expense date cannot be more than 10 years in the past');
            }
            return true;
        })
        .toDate(),
    
    body('title')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Title must be between 1 and 100 characters when provided'),
    
    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description must not exceed 500 characters'),
    
    body('icon')
        .optional()
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Icon must be between 1 and 50 characters when provided')
        .matches(/^[a-zA-Z0-9\-_]+$/)
        .withMessage('Icon can only contain letters, numbers, hyphens, and underscores'),
    
    handleValidationErrors
];

// ============================================
// INCOME VALIDATION (matches your incomeController)
// ============================================

const validateIncome = [
    body('source')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Source must be between 1 and 50 characters')
        .matches(/^[a-zA-Z0-9\s\-_&()]+$/)
        .withMessage('Source can only contain letters, numbers, spaces, hyphens, underscores, and parentheses')
        .custom((value) => {
            if (value.trim().length === 0) {
                throw new Error('Source cannot be empty or just spaces');
            }
            return true;
        }),
    
    body('amount')
        .isFloat({ min: 0.01, max: 999999999.99 })
        .withMessage('Amount must be a positive number between 0.01 and 999,999,999.99')
        .custom((value) => {
            const amount = parseFloat(value);
            const decimalPlaces = (amount.toString().split('.')[1] || '').length;
            if (decimalPlaces > 2) {
                throw new Error('Amount can have maximum 2 decimal places');
            }
            return true;
        }),
    
    body('date')
        .isISO8601()
        .withMessage('Please provide a valid date in ISO format (YYYY-MM-DD)')
        .custom((value) => {
            const date = new Date(value);
            const now = new Date();
            const maxFutureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            const minPastDate = new Date(now.getTime() - 10 * 365 * 24 * 60 * 60 * 1000);
            
            if (date > maxFutureDate) {
                throw new Error('Income date cannot be more than 7 days in the future');
            }
            if (date < minPastDate) {
                throw new Error('Income date cannot be more than 10 years in the past');
            }
            return true;
        })
        .toDate(),
    
    body('title')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Title must be between 1 and 100 characters when provided'),
    
    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description must not exceed 500 characters'),
    
    body('icon')
        .optional()
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Icon must be between 1 and 50 characters when provided')
        .matches(/^[a-zA-Z0-9\-_]+$/)
        .withMessage('Icon can only contain letters, numbers, hyphens, and underscores'),
    
    handleValidationErrors
];

// ============================================
// QUERY PARAMETER VALIDATION
// ============================================

const validateQueryParams = [
    query('page')
        .optional()
        .isInt({ min: 1, max: 1000 })
        .withMessage('Page must be a positive integer between 1 and 1000')
        .toInt(),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
        .toInt(),
    
    query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be in valid ISO format (YYYY-MM-DD)')
        .toDate(),
    
    query('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be in valid ISO format (YYYY-MM-DD)')
        .toDate(),
    
    query('category')
        .optional()
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Category filter must be between 1 and 50 characters'),
    
    query('source')
        .optional()
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Source filter must be between 1 and 50 characters'),
    
    handleValidationErrors
];

// ============================================
// MONGODB OBJECTID VALIDATION
// ============================================

const validateObjectId = [
    param('id')
        .isMongoId()
        .withMessage('Invalid ID format - must be a valid MongoDB ObjectID'),
    
    handleValidationErrors
];

// ============================================
// DATE RANGE VALIDATION
// ============================================

const validateDateRange = (req, res, next) => {
    const { startDate, endDate } = req.query;
    
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Check if dates are valid
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format provided'
            });
        }
        
        if (start >= end) {
            return res.status(400).json({
                success: false,
                message: 'Start date must be before end date'
            });
        }
        
        // Limit date range to prevent performance issues
        const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
        if (daysDiff > 365) {
            return res.status(400).json({
                success: false,
                message: 'Date range cannot exceed 365 days'
            });
        }
    }
    
    next();
};

// ============================================
// FILE UPLOAD VALIDATION
// ============================================

const validateFileUpload = (req, res, next) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return next();
    }

    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/jpg,image/webp,application/pdf').split(',');
    const maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 5242880; // 5MB
    const maxFiles = parseInt(process.env.MAX_FILES_PER_REQUEST) || 5;

    const files = Array.isArray(req.files) ? req.files : Object.values(req.files);
    
    if (files.length > maxFiles) {
        return res.status(400).json({
            success: false,
            message: `Maximum ${maxFiles} files allowed per request`
        });
    }

    for (let file of files) {
        if (file.size > maxFileSize) {
            return res.status(400).json({
                success: false,
                message: `File size cannot exceed ${(maxFileSize / (1024 * 1024)).toFixed(1)}MB`
            });
        }

        if (!allowedTypes.includes(file.mimetype)) {
            return res.status(400).json({
                success: false,
                message: `File type ${file.mimetype} not allowed. Allowed types: ${allowedTypes.join(', ')}`
            });
        }
    }

    next();
};

// ============================================
// REQUEST SIZE VALIDATION
// ============================================

const validateRequestSize = (req, res, next) => {
    const maxSize = process.env.MAX_REQUEST_SIZE || '50mb';
    const sizeMatch = maxSize.match(/^(\d+)(mb|kb)$/i);
    
    if (!sizeMatch) {
        return next(); // Skip validation if format is invalid
    }
    
    const sizeNum = parseInt(sizeMatch[1]);
    const unit = sizeMatch[2].toLowerCase();
    const sizeInBytes = unit === 'mb' ? sizeNum * 1024 * 1024 : sizeNum * 1024;
    
    const contentLength = parseInt(req.get('content-length') || '0');
    
    if (contentLength > sizeInBytes) {
        return res.status(413).json({
            success: false,
            message: `Request size cannot exceed ${maxSize}`
        });
    }
    
    next();
};

// ============================================
// SECURITY HEADERS VALIDATION
// ============================================

const validateSecurityHeaders = (req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
        const userAgent = req.get('User-Agent');
        
        if (!userAgent || userAgent.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or missing User-Agent header'
            });
        }
        
        // Block common bot patterns in production
        const suspiciousPatterns = [
            /curl/i,
            /wget/i,
            /python-requests/i,
            /bot/i,
            /crawler/i,
            /spider/i
        ];
        
        if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
    }
    
    next();
};

// ============================================
// CONTENT TYPE VALIDATION
// ============================================

const validateContentType = (expectedType = 'application/json') => {
    return (req, res, next) => {
        // Skip for GET, DELETE, and OPTIONS requests
        if (['GET', 'DELETE', 'OPTIONS'].includes(req.method)) {
            return next();
        }
        
        const contentType = req.get('Content-Type');
        
        if (!contentType) {
            return res.status(400).json({
                success: false,
                message: `Content-Type header is required for ${req.method} requests`
            });
        }
        
        if (!contentType.includes(expectedType)) {
            return res.status(400).json({
                success: false,
                message: `Expected content type: ${expectedType}, received: ${contentType}`
            });
        }
        
        next();
    };
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
    // Core validation middleware
    sanitizeInput,
    handleValidationErrors,
    
    // Rate limiting
    authRateLimit,
    apiRateLimit,
    speedLimiter,
    
    // Authentication validation
    validateUserRegistration,
    validateUserLogin,
    
    // Financial data validation
    validateExpense,
    validateIncome,
    
    // General validation
    validateQueryParams,
    validateObjectId,
    validateDateRange,
    
    // File and request validation
    validateFileUpload,
    validateRequestSize,
    
    // Security validation
    validateSecurityHeaders,
    validateContentType
};