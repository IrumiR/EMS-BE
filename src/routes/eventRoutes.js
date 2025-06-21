const express = require("express");
const { createEvent, getAllEvents, getEventById, getEventsDropdown,updateEvent, deleteEvent, updateStatus,getMonthlyEvents, getEventReportData, getEventUpcomingData, getEventCountsByStatus, getMonthlyEventCounts } = require("../controllers/eventController");
const verifyToken = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');
const router = express.Router();

router.post("/create", verifyToken, authorizeRoles("admin", "manager"), createEvent);
router.get("/all", verifyToken, authorizeRoles("admin", "manager", "team-member", "client"), getAllEvents);
router.get("/report", verifyToken, authorizeRoles("admin"), getEventReportData);
router.get("/upcoming", verifyToken, authorizeRoles("admin", "manager", "team-member"), getEventUpcomingData);
router.get("/events-count", verifyToken, authorizeRoles("admin", "manager", "team-member", "client"), getMonthlyEventCounts);
router.get("/events-count-by-status", verifyToken, authorizeRoles("admin", "manager", "team-member", "client"), getEventCountsByStatus);
router.get("/monthly", verifyToken, authorizeRoles("admin", "manager", "team-member", "client"), getMonthlyEvents);
router.get("/dropdown/events", verifyToken, authorizeRoles("admin", "manager", "team-member", "client"), getEventsDropdown);
router.get("/:id", verifyToken, authorizeRoles("admin", "manager", "team-member", "client"), getEventById);
router.put("/:id", verifyToken, authorizeRoles("admin", "manager"), updateEvent);
router.put("/status/:id", verifyToken, authorizeRoles("admin", "manager"), updateStatus);
router.delete("/:id", verifyToken, authorizeRoles("admin", "manager"), deleteEvent);

module.exports = router;