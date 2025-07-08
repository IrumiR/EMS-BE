const express = require("express");
const { createTask, getAllTasksByUserId, getTaskById, getAllTasksByEventId, getTaskCountsByStatus, updateTask, updateStatus, updatePriority, deleteTask, getUpcomingTasksByClientId, getTaskStatusCountsByClientId, getMonthlyTasks } = require("../controllers/taskController");
const verifyToken = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');
const router = express.Router();

router.post("/create", verifyToken, authorizeRoles("admin", "manager", "team-member"), createTask);
router.get("/all", verifyToken, authorizeRoles("admin", "manager", "team-member", "client"), getAllTasksByUserId);
router.get("/counts-by-status", verifyToken, authorizeRoles("admin", "manager", "team-member", "client"), getTaskCountsByStatus);
router.get("/upcoming-tasks/:clientId", verifyToken, authorizeRoles("admin", "manager", "team-member", "client"), getUpcomingTasksByClientId);
router.get("/status-counts/:clientId", verifyToken, authorizeRoles("admin", "manager", "team-member", "client"), getTaskStatusCountsByClientId);
router.get("/monthly", verifyToken, authorizeRoles("admin", "manager", "team-member", "client"), getMonthlyTasks);
router.get("/:id", verifyToken, authorizeRoles("admin", "manager", "team-member", "client"), getTaskById);
router.get("/all-by-event/:eventId", verifyToken, authorizeRoles("admin", "manager", "team-member", "client"), getAllTasksByEventId);
router.put("/status/:id", verifyToken, authorizeRoles("admin", "manager", "team-member"), updateStatus);
router.put("/priority/:id", verifyToken, authorizeRoles("admin", "manager", "team-member"), updatePriority);
router.put("/:id", verifyToken, authorizeRoles("admin", "manager", "team-member"), updateTask);
router.delete("/:id", verifyToken, authorizeRoles("admin", "manager"), deleteTask);

module.exports = router;