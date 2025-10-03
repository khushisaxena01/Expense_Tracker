const express = require("express");
const {
   addExpense,
   getAllExpense,
   deleteExpense,
   downloadExpenseExcel,
   updateExpense
} = require("../controllers/expenseController");
const { authenticateToken } = require("../middleware/authMiddleware");
const { 
    validateExpense,
    validateQueryParams,
    validateObjectId,
    validateDateRange,
    apiRateLimit,
    sanitizeInput,
    validateContentType
} = require("../middleware/validation");

const router = express.Router();

// Add expense with comprehensive validation
router.post("/add", 
    apiRateLimit,
    authenticateToken,
    sanitizeInput,
    validateContentType('application/json'),
    validateExpense,
    addExpense
);

// Get all expenses with query validation
router.get("/get", 
    apiRateLimit,
    authenticateToken,
    validateQueryParams,
    validateDateRange,
    getAllExpense
);

// Get single expense by ID
router.get("/:id",
    apiRateLimit,
    authenticateToken,
    validateObjectId,
    async (req, res) => {
        try {
            // This would need to be implemented in expenseController
            res.status(501).json({
                success: false,
                message: "Get single expense endpoint not implemented yet"
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Error fetching expense",
                ...(process.env.NODE_ENV === 'development' && { error: error.message })
            });
        }
    }
);

// Update expense with validation
router.put("/:id", 
    apiRateLimit,
    authenticateToken,
    sanitizeInput,
    validateContentType('application/json'),
    validateObjectId,
    validateExpense,
    updateExpense
);

// Delete expense
router.delete("/:id", 
    apiRateLimit,
    authenticateToken,
    validateObjectId,
    deleteExpense
);

// Download expense Excel with date filtering
router.get("/download/excel", 
    apiRateLimit,
    authenticateToken,
    validateQueryParams,
    validateDateRange,
    downloadExpenseExcel
);

// Bulk operations
router.post("/bulk-delete",
    apiRateLimit,
    authenticateToken,
    sanitizeInput,
    validateContentType('application/json'),
    (req, res) => {
        // Validate array of IDs
        const { ids } = req.body;
        
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please provide an array of expense IDs"
            });
        }
        
        if (ids.length > 50) {
            return res.status(400).json({
                success: false,
                message: "Cannot delete more than 50 expenses at once"
            });
        }
        
        // This would need to be implemented in expenseController
        res.status(501).json({
            success: false,
            message: "Bulk delete functionality not implemented yet"
        });
    }
);

// Get expense statistics
router.get("/stats/summary",
    apiRateLimit,
    authenticateToken,
    validateQueryParams,
    validateDateRange,
    async (req, res) => {
        try {
            // This would need to be implemented in expenseController
            res.status(501).json({
                success: false,
                message: "Expense statistics endpoint not implemented yet"
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Error fetching expense statistics",
                ...(process.env.NODE_ENV === 'development' && { error: error.message })
            });
        }
    }
);

module.exports = router;