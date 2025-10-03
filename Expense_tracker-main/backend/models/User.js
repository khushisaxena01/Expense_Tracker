const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  // Basic user information (compatible with your validation.js)
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    minlength: [2, 'Full name must be at least 2 characters long'],
    maxlength: [50, 'Full name cannot exceed 50 characters'],
    validate: {
      validator: function(v) {
        return /^[a-zA-Z\s'-]+$/.test(v);
      },
      message: 'Full name can only contain letters, spaces, hyphens, and apostrophes'
    }
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: [100, 'Email cannot exceed 100 characters'],
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please provide a valid email address'
    }
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    maxlength: [128, 'Password cannot exceed 128 characters'],
    select: false // Don't include password in queries by default
  },
  
  // Profile information
  profileImageUrl: {
    type: String,
    maxlength: [500, 'Profile image URL cannot exceed 500 characters'],
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Profile image must be a valid URL'
    }
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [20, 'Phone number cannot exceed 20 characters'],
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^[\d\s\-+()]+$/.test(v);
      },
      message: 'Please enter a valid phone number'
    }
  },
  dateOfBirth: {
    type: Date,
    validate: {
      validator: function(v) {
        if (!v) return true;
        const age = (Date.now() - v.getTime()) / (1000 * 60 * 60 * 24 * 365);
        return age >= 13 && age <= 120;
      },
      message: 'Invalid date of birth'
    }
  },
  
  // Account status and security
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive', 'suspended', 'pending', 'deleted'],
      message: '{VALUE} is not a valid status'
    },
    default: 'active',
    index: true
  },
  role: {
    type: String,
    enum: {
      values: ['user', 'admin', 'super-admin', 'moderator'],
      message: '{VALUE} is not a valid role'
    },
    default: 'user',
    index: true
  },
  
  // Enhanced account lockout mechanism (compatible with your auth middleware)
  loginAttempts: {
    type: Number,
    default: 0,
    min: [0, 'Login attempts cannot be negative'],
    max: [50, 'Login attempts limit exceeded']
  },
  lockUntil: {
    type: Date,
    default: null,
    index: true
  },
  maxLoginAttempts: {
    type: Number,
    default: function() {
      return parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
    }
  },
  lockTime: {
    type: Number,
    default: function() {
      return (parseInt(process.env.LOCKOUT_TIME_MINUTES) || 30) * 60 * 1000;
    }
  },
  
  // Enhanced security tracking
  lastLogin: {
    type: Date,
    default: null
  },
  lastLoginIP: {
    type: String,
    default: null,
    validate: {
      validator: function(v) {
        if (!v) return true;
        // Basic IP validation (IPv4 and IPv6)
        return /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(v);
      },
      message: 'Invalid IP address format'
    }
  },
  loginHistory: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    ip: {
      type: String,
      required: true
    },
    userAgent: {
      type: String,
      maxlength: [500, 'User agent cannot exceed 500 characters']
    },
    success: {
      type: Boolean,
      default: true
    },
    location: {
      country: String,
      city: String,
      timezone: String
    },
    deviceFingerprint: {
      type: String,
      maxlength: [100, 'Device fingerprint cannot exceed 100 characters']
    }
  }],
  
  // Enhanced token management (compatible with your auth middleware)
  refreshTokens: [{
    tokenHash: {
      type: String,
      required: true,
      select: false
    },
    jti: {
      type: String,
      required: true,
      unique: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    deviceInfo: {
      type: String,
      maxlength: [200, 'Device info cannot exceed 200 characters']
    },
    lastUsed: {
      type: Date,
      default: Date.now
    },
    isRevoked: {
      type: Boolean,
      default: false
    }
  }],
  
  // Security features
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    default: null,
    select: false
  },
  backupCodes: [{
    code: {
      type: String,
      select: false
    },
    used: {
      type: Boolean,
      default: false
    },
    usedAt: {
      type: Date,
      default: null
    }
  }],
  
  // Password reset functionality
  resetPasswordToken: {
    type: String,
    default: null,
    select: false
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  },
  passwordHistory: [{
    passwordHash: {
      type: String,
      select: false
    },
    changedAt: {
      type: Date,
      default: Date.now
    }
  }],
  passwordLastChanged: {
    type: Date,
    default: Date.now
  },
  
  // Email verification
  emailVerified: {
    type: Boolean,
    default: false,
    index: true
  },
  emailVerificationToken: {
    type: String,
    default: null,
    select: false
  },
  emailVerificationExpires: {
    type: Date,
    default: null
  },
  
  // Enhanced user preferences (compatible with your .env settings)
  preferences: {
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
      minlength: [3, 'Currency code must be 3 characters'],
      maxlength: [3, 'Currency code must be 3 characters'],
      validate: {
        validator: function(v) {
          return /^[A-Z]{3}$/.test(v);
        },
        message: 'Currency must be a valid 3-letter currency code'
      }
    },
    dateFormat: {
      type: String,
      enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'],
      default: 'DD/MM/YYYY'
    },
    timeFormat: {
      type: String,
      enum: ['12', '24'],
      default: '24'
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    language: {
      type: String,
      default: 'en',
      maxlength: [5, 'Language code cannot exceed 5 characters']
    },
    timezone: {
      type: String,
      default: 'UTC',
      maxlength: [50, 'Timezone cannot exceed 50 characters']
    },
    notifications: {
      email: {
        enabled: {
          type: Boolean,
          default: true
        },
        expenses: {
          type: Boolean,
          default: true
        },
        budgets: {
          type: Boolean,
          default: true
        },
        weeklyReports: {
          type: Boolean,
          default: true
        },
        security: {
          type: Boolean,
          default: true
        }
      },
      push: {
        enabled: {
          type: Boolean,
          default: false
        },
        budgetAlerts: {
          type: Boolean,
          default: true
        },
        expenses: {
          type: Boolean,
          default: false
        }
      },
      sms: {
        enabled: {
          type: Boolean,
          default: false
        },
        security: {
          type: Boolean,
          default: false
        }
      }
    },
    privacy: {
      profileVisible: {
        type: Boolean,
        default: false
      },
      dataSharing: {
        type: Boolean,
        default: false
      },
      analyticsOptOut: {
        type: Boolean,
        default: false
      }
    },
    security: {
      sessionTimeout: {
        type: Number,
        default: 3600000, // 1 hour in milliseconds
        min: [300000, 'Session timeout must be at least 5 minutes'],
        max: [86400000, 'Session timeout cannot exceed 24 hours']
      },
      requirePasswordChange: {
        type: Boolean,
        default: false
      },
      loginNotifications: {
        type: Boolean,
        default: true
      }
    }
  },
  
  // Financial preferences and goals
  monthlyBudget: {
    type: Number,
    default: 0,
    min: [0, 'Monthly budget cannot be negative'],
    max: [999999999.99, 'Monthly budget is too high']
  },
  budgetCategories: [{
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, 'Category name cannot exceed 50 characters']
    },
    budgetAmount: {
      type: Number,
      required: true,
      min: [0, 'Budget amount cannot be negative']
    },
    alertThreshold: {
      type: Number,
      default: 80,
      min: [0, 'Alert threshold cannot be negative'],
      max: [100, 'Alert threshold cannot exceed 100%']
    }
  }],
  savingsGoal: {
    target: {
      type: Number,
      default: 0,
      min: [0, 'Savings target cannot be negative']
    },
    deadline: Date,
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Savings goal description cannot exceed 200 characters']
    },
    achieved: {
      type: Boolean,
      default: false
    },
    achievedAt: {
      type: Date,
      default: null
    }
  },
  
  // Admin and audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  suspendedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  suspendedAt: {
    type: Date,
    default: null
  },
  suspensionReason: {
    type: String,
    maxlength: [500, 'Suspension reason cannot exceed 500 characters'],
    default: null
  },
  adminNotes: [{
    note: {
      type: String,
      required: true,
      maxlength: [1000, 'Admin note cannot exceed 1000 characters']
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    category: {
      type: String,
      enum: ['security', 'support', 'billing', 'other'],
      default: 'other'
    }
  }],
  
  // Data tracking and compliance
  dataProcessingConsent: {
    given: {
      type: Boolean,
      default: false
    },
    givenAt: {
      type: Date,
      default: null
    },
    ipAddress: {
      type: String,
      default: null
    }
  },
  marketingConsent: {
    given: {
      type: Boolean,
      default: false
    },
    givenAt: {
      type: Date,
      default: null
    }
  },
  lastActiveAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Soft delete
  deletedAt: {
    type: Date,
    default: null,
    index: true
  },
  deleteReason: {
    type: String,
    maxlength: [200, 'Delete reason cannot exceed 200 characters']
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      // Remove sensitive fields when converting to JSON
      delete ret.password;
      delete ret.refreshTokens;
      delete ret.twoFactorSecret;
      delete ret.resetPasswordToken;
      delete ret.emailVerificationToken;
      delete ret.passwordHistory;
      delete ret.backupCodes;
      delete ret.__v;
      ret.id = ret._id;
      delete ret._id;
      return ret;
    }
  },
  toObject: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.__v;
      return ret;
    }
  }
});

// Compound indexes for optimal performance
userSchema.index({ email: 1 });
userSchema.index({ status: 1, role: 1 });
userSchema.index({ lockUntil: 1 });
userSchema.index({ lastLogin: -1 });
userSchema.index({ emailVerified: 1, status: 1 });
userSchema.index({ 'refreshTokens.jti': 1 });
userSchema.index({ 'refreshTokens.expiresAt': 1 });
userSchema.index({ lastActiveAt: -1 });
userSchema.index({ deletedAt: 1 });
userSchema.index({ createdAt: -1 });

// Virtual fields
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.virtual('attemptsRemaining').get(function() {
  return Math.max(0, this.maxLoginAttempts - this.loginAttempts);
});

userSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  return Math.floor((Date.now() - this.dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 365));
});

userSchema.virtual('accountAge').get(function() {
  return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24));
});

userSchema.virtual('isActive').get(function() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return this.lastActiveAt > thirtyDaysAgo;
});

// Pre-save middleware for enhanced password security
userSchema.pre('save', async function(next) {
  try {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) return next();
    
    // Get bcrypt rounds from environment
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    
    // Store old password hash for history
    if (!this.isNew && this.password) {
      this.passwordHistory.push({
        passwordHash: this.password,
        changedAt: new Date()
      });
      
      // Keep only last 5 passwords
      if (this.passwordHistory.length > 5) {
        this.passwordHistory = this.passwordHistory.slice(-5);
      }
    }
    
    // Hash new password
    this.password = await bcrypt.hash(this.password, saltRounds);
    this.passwordLastChanged = new Date();
    
    next();
  } catch (error) {
    next(error);
  }
});

// Enhanced password comparison method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Check password against history to prevent reuse
userSchema.methods.isPasswordInHistory = async function(candidatePassword) {
  if (!this.passwordHistory || this.passwordHistory.length === 0) return false;
  
  for (const historicPassword of this.passwordHistory) {
    const isMatch = await bcrypt.compare(candidatePassword, historicPassword.passwordHash);
    if (isMatch) return true;
  }
  return false;
};

// Enhanced failed login attempts handling
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock the account if we've reached max attempts and it's not locked already
  if (this.loginAttempts + 1 >= this.maxLoginAttempts && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + this.lockTime };
  }
  
  return this.updateOne(updates);
};

// Reset login attempts after successful login
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: {
      loginAttempts: 1,
      lockUntil: 1
    }
  });
};

// Enhanced refresh token management
userSchema.methods.addRefreshToken = function(tokenHash, jti, expiresAt, deviceInfo = '') {
  this.refreshTokens.push({
    tokenHash: tokenHash,
    jti: jti,
    expiresAt: expiresAt,
    deviceInfo: deviceInfo,
    lastUsed: new Date()
  });
  
  // Keep only the last 5 refresh tokens per user
  if (this.refreshTokens.length > 5) {
    this.refreshTokens = this.refreshTokens.slice(-5);
  }
  
  return this.save();
};

userSchema.methods.removeRefreshToken = function(jti) {
  this.refreshTokens = this.refreshTokens.filter(rt => rt.jti !== jti);
  return this.save();
};

userSchema.methods.revokeRefreshToken = function(jti) {
  const token = this.refreshTokens.find(rt => rt.jti === jti);
  if (token) {
    token.isRevoked = true;
  }
  return this.save();
};

userSchema.methods.revokeAllRefreshTokens = function() {
  this.refreshTokens.forEach(token => {
    token.isRevoked = true;
  });
  return this.save();
};

// Enhanced login history tracking
userSchema.methods.recordLogin = function(ip, userAgent, success = true, location = {}) {
  // Generate device fingerprint
  const deviceFingerprint = crypto.createHash('md5')
    .update(`${ip}:${userAgent}`)
    .digest('hex')
    .substring(0, 16);
  
  this.loginHistory.push({
    timestamp: new Date(),
    ip: ip,
    userAgent: userAgent,
    success: success,
    location: location,
    deviceFingerprint: deviceFingerprint
  });
  
  // Keep only the last 50 login records
  if (this.loginHistory.length > 50) {
    this.loginHistory = this.loginHistory.slice(-50);
  }
  
  // Update last login info if successful
  if (success) {
    this.lastLogin = new Date();
    this.lastLoginIP = ip;
    this.lastActiveAt = new Date();
  }
  
  return this.save();
};

// Token generation methods
userSchema.methods.generateEmailVerificationToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  
  this.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
  this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  return token; // Return unhashed token for email
};

userSchema.methods.generatePasswordResetToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  
  this.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
  this.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  
  return token; // Return unhashed token for email
};

// Two-factor authentication methods
userSchema.methods.generateTwoFactorSecret = function() {
  const secret = crypto.randomBytes(20).toString('hex');
  this.twoFactorSecret = secret;
  return secret;
};

userSchema.methods.generateBackupCodes = function() {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
  }
  
  this.backupCodes = codes.map(code => ({
    code: crypto.createHash('sha256').update(code).digest('hex')
  }));
  
  return codes; // Return unhashed codes for user
};

userSchema.methods.verifyBackupCode = function(code) {
  const hashedCode = crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
  const backupCode = this.backupCodes.find(bc => bc.code === hashedCode && !bc.used);
  
  if (backupCode) {
    backupCode.used = true;
    backupCode.usedAt = new Date();
    return true;
  }
  
  return false;
};

// Account management methods
userSchema.methods.suspend = function(reason, suspendedBy) {
  this.status = 'suspended';
  this.suspendedAt = new Date();
  this.suspensionReason = reason;
  this.suspendedBy = suspendedBy;
  
  // Revoke all refresh tokens
  this.revokeAllRefreshTokens();
  
  return this.save();
};

userSchema.methods.reactivate = function() {
  this.status = 'active';
  this.suspendedAt = null;
  this.suspensionReason = null;
  this.suspendedBy = null;
  return this.save();
};

userSchema.methods.softDelete = function(reason = 'User requested') {
  this.status = 'deleted';
  this.deletedAt = new Date();
  this.deleteReason = reason;
  
  // Revoke all refresh tokens
  this.revokeAllRefreshTokens();
  
  return this.save();
};

userSchema.methods.addAdminNote = function(note, addedBy, category = 'other') {
  this.adminNotes.push({
    note: note,
    addedBy: addedBy,
    addedAt: new Date(),
    category: category
  });
  
  // Keep only last 20 admin notes
  if (this.adminNotes.length > 20) {
    this.adminNotes = this.adminNotes.slice(-20);
  }
  
  return this.save();
};

// Activity tracking
userSchema.methods.updateLastActive = function() {
  this.lastActiveAt = new Date();
  return this.save();
};

// Static methods for user management
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ 
    email: email.toLowerCase(),
    status: { $ne: 'deleted' }
  });
};

userSchema.statics.findActiveUsers = function() {
  return this.find({ 
    status: 'active',
    deletedAt: null
  });
};

userSchema.statics.findByVerificationToken = function(token) {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  return this.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
    status: { $ne: 'deleted' }
  });
};

userSchema.statics.findByResetToken = function(token) {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  return this.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
    status: { $ne: 'deleted' }
  });
};

userSchema.statics.findByRefreshToken = function(jti) {
  return this.findOne({
    'refreshTokens.jti': jti,
    'refreshTokens.isRevoked': false,
    'refreshTokens.expiresAt': { $gt: new Date() },
    status: { $ne: 'deleted' }
  });
};

// Cleanup methods
userSchema.statics.cleanupExpiredTokens = function() {
  const now = new Date();
  return this.updateMany(
    {},
    {
      $pull: {
        refreshTokens: { 
          $or: [
            { expiresAt: { $lt: now } },
            { isRevoked: true }
          ]
        }
      },
      $unset: {
        resetPasswordToken: "",
        resetPasswordExpires: "",
        emailVerificationToken: "",
        emailVerificationExpires: ""
      }
    },
    {
      multi: true
    }
  );
};

userSchema.statics.findInactiveUsers = function(days = 90) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return this.find({
    lastActiveAt: { $lt: cutoffDate },
    status: 'active'
  });
};

userSchema.statics.getUserStatistics = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$count' },
        statusCounts: {
          $push: {
            status: '$_id',
            count: '$count'
          }
        }
      }
    }
  ]);
};

// Security analysis methods
userSchema.statics.findSuspiciousActivity = function(hours = 24) {
  const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  return this.find({
    $or: [
      { loginAttempts: { $gte: 3 } },
      { 
        'loginHistory': {
          $elemMatch: {
            success: false,
            timestamp: { $gte: cutoffDate }
          }
        }
      }
    ]
  });
};

// Scheduled cleanup function
userSchema.statics.performMaintenance = async function() {
  try {
    // Clean up expired tokens
    await this.cleanupExpiredTokens();
    
    // Remove old login history entries
    await this.updateMany(
      {},
      {
        $push: {
          loginHistory: {
            $each: [],
            $slice: -50 // Keep only last 50 entries
          }
        }
      }
    );
    
    console.log('User maintenance completed successfully');
  } catch (error) {
    console.error('User maintenance failed:', error);
  }
};

// Create and export the model
const User = mongoose.model('User', userSchema);

module.exports = User;