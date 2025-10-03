const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Get upload configuration from environment (compatible with validation.js)
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 5242880; // 5MB
const ALLOWED_FILE_TYPES = process.env.ALLOWED_FILE_TYPES?.split(',') || [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/webp',
    'application/pdf',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];
const MAX_FILES_PER_REQUEST = parseInt(process.env.MAX_FILES_PER_REQUEST) || 5;
const UPLOAD_PATH = process.env.UPLOAD_PATH || './uploads';

// Enhanced file type validation
const MIME_TYPE_EXTENSIONS = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/jpg': ['.jpg'],
    'image/webp': ['.webp'],
    'application/pdf': ['.pdf'],
    'text/csv': ['.csv'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
};

// Dangerous file patterns
const DANGEROUS_PATTERNS = [
    /\.\./g,  // Directory traversal
    /[<>:"|?*]/g,  // Invalid filename characters
    /^\./,  // Hidden files starting with dot
    /\.(exe|bat|cmd|scr|pif|com|dll|sh|py|js|php|asp|jsp|htaccess)$/i,  // Executable files
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i  // Windows reserved names
];

// Ensure upload directory exists
const ensureUploadDir = (uploadPath) => {
    try {
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
            console.log(`📁 Created upload directory: ${uploadPath}`);
        }
        
        // Create subdirectories for organization
        const subdirs = ['profiles', 'documents', 'exports', 'temp'];
        subdirs.forEach(subdir => {
            const subdirPath = path.join(uploadPath, subdir);
            if (!fs.existsSync(subdirPath)) {
                fs.mkdirSync(subdirPath, { recursive: true });
            }
        });
        
        // Set proper permissions (755 for directories)
        try {
            fs.chmodSync(uploadPath, 0o755);
        } catch (permError) {
            console.warn('Warning: Could not set directory permissions:', permError.message);
        }
        
    } catch (error) {
        console.error('❌ Error creating upload directory:', error);
        throw new Error(`Failed to create upload directory: ${error.message}`);
    }
};

// Initialize upload directory
try {
    ensureUploadDir(UPLOAD_PATH);
} catch (error) {
    console.error('Failed to initialize upload system:', error);
}

// Enhanced file validation
const validateFileDetails = (file) => {
    const errors = [];
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        errors.push(`File too large: ${Math.ceil(file.size / (1024 * 1024))}MB exceeds ${Math.ceil(MAX_FILE_SIZE / (1024 * 1024))}MB limit`);
    }
    
    // Check MIME type
    if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
        errors.push(`File type not allowed: ${file.mimetype}`);
    }
    
    // Check file extension matches MIME type
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const expectedExtensions = MIME_TYPE_EXTENSIONS[file.mimetype];
    
    if (expectedExtensions && !expectedExtensions.includes(fileExtension)) {
        errors.push(`File extension ${fileExtension} doesn't match MIME type ${file.mimetype}`);
    }
    
    // Check for dangerous patterns in filename
    const filename = file.originalname;
    const dangerousPattern = DANGEROUS_PATTERNS.find(pattern => pattern.test(filename));
    if (dangerousPattern) {
        errors.push(`Filename contains invalid characters or patterns`);
    }
    
    // Check filename length
    if (filename.length > 255) {
        errors.push(`Filename too long (max 255 characters)`);
    }
    
    // Check for null bytes (security risk)
    if (filename.includes('\x00')) {
        errors.push(`Filename contains null bytes`);
    }
    
    return errors;
};

// Enhanced file filter for security
const fileFilter = (req, file, cb) => {
    try {
        const validationErrors = validateFileDetails(file);
        
        if (validationErrors.length > 0) {
            const error = new Error(validationErrors.join('; '));
            error.code = 'INVALID_FILE';
            error.details = validationErrors;
            return cb(error, false);
        }
        
        console.log(`✅ File validation passed: ${file.originalname} (${file.mimetype})`);
        cb(null, true);
        
    } catch (error) {
        console.error('❌ File filter error:', error);
        const filterError = new Error('File validation failed');
        filterError.code = 'VALIDATION_ERROR';
        cb(filterError, false);
    }
};

// Enhanced storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        try {
            let uploadSubDir = 'temp'; // default
            
            // Determine subdirectory based on file type or request context
            if (file.mimetype.startsWith('image/')) {
                uploadSubDir = 'profiles';
            } else if (file.mimetype.includes('pdf') || 
                      file.mimetype.includes('excel') || 
                      file.mimetype.includes('spreadsheet') ||
                      file.mimetype.includes('csv')) {
                uploadSubDir = 'documents';
            } else if (req.path && req.path.includes('export')) {
                uploadSubDir = 'exports';
            }
            
            const fullPath = path.join(UPLOAD_PATH, uploadSubDir);
            
            // Ensure directory exists
            if (!fs.existsSync(fullPath)) {
                ensureUploadDir(fullPath);
            }
            
            console.log(`📁 Upload destination: ${fullPath}`);
            cb(null, fullPath);
            
        } catch (error) {
            console.error('❌ Storage destination error:', error);
            cb(error);
        }
    },
    
    filename: (req, file, cb) => {
        try {
            // Generate secure filename
            const timestamp = Date.now();
            const randomString = crypto.randomBytes(12).toString('hex');
            const userId = req.user?.id || 'anonymous';
            const fileExtension = path.extname(file.originalname).toLowerCase();
            
            // Clean original filename (remove dangerous characters)
            const cleanOriginalName = file.originalname
                .replace(/[^a-zA-Z0-9.-]/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_|_$/g, '')
                .replace(/\.+/g, '.');
            
            // Create secure filename with multiple security layers
            const baseFilename = `${userId}_${timestamp}_${randomString}_${cleanOriginalName}`;
            
            // Ensure filename isn't too long (max 200 chars to leave room for path)
            const maxLength = 200;
            const finalFilename = baseFilename.length > maxLength 
                ? baseFilename.substring(0, maxLength - fileExtension.length) + fileExtension
                : baseFilename;
            
            // Double-check final filename for security
            if (DANGEROUS_PATTERNS.some(pattern => pattern.test(finalFilename))) {
                throw new Error('Generated filename failed security check');
            }
            
            console.log(`📝 Generated secure filename: ${finalFilename}`);
            
            // Store metadata in request for later use
            if (!req.fileMetadata) {
                req.fileMetadata = [];
            }
            
            req.fileMetadata.push({
                originalName: file.originalname,
                secureFilename: finalFilename,
                mimetype: file.mimetype,
                size: file.size,
                uploadedAt: new Date(),
                userId: userId
            });
            
            cb(null, finalFilename);
            
        } catch (error) {
            console.error('❌ Filename generation error:', error);
            cb(error);
        }
    }
});

// Enhanced multer configuration
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: MAX_FILES_PER_REQUEST,
        fields: 20, // Maximum number of non-file fields
        fieldNameSize: 100, // Maximum field name size
        fieldSize: 1024 * 1024, // Maximum field value size (1MB)
        headerPairs: 2000, // Maximum number of header key-value pairs
        parts: 1000 // Maximum number of parts (fields + files)
    }
});

// Enhanced error handling middleware
const handleUploadErrors = (error, req, res, next) => {
    console.error('❌ Upload error details:', error);
    
    // Handle multer-specific errors
    if (error instanceof multer.MulterError) {
        let message = 'File upload error';
        let code = 'UPLOAD_ERROR';
        let statusCode = 400;
        
        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                message = `File too large. Maximum size: ${Math.floor(MAX_FILE_SIZE / (1024 * 1024))}MB`;
                code = 'FILE_TOO_LARGE';
                break;
            case 'LIMIT_FILE_COUNT':
                message = `Too many files. Maximum allowed: ${MAX_FILES_PER_REQUEST}`;
                code = 'TOO_MANY_FILES';
                break;
            case 'LIMIT_UNEXPECTED_FILE':
                message = 'Unexpected file field or too many files';
                code = 'UNEXPECTED_FILE';
                break;
            case 'LIMIT_FIELD_KEY':
                message = 'Field name too long (max 100 characters)';
                code = 'FIELD_NAME_TOO_LONG';
                break;
            case 'LIMIT_FIELD_VALUE':
                message = 'Field value too long (max 1MB)';
                code = 'FIELD_VALUE_TOO_LONG';
                break;
            case 'LIMIT_FIELD_COUNT':
                message = 'Too many fields (max 20)';
                code = 'TOO_MANY_FIELDS';
                break;
            case 'LIMIT_PART_COUNT':
                message = 'Too many parts in multipart form';
                code = 'TOO_MANY_PARTS';
                break;
            default:
                message = `Upload error: ${error.message}`;
        }
        
        return res.status(statusCode).json({
            success: false,
            message,
            code,
            limits: {
                maxFileSize: `${Math.floor(MAX_FILE_SIZE / (1024 * 1024))}MB`,
                maxFiles: MAX_FILES_PER_REQUEST,
                allowedTypes: ALLOWED_FILE_TYPES
            }
        });
    }
    
    // Handle custom file validation errors
    if (error.code === 'INVALID_FILE') {
        return res.status(400).json({
            success: false,
            message: error.message,
            code: error.code,
            details: error.details || [],
            allowedTypes: ALLOWED_FILE_TYPES,
            maxFileSize: `${Math.floor(MAX_FILE_SIZE / (1024 * 1024))}MB`
        });
    }
    
    // Handle other upload-related errors
    if (error.code === 'VALIDATION_ERROR' || error.message.includes('upload') || error.message.includes('file')) {
        return res.status(400).json({
            success: false,
            message: error.message || 'File upload validation failed',
            code: error.code || 'UPLOAD_VALIDATION_ERROR'
        });
    }
    
    // Handle system errors (disk space, permissions, etc.)
    if (error.code === 'ENOSPC') {
        return res.status(507).json({
            success: false,
            message: 'Insufficient storage space',
            code: 'STORAGE_FULL'
        });
    }
    
    if (error.code === 'EACCES' || error.code === 'EPERM') {
        return res.status(500).json({
            success: false,
            message: 'File system permission error',
            code: 'PERMISSION_ERROR'
        });
    }
    
    // Generic error handler
    console.error('❌ Unhandled upload error:', error);
    return res.status(500).json({
        success: false,
        message: 'Internal server error during file upload',
        code: 'UPLOAD_INTERNAL_ERROR',
        ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
};

// File cleanup utility with enhanced security
const cleanupFiles = (filePaths, options = {}) => {
    const { 
        logCleanup = true, 
        ignoreErrors = false,
        securityCheck = true 
    } = options;
    
    if (!Array.isArray(filePaths)) {
        filePaths = [filePaths];
    }
    
    filePaths.forEach(filePath => {
        try {
            if (!filePath || typeof filePath !== 'string') {
                return;
            }
            
            // Security check: ensure file is within upload directory
            if (securityCheck) {
                const resolvedPath = path.resolve(filePath);
                const resolvedUploadPath = path.resolve(UPLOAD_PATH);
                
                if (!resolvedPath.startsWith(resolvedUploadPath)) {
                    console.warn(`Security warning: Attempted to delete file outside upload directory: ${filePath}`);
                    return;
                }
            }
            
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                if (logCleanup) {
                    console.log(`🗑️ Cleaned up file: ${path.basename(filePath)}`);
                }
            }
        } catch (error) {
            const errorMsg = `Error cleaning up file ${filePath}: ${error.message}`;
            if (ignoreErrors) {
                console.warn('⚠️', errorMsg);
            } else {
                console.error('❌', errorMsg);
            }
        }
    });
};

// Enhanced temporary file cleanup
const cleanupTempFiles = () => {
    const tempDir = path.join(UPLOAD_PATH, 'temp');
    const maxAge = parseInt(process.env.TEMP_FILE_MAX_AGE) || 24 * 60 * 60 * 1000; // 24 hours
    
    try {
        if (!fs.existsSync(tempDir)) {
            return;
        }
        
        const files = fs.readdirSync(tempDir);
        let cleanedCount = 0;
        let totalSize = 0;
        
        files.forEach(file => {
            try {
                const filePath = path.join(tempDir, file);
                const stats = fs.statSync(filePath);
                
                // Skip directories
                if (stats.isDirectory()) {
                    return;
                }
                
                const fileAge = Date.now() - stats.mtime.getTime();
                
                if (fileAge > maxAge) {
                    totalSize += stats.size;
                    fs.unlinkSync(filePath);
                    cleanedCount++;
                }
            } catch (fileError) {
                console.warn(`Warning: Could not process temp file ${file}:`, fileError.message);
            }
        });
        
        if (cleanedCount > 0) {
            console.log(`🧹 Cleaned up ${cleanedCount} temporary files (${Math.round(totalSize / 1024)}KB freed)`);
        }
        
    } catch (error) {
        console.error('❌ Error during temp file cleanup:', error);
    }
};

// Upload progress tracking
const trackUploadProgress = (req, res, next) => {
    const startTime = Date.now();
    
    // Add upload metadata to request
    req.uploadStart = startTime;
    req.uploadId = crypto.randomUUID();
    
    // Override res.json to log completion
    const originalJson = res.json;
    res.json = function(data) {
        const duration = Date.now() - startTime;
        const fileCount = req.files ? (Array.isArray(req.files) ? req.files.length : Object.keys(req.files).length) : 0;
        
        if (fileCount > 0) {
            console.log(`📊 Upload completed - ID: ${req.uploadId}, Files: ${fileCount}, Duration: ${duration}ms`);
        }
        
        return originalJson.call(this, data);
    };
    
    next();
};

// Security middleware for upload endpoints
const validateUploadSecurity = (req, res, next) => {
    // Check user authentication
    if (!req.user || !req.user.id) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required for file uploads',
            code: 'AUTH_REQUIRED'
        });
    }
    
    // Check content type for multipart uploads
    const contentType = req.get('Content-Type');
    if (contentType && !contentType.includes('multipart/form-data')) {
        return res.status(400).json({
            success: false,
            message: 'Multipart form data required for file uploads',
            code: 'INVALID_CONTENT_TYPE'
        });
    }
    
    // Rate limiting check (basic implementation)
    const userId = req.user.id;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    const maxUploads = 10; // max 10 uploads per minute per user
    
    if (!req.uploadLimits) {
        req.uploadLimits = new Map();
    }
    
    const userUploads = req.uploadLimits.get(userId) || [];
    const recentUploads = userUploads.filter(timestamp => now - timestamp < windowMs);
    
    if (recentUploads.length >= maxUploads) {
        return res.status(429).json({
            success: false,
            message: 'Upload rate limit exceeded. Please wait before uploading more files.',
            code: 'UPLOAD_RATE_LIMIT'
        });
    }
    
    // Update rate limiting data
    recentUploads.push(now);
    req.uploadLimits.set(userId, recentUploads);
    
    next();
};

// Post-upload validation middleware
const validateUploadedFiles = (req, res, next) => {
    if (!req.files || (Array.isArray(req.files) && req.files.length === 0) || 
        (typeof req.files === 'object' && Object.keys(req.files).length === 0)) {
        return next(); // No files to validate
    }
    
    const files = Array.isArray(req.files) ? req.files : 
                  req.files.length !== undefined ? req.files : 
                  Object.values(req.files).flat();
    
    const validationErrors = [];
    
    files.forEach((file, index) => {
        // Verify file was actually saved
        if (!file.path || !fs.existsSync(file.path)) {
            validationErrors.push(`File ${index + 1}: Upload failed - file not saved`);
            return;
        }
        
        // Verify file size matches what was uploaded
        try {
            const stats = fs.statSync(file.path);
            if (stats.size !== file.size) {
                validationErrors.push(`File ${index + 1}: Size mismatch (uploaded: ${file.size}, saved: ${stats.size})`);
            }
            
            // Additional security: verify file hasn't been modified during upload
            if (stats.size === 0) {
                validationErrors.push(`File ${index + 1}: Empty file detected`);
            }
        } catch (statError) {
            validationErrors.push(`File ${index + 1}: Cannot verify file integrity`);
        }
    });
    
    if (validationErrors.length > 0) {
        // Cleanup failed uploads
        files.forEach(file => {
            if (file.path && fs.existsSync(file.path)) {
                cleanupFiles([file.path], { logCleanup: false, ignoreErrors: true });
            }
        });
        
        return res.status(400).json({
            success: false,
            message: 'File upload validation failed',
            errors: validationErrors,
            code: 'UPLOAD_VALIDATION_FAILED'
        });
    }
    
    next();
};

// Schedule cleanup every hour
setInterval(cleanupTempFiles, 60 * 60 * 1000);

// Initial cleanup on startup
setTimeout(cleanupTempFiles, 5000);

module.exports = {
    // Single file upload configurations
    uploadSingle: (fieldName) => [
        trackUploadProgress,
        validateUploadSecurity,
        upload.single(fieldName),
        validateUploadedFiles,
        handleUploadErrors
    ],
    
    // Multiple files upload configurations
    uploadMultiple: (fieldName, maxCount = MAX_FILES_PER_REQUEST) => [
        trackUploadProgress,
        validateUploadSecurity,
        upload.array(fieldName, maxCount),
        validateUploadedFiles,
        handleUploadErrors
    ],
    
    // Multiple fields with files
    uploadFields: (fields) => [
        trackUploadProgress,
        validateUploadSecurity,
        upload.fields(fields),
        validateUploadedFiles,
        handleUploadErrors
    ],
    
    // Any files upload
    uploadAny: () => [
        trackUploadProgress,
        validateUploadSecurity,
        upload.any(),
        validateUploadedFiles,
        handleUploadErrors
    ],
    
    // Form data only (no files)
    uploadNone: () => [
        upload.none(),
        handleUploadErrors
    ],
    
    // Individual middleware components
    upload,
    handleUploadErrors,
    trackUploadProgress,
    validateUploadSecurity,
    validateUploadedFiles,
    
    // Utilities
    cleanupFiles,
    cleanupTempFiles,
    ensureUploadDir,
    
    // Configuration and info
    config: {
        maxFileSize: MAX_FILE_SIZE,
        maxFileSizeMB: Math.floor(MAX_FILE_SIZE / (1024 * 1024)),
        maxFiles: MAX_FILES_PER_REQUEST,
        allowedTypes: ALLOWED_FILE_TYPES,
        uploadPath: UPLOAD_PATH
    },
    
    // Validation helpers
    validateFileDetails,
    
    // Security helpers
    DANGEROUS_PATTERNS,
    MIME_TYPE_EXTENSIONS
};