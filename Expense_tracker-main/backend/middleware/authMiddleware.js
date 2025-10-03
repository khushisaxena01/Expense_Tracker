const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

// Token blacklist - In production, use Redis or database
const tokenBlacklist = new Set();
const refreshTokens = new Map();

// Enhanced JWT secret management
const getCurrentJWTSecret = () => {
    return process.env.JWT_SECRET || '3de45819a68860e577acbd9d2b28fa6f5e8672755afd5f43e3ef1ae15b67d809';
};

const getRefreshSecret = () => {
    return process.env.JWT_REFRESH_SECRET || '7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c_refresh_token_secret';
};

// Generate Access Token with enhanced security
const generateToken = (payload) => {
    const tokenPayload = {
        id: payload.id,
        email: payload.email,
        role: payload.role || 'user',
        tokenType: 'access',
        iat: Math.floor(Date.now() / 1000),
        jti: crypto.randomUUID()
    };
    
    return jwt.sign(
        tokenPayload,
        getCurrentJWTSecret(),
        {
            expiresIn: process.env.JWT_EXPIRES_IN || '1h',
            issuer: process.env.JWT_ISSUER || 'expense-tracker',
            audience: process.env.JWT_AUDIENCE || 'expense-tracker-users'
        }
    );
};

// Generate Refresh Token with enhanced security
const generateRefreshToken = (payload) => {
    const tokenPayload = {
        id: payload.id,
        email: payload.email,
        tokenType: 'refresh',
        iat: Math.floor(Date.now() / 1000),
        jti: crypto.randomUUID()
    };
    
    const refreshToken = jwt.sign(
        tokenPayload,
        getRefreshSecret(),
        {
            expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
            issuer: process.env.JWT_ISSUER || 'expense-tracker',
            audience: process.env.JWT_AUDIENCE || 'expense-tracker-users'
        }
    );
    
    // Store refresh token info
    refreshTokens.set(tokenPayload.jti, {
        userId: payload.id,
        email: payload.email,
        createdAt: new Date(),
        lastUsed: new Date()
    });
    
    return refreshToken;
};

// Enhanced token blacklisting
const blacklistToken = (token) => {
    if (token) {
        tokenBlacklist.add(token);
        
        // Extract JTI for refresh token cleanup
        try {
            const decoded = jwt.decode(token);
            if (decoded && decoded.jti) {
                refreshTokens.delete(decoded.jti);
            }
        } catch (error) {
            // Token already invalid, just add to blacklist
        }
        
        // Cleanup old tokens (production should use Redis with TTL)
        if (tokenBlacklist.size > 10000) {
            const tokensArray = Array.from(tokenBlacklist);
            const tokensToKeep = tokensArray.slice(-5000);
            tokenBlacklist.clear();
            tokensToKeep.forEach(t => tokenBlacklist.add(t));
        }
    }
};

// Check if token is blacklisted
const isTokenBlacklisted = (token) => {
    return tokenBlacklist.has(token);
};

// Enhanced authentication middleware
const authenticateToken = async (req, res, next) => {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token is required'
            });
        }
        
        // Check if token is blacklisted
        if (isTokenBlacklisted(token)) {
            return res.status(401).json({
                success: false,
                message: 'Token has been revoked'
            });
        }
        
        // Verify token
        const decoded = jwt.verify(token, getCurrentJWTSecret(), {
            issuer: process.env.JWT_ISSUER || 'expense-tracker',
            audience: process.env.JWT_AUDIENCE || 'expense-tracker-users'
        });
        
        // Verify token type
        if (decoded.tokenType !== 'access') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token type'
            });
        }
        
        // Verify user still exists and is active
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            // Blacklist invalid token
            blacklistToken(token);
            return res.status(401).json({
                success: false,
                message: 'User no longer exists'
            });
        }
        
        if (user.status && user.status !== 'active') {
            return res.status(401).json({
                success: false,
                message: 'Account has been deactivated'
            });
        }
        
        // Check if account is locked (compatible with validation system)
        if (user.lockUntil && user.lockUntil > Date.now()) {
            const lockTimeRemaining = Math.ceil((user.lockUntil - Date.now()) / (1000 * 60));
            return res.status(423).json({
                success: false,
                message: `Account is temporarily locked. Try again in ${lockTimeRemaining} minutes.`
            });
        }
        
        // Add user info to request (compatible format)
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role || 'user',
            tokenId: decoded.jti,
            fullName: user.fullName,
            profileImageUrl: user.profileImageUrl
        };
        
        // Store token for potential blacklisting
        req.token = token;
        
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token format'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token has expired. Please login again.'
            });
        }
        
        if (error.name === 'NotBeforeError') {
            return res.status(401).json({
                success: false,
                message: 'Token not active yet'
            });
        }
        
        return res.status(500).json({
            success: false,
            message: 'Authentication failed',
            ...(process.env.NODE_ENV === 'development' && { error: error.message })
        });
    }
};

// Refresh token endpoint handler
const refreshAccessToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token is required'
            });
        }
        
        // Check if refresh token is blacklisted
        if (isTokenBlacklisted(refreshToken)) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token has been revoked'
            });
        }
        
        // Verify refresh token
        const decoded = jwt.verify(refreshToken, getRefreshSecret(), {
            issuer: process.env.JWT_ISSUER || 'expense-tracker',
            audience: process.env.JWT_AUDIENCE || 'expense-tracker-users'
        });
        
        // Verify token type
        if (decoded.tokenType !== 'refresh') {
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token type'
            });
        }
        
        // Check if refresh token exists in our store
        const tokenInfo = refreshTokens.get(decoded.jti);
        if (!tokenInfo) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token not found or expired'
            });
        }
        
        // Verify user still exists and is active
        const user = await User.findById(decoded.id).select('-password');
        if (!user || (user.status && user.status !== 'active')) {
            // Blacklist the refresh token
            blacklistToken(refreshToken);
            refreshTokens.delete(decoded.jti);
            return res.status(401).json({
                success: false,
                message: 'User no longer exists or account is inactive'
            });
        }
        
        // Generate new tokens
        const newAccessToken = generateToken({
            id: user._id,
            email: user.email,
            role: user.role
        });
        
        const newRefreshToken = generateRefreshToken({
            id: user._id,
            email: user.email
        });
        
        // Blacklist old refresh token
        blacklistToken(refreshToken);
        refreshTokens.delete(decoded.jti);
        
        // Update last used time
        const newTokenInfo = refreshTokens.get(jwt.decode(newRefreshToken).jti);
        if (newTokenInfo) {
            newTokenInfo.lastUsed = new Date();
        }
        
        res.status(200).json({
            success: true,
            message: 'Token refreshed successfully',
            token: newAccessToken,
            refreshToken: newRefreshToken,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role
            }
        });
        
    } catch (error) {
        console.error('Token refresh error:', error);
        
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired refresh token'
            });
        }
        
        return res.status(500).json({
            success: false,
            message: 'Token refresh failed',
            ...(process.env.NODE_ENV === 'development' && { error: error.message })
        });
    }
};

// Role-based authorization middleware
const requireRole = (roles) => {
    return (req, res, next) => {
        const userRole = req.user?.role || 'user';
        
        // Convert single role to array
        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required role(s): ${allowedRoles.join(', ')}`
            });
        }
        
        next();
    };
};

// Admin only middleware
const requireAdmin = requireRole(['admin', 'super-admin']);

// Enhanced security middleware for sensitive operations
const requireSecureContext = (req, res, next) => {
    // Check for HTTPS in production
    if (process.env.NODE_ENV === 'production' && !req.secure && !req.headers['x-forwarded-proto']?.includes('https')) {
        return res.status(403).json({
            success: false,
            message: 'HTTPS required for this operation'
        });
    }
    
    // Additional security checks
    const userAgent = req.get('User-Agent');
    if (!userAgent || userAgent.length < 10) {
        return res.status(400).json({
            success: false,
            message: 'Invalid request'
        });
    }
    
    next();
};

// Token validation for logout
const validateTokenForLogout = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res.status(400).json({
            success: false,
            message: 'No token provided for logout'
        });
    }
    
    // Store token for blacklisting
    req.tokenToBlacklist = token;
    next();
};

// Cleanup expired tokens (should be called periodically)
const cleanupExpiredTokens = () => {
    const now = Date.now();
    let cleanedCount = 0;
    
    // Clean up refresh tokens older than their expiry
    const refreshExpiry = parseInt(process.env.JWT_REFRESH_EXPIRES_IN?.replace(/\D/g, '') || '7') * 24 * 60 * 60 * 1000;
    
    for (const [jti, tokenInfo] of refreshTokens.entries()) {
        if (now - tokenInfo.createdAt.getTime() > refreshExpiry) {
            refreshTokens.delete(jti);
            cleanedCount++;
        }
    }
    
    if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} expired refresh tokens`);
    }
    
    // Clean up blacklisted tokens (basic cleanup - in production use Redis TTL)
    if (tokenBlacklist.size > 20000) {
        const tokensArray = Array.from(tokenBlacklist);
        const tokensToKeep = tokensArray.slice(-10000);
        tokenBlacklist.clear();
        tokensToKeep.forEach(t => tokenBlacklist.add(t));
    }
};

// Schedule cleanup every hour
setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

// Get token info (for debugging/admin purposes)
const getTokenInfo = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
        try {
            const decoded = jwt.decode(token);
            req.tokenInfo = {
                jti: decoded.jti,
                issuedAt: new Date(decoded.iat * 1000),
                expiresAt: new Date(decoded.exp * 1000),
                tokenType: decoded.tokenType
            };
        } catch (error) {
            // Invalid token format, but don't fail here
            req.tokenInfo = null;
        }
    }
    next();
};

module.exports = {
    generateToken,
    generateRefreshToken,
    blacklistToken,
    isTokenBlacklisted,
    authenticateToken,
    refreshAccessToken,
    requireRole,
    requireAdmin,
    requireSecureContext,
    validateTokenForLogout,
    getTokenInfo,
    cleanupExpiredTokens
};