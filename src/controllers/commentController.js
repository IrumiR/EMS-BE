const Comment = require('../models/commentModel');
const Task = require('../models/taskModel');

const createComment = async (req, res) => {
    try {
        const { taskId, commentText, createdBy } = req.body;

        // Step 1: Create and save the new comment
        const newComment = new Comment({
            taskId,
            commentText,
            createdBy,
        });

        const savedComment = await newComment.save();

        // Step 2: Add this comment to the associated task
        await Task.findByIdAndUpdate(
            taskId,
            {
                $push: {
                    comments: savedComment._id
                }
            },
            { new: true, useFindAndModify: false }
        );

        res.status(201).json({
            message: "Comment created successfully and added to the task",
            comment: savedComment
        });
    } catch (error) {
        console.error("Error creating comment:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const getCommentsByTaskId = async (req, res) => {
    try {
        const { taskId } = req.params;

        const comments = await Comment.find({ taskId, parentCommentId: null })
            .populate('createdBy', 'userName')
            .sort({ createdAt: -1 });

        const commentIds = comments.map(c => c._id);
        const replies = await Comment.find({ parentCommentId: { $in: commentIds } })
            .populate('createdBy', 'userName');

        const replyMap = {};
        for (const reply of replies) {
            const parentId = reply.parentCommentId.toString();
            if (!replyMap[parentId]) replyMap[parentId] = [];
            replyMap[parentId].push(reply);
        }

        const result = comments.map(comment => ({
            ...comment.toObject(),
            replies: replyMap[comment._id.toString()] || []
        }));

        res.status(200).json(result);
    } catch (error) {
        console.error("Error fetching comments:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


const addReplyToComment = async (req, res) => {
    try {
        const { commentId } = req.params; // parent comment ID
        const { replyText, createdBy } = req.body;

        const parentComment = await Comment.findById(commentId);
        if (!parentComment) {
            return res.status(404).json({ message: "Parent comment not found" });
        }

        const reply = new Comment({
            taskId: parentComment.taskId,
            commentText: replyText,
            createdBy,
            parentCommentId: parentComment._id
        });

        const savedReply = await reply.save();

        res.status(201).json({
            message: "Reply added successfully",
            reply: savedReply
        });
    } catch (error) {
        console.error("Error adding reply:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;

        // Delete the comment only (replies remain because they're separate documents)
        const deletedComment = await Comment.findByIdAndDelete(commentId);

        if (!deletedComment) {
            return res.status(404).json({ message: "Comment not found" });
        }

        // Remove from Task
        await Task.findOneAndUpdate(
            { comments: commentId },
            { $pull: { comments: commentId } },
            { new: true, useFindAndModify: false }
        );

        res.status(200).json({
            message: "Comment deleted successfully",
            comment: deletedComment
        });
    } catch (error) {
        console.error("Error deleting comment:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = {
    createComment,
    getCommentsByTaskId,
    deleteComment,
    addReplyToComment
};