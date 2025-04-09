const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    eventName: {
        type: String,
        required: true,
    },
    eventType: {
        type: String,
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
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    assignees: {
        manager: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false,
        },
        teamMembers: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: false,
            },
        ],
    },
    tasks: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Task',
            required: false,
        },
    ],
    comments:{
       type: mongoose.Schema.Types.ObjectId,
       ref: 'Comment',
       required: false
    },
    status: {
        type: String,
        enum: ["Draft", "PendingApproval", "Approved", "InProgress", "Completed", "Cancelled"],
        default: "Draft",
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    }
}, { timestamps: true });


module.exports = mongoose.model('Event', eventSchema);