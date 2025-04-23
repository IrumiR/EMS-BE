const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    isChangeRequest: {
        type: Boolean,
        default: false,
    },
    attachments: {
        type: [String], 
        default: [],
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, { timestamps: true  });

module.exports = mongoose.Model('Comment', commentSchema);