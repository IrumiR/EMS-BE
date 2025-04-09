const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true, 
    },
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event', 
        required: true,
    },
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
    assigneeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
        required: true,
    },
    subTasks: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Task', 
        }
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

module.exports = mongoose.model('Task', taskSchema);