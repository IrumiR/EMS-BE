const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    commentId: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true, 
    },
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
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
    parentCommentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment', // Self-referencing for comment threads
        default: null,
    }
});

module.exports = mongoose.Model('Comment', commentSchema);