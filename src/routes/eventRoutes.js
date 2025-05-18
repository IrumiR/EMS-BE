const express = require("express");
const { createEvent, getAllEvents, getEventById, updateEvent, deleteEvent, updateStatus } = require("../controllers/eventController");
const verifyToken = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');
const router = express.Router();

router.post("/create", verifyToken, authorizeRoles("admin", "manager"), createEvent);
router.get("/all", verifyToken, authorizeRoles("admin", "manager"), getAllEvents);
router.get("/:id", verifyToken, authorizeRoles("admin", "manager"), getEventById);
router.put("/:id", verifyToken, authorizeRoles("admin", "manager"), updateEvent);
router.put("/status/:id", verifyToken, authorizeRoles("admin", "manager"), updateStatus);
router.delete("/:id", verifyToken, authorizeRoles("admin", "manager"), deleteEvent);

module.exports = router;