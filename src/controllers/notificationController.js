const Notification = require('../models/notificationModel');

const sendNotification = async ({ recipients, type, message }) => {
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
        })
            .sort({ createdAt: -1 })

        res.status(200).json({
            count: notifications.length,
            notifications
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


module.exports = { sendNotification ,getUserNotifications };
