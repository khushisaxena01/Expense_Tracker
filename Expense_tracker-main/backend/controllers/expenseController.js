const xlsx = require("xlsx");
const Expense = require("../models/Expense");
const User = require("../models/User");
const path = require("path");
const fs = require("fs");
const { cleanupFiles } = require("../middleware/uploadMiddleware");

// Add Expense with Enhanced Security and Analytics
exports.addExpense = async (req, res) => {
    try {
        const userId = req.user.id;
        const { icon, category, amount, date, title, description, tags, paymentMethod, merchant } = req.body;
        const clientIP = req.ip;

        // Validate data integrity
        if (!category || !amount || !date) {
            return res.status(400).json({ 
                success: false,
                message: "Missing required fields",
                required: ["category", "amount", "date"]
            });
        }

        // Additional business logic validation
        const expenseAmount = parseFloat(amount);
        if (expenseAmount <= 0 || expenseAmount > 999999999.99) {
            return res.status(400).json({
                success: false,
                message: "Amount must be between 0.01 and 999,999,999.99"
            });
        }

        // Check for potential duplicate entries (same category, amount, and date within 1 minute)
        const duplicateCheck = await Expense.findOne({
            userId,
            category: category.trim(),
            amount: expenseAmount,
            date: {
                $gte: new Date(new Date(date).getTime() - 60000),
                $lte: new Date(new Date(date).getTime() + 60000)
            },
            deleted: false
        });

        if (duplicateCheck) {
            return res.status(409).json({
                success: false,
                message: "Similar expense already exists. Possible duplicate entry.",
                existingExpense: {
                    id: duplicateCheck._id,
                    category: duplicateCheck.category,
                    amount: duplicateCheck.amount,
                    date: duplicateCheck.date
                }
            });
        }

        // Get current order for user's expenses
        const count = await Expense.countDocuments({ userId, deleted: false });
        
        // Create expense with enhanced security tracking
        const newExpense = new Expense({
            userId,
            icon: icon?.trim(),
            category: category.trim(),
            title: title?.trim() || category.trim(),
            description: description?.trim(),
            amount: expenseAmount,
            date: new Date(date),
            order: count + 1,
            tags: tags && Array.isArray(tags) ? tags.map(tag => tag.trim().toLowerCase()) : [],
            paymentMethod: paymentMethod || 'other',
            merchant: merchant ? {
                name: merchant.name?.trim(),
                location: merchant.location?.trim()
            } : undefined,
            createdBy: userId,
            lastModifiedBy: userId
        });

        await newExpense.save();

        // Update user's last active timestamp
        await User.findByIdAndUpdate(userId, { lastActiveAt: new Date() });

        // Fetch user's budget to check if expense exceeds category budget
        const user = await User.findById(userId);
        const categoryBudget = user?.budgetCategories?.find(
            budget => budget.category.toLowerCase() === category.toLowerCase()
        );

        let budgetWarning = null;
        if (categoryBudget) {
            const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            const categorySpending = await Expense.aggregate([
                {
                    $match: {
                        userId: newExpense.userId,
                        category: category,
                        date: { $gte: monthStart },
                        deleted: false
                    }
                },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]);

            const totalSpent = categorySpending[0]?.total || 0;
            const budgetPercentage = (totalSpent / categoryBudget.budgetAmount) * 100;

            if (budgetPercentage >= categoryBudget.alertThreshold) {
                budgetWarning = {
                    category,
                    budgetAmount: categoryBudget.budgetAmount,
                    spent: totalSpent,
                    remaining: Math.max(0, categoryBudget.budgetAmount - totalSpent),
                    percentageUsed: budgetPercentage.toFixed(1),
                    exceeded: budgetPercentage > 100
                };
            }
        }

        const response = {
            success: true,
            message: "Expense added successfully",
            data: {
                expense: newExpense.toSafeObject(),
                budgetAlert: budgetWarning
            }
        };

        res.status(201).json(response);

        // Log expense creation
        console.log('Expense created:', {
            userId,
            expenseId: newExpense._id,
            category,
            amount: expenseAmount,
            ip: clientIP,
            timestamp: new Date().toISOString()
        });

    } catch (err) {
        console.error('Add expense error:', {
            error: err.message,
            userId: req.user?.id,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
            timestamp: new Date().toISOString()
        });

        // Handle specific validation errors
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
            message: "Failed to add expense",
            ...(process.env.NODE_ENV === 'development' && { error: err.message })
        });
    }
};

// Get All Expenses with Enhanced Filtering and Analytics
exports.getAllExpense = async (req, res) => {
    try {
        const userId = req.user.id;
        const { 
            page = 1, 
            limit = 10, 
            category, 
            startDate, 
            endDate,
            minAmount,
            maxAmount,
            search,
            sortBy = 'date',
            sortOrder = 'desc',
            paymentMethod,
            tags
        } = req.query;

        // Build comprehensive filter
        const filter = { userId, deleted: false };
        
        if (category) {
            filter.category = { $regex: category, $options: 'i' };
        }
        
        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }

        if (minAmount || maxAmount) {
            filter.amount = {};
            if (minAmount) filter.amount.$gte = parseFloat(minAmount);
            if (maxAmount) filter.amount.$lte = parseFloat(maxAmount);
        }

        if (paymentMethod) {
            filter.paymentMethod = paymentMethod;
        }

        if (tags) {
            const tagArray = Array.isArray(tags) ? tags : [tags];
            filter.tags = { $in: tagArray };
        }

        // Text search if provided
        if (search) {
            filter.$or = [
                { category: { $regex: search, $options: 'i' } },
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { 'merchant.name': { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Execute queries in parallel for better performance
        const [expenses, totalExpenses, totalAmount, categoryBreakdown] = await Promise.all([
            Expense.find(filter)
                .sort(sortOptions)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),

            Expense.countDocuments(filter),

            Expense.aggregate([
                { $match: filter },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]),

            // Category breakdown for current filter
            Expense.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: "$category",
                        total: { $sum: "$amount" },
                        count: { $sum: 1 },
                        avgAmount: { $avg: "$amount" }
                    }
                },
                { $sort: { total: -1 } }
            ])
        ]);

        // Calculate pagination metadata
        const totalPages = Math.ceil(totalExpenses / parseInt(limit));
        const hasNext = parseInt(page) < totalPages;
        const hasPrev = parseInt(page) > 1;

        // Format expenses with additional computed fields
        const formattedExpenses = expenses.map(expense => ({
            ...expense,
            id: expense._id,
            formattedAmount: `$${expense.amount.toLocaleString()}`,
            ageInDays: Math.floor((Date.now() - expense.date.getTime()) / (1000 * 60 * 60 * 24)),
            category: expense.category,
            paymentMethod: expense.paymentMethod || 'other'
        }));

        const responseData = {
            expenses: formattedExpenses,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalExpenses,
                limit: parseInt(limit),
                hasNext,
                hasPrev,
                nextPage: hasNext ? parseInt(page) + 1 : null,
                prevPage: hasPrev ? parseInt(page) - 1 : null
            },
            summary: {
                totalAmount: totalAmount[0]?.total || 0,
                averageAmount: totalExpenses > 0 ? (totalAmount[0]?.total || 0) / totalExpenses : 0,
                count: formattedExpenses.length,
                categoryBreakdown: categoryBreakdown.slice(0, 10)
            },
            filters: {
                category,
                dateRange: { startDate, endDate },
                amountRange: { minAmount, maxAmount },
                search,
                paymentMethod,
                tags
            }
        };

        res.status(200).json({
            success: true,
            data: responseData
        });

        // Update user's last active timestamp
        await User.findByIdAndUpdate(userId, { lastActiveAt: new Date() });

    } catch (err) {
        console.error('Get expenses error:', {
            error: err.message,
            userId: req.user?.id,
            timestamp: new Date().toISOString()
        });

        res.status(500).json({ 
            success: false,
            message: "Failed to retrieve expenses",
            ...(process.env.NODE_ENV === 'development' && { error: err.message })
        });
    }
};

// Update Expense with Enhanced Security
exports.updateExpense = async (req, res) => {
    try {
        const userId = req.user.id;
        const expenseId = req.params.id;
        const updateData = req.body;
        const clientIP = req.ip;

        // Find existing expense with ownership verification
        const existingExpense = await Expense.findOne({ 
            _id: expenseId, 
            userId,
            deleted: false 
        });

        if (!existingExpense) {
            return res.status(404).json({
                success: false,
                message: "Expense not found or access denied"
            });
        }

        // Validate data integrity if critical fields are being updated
        if (updateData.amount !== undefined) {
            const amount = parseFloat(updateData.amount);
            if (amount <= 0 || amount > 999999999.99) {
                return res.status(400).json({
                    success: false,
                    message: "Amount must be between 0.01 and 999,999,999.99"
                });
            }
        }

        // Check data integrity
        if (!existingExpense.validateDataIntegrity()) {
            console.warn('Data integrity violation detected:', {
                expenseId,
                userId,
                ip: clientIP,
                timestamp: new Date().toISOString()
            });
        }

        // Prepare update object
        const updateFields = {};
        const allowedFields = ['icon', 'category', 'title', 'description', 'amount', 'date', 'tags', 'paymentMethod', 'merchant'];
        
        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                if (field === 'tags' && Array.isArray(updateData[field])) {
                    updateFields[field] = updateData[field].map(tag => tag.trim().toLowerCase());
                } else if (field === 'amount') {
                    updateFields[field] = parseFloat(updateData[field]);
                } else if (field === 'date') {
                    updateFields[field] = new Date(updateData[field]);
                } else if (typeof updateData[field] === 'string') {
                    updateFields[field] = updateData[field].trim();
                } else {
                    updateFields[field] = updateData[field];
                }
            }
        });

        updateFields.lastModifiedBy = userId;
        updateFields.updatedAt = new Date();

        // Update expense with validation
        const updatedExpense = await Expense.findByIdAndUpdate(
            expenseId,
            updateFields,
            { 
                new: true, 
                runValidators: true,
                context: 'query'
            }
        );

        res.status(200).json({
            success: true,
            message: "Expense updated successfully",
            data: {
                expense: updatedExpense.toSafeObject(),
                changes: Object.keys(updateFields).filter(key => key !== 'lastModifiedBy' && key !== 'updatedAt')
            }
        });

        // Log expense update
        console.log('Expense updated:', {
            userId,
            expenseId,
            changes: Object.keys(updateFields),
            ip: clientIP,
            timestamp: new Date().toISOString()
        });

    } catch (err) {
        console.error('Update expense error:', {
            error: err.message,
            userId: req.user?.id,
            expenseId: req.params?.id,
            timestamp: new Date().toISOString()
        });

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
            message: "Failed to update expense",
            ...(process.env.NODE_ENV === 'development' && { error: err.message })
        });
    }
};

// Enhanced Soft Delete with Audit Trail
exports.deleteExpense = async (req, res) => {
    try {
        const userId = req.user.id;
        const expenseId = req.params.id;
        const clientIP = req.ip;

        // Find and verify ownership
        const expense = await Expense.findOne({ 
            _id: expenseId, 
            userId,
            deleted: false 
        });

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: "Expense not found or already deleted"
            });
        }

        // Soft delete with audit trail
        await expense.softDelete(userId);

        res.status(200).json({ 
            success: true,
            message: "Expense deleted successfully",
            data: {
                deletedExpense: {
                    id: expense._id,
                    category: expense.category,
                    amount: expense.amount,
                    deletedAt: expense.deletedAt
                }
            }
        });

        // Log deletion
        console.log('Expense deleted:', {
            userId,
            expenseId,
            category: expense.category,
            amount: expense.amount,
            ip: clientIP,
            timestamp: new Date().toISOString()
        });

    } catch (err) {
        console.error('Delete expense error:', {
            error: err.message,
            userId: req.user?.id,
            expenseId: req.params?.id,
            timestamp: new Date().toISOString()
        });

        res.status(500).json({ 
            success: false,
            message: "Failed to delete expense",
            ...(process.env.NODE_ENV === 'development' && { error: err.message })
        });
    }
};

// Enhanced Excel Download with Security
exports.downloadExpenseExcel = async (req, res) => {
    try {
        const userId = req.user.id;
        const { startDate, endDate, category, format = 'xlsx' } = req.query;
        const clientIP = req.ip;

        // Build filter with security validation
        const filter = { userId, deleted: false };
        
        if (startDate || endDate) {
            filter.date = {};
            if (startDate) {
                const start = new Date(startDate);
                if (isNaN(start.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid start date format"
                    });
                }
                filter.date.$gte = start;
            }
            if (endDate) {
                const end = new Date(endDate);
                if (isNaN(end.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid end date format"
                    });
                }
                filter.date.$lte = end;
            }
        }

        if (category) {
            filter.category = { $regex: category, $options: 'i' };
        }

        const expenses = await Expense.find(filter)
            .sort({ date: -1 })
            .lean();
        
        if (expenses.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No expenses found for the specified criteria"
            });
        }

        // Prepare data for Excel with enhanced fields
        const data = expenses.map((item, index) => ({
            'Sr. No.': index + 1,
            'Date': item.date.toLocaleDateString('en-US'),
            'Category': item.category,
            'Title': item.title || item.category,
            'Amount': item.amount,
            'Payment Method': item.paymentMethod || 'Not specified',
            'Merchant': item.merchant?.name || '-',
            'Description': item.description || '-',
            'Tags': item.tags?.join(', ') || '-',
            'Created': item.createdAt.toLocaleDateString('en-US')
        }));

        // Add summary statistics
        const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const avgAmount = totalAmount / expenses.length;
        const categories = [...new Set(expenses.map(exp => exp.category))];

        data.push({}, {
            'Sr. No.': 'SUMMARY',
            'Date': '',
            'Category': `${categories.length} categories`,
            'Title': '',
            'Amount': '',
            'Payment Method': '',
            'Merchant': '',
            'Description': '',
            'Tags': '',
            'Created': ''
        }, {
            'Sr. No.': 'Total Records',
            'Date': expenses.length,
            'Category': 'Total Amount',
            'Title': totalAmount.toFixed(2),
            'Amount': 'Average',
            'Payment Method': avgAmount.toFixed(2),
            'Merchant': '',
            'Description': '',
            'Tags': '',
            'Created': ''
        });

        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet(data);
        
        // Enhanced column styling
        ws['!cols'] = [
            { width: 8 },   // Sr. No.
            { width: 12 },  // Date
            { width: 15 },  // Category
            { width: 20 },  // Title
            { width: 12 },  // Amount
            { width: 15 },  // Payment Method
            { width: 20 },  // Merchant
            { width: 30 },  // Description
            { width: 20 },  // Tags
            { width: 12 }   // Created
        ];

        xlsx.utils.book_append_sheet(wb, ws, "Expenses");

        // Generate secure filename with timestamp and user context
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const filename = `expenses_${timestamp}_${userId.toString().slice(-6)}.${format}`;
        const filepath = path.join(process.env.UPLOAD_PATH || './uploads', 'exports', filename);

        // Ensure export directory exists
        const exportDir = path.dirname(filepath);
        if (!fs.existsSync(exportDir)) {
            fs.mkdirSync(exportDir, { recursive: true });
        }

        xlsx.writeFile(wb, filepath);

        // Security: Set proper headers
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        res.download(filepath, filename, (err) => {
            if (err) {
                console.error('Download error:', {
                    error: err.message,
                    userId,
                    filename,
                    timestamp: new Date().toISOString()
                });
                
                if (!res.headersSent) {
                    res.status(500).json({
                        success: false,
                        message: "Failed to download file"
                    });
                }
            } else {
                // Log successful download
                console.log('Expense Excel downloaded:', {
                    userId,
                    filename,
                    recordCount: expenses.length,
                    ip: clientIP,
                    timestamp: new Date().toISOString()
                });

                // Clean up file after successful download
                setTimeout(() => {
                    cleanupFiles([filepath], { logCleanup: false });
                }, 30000);
            }
        });

    } catch (err) {
        console.error('Download expense excel error:', {
            error: err.message,
            userId: req.user?.id,
            timestamp: new Date().toISOString()
        });

        if (!res.headersSent) {
            res.status(500).json({ 
                success: false,
                message: "Failed to generate expense report",
                ...(process.env.NODE_ENV === 'development' && { error: err.message })
            });
        }
    }
};

module.exports = {
    addExpense: exports.addExpense,
    getAllExpense: exports.getAllExpense,
    updateExpense: exports.updateExpense,
    deleteExpense: exports.deleteExpense,
    downloadExpenseExcel: exports.downloadExpenseExcel
};