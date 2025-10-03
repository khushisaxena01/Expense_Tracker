const express = require("express");
const { authenticateToken } = require("../middleware/authMiddleware");
const { 
    apiRateLimit,
    validateQueryParams,
    validateDateRange 
} = require("../middleware/validation");
const { getDashboardData } = require("../controllers/dashboardController");

const router = express.Router();

// Get dashboard data with enhanced security and validation
router.get("/", 
    apiRateLimit,
    authenticateToken,
    validateQueryParams,
    validateDateRange,
    getDashboardData
);

// Get dashboard summary (lightweight version)
router.get("/summary",
    apiRateLimit,
    authenticateToken,
    async (req, res) => {
        try {
            // This could be a lighter version of dashboard data
            // that only returns essential metrics
            req.summaryOnly = true;
            await getDashboardData(req, res);
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Error fetching dashboard summary",
                ...(process.env.NODE_ENV === 'development' && { error: error.message })
            });
        }
    }
);

module.exports = router;