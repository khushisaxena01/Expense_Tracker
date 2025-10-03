const Income = require("../models/Income");
const Expense = require("../models/Expense");
const User = require("../models/User");
const { isValidObjectId, Types } = require("mongoose");

// Enhanced Dashboard Data with Analytics
exports.getDashboardData = async (req, res) => {
    try {
        const userId = req.user.id;
        const { summaryOnly = false } = req.query;
        
        // Validate user ID
        if (!userId || !isValidObjectId(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user authentication"
            });
        }

        const userObjectId = new Types.ObjectId(String(userId));

        // Update user's last active timestamp
        await User.findByIdAndUpdate(userId, { lastActiveAt: new Date() });

        // Define date ranges for analysis
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

        // Parallel execution for optimal performance
        const [
            totalIncomeResult,
            totalExpenseResult,
            currentMonthIncomeResult,
            currentMonthExpenseResult,
            lastMonthIncomeResult,
            lastMonthExpenseResult,
            recentTransactions
        ] = await Promise.all([
            // Total lifetime income
            Income.aggregate([
                { $match: { userId: userObjectId, deleted: false } },
                { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
            ]),
            
            // Total lifetime expenses
            Expense.aggregate([
                { $match: { userId: userObjectId, deleted: false } },
                { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
            ]),

            // Current month income
            Income.aggregate([
                { $match: { userId: userObjectId, deleted: false, date: { $gte: currentMonthStart } } },
                { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
            ]),

            // Current month expenses
            Expense.aggregate([
                { $match: { userId: userObjectId, deleted: false, date: { $gte: currentMonthStart } } },
                { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
            ]),

            // Last month income
            Income.aggregate([
                { $match: { userId: userObjectId, deleted: false, date: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
                { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
            ]),

            // Last month expenses
            Expense.aggregate([
                { $match: { userId: userObjectId, deleted: false, date: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
                { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
            ]),

            // Recent transactions (combined and sorted)
            Promise.all([
                Income.find({ userId, deleted: false })
                    .sort({ date: -1 })
                    .limit(summaryOnly ? 3 : 10)
                    .lean(),
                Expense.find({ userId, deleted: false })
                    .sort({ date: -1 })
                    .limit(summaryOnly ? 3 : 10)
                    .lean()
            ])
        ]);

        // Calculate basic metrics
        const totalIncome = totalIncomeResult[0]?.total || 0;
        const totalExpense = totalExpenseResult[0]?.total || 0;
        const totalBalance = totalIncome - totalExpense;
        
        const currentMonthIncome = currentMonthIncomeResult[0]?.total || 0;
        const currentMonthExpense = currentMonthExpenseResult[0]?.total || 0;
        const currentMonthBalance = currentMonthIncome - currentMonthExpense;
        
        const lastMonthIncome = lastMonthIncomeResult[0]?.total || 0;
        const lastMonthExpense = lastMonthExpenseResult[0]?.total || 0;

        // Calculate month-over-month growth
        const incomeGrowth = lastMonthIncome > 0 
            ? ((currentMonthIncome - lastMonthIncome) / lastMonthIncome * 100).toFixed(2)
            : currentMonthIncome > 0 ? 100 : 0;

        const expenseGrowth = lastMonthExpense > 0 
            ? ((currentMonthExpense - lastMonthExpense) / lastMonthExpense * 100).toFixed(2)
            : currentMonthExpense > 0 ? 100 : 0;

        // Combine and format recent transactions
        const [recentIncomes, recentExpenses] = recentTransactions;
        const formattedTransactions = [
            ...recentIncomes.map(txn => ({
                id: txn._id,
                type: "income",
                title: txn.title || txn.source,
                category: txn.source,
                amount: txn.amount,
                date: txn.date,
                description: txn.description,
                icon: txn.icon,
                createdAt: txn.createdAt
            })),
            ...recentExpenses.map(txn => ({
                id: txn._id,
                type: "expense",
                title: txn.title || txn.category,
                category: txn.category,
                amount: txn.amount,
                date: txn.date,
                description: txn.description,
                icon: txn.icon,
                createdAt: txn.createdAt
            }))
        ]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, summaryOnly ? 5 : 15);

        // Basic response for summary requests
        if (summaryOnly) {
            return res.status(200).json({
                success: true,
                data: {
                    summary: {
                        totalBalance,
                        totalIncome,
                        totalExpense,
                        currentMonthBalance,
                        currentMonthIncome,
                        currentMonthExpense
                    },
                    recentTransactions: formattedTransactions,
                    metadata: {
                        lastUpdated: new Date(),
                        userId,
                        isSummary: true
                    }
                }
            });
        }

        // Enhanced analytics for full dashboard
        const [
            expensesByCategory,
            incomesBySource,
            monthlyTrends,
            weeklyTrends
        ] = await Promise.all([
            // Top expense categories
            Expense.getCategoryBreakdown(userId, sixtyDaysAgo, now),
            
            // Top income sources
            Income.getSourceBreakdown(userId, sixtyDaysAgo, now),
            
            // Monthly trends (last 12 months)
            Promise.all([
                Income.getIncometrends(userId, 12),
                Expense.getSpendingTrends(userId, 12)
            ]),
            
            // Weekly trends (last 8 weeks)
            Promise.all([
                Income.aggregate([
                    { $match: { userId: userObjectId, deleted: false, date: { $gte: new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000) } } },
                    {
                        $group: {
                            _id: { 
                                week: { $week: "$date" },
                                year: { $year: "$date" }
                            },
                            total: { $sum: "$amount" },
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { "_id.year": 1, "_id.week": 1 } }
                ]),
                Expense.aggregate([
                    { $match: { userId: userObjectId, deleted: false, date: { $gte: new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000) } } },
                    {
                        $group: {
                            _id: { 
                                week: { $week: "$date" },
                                year: { $year: "$date" }
                            },
                            total: { $sum: "$amount" },
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { "_id.year": 1, "_id.week": 1 } }
                ])
            ])
        ]);

        const [monthlyIncomeData, monthlyExpenseData] = monthlyTrends;
        const [weeklyIncomeData, weeklyExpenseData] = weeklyTrends;

        // Calculate financial health indicators
        const savingsRate = totalIncome > 0 ? ((totalBalance / totalIncome) * 100).toFixed(2) : 0;
        const expenseRatio = currentMonthIncome > 0 ? ((currentMonthExpense / currentMonthIncome) * 100).toFixed(2) : 0;
        
        // Determine financial health status
        const getFinancialHealthStatus = () => {
            if (totalBalance < 0) return { status: 'critical', message: 'Spending exceeds income' };
            if (savingsRate < 10) return { status: 'warning', message: 'Low savings rate' };
            if (savingsRate >= 20) return { status: 'excellent', message: 'Great financial health' };
            return { status: 'good', message: 'Healthy financial position' };
        };

        // Comprehensive dashboard response
        const dashboardData = {
            summary: {
                totalBalance,
                totalIncome,
                totalExpense,
                savingsRate: parseFloat(savingsRate),
                currentMonth: {
                    income: currentMonthIncome,
                    expense: currentMonthExpense,
                    balance: currentMonthBalance,
                    expenseRatio: parseFloat(expenseRatio)
                },
                growth: {
                    income: parseFloat(incomeGrowth),
                    expense: parseFloat(expenseGrowth)
                },
                financialHealth: getFinancialHealthStatus()
            },
            
            analytics: {
                topExpenseCategories: expensesByCategory.slice(0, 10),
                topIncomeSources: incomesBySource.slice(0, 10),
                monthlyTrends: {
                    income: monthlyIncomeData,
                    expense: monthlyExpenseData
                },
                weeklyTrends: {
                    income: weeklyIncomeData,
                    expense: weeklyExpenseData
                }
            },
            
            recentActivity: {
                transactions: formattedTransactions,
                summary: {
                    totalTransactions: formattedTransactions.length,
                    incomeTransactions: formattedTransactions.filter(t => t.type === 'income').length,
                    expenseTransactions: formattedTransactions.filter(t => t.type === 'expense').length
                }
            },
            
            insights: {
                averageMonthlyIncome: monthlyIncomeData.length > 0 
                    ? (monthlyIncomeData.reduce((sum, month) => sum + month.total, 0) / monthlyIncomeData.length).toFixed(2)
                    : 0,
                averageMonthlyExpense: monthlyExpenseData.length > 0 
                    ? (monthlyExpenseData.reduce((sum, month) => sum + month.total, 0) / monthlyExpenseData.length).toFixed(2)
                    : 0,
                topSpendingCategory: expensesByCategory[0]?._id || 'N/A',
                topIncomeSource: incomesBySource[0]?._id || 'N/A'
            },
            
            metadata: {
                lastUpdated: new Date(),
                userId,
                currency: 'USD', // Can be made dynamic from user preferences
                timeZone: 'UTC',
                dataRange: {
                    from: sixtyDaysAgo,
                    to: now
                }
            }
        };

        res.status(200).json({
            success: true,
            data: dashboardData
        });

        // Log dashboard access for analytics
        console.log("Dashboard accessed:", {
            userId,
            summaryOnly,
            timestamp: new Date().toISOString(),
            totalBalance,
            financialHealth: dashboardData.summary.financialHealth.status
        });

    } catch (error) {
        console.error('Dashboard data error:', {
            error: error.message,
            userId: req.user?.id,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            timestamp: new Date().toISOString()
        });

        res.status(500).json({ 
            success: false,
            message: "Unable to load dashboard data",
            code: "DASHBOARD_ERROR",
            ...(process.env.NODE_ENV === 'development' && { 
                error: error.message 
            })
        });
    }
};