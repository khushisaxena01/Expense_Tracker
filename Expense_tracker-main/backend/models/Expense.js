const mongoose = require('mongoose');
const crypto = require('crypto');

const ExpenseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, 'User ID is required'],
    index: true,
    validate: {
      validator: function(v) {
        return mongoose.Types.ObjectId.isValid(v);
      },
      message: 'Invalid User ID format'
    }
  },
  title: {
    type: String,
    required: false,
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters'],
    minlength: [1, 'Title must be at least 1 character'],
    default: function() {
      return this.category ? `${this.category} Expense` : 'Expense';
    },
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^[a-zA-Z0-9\s\-_&().,!]+$/.test(v);
      },
      message: 'Title contains invalid characters'
    }
  },
  icon: {
    type: String,
    trim: true,
    maxlength: [50, 'Icon cannot exceed 50 characters'],
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^[a-zA-Z0-9\-_]+$/.test(v);
      },
      message: 'Icon can only contain letters, numbers, hyphens, and underscores'
    }
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    minlength: [1, 'Category must be at least 1 character'],
    maxlength: [50, 'Category cannot exceed 50 characters'],
    validate: {
      validator: function(v) {
        return /^[a-zA-Z0-9\s\-_&()]+$/.test(v);
      },
      message: 'Category contains invalid characters'
    }
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0'],
    max: [999999999.99, 'Amount cannot exceed 999,999,999.99'],
    validate: {
      validator: function(v) {
        // Check for maximum 2 decimal places
        return Number.isFinite(v) && /^\d+(\.\d{1,2})?$/.test(v.toString());
      },
      message: 'Amount must be a valid number with maximum 2 decimal places'
    }
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    validate: {
      validator: function(v) {
        const now = new Date();
        const maxFutureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const minPastDate = new Date(now.getTime() - 10 * 365 * 24 * 60 * 60 * 1000);
        
        return v >= minPastDate && v <= maxFutureDate;
      },
      message: 'Date must be within the last 10 years and not more than 7 days in the future'
    }
  },
  order: {
    type: Number,
    required: true,
    min: [1, 'Order must be at least 1']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: '',
    validate: {
      validator: function(v) {
        if (!v) return true;
        // Allow common punctuation and characters but prevent script injection
        return !/[<>\"'`]/.test(v);
      },
      message: 'Description contains potentially unsafe characters'
    }
  },
  // Enhanced security and tracking fields
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [30, 'Each tag cannot exceed 30 characters'],
    validate: {
      validator: function(v) {
        return /^[a-zA-Z0-9\-_]+$/.test(v);
      },
      message: 'Tags can only contain letters, numbers, hyphens, and underscores'
    }
  }],
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
    validate: {
      validator: function(v) {
        if (!v) return true;
        return !/[<>\"'`]/.test(v);
      },
      message: 'Notes contain potentially unsafe characters'
    }
  },
  paymentMethod: {
    type: String,
    enum: {
      values: ['cash', 'card', 'bank_transfer', 'digital_wallet', 'cheque', 'other'],
      message: '{VALUE} is not a valid payment method'
    },
    default: 'other'
  },
  merchant: {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Merchant name cannot exceed 100 characters'],
      validate: {
        validator: function(v) {
          if (!v) return true;
          return /^[a-zA-Z0-9\s\-_&().,!]+$/.test(v);
        },
        message: 'Merchant name contains invalid characters'
      }
    },
    location: {
      type: String,
      trim: true,
      maxlength: [200, 'Merchant location cannot exceed 200 characters'],
      validate: {
        validator: function(v) {
          if (!v) return true;
          return /^[a-zA-Z0-9\s\-_&().,!#]+$/.test(v);
        },
        message: 'Merchant location contains invalid characters'
      }
    }
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringFrequency: {
    type: String,
    enum: {
      values: ['weekly', 'bi-weekly', 'monthly', 'quarterly', 'yearly'],
      message: '{VALUE} is not a valid recurring frequency'
    },
    required: function() {
      return this.isRecurring;
    }
  },
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
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high', 'urgent'],
      message: '{VALUE} is not a valid priority level'
    },
    default: 'medium'
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'completed', 'cancelled', 'disputed'],
      message: '{VALUE} is not a valid status'
    },
    default: 'completed'
  },
  // Business and tax related fields
  taxDeductible: {
    type: Boolean,
    default: false
  },
  businessExpense: {
    type: Boolean,
    default: false
  },
  reimbursable: {
    type: Boolean,
    default: false
  },
  reimbursed: {
    type: Boolean,
    default: false
  },
  reimbursedAt: {
    type: Date,
    default: null,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return this.reimbursed === true;
      },
      message: 'Reimbursed date can only be set when reimbursed is true'
    }
  },
  // Security and audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: function() {
      return this.userId;
    }
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: function() {
      return this.userId;
    }
  },
  // Soft delete functionality
  deleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  // Data integrity hash
  dataHash: {
    type: String,
    select: false // Don't include in normal queries
  }
}, {
  timestamps: true,
  // Optimize JSON output
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.dataHash;
      return ret;
    }
  },
  // Add version key for optimistic locking
  optimisticConcurrency: true
});

// Compound indexes for optimal query performance
ExpenseSchema.index({ userId: 1, date: -1 });
ExpenseSchema.index({ userId: 1, category: 1, date: -1 });
ExpenseSchema.index({ userId: 1, status: 1, date: -1 });
ExpenseSchema.index({ userId: 1, deleted: 1, createdAt: -1 });
ExpenseSchema.index({ userId: 1, amount: -1 });
ExpenseSchema.index({ userId: 1, tags: 1 });
ExpenseSchema.index({ userId: 1, isRecurring: 1 });
ExpenseSchema.index({ userId: 1, businessExpense: 1 });
ExpenseSchema.index({ date: -1 });
ExpenseSchema.index({ amount: -1 });
ExpenseSchema.index({ deleted: 1, deletedAt: 1 });

// Text search index for descriptions and notes
ExpenseSchema.index({
  category: 'text',
  description: 'text',
  notes: 'text',
  'merchant.name': 'text'
});

// Virtual fields
ExpenseSchema.virtual('formattedAmount').get(function() {
  return `${this.currency || 'USD'} ${this.amount.toLocaleString()}`;
});

ExpenseSchema.virtual('isExpired').get(function() {
  if (!this.isRecurring) return false;
  // Add logic to determine if recurring expense is expired
  return false;
});

ExpenseSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.date.getTime()) / (1000 * 60 * 60 * 24));
});

// Pre-save middleware for security and validation
ExpenseSchema.pre('save', function(next) {
  try {
    // Update lastModifiedBy on changes
    if (this.isModified() && !this.isNew) {
      this.lastModifiedBy = this.userId;
    }
    
    // Generate data integrity hash
    const dataString = JSON.stringify({
      userId: this.userId,
      category: this.category,
      amount: this.amount,
      date: this.date,
      description: this.description
    });
    this.dataHash = crypto.createHash('sha256').update(dataString).digest('hex');
    
    // Validate tags array length
    if (this.tags && this.tags.length > 10) {
      return next(new Error('Maximum 10 tags allowed'));
    }
    
    // Auto-set reimbursedAt when marked as reimbursed
    if (this.reimbursed && !this.reimbursedAt) {
      this.reimbursedAt = new Date();
    }
    
    // Clear reimbursedAt if reimbursed is set to false
    if (!this.reimbursed && this.reimbursedAt) {
      this.reimbursedAt = null;
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Static methods for enhanced querying
ExpenseSchema.statics.findByUser = function(userId, options = {}) {
  const query = { userId, deleted: false };
  return this.find(query).sort(options.sort || { date: -1 });
};

ExpenseSchema.statics.findByDateRange = function(userId, startDate, endDate, options = {}) {
  const query = {
    userId,
    deleted: false,
    date: { $gte: startDate, $lte: endDate }
  };
  
  if (options.category) {
    query.category = options.category;
  }
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query).sort({ date: -1 });
};

ExpenseSchema.statics.getTotalByUser = function(userId) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), deleted: false } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
};

ExpenseSchema.statics.getMonthlyTotal = function(userId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        deleted: false,
        date: { $gte: startDate, $lte: endDate }
      }
    },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
};

ExpenseSchema.statics.getCategoryBreakdown = function(userId, startDate, endDate) {
  const matchStage = { 
    userId: new mongoose.Types.ObjectId(userId),
    deleted: false
  };
  
  if (startDate && endDate) {
    matchStage.date = { $gte: startDate, $lte: endDate };
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
        average: { $avg: '$amount' },
        maxAmount: { $max: '$amount' },
        minAmount: { $min: '$amount' }
      }
    },
    { $sort: { total: -1 } }
  ]);
};

ExpenseSchema.statics.getSpendingTrends = function(userId, months = 6) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        deleted: false,
        date: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' }
        },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
        average: { $avg: '$amount' },
        categories: { $addToSet: '$category' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);
};

ExpenseSchema.statics.searchExpenses = function(userId, searchTerm, options = {}) {
  const query = {
    userId: new mongoose.Types.ObjectId(userId),
    deleted: false,
    $text: { $search: searchTerm }
  };
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(options.limit || 20);
};

// Soft delete static method
ExpenseSchema.statics.softDelete = function(id, userId, deletedBy) {
  return this.findOneAndUpdate(
    { _id: id, userId: userId },
    {
      deleted: true,
      deletedAt: new Date(),
      deletedBy: deletedBy
    },
    { new: true }
  );
};

// Instance methods
ExpenseSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  return {
    id: obj._id,
    userId: obj.userId,
    title: obj.title,
    icon: obj.icon,
    category: obj.category,
    amount: obj.amount,
    date: obj.date,
    order: obj.order,
    description: obj.description,
    tags: obj.tags || [],
    notes: obj.notes,
    paymentMethod: obj.paymentMethod,
    merchant: obj.merchant,
    priority: obj.priority,
    status: obj.status,
    taxDeductible: obj.taxDeductible,
    businessExpense: obj.businessExpense,
    isRecurring: obj.isRecurring,
    recurringFrequency: obj.recurringFrequency,
    currency: obj.currency,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
    formattedAmount: this.formattedAmount,
    ageInDays: this.ageInDays
  };
};

ExpenseSchema.methods.markAsReimbursed = function() {
  this.reimbursed = true;
  this.reimbursedAt = new Date();
  return this.save();
};

ExpenseSchema.methods.softDelete = function(deletedBy) {
  this.deleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  return this.save();
};

ExpenseSchema.methods.validateDataIntegrity = function() {
  const dataString = JSON.stringify({
    userId: this.userId,
    category: this.category,
    amount: this.amount,
    date: this.date,
    description: this.description
  });
  const currentHash = crypto.createHash('sha256').update(dataString).digest('hex');
  return currentHash === this.dataHash;
};

module.exports = mongoose.model('Expense', ExpenseSchema);