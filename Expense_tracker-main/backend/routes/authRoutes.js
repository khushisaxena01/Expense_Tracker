const express = require("express");
const { 
    authenticateToken, 
    refreshAccessToken,
    validateTokenForLogout 
} = require("../middleware/authMiddleware");
const { 
    uploadSingle, 
    handleUploadErrors,
    config 
} = require("../middleware/uploadMiddleware");
const { 
    validateUserRegistration, 
    validateUserLogin,
    authRateLimit,
    apiRateLimit,
    sanitizeInput,
    validateContentType
} = require("../middleware/validation");

const {
   registerUser,
   loginUser,
   getUserInfo,
   logoutUser
} = require("../controllers/authController");

const router = express.Router();

// User registration with comprehensive validation and rate limiting
router.post("/register", 
    authRateLimit,
    sanitizeInput,
    validateContentType('application/json'),
    validateUserRegistration,
    registerUser
);

// User login with validation and rate limiting
router.post("/login", 
    authRateLimit,
    sanitizeInput,
    validateContentType('application/json'),
    validateUserLogin,
    loginUser
);

// Token refresh endpoint
router.post("/refresh-token",
    authRateLimit,
    sanitizeInput,
    validateContentType('application/json'),
    refreshAccessToken
);

// Get user info (protected route)
router.get("/getUser", 
    apiRateLimit,
    authenticateToken, 
    getUserInfo
);

// User logout (protected route)
router.post("/logout", 
    apiRateLimit,
    authenticateToken,
    validateTokenForLogout,
    logoutUser
);

// Secure profile image upload with comprehensive validation
router.post("/upload-profile-image", 
    apiRateLimit,
    authenticateToken,
    ...uploadSingle('profileImage'),
    (req, res) => {
        if (!req.file) {
            return res.status(400).json({ 
                success: false,
                message: "No file uploaded",
                code: "NO_FILE"
            });
        }
        
        // Generate secure URL
        const baseUrl = process.env.CLIENT_URL || `${req.protocol}://${req.get("host")}`;
        const imageUrl = `${baseUrl}/uploads/profiles/${req.file.filename}`;
        
        res.status(200).json({ 
            success: true,
            message: "Profile image uploaded successfully", 
            data: {
                imageUrl,
                fileInfo: {
                    filename: req.file.filename,
                    originalName: req.file.originalname,
                    size: req.file.size,
                    mimetype: req.file.mimetype,
                    uploadedAt: new Date().toISOString()
                }
            }
        });
    }
);

// Upload any document (receipts, etc.)
router.post("/upload-document",
    apiRateLimit,
    authenticateToken,
    ...uploadSingle('document'),
    (req, res) => {
        if (!req.file) {
            return res.status(400).json({ 
                success: false,
                message: "No document uploaded",
                code: "NO_FILE"
            });
        }
        
        const baseUrl = process.env.CLIENT_URL || `${req.protocol}://${req.get("host")}`;
        const documentUrl = `${baseUrl}/uploads/documents/${req.file.filename}`;
        
        res.status(200).json({ 
            success: true,
            message: "Document uploaded successfully", 
            data: {
                documentUrl,
                fileInfo: {
                    filename: req.file.filename,
                    originalName: req.file.originalname,
                    size: req.file.size,
                    mimetype: req.file.mimetype,
                    category: req.body.category || 'general',
                    uploadedAt: new Date().toISOString()
                }
            }
        });
    }
);

// Get upload configuration info
router.get("/upload-config",
    apiRateLimit,
    authenticateToken,
    (req, res) => {
        res.status(200).json({
            success: true,
            data: {
                maxFileSize: config.maxFileSizeMB + "MB",
                maxFiles: config.maxFiles,
                allowedTypes: config.allowedTypes,
                supportedFormats: {
                    images: ['jpg', 'jpeg', 'png', 'webp'],
                    documents: ['pdf', 'csv', 'xlsx', 'xls']
                }
            }
        });
    }
);

module.exports = router;