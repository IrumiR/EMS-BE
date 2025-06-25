const Notification = require('../models/notificationModel');

const sendNotification = async ({ recipients, type, message, sender }) => {
    try {
        // Normalize recipients
        if (!recipients) {
            throw new Error('Recipients are required to send a notification.');
        }

        if (!Array.isArray(recipients)) {
            recipients = [recipients];
        }

        if (recipients.length === 0 || !recipients[0]) {
            throw new Error('At least one recipient must be specified.');
        }

        const notification = new Notification({
            recipients,
            type,
            message,
            sender
        });

        await notification.save();

        console.log(`🔔 Notification sent to users: ${recipients.join(', ')}`);
        return notification;
    } catch (error) {
        console.error("Error sending notification:", error);
    }
};


const getUserNotifications = async (req, res) => {
    try {
        const userId = req.params.userId;

        const notifications = await Notification.find({
            recipients: userId
        }).sort({ createdAt: -1 })
        .populate('sender', 'userName');

        const unreadCount = notifications.filter(
            (n) => !n.readBy.map(id => id.toString()).includes(userId)
        ).length;

        res.status(200).json({
            count: notifications.length,
            unreadCount,
            notifications
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


const markNotificationAsRead = async (req, res) => {
    const { userId, notificationIds } = req.body;

    if (!userId || !Array.isArray(notificationIds) || notificationIds.length === 0) {
        return res.status(400).json({ message: "userId and an array of notificationIds are required." });
    }

    try {
        const result = await Notification.updateMany(
            {
                _id: { $in: notificationIds },
                readBy: { $ne: userId } // only update if not already in readBy
            },
            {
                $addToSet: { readBy: userId } // avoids duplicates
            }
        );

        res.status(200).json({
            message: "Notifications marked as read.",
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error("Error marking notifications as read:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};



module.exports = { sendNotification, getUserNotifications, markNotificationAsRead };
