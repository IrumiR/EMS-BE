const express = require("express");
const { createTask, getAllTasks, getTaskById, getAllTasksByEventId, updateTask, updateStatus, updatePriority, deleteTask, calculateAndUpdateEventProgress } = require("../controllers/taskController");
const verifyToken = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');
const router = express.Router();

router.post("/create", verifyToken, authorizeRoles("admin", "manager", "team-member"), createTask);
router.get("/all", verifyToken, authorizeRoles("admin", "manager", "client"), getAllTasks);
router.get("/:id", verifyToken, authorizeRoles("admin", "manager", "team-member", "client"), getTaskById);
router.get("/all/:eventId", verifyToken, authorizeRoles("admin", "manager", "team-member"), getAllTasksByEventId);
router.put("/status/:id", verifyToken, authorizeRoles("admin", "manager", "team-member"), updateStatus);
router.put("/priority/:id", verifyToken, authorizeRoles("admin", "manager", "team-member"), updatePriority);
router.put("/:id", verifyToken, authorizeRoles("admin", "manager", "team-member"), updateTask);
router.delete("/:id", verifyToken, authorizeRoles("admin", "manager"), deleteTask);

module.exports = router;