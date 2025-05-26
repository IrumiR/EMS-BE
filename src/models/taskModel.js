const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    taskName: {
        type: String,
        required: true,
    },
    taskDescription: {
        type: String,
    },
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        required: true,
    },
    status: {
        type: String,
        enum: ["To Do", "In Progress", "Completed", "Over Due", "Cancelled"],
        default: "To Do",
    },
    priority: {
        type: String,
        enum: ["Low", "Medium", "High"],
        default: "Low",
    },
    assignees: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false,
        }
    ],
    inventoryItems: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'InventoryItem',
            required: false,
        },
    ],
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true,
    },
    subTasks: {
        type: [String],
        required: false,
    },
    comments: [
        {
            commentId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Comment',
                required: false,
            },
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: false,
            },
            attachments: {
                type: [String],
            },
            isChangeRequest: {
                type: Boolean,
                default: false,
            },
            timestamp: {
                type: Date,
                default: Date.now,
            },
        }
    ],
    feedback: [
        {
            feedbackId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Feedback',
                required: false,
            },
            isChangeRequest: {
                type: Boolean,
                default: false,
            },
            timestamp: {
                type: Date,
                default: Date.now,
            },
        }
    ],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    }
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);