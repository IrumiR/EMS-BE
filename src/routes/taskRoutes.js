const express = require("express");
const { createTask, getAllTasks, getTaskById, updateTask, deleteTask } = require("../controllers/taskController");
const verifyToken = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');
const router = express.Router();

router.post("/create", verifyToken, authorizeRoles("admin", "manager", "team-member"), createTask);
router.get("/all", verifyToken, authorizeRoles("admin", "manager"), getAllTasks);
router.get("/:id", verifyToken, authorizeRoles("admin", "manager", "team-member"), getTaskById);
router.put("/:id", verifyToken, authorizeRoles("admin", "manager", "team-member"), updateTask);
router.delete("/:id", verifyToken, authorizeRoles("admin", "manager"), deleteTask);

module.exports = router;