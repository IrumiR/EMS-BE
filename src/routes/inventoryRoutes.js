const express = require('express');
const { createInventoryItem, getAllInventoryItems, getInventoryItemById, getAllDropdown, updateInventoryItem, deleteInventoryItem, createReservation,getInventoryReportData } = require('../controllers/inventoryItemController');
const verifyToken = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');
const router = express.Router();

router.post("/create", verifyToken, authorizeRoles("admin", "manager", "team-member"), createInventoryItem);
router.get("/all", verifyToken, authorizeRoles("admin", "manager", "team-member"), getAllInventoryItems);
router.get("/report", verifyToken, authorizeRoles("admin"), getInventoryReportData);
router.get("/all", verifyToken, authorizeRoles("admin", "manager", "team-member"), getAllInventoryItems);
router.get("/:id", verifyToken, authorizeRoles("admin", "manager", "team-member"), getInventoryItemById);
router.put("/:id", verifyToken, authorizeRoles("admin", "manager", "team-member"), updateInventoryItem);
router.delete("/:id", verifyToken, authorizeRoles("admin", "manager"), deleteInventoryItem);
router.post("/reserve", verifyToken, authorizeRoles("admin", "manager", "team-member"), createReservation);

module.exports = router;