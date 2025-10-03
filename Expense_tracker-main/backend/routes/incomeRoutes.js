const express = require("express");
const {
   addIncome,
   getAllIncome,
   deleteIncome,
   downloadIncomeExcel,
   updateIncome
} = require("../controllers/incomeController");
const { authenticateToken } = require("../middleware/authMiddleware");
const { 
    validateIncome,
    validateQueryParams,
    validateObjectId,
    validateDateRange,
    apiRateLimit,
    sanitizeInput,
    validateContentType
} = require("../middleware/validation");

const router = express.Router();

// Add income with comprehensive validation
router.post("/add", 
    apiRateLimit,
    authenticateToken,
    sanitizeInput,
    validateContentType('application/json'),
    validateIncome,
    addIncome
);

// Get all incomes with query validation
router.get("/get", 
    apiRateLimit,
    authenticateToken,
    validateQueryParams,
    validateDateRange,
    getAllIncome
);

// Get single income by ID
router.get("/:id",
    apiRateLimit,
    authenticateToken,
    validateObjectId,
    async (req, res) => {
        try {
            // This would need to be implemented in incomeController
            res.status(501).json({
                success: false,
                message: "Get single income endpoint not implemented yet"
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Error fetching income",
                ...(process.env.NODE_ENV === 'development' && { error: error.message })
            });
        }
    }
);

// Update income with validation
router.put("/:id", 
    apiRateLimit,
    authenticateToken,
    sanitizeInput,
    validateContentType('application/json'),
    validateObjectId,
    validateIncome,
    updateIncome
);

// Delete income
router.delete("/:id", 
    apiRateLimit,
    authenticateToken,
    validateObjectId,
    deleteIncome
);

// Download income Excel with date filtering
router.get("/download/excel", 
    apiRateLimit,
    authenticateToken,
    validateQueryParams,
    validateDateRange,
    downloadIncomeExcel
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
                message: "Please provide an array of income IDs"
            });
        }
        
        if (ids.length > 50) {
            return res.status(400).json({
                success: false,
                message: "Cannot delete more than 50 income records at once"
            });
        }
        
        // This would need to be implemented in incomeController
        res.status(501).json({
            success: false,
            message: "Bulk delete functionality not implemented yet"
        });
    }
);

// Get income statistics
router.get("/stats/summary",
    apiRateLimit,
    authenticateToken,
    validateQueryParams,
    validateDateRange,
    async (req, res) => {
        try {
            // This would need to be implemented in incomeController
            res.status(501).json({
                success: false,
                message: "Income statistics endpoint not implemented yet"
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Error fetching income statistics",
                ...(process.env.NODE_ENV === 'development' && { error: error.message })
            });
        }
    }
);

// Get income sources summary
router.get("/sources/summary",
    apiRateLimit,
    authenticateToken,
    async (req, res) => {
        try {
            // This would return a summary of different income sources
            res.status(501).json({
                success: false,
                message: "Income sources summary endpoint not implemented yet"
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Error fetching income sources",
                ...(process.env.NODE_ENV === 'development' && { error: error.message })
            });
        }
    }
);

module.exports = router;