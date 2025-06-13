const express = require("express");
const { createEvent, getAllEvents, getEventById, getEventsDropdown,updateEvent, deleteEvent, updateStatus,getMonthlyEvents, getEventReportData, getEventUpcomingData, getEventCountsByStatus, getMonthlyEventCounts } = require("../controllers/eventController");
const verifyToken = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');
const router = express.Router();

router.post("/create", verifyToken, authorizeRoles("admin", "manager"), createEvent);
router.get("/all", verifyToken, authorizeRoles("admin", "manager", "client"), getAllEvents);
router.get("/report", verifyToken, authorizeRoles("admin"), getEventReportData);
router.get("/upcoming", verifyToken, authorizeRoles("admin"), getEventUpcomingData);
router.get("/events-count", verifyToken, authorizeRoles("admin"), getMonthlyEventCounts);
router.get("/events-count-by-status", verifyToken, authorizeRoles("admin"), getEventCountsByStatus);
router.get("/monthly", verifyToken, authorizeRoles("admin", "manager", "client"), getMonthlyEvents); 
router.get("/dropdown/events", verifyToken, authorizeRoles("admin", "manager"), getEventsDropdown);
router.get("/:id", verifyToken, authorizeRoles("admin", "manager", "client"), getEventById);
router.put("/:id", verifyToken, authorizeRoles("admin", "manager"), updateEvent);
router.put("/status/:id", verifyToken, authorizeRoles("admin", "manager"), updateStatus);
router.delete("/:id", verifyToken, authorizeRoles("admin", "manager"), deleteEvent);

module.exports = router;