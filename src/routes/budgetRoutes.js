const express = require('express');
const { createBudget, getAllBudgets,getBudgetReportData, getBudgetById, updateBudget, updateStatus, deleteBudget } = require('../controllers/budgetController');
const verifyToken = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');
const router = express.Router();

router.post('/create', verifyToken, authorizeRoles("admin", "manager"), createBudget);
router.get('/all', verifyToken, authorizeRoles("admin", "manager"), getAllBudgets);
router.get('/report', verifyToken, authorizeRoles("admin"), getBudgetReportData);
router.get('/:id', verifyToken, authorizeRoles("admin", "manager"), getBudgetById);
router.put('/:id', verifyToken, authorizeRoles("admin", "manager"), updateBudget);
router.put('/status/:id', verifyToken, authorizeRoles("admin", "manager", "client"), updateStatus);
router.delete('/:id', verifyToken, authorizeRoles("admin", "manager"), deleteBudget);

module.exports = router;