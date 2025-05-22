const Task = require('../models/taskModel');
const Event = require('../models/eventModel');
const User = require('../models/userModel');

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


const getAllTasks = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = "" } = req.query;

        const query = {
            $or: [
                { taskName: { $regex: search, $options: "i" } },
                { taskDescription: { $regex: search, $options: "i" } }
            ]
        };

        const tasks = await Task.find(query)
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('eventId', 'eventName')
            .populate('assignees', 'userName')
            .populate('createdBy', 'userName')

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
        console.error("Error fetching tasks:", error);
        res.status(500).json({ message: "Something went wrong", error: error.message });
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
        const { page = 1, limit = 10, search = "" } = req.query;

        const query = {
            eventId,
            $or: [
                { taskName: { $regex: search, $options: "i" } },
                { taskDescription: { $regex: search, $options: "i" } }
            ]
        };

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

        res.status(200).json({
            message: "Task updated successfully",
            task: updatedTask
        });
    } catch (error) {
        console.error("Error updating task:", error);
        res.status(500).json({ message: "Something went wrong", error: error.message });
    }
};


const deleteTask = async (req, res) => {
    try {
        // Step 1: Find the task to get its eventId
        const taskToDelete = await Task.findById(req.params.id);

        if (!taskToDelete) {
            return res.status(404).json({ message: "Task not found" });
        }

        // Step 2: Delete the task
        await Task.findByIdAndDelete(req.params.id);

        // Step 3: Remove the task reference from the associated event
        await Event.findByIdAndUpdate(
            taskToDelete.eventId,
            {
                $pull: {
                    tasks: { taskId: taskToDelete._id }
                }
            },
            { new: true }
        );

        res.status(200).json({ message: "Task deleted successfully" });
    } catch (error) {
        console.error("Error deleting task:", error);
        res.status(500).json({ message: "Something went wrong", error: error.message });
    }
};


module.exports = {
    createTask,
    getAllTasks,
    getTaskById,
    getAllTasksByEventId,
    updateTask,
    deleteTask
};