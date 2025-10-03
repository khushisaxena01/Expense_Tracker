const mongoose = require('mongoose');
const crypto = require('crypto');

const IncomeSchema = new mongoose.Schema({
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
      return this.source ? `${this.source} Income` : 'Income';
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
  source: {
    type: String,
    required: [true, 'Source is required'],
    trim: true,
    minlength: [1, 'Source must be at least 1 character'],
    maxlength: [50, 'Source cannot exceed 50 characters'],
    validate: {
      validator: function(v) {
        return /^[a-zA-Z0-9\s\-_&()]+$/.test(v);
      },
      message: 'Source contains invalid characters'
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
  // Enhanced functionality fields
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
  category: {
    type: String,
    trim: true,
    maxlength: [50, 'Category cannot exceed 50 characters'],
    default: 'Other',
    enum: {
      values: ['Salary', 'Freelance', 'Business', 'Investment', 'Rental', 'Gift', 'Bonus', 'Refund', 'Other'],
      message: '{VALUE} is not a valid income category'
    }
  },
  // Recurring income fields
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
  nextExpectedDate: {
    type: Date,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return this.isRecurring;
      },
      message: 'Next expected date can only be set for recurring income'
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
  // Income tracking and tax fields
  taxable: {
    type: Boolean,
    default: true
  },
  taxRate: {
    type: Number,
    min: [0, 'Tax rate cannot be negative'],
    max: [100, 'Tax rate cannot exceed 100%'],
    default: 0
  },
  netAmount: {
    type: Number,
    min: [0, 'Net amount cannot be negative'],
    validate: {
      validator: function(v) {
        if (!v) return true;
        return v <= this.amount;
      },
      message: 'Net amount cannot exceed gross amount'
    }
  },
  // Payment tracking
  paymentMethod: {
    type: String,
    enum: {
      values: ['bank_transfer', 'cash', 'check', 'digital_wallet', 'crypto', 'other'],
      message: '{VALUE} is not a valid payment method'
    },
    default: 'other'
  },
  paymentReference: {
    type: String,
    trim: true,
    maxlength: [100, 'Payment reference cannot exceed 100 characters'],
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^[a-zA-Z0-9\s\-_#/]+$/.test(v);
      },
      message: 'Payment reference contains invalid characters'
    }
  },
  // Status tracking
  status: {
    type: String,
    enum: {
      values: ['pending', 'received', 'cancelled', 'disputed'],
      message: '{VALUE} is not a valid status'
    },
    default: 'received'
  },
  confirmedAt: {
    type: Date,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return this.status === 'received';
      },
      message: 'Confirmed date can only be set when status is received'
    }
  },
  // Client/Employer information
  client: {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Client name cannot exceed 100 characters'],
      validate: {
        validator: function(v) {
          if (!v) return true;
          return /^[a-zA-Z0-9\s\-_&().,!]+$/.test(v);
        },
        message: 'Client name contains invalid characters'
      }
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [100, 'Client email cannot exceed 100 characters'],
      validate: {
        validator: function(v) {
          if (!v) return true;
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Invalid client email format'
      }
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [20, 'Client phone cannot exceed 20 characters'],
      validate: {
        validator: function(v) {
          if (!v) return true;
          return /^[\d\s\-+()]+$/.test(v);
        },
        message: 'Invalid client phone format'
      }
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
    select: false
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.dataHash;
      return ret;
    }
  },
  optimisticConcurrency: true
});

// Compound indexes for optimal performance
IncomeSchema.index({ userId: 1, date: -1 });
IncomeSchema.index({ userId: 1, source: 1, date: -1 });
IncomeSchema.index({ userId: 1, category: 1, date: -1 });
IncomeSchema.index({ userId: 1, status: 1, date: -1 });
IncomeSchema.index({ userId: 1, deleted: 1, createdAt: -1 });
IncomeSchema.index({ userId: 1, isRecurring: 1, nextExpectedDate: 1 });
IncomeSchema.index({ userId: 1, taxable: 1 });
IncomeSchema.index({ userId: 1, amount: -1 });
IncomeSchema.index({ date: -1 });
IncomeSchema.index({ amount: -1 });
IncomeSchema.index({ deleted: 1, deletedAt: 1 });
IncomeSchema.index({ nextExpectedDate: 1 });

// Text search index
IncomeSchema.index({
  source: 'text',
  description: 'text',
  notes: 'text',
  'client.name': 'text'
});

// Virtual fields
IncomeSchema.virtual('formattedAmount').get(function() {
  return `${this.currency || 'USD'} ${this.amount.toLocaleString()}`;
});

IncomeSchema.virtual('formattedNetAmount').get(function() {
  const net = this.netAmount || this.amount;
  return `${this.currency || 'USD'} ${net.toLocaleString()}`;
});

IncomeSchema.virtual('taxAmount').get(function() {
  if (!this.taxable || !this.taxRate) return 0;
  return this.amount * (this.taxRate / 100);
});

IncomeSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.date.getTime()) / (1000 * 60 * 60 * 24));
});

IncomeSchema.virtual('isOverdue').get(function() {
  if (!this.isRecurring || !this.nextExpectedDate) return false;
  return this.nextExpectedDate < new Date() && this.status === 'pending';
});

// Pre-save middleware
IncomeSchema.pre('save', function(next) {
  try {
    // Update lastModifiedBy on changes
    if (this.isModified() && !this.isNew) {
      this.lastModifiedBy = this.userId;
    }
    
    // Generate data integrity hash
    const dataString = JSON.stringify({
      userId: this.userId,
      source: this.source,
      amount: this.amount,
      date: this.date,
      description: this.description
    });
    this.dataHash = crypto.createHash('sha256').update(dataString).digest('hex');
    
    // Validate tags array length
    if (this.tags && this.tags.length > 10) {
      return next(new Error('Maximum 10 tags allowed'));
    }
    
    // Auto-calculate net amount if not provided
    if (!this.netAmount && this.taxable && this.taxRate) {
      this.netAmount = this.amount - (this.amount * (this.taxRate / 100));
    }
    
    // Set confirmation date when status changes to received
    if (this.status === 'received' && !this.confirmedAt) {
      this.confirmedAt = new Date();
    }
    
    // Calculate next expected date for recurring income
    if (this.isRecurring && this.recurringFrequency && !this.nextExpectedDate) {
      const nextDate = new Date(this.date);
      switch (this.recurringFrequency) {
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case 'bi-weekly':
          nextDate.setDate(nextDate.getDate() + 14);
          break;
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case 'quarterly':
          nextDate.setMonth(nextDate.getMonth() + 3);
          break;
        case 'yearly':
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          break;
      }
      this.nextExpectedDate = nextDate;
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Static methods for enhanced querying
IncomeSchema.statics.findByUser = function(userId, options = {}) {
  const query = { userId, deleted: false };
  return this.find(query).sort(options.sort || { date: -1 });
};

IncomeSchema.statics.findByDateRange = function(userId, startDate, endDate, options = {}) {
  const query = {
    userId,
    deleted: false,
    date: { $gte: startDate, $lte: endDate }
  };
  
  if (options.source) {
    query.source = options.source;
  }
  
  if (options.category) {
    query.category = options.category;
  }
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query).sort({ date: -1 });
};

IncomeSchema.statics.getTotalByUser = function(userId) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), deleted: false } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
};

IncomeSchema.statics.getMonthlyTotal = function(userId, year, month) {
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

IncomeSchema.statics.getSourceBreakdown = function(userId, startDate, endDate) {
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
        _id: '$source',
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

IncomeSchema.statics.getIncometrends = function(userId, months = 6) {
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
        netTotal: { $sum: { $ifNull: ['$netAmount', '$amount'] } },
        count: { $sum: 1 },
        average: { $avg: '$amount' },
        sources: { $addToSet: '$source' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);
};

IncomeSchema.statics.getRecurringIncomes = function(userId) {
  return this.find({
    userId,
    deleted: false,
    isRecurring: true
  }).sort({ nextExpectedDate: 1 });
};

IncomeSchema.statics.getOverdueIncomes = function(userId) {
  return this.find({
    userId,
    deleted: false,
    isRecurring: true,
    status: 'pending',
    nextExpectedDate: { $lt: new Date() }
  }).sort({ nextExpectedDate: 1 });
};

IncomeSchema.statics.getTaxableIncomes = function(userId, year) {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        deleted: false,
        taxable: true,
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalIncome: { $sum: '$amount' },
        totalTax: { $sum: { $multiply: ['$amount', { $divide: [{ $ifNull: ['$taxRate', 0] }, 100] }] } },
        count: { $sum: 1 }
      }
    }
  ]);
};

IncomeSchema.statics.searchIncomes = function(userId, searchTerm, options = {}) {
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
IncomeSchema.statics.softDelete = function(id, userId, deletedBy) {
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
IncomeSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  return {
    id: obj._id,
    userId: obj.userId,
    title: obj.title,
    icon: obj.icon,
    source: obj.source,
    amount: obj.amount,
    date: obj.date,
    order: obj.order,
    description: obj.description,
    tags: obj.tags || [],
    notes: obj.notes,
    category: obj.category,
    paymentMethod: obj.paymentMethod,
    paymentReference: obj.paymentReference,
    status: obj.status,
    isRecurring: obj.isRecurring,
    recurringFrequency: obj.recurringFrequency,
    nextExpectedDate: obj.nextExpectedDate,
    taxable: obj.taxable,
    taxRate: obj.taxRate,
    netAmount: obj.netAmount,
    client: obj.client,
    currency: obj.currency,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
    formattedAmount: this.formattedAmount,
    formattedNetAmount: this.formattedNetAmount,
    taxAmount: this.taxAmount,
    ageInDays: this.ageInDays,
    isOverdue: this.isOverdue
  };
};

IncomeSchema.methods.markAsReceived = function() {
  this.status = 'received';
  this.confirmedAt = new Date();
  return this.save();
};

IncomeSchema.methods.softDelete = function(deletedBy) {
  this.deleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  return this.save();
};

IncomeSchema.methods.validateDataIntegrity = function() {
  const dataString = JSON.stringify({
    userId: this.userId,
    source: this.source,
    amount: this.amount,
    date: this.date,
    description: this.description
  });
  const currentHash = crypto.createHash('sha256').update(dataString).digest('hex');
  return currentHash === this.dataHash;
};

IncomeSchema.methods.updateNextExpectedDate = function() {
  if (!this.isRecurring || !this.recurringFrequency) return;
  
  const nextDate = new Date(this.nextExpectedDate || this.date);
  
  switch (this.recurringFrequency) {
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'bi-weekly':
      nextDate.setDate(nextDate.getDate() + 14);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
  }
  
  this.nextExpectedDate = nextDate;
  return this.save();
};

module.exports = mongoose.model('Income', IncomeSchema);