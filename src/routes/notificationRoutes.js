const express = require('express');
const { getUserNotifications } = require('../controllers/notificationController');
const verifyToken = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');
const router = express.Router();

router.get('/:userId', verifyToken, authorizeRoles("admin", "manager", "team-member", "client"), getUserNotifications);


module.exports = router;