const express = require('express');
const { getUserNotifications, markNotificationAsRead } = require('../controllers/notificationController');
const verifyToken = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');
const router = express.Router();

router.get('/:userId', verifyToken, authorizeRoles("admin", "manager", "team-member", "client"), getUserNotifications);
router.patch('/read', markNotificationAsRead);

module.exports = router;