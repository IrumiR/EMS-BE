const Comment = require('../models/commentModel');
const Task = require('../models/taskModel');
const Event = require('../models/eventModel');
const { sendNotification } = require('./notificationController');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage });

const isAssignedToTask = (userId, task) => {
    const assigneeIds = task.assignees?.map((a) => String(a)) || [];
    return assigneeIds.includes(String(userId));
};

const canCommentOnTask = (userId, userRole, task, clientId) => {
    if (userRole === 'admin' || userRole === 'manager') return true;
    if (userRole === 'team-member') return isAssignedToTask(userId, task);
    if (userRole === 'client') return String(clientId) === String(userId);
    return false;
};

// Export this if used in your route
const uploadCommentImages = upload.array('images');


const createComment = async (req, res) => {
    try {
        const { taskId, commentText } = req.body;
        const userId = req.user?.id;
        const userRole = req.user?.role;

        const parentTask = await Task.findById(taskId);
        if (!parentTask) {
            return res.status(404).json({ message: "Parent task not found" });
        }

        const parentEvent = await Event.findById(parentTask.eventId);
        if (!parentEvent) {
            return res.status(404).json({ message: "Parent event not found" });
        }

        const clientId = parentEvent.clientId?.toString();
        if (!canCommentOnTask(userId, userRole, parentTask, clientId)) {
            return res.status(403).json({ message: "You are not authorized to comment on this task" });
        }

        const images = req.files?.map(file => ({
            data: file.buffer,
            contentType: file.mimetype
        })) || [];

        const newComment = new Comment({
            taskId,
            commentText,
            createdBy: userId,
            images 
        });

        const savedComment = await newComment.save();

        const assigneeIds = parentTask.assignees?.map((a) => String(a)) || [];
        const isClient = userRole === 'client' && String(userId) === clientId;

        const recipients = isClient
            ? assigneeIds.filter((id) => id !== String(userId))
            : clientId && clientId !== String(userId)
                ? [clientId]
                : [];

        if (recipients.length > 0) {
            await sendNotification({
                recipients: [...new Set(recipients)],
                type: "comment",
                message: `New comment on your task "${parentTask.taskName}".`,
                sender: userId,
            });
        }

        await Task.findByIdAndUpdate(
            taskId,
            { $push: { comments: savedComment._id } },
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

        // Get top-level comments
        const comments = await Comment.find({ taskId, parentCommentId: null })
            .populate('createdBy', 'userName')
            .sort({ createdAt: 1 });

        const commentIds = comments.map(c => c._id);

        // Get replies
        const replies = await Comment.find({ parentCommentId: { $in: commentIds } })
            .populate('createdBy', 'userName');

        // Helper to convert buffer images to base64
        const normalizeImages = (images = []) => {
            return images.map(img => ({
                _id: img._id,
                contentType: img.contentType,
                data: img.data.toString('base64')
            }));
        };

        // Normalize replies
        const replyMap = {};
        for (const reply of replies) {
            const parentId = reply.parentCommentId.toString();
            const normalizedReply = reply.toObject();
            normalizedReply.images = normalizeImages(normalizedReply.images);
            if (!replyMap[parentId]) replyMap[parentId] = [];
            replyMap[parentId].push(normalizedReply);
        }

        // Normalize main comments and attach replies
        const result = comments.map(comment => {
            const obj = comment.toObject();
            obj.images = normalizeImages(obj.images);
            obj.replies = replyMap[comment._id.toString()] || [];
            return obj;
        });

        res.status(200).json(result);
    } catch (error) {
        console.error("Error fetching comments:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
  

const addReplyToComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const { replyText } = req.body;
        const userId = req.user?.id;
        const userRole = req.user?.role;

        const parentComment = await Comment.findById(commentId);
        if (!parentComment) {
            return res.status(404).json({ message: "Parent comment not found" });
        }

        const task = await Task.findById(parentComment.taskId);
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        const parentEvent = await Event.findById(task.eventId);
        if (!parentEvent) {
            return res.status(404).json({ message: "Parent event not found" });
        }

        const clientId = parentEvent.clientId?.toString();
        if (!canCommentOnTask(userId, userRole, task, clientId)) {
            return res.status(403).json({ message: "You are not authorized to reply to this comment" });
        }

        const images = req.files?.map(file => ({
            data: file.buffer,
            contentType: file.mimetype
        })) || [];

        const taskName = task.taskName || "a task";

        const reply = new Comment({
            taskId: parentComment.taskId,
            commentText: replyText,
            createdBy: userId,
            parentCommentId: parentComment._id,
            images
        });

        const savedReply = await reply.save();

        await sendNotification({
            recipients: [parentComment.createdBy],
            type: 'comment',
            message: `New reply on your task ${taskName}.`,
            sender: userId
        });

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

        const deletedComment = await Comment.findByIdAndDelete(commentId);

        if (!deletedComment) {
            return res.status(404).json({ message: "Comment not found" });
        }

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
    addReplyToComment,
    uploadCommentImages
};