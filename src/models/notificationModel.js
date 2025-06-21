const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipients: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    }],
    type: {
        type: String,
        enum: ['comment', 'reply', 'task', 'event'],
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    readBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: []
    }]
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
