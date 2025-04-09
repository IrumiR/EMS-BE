const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    notificationId: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true, // Auto-generates a unique ObjectId
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    content: {
        type: String,
        required: true,
    },
    sourceType: {
        type: String,
        enum: ["Event", "Task", "Comment", "Quotation"],
        required: true,
    },
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true,
    },
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        default: null, // Nullable field
    },
    isRead: {
        type: Boolean,
        default: false,
    }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);