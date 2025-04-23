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
        enum: ["NotStarted", "InProgress", "Completed", "Delayed", "Cancelled"],
        default: "NotStarted",
    },
    budget: {
        type: Number,
        required: true,
    },
    assignees: [
        {
            assigneeId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Assignees',
                required: true,
            },
            role: {
                type: String,
                required: true,
                enum: ["manager", "team-member"],
            },
        }
    ],
    event: [
        {
            eventId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Event',
                required: true,
            }
        }
    ],
    subTasks: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Task',
        }
    ],
    comments: [
        {
            commentId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Comment',
                required: true,
            },
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
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
                required: true,
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