const Task = require('../models/taskModel');
const Event = require('../models/eventModel');
const User = require('../models/userModel');
const Comment = require('../models/commentModel');
const mongoose = require('mongoose');

const createTask = async (req, res) => {
    try {
        const {
            taskName,
            taskDescription,
            startDate,
            endDate,
            status,
            priority,
            assignees,
            inventoryItems,
            eventId,
            subTasks,
            comments,
            feedback,
            createdBy
        } = req.body;

        // Step 1: Create and save the new task
        const newTask = new Task({
            taskName,
            taskDescription,
            startDate,
            endDate,
            status,
            priority,
            inventoryItems,
            assignees,
            eventId,
            subTasks,
            comments,
            feedback,
            createdBy
        });

        const savedTask = await newTask.save();

        // Step 2: Add this task to the associated event
        await Event.findByIdAndUpdate(
            eventId,
            {
                $push: {
                    tasks: {
                        taskId: savedTask._id,
                        taskName: savedTask.taskName,
                        assigneeId: assignees?.[0]?.assigneeId || null,
                        commentId: savedTask.comments?.[0]?.commentId || null
                    }
                }
            },
            { new: true, useFindAndModify: false }
        );

        await calculateAndUpdateEventProgress(newTask.eventId);

        res.status(201).json({
            message: "Task created successfully and added to the event",
            task: savedTask
        });
    } catch (error) {
        console.error("Error creating task:", error);
        res.status(500).json({
            message: "Something went wrong",
            error: error.message
        });
    }
};

const getAllTasksByUserId = async (req, res) => {
    try {
        const { userId, page = 1, limit = 10, search = "", status } = req.query;

        const query = {
            $or: [
                { taskName: { $regex: search, $options: "i" } },
                { taskDescription: { $regex: search, $options: "i" } }
            ]
        };

        if (
            userId &&
            userId !== "all" &&
            mongoose.Types.ObjectId.isValid(userId)
        ) {
            query.assignees = { $in: [new mongoose.Types.ObjectId(userId)] };
        }

        if (status) {
            query.status = status;
        }

        const tasks = await Task.find(query)
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate("eventId", "eventName")
            .populate("assignees", "userName")
            .populate("createdBy", "userName");

        const totalCount = await Task.countDocuments(query);

        res.status(200).json({
            message: "Tasks retrieved successfully",
            tasks,
            pagination: {
                total: totalCount,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(totalCount / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching tasks:", error);
        res.status(500).json({
            message: "Something went wrong",
            error: error.message,
        });
    }
};
  
  
  

const getTaskById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ message: "Invalid task ID format" });
        }

        const task = await Task.findById(id)
            .populate('eventId', 'eventName')
            .populate('assignees', 'userName')
            .populate('createdBy', 'userName')

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        res.status(200).json({ message: "Task retrieved successfully", task });
    } catch (error) {
        console.error("Error fetching task by ID:", error);
        res.status(500).json({ message: "Something went wrong", error: error.message });
    }
};

const getAllTasksByEventId = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { page = 1, limit = 10, search = "", status } = req.query;

        const query = {
            eventId: eventId,
            $or: [
                { taskName: { $regex: search, $options: "i" } },
                { taskDescription: { $regex: search, $options: "i" } }
            ]
        };

        if (status) {
            query.status = status;
        }

        const tasks = await Task.find(query)
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('assignees', 'userName')
            .populate('createdBy', 'userName')
            .populate('eventId', 'eventName');

        const totalCount = await Task.countDocuments(query);

        res.status(200).json({
            message: "Tasks retrieved successfully",
            tasks,
            pagination: {
                total: totalCount,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        console.error("Error fetching tasks by event ID:", error);
        res.status(500).json({ message: "Something went wrong", error: error.message });
    }
};

const getTaskCountsByStatus = async (req, res) => {
    try {
        const { userId } = req.query;

        const pipeline = [];

        if (userId) {
            // Convert userId to ObjectId
            const objectUserId = new mongoose.Types.ObjectId(userId);

            // Match any task where assignees contains this user
            pipeline.push({
                $match: {
                    assignees: objectUserId,
                },
            });
        }

        // Group and count by status
        pipeline.push(
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    status: "$_id",
                    count: 1,
                },
            }
        );

        const statusCounts = await Task.aggregate(pipeline);

        const allStatuses = ["To Do", "In Progress", "Completed", "Over Due", "Cancelled"]; // match your enum

        const formattedCounts = allStatuses.map((status) => {
            const match = statusCounts.find((s) => s.status === status);
            return {
                status,
                count: match ? match.count : 0,
            };
        });

        res.status(200).json({
            message: "Task status counts retrieved successfully",
            data: formattedCounts,
        });
    } catch (error) {
        console.error("Error fetching task status counts:", error);
        res.status(500).json({ message: "Something went wrong" });
    }
};

const updateTask = async (req, res) => {
    try {
        // Step 1: Update the task
        const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });

        if (!updatedTask) {
            return res.status(404).json({ message: "Task not found" });
        }

        // Step 2: Update the related event's task reference
        await Event.updateOne(
            { "tasks.taskId": updatedTask._id },
            {
                $set: {
                    "tasks.$.taskName": updatedTask.taskName,
                    "tasks.$.assigneeId": updatedTask.assignees?.[0]?.assigneeId || null,
                    "tasks.$.commentId": updatedTask.comments?.[0]?.commentId || null
                }
            }
        );

        await calculateAndUpdateEventProgress(updatedTask.eventId);

        res.status(200).json({
            message: "Task updated successfully",
            task: updatedTask
        });
    } catch (error) {
        console.error("Error updating task:", error);
        res.status(500).json({ message: "Something went wrong", error: error.message });
    }
};

const updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!id) {
            return res.status(400).json({ message: "Invalid task ID format" });
        }

        const updatedTask = await Task.findByIdAndUpdate(id, { status }, { new: true });

        if (!updatedTask) {
            return res.status(404).json({ message: "Task not found" });
        }

         await calculateAndUpdateEventProgress(updatedTask.eventId);

        res.status(200).json({ message: "Task status updated successfully", task: updatedTask });
    } catch (error) {
        console.error("Error updating task status:", error);
        res.status(500).json({ message: "Something went wrong", error: error.message });
    }
};

const updatePriority = async (req, res) => {
    try {
        const { id } = req.params;
        const { priority } = req.body;

        if (!id) {
            return res.status(400).json({ message: "Invalid task ID format" });
        }

        const updatedTask = await Task.findByIdAndUpdate(id, { priority }, { new: true });

        if (!updatedTask) {
            return res.status(404).json({ message: "Task not found" });
        }

        res.status(200).json({ message: "Task priority updated successfully", task: updatedTask });
    } catch (error) {
        console.error("Error updating task priority:", error);
        res.status(500).json({ message: "Something went wrong", error: error.message });
    }
};


const deleteTask = async (req, res) => {
    try {
        const taskId = req.params.id;

        // Step 1: Find the task to get eventId and comments
        const taskToDelete = await Task.findById(taskId);

        if (!taskToDelete) {
            return res.status(404).json({ message: "Task not found" });
        }

        // Step 2: Delete associated comments
        if (taskToDelete.comments && taskToDelete.comments.length > 0) {
            await Comment.deleteMany({ _id: { $in: taskToDelete.comments } });
        }

        // Step 3: Delete the task (subtasks will be removed as they're embedded)
        await Task.findByIdAndDelete(taskId);

        // Step 4: Remove the task reference from the associated event
        await Event.findByIdAndUpdate(
            taskToDelete.eventId,
            {
                $pull: {
                    tasks: { taskId: taskToDelete._id }
                }
            },
            { new: true }
        );

        res.status(200).json({ message: "Task and related data deleted successfully" });
    } catch (error) {
        console.error("Error deleting task:", error);
        res.status(500).json({ message: "Something went wrong", error: error.message });
    }
};
  
const calculateAndUpdateEventProgress = async (eventId) => {
    try {
        const tasks = await Task.find({ eventId });

        let totalCount = 0;
        let completedCount = 0;

        tasks.forEach(task => {
            totalCount++; // for the main task
            if (task.status === "Completed") completedCount++;

            if (Array.isArray(task.subTasks)) {
                task.subTasks.forEach(sub => {
                    totalCount++;
                    if (sub.status === "Completed") completedCount++;
                });
            }
        });

        const progress = totalCount > 0 ? (completedCount * 100) / totalCount : 0;

        await Event.findByIdAndUpdate(
            eventId,
            { progress },
            { new: true }
        );
    } catch (error) {
        console.error("Error calculating event progress:", error.message);
    }
};

const getUpcomingTasksByClientId = async (req, res) => {
    const { clientId } = req.params;

    if (!clientId) {
        return res.status(400).json({ message: 'Client ID is required' });
    }

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Step 1: Get upcoming events by clientId
        const upcomingEvents = await Event.find({
            clientId,
            startDate: { $gte: today },
        }).select('_id');

        const eventIds = upcomingEvents.map(event => event._id);

        if (eventIds.length === 0) {
            return res.status(200).json([]); // No events = no tasks
        }

        // Step 2: Get upcoming tasks related to those events
        const upcomingTasks = await Task.find({
            eventId: { $in: eventIds },
            startDate: { $gte: today },
        })
            .select('taskName startDate endDate status priority eventId') // only selected fields
            .populate({
                path: 'eventId',
                select: 'eventName',
            });

        // Optional: transform output
        const response = upcomingTasks.map(task => ({
            taskName: task.taskName,
            eventName: task.eventId?.eventName || 'N/A',
            startDate: task.startDate,
            endDate: task.endDate,
            status: task.status,
            priority: task.priority,
        }));

        return res.status(200).json({
            message: 'Upcoming tasks retrieved successfully',
            tasks: response
        });
    } catch (error) {
        console.error('Error fetching upcoming tasks:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
  };

module.exports = {
    createTask,
    getAllTasksByUserId,
    getTaskById,
    getAllTasksByEventId,
    getTaskCountsByStatus,
    updateTask,
    updateStatus,
    updatePriority,
    deleteTask,
    calculateAndUpdateEventProgress,
    getUpcomingTasksByClientId
};