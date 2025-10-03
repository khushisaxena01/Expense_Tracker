const xlsx = require("xlsx");
const Income = require("../models/Income");
const User = require("../models/User");
const path = require("path");
const fs = require("fs");
const { cleanupFiles } = require("../middleware/uploadMiddleware");

// Add Income with Enhanced Security and Analytics
exports.addIncome = async (req, res) => {
    try {
        const userId = req.user.id;
        const { 
            icon, source, amount, date, title, description, tags, 
            paymentMethod, client, isRecurring, recurringFrequency,
            taxable, taxRate
        } = req.body;
        const clientIP = req.ip;

        // Validate required fields
        if (!source || !amount || !date) {
            return res.status(400).json({ 
                success: false,
                message: "Missing required fields",
                required: ["source", "amount", "date"]
            });
        }

        // Enhanced amount validation
        const incomeAmount = parseFloat(amount);
        if (incomeAmount <= 0 || incomeAmount > 999999999.99) {
            return res.status(400).json({
                success: false,
                message: "Amount must be between 0.01 and 999,999,999.99"
            });
        }

        // Validate tax rate if provided
        if (taxRate !== undefined) {
            const rate = parseFloat(taxRate);
            if (rate < 0 || rate > 100) {
                return res.status(400).json({
                    success: false,
                    message: "Tax rate must be between 0 and 100"
                });
            }
        }

        // Check for potential duplicate entries
        const duplicateCheck = await Income.findOne({
            userId,
            source: source.trim(),
            amount: incomeAmount,
            date: {
                $gte: new Date(new Date(date).getTime() - 60000),
                $lte: new Date(new Date(date).getTime() + 60000)
            },
            deleted: false
        });

        if (duplicateCheck) {
            return res.status(409).json({
                success: false,
                message: "Similar income entry already exists. Possible duplicate.",
                existingIncome: {
                    id: duplicateCheck._id,
                    source: duplicateCheck.source,
                    amount: duplicateCheck.amount,
                    date: duplicateCheck.date
                }
            });
        }

        // Get current order for user's income entries
        const count = await Income.countDocuments({ userId, deleted: false });
        
        // Calculate net amount if tax information is provided
        let netAmount = incomeAmount;
        if (taxable && taxRate) {
            netAmount = incomeAmount - (incomeAmount * (parseFloat(taxRate) / 100));
        }

        // Create income with enhanced security tracking
        const newIncome = new Income({
            userId,
            icon: icon?.trim(),
            source: source.trim(),
            title: title?.trim() || source.trim(),
            description: description?.trim(),
            amount: incomeAmount,
            netAmount,
            date: new Date(date),
            order: count + 1,
            tags: tags && Array.isArray(tags) ? tags.map(tag => tag.trim().toLowerCase()) : [],
            paymentMethod: paymentMethod || 'other',
            client: client ? {
                name: client.name?.trim(),
                email: client.email?.toLowerCase().trim(),
                phone: client.phone?.trim()
            } : undefined,
            isRecurring: Boolean(isRecurring),
            recurringFrequency: isRecurring ? recurringFrequency : undefined,
            taxable: taxable !== undefined ? Boolean(taxable) : true,
            taxRate: taxRate ? parseFloat(taxRate) : 0,
            createdBy: userId,
            lastModifiedBy: userId
        });

        await newIncome.save();

        // Update user's last active timestamp
        await User.findByIdAndUpdate(userId, { lastActiveAt: new Date() });

        // Check if this income helps achieve savings goals
        const user = await User.findById(userId);
        let goalProgress = null;

        if (user?.savingsGoal?.target && !user.savingsGoal.achieved) {
            // Calculate current savings (simplified - total income minus total expenses)
            const [totalIncomeResult, totalExpenseResult] = await Promise.all([
                Income.aggregate([
                    { $match: { userId: newIncome.userId, deleted: false } },
                    { $group: { _id: null, total: { $sum: "$amount" } } }
                ]),
                require("../models/Expense").aggregate([
                    { $match: { userId: newIncome.userId, deleted: false } },
                    { $group: { _id: null, total: { $sum: "$amount" } } }
                ])
            ]);

            const totalIncome = totalIncomeResult[0]?.total || 0;
            const totalExpense = totalExpenseResult[0]?.total || 0;
            const currentSavings = totalIncome - totalExpense;

            const goalPercentage = (currentSavings / user.savingsGoal.target) * 100;

            goalProgress = {
                target: user.savingsGoal.target,
                current: currentSavings,
                percentage: goalPercentage.toFixed(1),
                achieved: currentSavings >= user.savingsGoal.target
            };

            // Update goal if achieved
            if (currentSavings >= user.savingsGoal.target && !user.savingsGoal.achieved) {
                user.savingsGoal.achieved = true;
                user.savingsGoal.achievedAt = new Date();
                await user.save();
                goalProgress.justAchieved = true;
            }
        }

        const response = {
            success: true,
            message: "Income added successfully",
            data: {
                income: newIncome.toSafeObject(),
                savingsGoalProgress: goalProgress,
                nextExpectedDate: newIncome.nextExpectedDate
            }
        };

        res.status(201).json(response);

        // Log income creation
        console.log('Income created:', {
            userId,
            incomeId: newIncome._id,
            source: newIncome.source,
            amount: incomeAmount,
            isRecurring: newIncome.isRecurring,
            ip: clientIP,
            timestamp: new Date().toISOString()
        });

    } catch (err) {
        console.error('Add income error:', {
            error: err.message,
            userId: req.user?.id,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
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
            message: "Failed to add income",
            ...(process.env.NODE_ENV === 'development' && { error: err.message })
        });
    }
};

// Get All Incomes with Enhanced Filtering and Analytics
exports.getAllIncome = async (req, res) => {
    try {
        const userId = req.user.id;
        const { 
            page = 1, 
            limit = 10, 
            source, 
            startDate, 
            endDate,
            minAmount,
            maxAmount,
            search,
            sortBy = 'date',
            sortOrder = 'desc',
            taxable,
            recurring,
            status
        } = req.query;

        // Build comprehensive filter
        const filter = { userId, deleted: false };
        
        if (source) {
            filter.source = { $regex: source, $options: 'i' };
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

        if (taxable !== undefined) {
            filter.taxable = taxable === 'true';
        }

        if (recurring !== undefined) {
            filter.isRecurring = recurring === 'true';
        }

        if (status) {
            filter.status = status;
        }

        // Text search across multiple fields
        if (search) {
            filter.$or = [
                { source: { $regex: search, $options: 'i' } },
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { 'client.name': { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Execute queries in parallel
        const [incomes, totalIncomes, totalAmount, sourceBreakdown, recurringIncomes] = await Promise.all([
            Income.find(filter)
                .sort(sortOptions)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),

            Income.countDocuments(filter),

            Income.aggregate([
                { $match: filter },
                { 
                    $group: { 
                        _id: null, 
                        totalGross: { $sum: "$amount" },
                        totalNet: { $sum: { $ifNull: ["$netAmount", "$amount"] } },
                        avgAmount: { $avg: "$amount" }
                    } 
                }
            ]),

            // Source breakdown
            Income.aggregate([
                { $match: filter },
                {
                    $group: {
                        _id: "$source",
                        total: { $sum: "$amount" },
                        count: { $sum: 1 },
                        avgAmount: { $avg: "$amount" },
                        recurring: { $sum: { $cond: ["$isRecurring", 1, 0] } }
                    }
                },
                { $sort: { total: -1 } }
            ]),

            // Get overdue recurring incomes
            Income.find({
                userId,
                deleted: false,
                isRecurring: true,
                status: 'pending',
                nextExpectedDate: { $lt: new Date() }
            }).lean()
        ]);

        // Format incomes with computed fields
        const formattedIncomes = incomes.map(income => ({
            ...income,
            id: income._id,
            formattedAmount: `${income.amount.toLocaleString()}`,
            formattedNetAmount: income.netAmount ? `${income.netAmount.toLocaleString()}` : null,
            taxAmount: income.taxable && income.taxRate ? income.amount * (income.taxRate / 100) : 0,
            ageInDays: Math.floor((Date.now() - income.date.getTime()) / (1000 * 60 * 60 * 24)),
            isOverdue: income.isRecurring && income.nextExpectedDate && income.nextExpectedDate < new Date()
        }));

        const totalPages = Math.ceil(totalIncomes / parseInt(limit));
        const responseData = {
            incomes: formattedIncomes,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalIncomes,
                limit: parseInt(limit),
                hasNext: parseInt(page) < totalPages,
                hasPrev: parseInt(page) > 1
            },
            summary: {
                totalGrossAmount: totalAmount[0]?.totalGross || 0,
                totalNetAmount: totalAmount[0]?.totalNet || 0,
                averageAmount: totalAmount[0]?.avgAmount || 0,
                count: formattedIncomes.length,
                sourceBreakdown: sourceBreakdown.slice(0, 10),
                overdueRecurring: recurringIncomes.length
            },
            alerts: {
                overdueIncomes: recurringIncomes.map(income => ({
                    id: income._id,
                    source: income.source,
                    amount: income.amount,
                    expectedDate: income.nextExpectedDate,
                    daysPastDue: Math.floor((Date.now() - income.nextExpectedDate.getTime()) / (1000 * 60 * 60 * 24))
                }))
            }
        };

        res.status(200).json({
            success: true,
            data: responseData
        });

        // Update user activity
        await User.findByIdAndUpdate(userId, { lastActiveAt: new Date() });

    } catch (err) {
        console.error('Get incomes error:', {
            error: err.message,
            userId: req.user?.id,
            timestamp: new Date().toISOString()
        });

        res.status(500).json({ 
            success: false,
            message: "Failed to retrieve incomes",
            ...(process.env.NODE_ENV === 'development' && { error: err.message })
        });
    }
};

// Update Income with Enhanced Validation
exports.updateIncome = async (req, res) => {
    try {
        const userId = req.user.id;
        const incomeId = req.params.id;
        const updateData = req.body;
        const clientIP = req.ip;

        // Find and verify ownership
        const existingIncome = await Income.findOne({ 
            _id: incomeId, 
            userId,
            deleted: false 
        });

        if (!existingIncome) {
            return res.status(404).json({
                success: false,
                message: "Income not found or access denied"
            });
        }

        // Validate critical updates
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
        if (!existingIncome.validateDataIntegrity()) {
            console.warn('Income data integrity violation:', {
                incomeId,
                userId,
                ip: clientIP,
                timestamp: new Date().toISOString()
            });
        }

        // Prepare update fields
        const updateFields = {};
        const allowedFields = ['icon', 'source', 'title', 'description', 'amount', 'date', 'tags', 'paymentMethod', 'client', 'isRecurring', 'recurringFrequency', 'taxable', 'taxRate', 'status'];
        
        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                if (field === 'amount') {
                    updateFields[field] = parseFloat(updateData[field]);
                    // Recalculate net amount if tax info exists
                    if (existingIncome.taxable && existingIncome.taxRate) {
                        updateFields.netAmount = updateFields[field] - (updateFields[field] * (existingIncome.taxRate / 100));
                    }
                } else if (field === 'taxRate') {
                    updateFields[field] = parseFloat(updateData[field]);
                    // Recalculate net amount
                    const amount = updateFields.amount || existingIncome.amount;
                    if (existingIncome.taxable) {
                        updateFields.netAmount = amount - (amount * (updateFields[field] / 100));
                    }
                } else if (field === 'date') {
                    updateFields[field] = new Date(updateData[field]);
                } else if (field === 'tags' && Array.isArray(updateData[field])) {
                    updateFields[field] = updateData[field].map(tag => tag.trim().toLowerCase());
                } else if (typeof updateData[field] === 'string') {
                    updateFields[field] = updateData[field].trim();
                } else {
                    updateFields[field] = updateData[field];
                }
            }
        });

        updateFields.lastModifiedBy = userId;

        const updatedIncome = await Income.findByIdAndUpdate(
            incomeId,
            updateFields,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: "Income updated successfully",
            data: {
                income: updatedIncome.toSafeObject(),
                changes: Object.keys(updateFields).filter(key => key !== 'lastModifiedBy')
            }
        });

        console.log('Income updated:', {
            userId,
            incomeId,
            changes: Object.keys(updateFields),
            ip: clientIP,
            timestamp: new Date().toISOString()
        });

    } catch (err) {
        console.error('Update income error:', {
            error: err.message,
            userId: req.user?.id,
            incomeId: req.params?.id,
            timestamp: new Date().toISOString()
        });

        res.status(500).json({ 
            success: false,
            message: "Failed to update income",
            ...(process.env.NODE_ENV === 'development' && { error: err.message })
        });
    }
};

// Soft Delete Income
exports.deleteIncome = async (req, res) => {
    try {
        const userId = req.user.id;
        const incomeId = req.params.id;
        const clientIP = req.ip;

        const income = await Income.findOne({ 
            _id: incomeId, 
            userId,
            deleted: false 
        });

        if (!income) {
            return res.status(404).json({
                success: false,
                message: "Income not found or already deleted"
            });
        }

        await income.softDelete(userId);

        res.status(200).json({ 
            success: true,
            message: "Income deleted successfully",
            data: {
                deletedIncome: {
                    id: income._id,
                    source: income.source,
                    amount: income.amount,
                    deletedAt: income.deletedAt
                }
            }
        });

        console.log('Income deleted:', {
            userId,
            incomeId,
            source: income.source,
            amount: income.amount,
            ip: clientIP,
            timestamp: new Date().toISOString()
        });

    } catch (err) {
        console.error('Delete income error:', {
            error: err.message,
            userId: req.user?.id,
            incomeId: req.params?.id,
            timestamp: new Date().toISOString()
        });

        res.status(500).json({ 
            success: false,
            message: "Failed to delete income",
            ...(process.env.NODE_ENV === 'development' && { error: err.message })
        });
    }
};

// Enhanced Excel Download
exports.downloadIncomeExcel = async (req, res) => {
    try {
        const userId = req.user.id;
        const { startDate, endDate, source, format = 'xlsx' } = req.query;
        const clientIP = req.ip;

        const filter = { userId, deleted: false };
        
        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }

        if (source) {
            filter.source = { $regex: source, $options: 'i' };
        }

        const incomes = await Income.find(filter).sort({ date: -1 }).lean();
        
        if (incomes.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No income records found for the specified criteria"
            });
        }

        const data = incomes.map((item, index) => ({
            'Sr. No.': index + 1,
            'Date': item.date.toLocaleDateString('en-US'),
            'Source': item.source,
            'Title': item.title || item.source,
            'Gross Amount': item.amount,
            'Net Amount': item.netAmount || item.amount,
            'Tax Rate %': item.taxRate || 0,
            'Payment Method': item.paymentMethod || 'Not specified',
            'Client': item.client?.name || '-',
            'Recurring': item.isRecurring ? 'Yes' : 'No',
            'Status': item.status || 'received',
            'Description': item.description || '-',
            'Tags': item.tags?.join(', ') || '-',
            'Created': item.createdAt.toLocaleDateString('en-US')
        }));

        // Summary calculations
        const totalGross = incomes.reduce((sum, inc) => sum + inc.amount, 0);
        const totalNet = incomes.reduce((sum, inc) => sum + (inc.netAmount || inc.amount), 0);
        const totalTax = totalGross - totalNet;
        const sources = [...new Set(incomes.map(inc => inc.source))];

        data.push({}, {
            'Sr. No.': 'SUMMARY',
            'Date': '',
            'Source': `${sources.length} sources`,
            'Title': '',
            'Gross Amount': '',
            'Net Amount': '',
            'Tax Rate %': '',
            'Payment Method': '',
            'Client': '',
            'Recurring': '',
            'Status': '',
            'Description': '',
            'Tags': '',
            'Created': ''
        }, {
            'Sr. No.': 'Total Records',
            'Date': incomes.length,
            'Source': 'Gross Total',
            'Title': totalGross.toFixed(2),
            'Gross Amount': 'Net Total',
            'Net Amount': totalNet.toFixed(2),
            'Tax Rate %': 'Tax Total',
            'Payment Method': totalTax.toFixed(2),
            'Client': '',
            'Recurring': '',
            'Status': '',
            'Description': '',
            'Tags': '',
            'Created': ''
        });

        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet(data);
        
        ws['!cols'] = [
            { width: 8 }, { width: 12 }, { width: 15 }, { width: 20 }, 
            { width: 12 }, { width: 12 }, { width: 10 }, { width: 15 }, 
            { width: 20 }, { width: 10 }, { width: 12 }, { width: 30 }, 
            { width: 20 }, { width: 12 }
        ];

        xlsx.utils.book_append_sheet(wb, ws, "Income");

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const filename = `income_${timestamp}_${userId.toString().slice(-6)}.${format}`;
        const filepath = path.join(process.env.UPLOAD_PATH || './uploads', 'exports', filename);

        const exportDir = path.dirname(filepath);
        if (!fs.existsSync(exportDir)) {
            fs.mkdirSync(exportDir, { recursive: true });
        }

        xlsx.writeFile(wb, filepath);

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        res.download(filepath, filename, (err) => {
            if (err) {
                console.error('Download error:', err);
                if (!res.headersSent) {
                    res.status(500).json({
                        success: false,
                        message: "Failed to download file"
                    });
                }
            } else {
                console.log('Income Excel downloaded:', {
                    userId,
                    filename,
                    recordCount: incomes.length,
                    ip: clientIP,
                    timestamp: new Date().toISOString()
                });

                setTimeout(() => {
                    cleanupFiles([filepath], { logCleanup: false });
                }, 30000);
            }
        });

    } catch (err) {
        console.error('Download income excel error:', {
            error: err.message,
            userId: req.user?.id,
            timestamp: new Date().toISOString()
        });

        if (!res.headersSent) {
            res.status(500).json({ 
                success: false,
                message: "Failed to generate income report",
                ...(process.env.NODE_ENV === 'development' && { error: err.message })
            });
        }
    }
};

module.exports = {
    addIncome: exports.addIncome,
    getAllIncome: exports.getAllIncome,
    updateIncome: exports.updateIncome,
    deleteIncome: exports.deleteIncome,
    downloadIncomeExcel: exports.downloadIncomeExcel
};