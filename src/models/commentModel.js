const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        required: true,
    },
    commentText: {
        type: String,
        required: false,
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    parentCommentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
        default: null // Null means it's a root comment, otherwise it's a reply
    },
    images: [
        {
            data: Buffer,
            contentType: String
        }
      ]
}, { 
    timestamps: true  
});

module.exports = mongoose.model('Comment', commentSchema);