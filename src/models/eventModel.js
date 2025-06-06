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
    startTime: {
        type: String,
        required: false,
    },
    endTime: {
        type: String,
        required: false,
    },
    proposedLocation: {
        type: String,
        default: null, // Nullable field
    },
    status: {
        type: String,
        enum: ["Pending Approval", "Approved", "In Progress", "Hold", "Completed", "Cancelled"],
        default: "Pending Approval",
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
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
    progress: {
        type: Number,
        default: 0,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    }
}, { timestamps: true });


module.exports = mongoose.model('Event', eventSchema);