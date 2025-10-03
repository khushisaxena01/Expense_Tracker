const User = require('../models/User');
const { 
    generateToken, 
    generateRefreshToken, 
    blacklistToken,
    refreshAccessToken 
} = require('../middleware/authMiddleware');
const crypto = require('crypto');

// Register User with Enhanced Security
exports.registerUser = async (req, res) => {
    try {
        const { fullName, email, password, profileImageUrl } = req.body;
        const clientIP = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('User-Agent') || 'Unknown';

        // Check if user already exists (case-insensitive)
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            // Log potential security issue
            console.warn('Registration attempt with existing email:', {
                email: email.toLowerCase(),
                ip: clientIP,
                timestamp: new Date().toISOString()
            });
            
            return res.status(409).json({ 
                success: false,
                message: "An account with this email already exists" 
            });
        }

        // Create user with enhanced security tracking
        const user = await User.create({
            fullName: fullName.trim(),
            email: email.toLowerCase(),
            password, // Will be hashed by pre-save hook
            profileImageUrl,
            status: 'active',
            role: 'user',
            emailVerified: false,
            dataProcessingConsent: {
                given: true,
                givenAt: new Date(),
                ipAddress: clientIP
            },
            lastActiveAt: new Date()
        });

        // Record initial login history
        await user.recordLogin(clientIP, userAgent, true, {
            country: req.get('CF-IPCountry') || 'Unknown',
            city: 'Unknown',
            timezone: req.get('CF-Timezone') || 'UTC'
        });

        // Generate secure tokens with enhanced payload
        const tokenPayload = {
            id: user._id,
            email: user.email,
            role: user.role
        };

        const accessToken = generateToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);

        // Store refresh token hash in user document
        const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        const decoded = require('jsonwebtoken').decode(refreshToken);
        
        await user.addRefreshToken(
            refreshTokenHash, 
            decoded.jti, 
            new Date(decoded.exp * 1000),
            `${req.get('User-Agent')} - ${clientIP}`
        );

        // Generate email verification token (for future email verification)
        const emailVerificationToken = user.generateEmailVerificationToken();

        res.status(201).json({
            success: true,
            message: "Account created successfully",
            data: {
                user: {
                    id: user._id,
                    fullName: user.fullName,
                    email: user.email,
                    profileImageUrl: user.profileImageUrl,
                    role: user.role,
                    status: user.status,
                    emailVerified: user.emailVerified,
                    createdAt: user.createdAt
                },
                tokens: {
                    accessToken,
                    refreshToken,
                    expiresIn: process.env.JWT_EXPIRES_IN || '1h'
                }
            }
        });

        // Log successful registration
        console.log('User registered successfully:', {
            userId: user._id,
            email: user.email,
            ip: clientIP,
            timestamp: new Date().toISOString()
        });

    } catch (err) {
        console.error('Registration error:', {
            error: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
            timestamp: new Date().toISOString()
        });

        // Handle specific errors
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(e => ({
                field: e.path,
                message: e.message
            }));
            
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors
            });
        }

        res.status(500).json({ 
            success: false,
            message: "Registration failed. Please try again later.",
            ...(process.env.NODE_ENV === 'development' && { error: err.message })
        });
    }
};

// Login User with Enhanced Security
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const clientIP = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('User-Agent') || 'Unknown';

        // Find user and include password for comparison
        const user = await User.findOne({ 
            email: email.toLowerCase(),
            status: { $ne: 'deleted' }
        }).select('+password');

        if (!user) {
            // Record failed login attempt for non-existent user
            console.warn('Login attempt for non-existent user:', {
                email: email.toLowerCase(),
                ip: clientIP,
                timestamp: new Date().toISOString()
            });

            return res.status(401).json({ 
                success: false,
                message: "Invalid credentials" 
            });
        }

        // Check account status
        if (user.status !== 'active') {
            await user.recordLogin(clientIP, userAgent, false);
            
            return res.status(403).json({
                success: false,
                message: user.status === 'suspended' 
                    ? "Account suspended. Contact support." 
                    : "Account inactive. Contact support."
            });
        }

        // Check if account is locked
        if (user.isLocked) {
            const lockTimeRemaining = Math.ceil((user.lockUntil - Date.now()) / (1000 * 60));
            await user.recordLogin(clientIP, userAgent, false);
            
            return res.status(423).json({
                success: false,
                message: `Account temporarily locked. Try again in ${lockTimeRemaining} minutes.`,
                lockTimeRemaining
            });
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            // Record failed login attempt
            await user.recordLogin(clientIP, userAgent, false);
            await user.incLoginAttempts();

            const remainingAttempts = user.attemptsRemaining;
            
            return res.status(401).json({ 
                success: false,
                message: remainingAttempts > 0 
                    ? `Invalid credentials. ${remainingAttempts} attempts remaining.`
                    : "Invalid credentials. Account will be temporarily locked."
            });
        }

        // Check for password reuse (security policy)
        if (await user.isPasswordInHistory(password)) {
            console.warn('Login with previously used password:', {
                userId: user._id,
                email: user.email,
                ip: clientIP
            });
        }

        // Successful login - reset attempts and update tracking
        await user.resetLoginAttempts();
        await user.recordLogin(clientIP, userAgent, true, {
            country: req.get('CF-IPCountry') || 'Unknown',
            city: 'Unknown',
            timezone: req.get('CF-Timezone') || 'UTC'
        });

        // Update last active timestamp
        await user.updateLastActive();

        // Generate secure tokens
        const tokenPayload = {
            id: user._id,
            email: user.email,
            role: user.role
        };

        const accessToken = generateToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);

        // Store refresh token hash
        const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        const decoded = require('jsonwebtoken').decode(refreshToken);
        
        await user.addRefreshToken(
            refreshTokenHash, 
            decoded.jti, 
            new Date(decoded.exp * 1000),
            `${userAgent} - ${clientIP}`
        );

        // Clean response without sensitive data
        const userResponse = user.toJSON();
        delete userResponse.loginAttempts;
        delete userResponse.lockUntil;

        res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                user: userResponse,
                tokens: {
                    accessToken,
                    refreshToken,
                    expiresIn: process.env.JWT_EXPIRES_IN || '1h'
                },
                sessionInfo: {
                    loginTime: new Date(),
                    ipAddress: clientIP,
                    deviceInfo: userAgent.substring(0, 100)
                }
            }
        });

        console.log('User logged in successfully:', {
            userId: user._id,
            email: user.email,
            ip: clientIP,
            timestamp: new Date().toISOString()
        });

    } catch (err) {
        console.error('Login error:', {
            error: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
            timestamp: new Date().toISOString()
        });

        res.status(500).json({ 
            success: false,
            message: "Login failed. Please try again later.",
            ...(process.env.NODE_ENV === 'development' && { error: err.message })
        });
    }
};

// Get User Info with Enhanced Security
exports.getUserInfo = async (req, res) => {
    try {
        const userId = req.user.id;

        // Find user with additional profile data
        const user = await User.findById(userId)
            .select('-password -refreshTokens -twoFactorSecret -resetPasswordToken -emailVerificationToken -passwordHistory')
            .populate('preferences');

        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: "User profile not found" 
            });
        }

        // Check if user is still active
        if (user.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: "Account access restricted"
            });
        }

        // Update last active time
        await user.updateLastActive();

        // Get additional profile statistics
        const profileStats = {
            accountAge: user.accountAge,
            lastLoginDaysAgo: user.lastLogin 
                ? Math.floor((Date.now() - user.lastLogin.getTime()) / (1000 * 60 * 60 * 24))
                : null,
            isActive: user.isActive,
            loginHistoryCount: user.loginHistory.length
        };

        res.status(200).json({
            success: true,
            data: {
                user: user.toJSON(),
                profileStats,
                securityInfo: {
                    twoFactorEnabled: user.twoFactorEnabled,
                    emailVerified: user.emailVerified,
                    lastPasswordChange: user.passwordLastChanged,
                    activeTokens: user.refreshTokens.filter(rt => !rt.isRevoked && rt.expiresAt > new Date()).length
                }
            }
        });

    } catch (err) {
        console.error('Get user info error:', {
            error: err.message,
            userId: req.user?.id,
            timestamp: new Date().toISOString()
        });

        res.status(500).json({ 
            success: false,
            message: "Failed to retrieve user information",
            ...(process.env.NODE_ENV === 'development' && { error: err.message })
        });
    }
};

// Logout User with Enhanced Token Management
exports.logoutUser = async (req, res) => {
    try {
        const token = req.tokenToBlacklist || req.headers.authorization?.split(" ")[1];
        const userId = req.user.id;
        const clientIP = req.ip;

        if (token) {
            // Blacklist the current access token
            blacklistToken(token);

            // Extract JTI to revoke refresh token
            const decoded = require('jsonwebtoken').decode(token);
            if (decoded && decoded.jti) {
                const user = await User.findById(userId);
                if (user) {
                    // Revoke associated refresh token
                    await user.revokeRefreshToken(decoded.jti);
                }
            }
        }

        // Log logout activity
        console.log('User logged out:', {
            userId,
            ip: clientIP,
            timestamp: new Date().toISOString()
        });

        res.status(200).json({
            success: true,
            message: "Logged out successfully",
            data: {
                logoutTime: new Date(),
                message: "All tokens have been invalidated"
            }
        });

    } catch (err) {
        console.error('Logout error:', {
            error: err.message,
            userId: req.user?.id,
            timestamp: new Date().toISOString()
        });

        res.status(500).json({ 
            success: false,
            message: "Logout failed",
            ...(process.env.NODE_ENV === 'development' && { error: err.message })
        });
    }
};

// Logout from all devices
exports.logoutAllDevices = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Revoke all refresh tokens
        await user.revokeAllRefreshTokens();

        // Log security action
        console.log('User logged out from all devices:', {
            userId,
            ip: req.ip,
            timestamp: new Date().toISOString()
        });

        res.status(200).json({
            success: true,
            message: "Logged out from all devices successfully",
            data: {
                logoutTime: new Date(),
                devicesAffected: user.refreshTokens.length
            }
        });

    } catch (err) {
        console.error('Logout all devices error:', err);
        res.status(500).json({
            success: false,
            message: "Failed to logout from all devices",
            ...(process.env.NODE_ENV === 'development' && { error: err.message })
        });
    }
};

// Change Password with Enhanced Security
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;
        const clientIP = req.ip;

        const user = await User.findById(userId).select('+password +passwordHistory');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Verify current password
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                message: "Current password is incorrect"
            });
        }

        // Check if new password was used before
        if (await user.isPasswordInHistory(newPassword)) {
            return res.status(400).json({
                success: false,
                message: "Cannot reuse a previous password"
            });
        }

        // Update password (will be hashed by pre-save hook)
        user.password = newPassword;
        user.passwordLastChanged = new Date();
        
        // Force logout from all devices for security
        await user.revokeAllRefreshTokens();
        
        await user.save();

        // Log security action
        console.log('Password changed:', {
            userId,
            ip: clientIP,
            timestamp: new Date().toISOString()
        });

        res.status(200).json({
            success: true,
            message: "Password changed successfully. Please login again with your new password.",
            data: {
                passwordChangedAt: user.passwordLastChanged,
                logoutRequired: true
            }
        });

    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({
            success: false,
            message: "Failed to change password",
            ...(process.env.NODE_ENV === 'development' && { error: err.message })
        });
    }
};

module.exports = {
    registerUser: exports.registerUser,
    loginUser: exports.loginUser,
    getUserInfo: exports.getUserInfo,
    logoutUser: exports.logoutUser,
    logoutAllDevices: exports.logoutAllDevices,
    changePassword: exports.changePassword
};