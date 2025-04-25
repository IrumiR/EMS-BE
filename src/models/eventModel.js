const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    eventName: {
        type: String,
        required: true,
    },
    eventType: {
        type: [String],
        required: true,
    },
    eventDescription: {
        type: String,
    },
    eventImage: {
        type: String,
        required: false,
    },
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        required: true,
    },
    proposedLocation: {
        type: String,
        default: null, // Nullable field
    },
    status: {
        type: String,
        enum: ["Pending Approval", "Approved", "InProgress", "Hold", "Completed", "Cancelled"],
        default: "Pending Approval",
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true,
    },
    quotationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quotation',
        required: false,
    },
    feedbackId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Feedback',
        required: false,
    },
    assignees: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Assignees',
            required: false,
        },
    ],
    tasks: [
        {
            taskId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Task',
                required: false,
            },
            taskName: {
                type: String,
                required: true,
            },
            assigneeId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Assignees',
                required: false,
            },
            commentId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Comment',
                required: false,
            },
        }
    ],
    inventoryItems: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'InventoryItem',
            required: false,
        },
    ],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    }
}, { timestamps: true });


module.exports = mongoose.model('Event', eventSchema);