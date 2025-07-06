const express = require('express');
const { createInventoryItem, getAllInventoryItems, getInventoryItemById, getInventoryItemCount, getAllDropdown, updateInventoryItem, deleteInventoryItem, createReservation,getInventoryReportData, uploadInventoryImage } = require('../controllers/inventoryItemController');
const verifyToken = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');
const router = express.Router();

router.post("/create", verifyToken, authorizeRoles("admin", "manager", "team-member"), uploadInventoryImage, createInventoryItem);
router.get("/all", verifyToken, authorizeRoles("admin", "manager", "team-member"), getAllInventoryItems);
router.get("/report", verifyToken, authorizeRoles("admin"), getInventoryReportData);
router.get("/count", verifyToken, authorizeRoles("admin", "manager", "team-member"), getInventoryItemCount);
router.get("/all-dropdown", verifyToken, authorizeRoles("admin", "manager", "team-member"), getAllDropdown);
router.get("/:id", verifyToken, authorizeRoles("admin", "manager", "team-member"), getInventoryItemById);
router.put("/:id", verifyToken, authorizeRoles("admin", "manager", "team-member"), uploadInventoryImage, updateInventoryItem);
router.delete("/:id", verifyToken, authorizeRoles("admin", "manager"), deleteInventoryItem);
router.post("/reserve", verifyToken, authorizeRoles("admin", "manager", "team-member"), createReservation);

module.exports = router;