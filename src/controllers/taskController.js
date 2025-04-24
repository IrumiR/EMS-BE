const Task = require('../models/taskModel');
const Event = require('../models/eventModel');

const createTask = async (req, res) => {
    try {
        const {
            taskName,
            taskDescription,
            startDate,
            endDate,
            status,
            budget,
            assignees,
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
            budget,
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
        const tasks = await Task.find();
        res.status(200).json({ message: "All tasks retrieved successfully", tasks });
    } catch (error) {
        console.error("Error fetching tasks:", error);
        res.status(500).json({ message: "Something went wrong", error: error.message });
    }
}

const getTaskById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ message: "Invalid task ID format" });
        }

        const task = await Task.findById(id);

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        res.status(200).json({ message: "Task retrieved successfully", task });
    } catch (error) {
        console.error("Error fetching task by ID:", error);
        res.status(500).json({ message: "Something went wrong", error: error.message });
    }
};

const updateTask = async (req, res) => {
    try {
        const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedTask) {
            return res.status(404).json({ message: "Task not found" });
        }
        res.status(200).json({ message: "Task updated successfully", task: updatedTask });
    } catch (error) {
        res.status(500).json({ message: "Something went wrong" });
    }
};

const deleteTask = async (req, res) => {
    try {
        const deletedTask = await Task.findByIdAndDelete(req.params.id);
        if (!deletedTask) {
            return res.status(404).json({ message: "Task not found" });
        }
        res.status(200).json({ message: "Task deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Something went wrong" });
    }
}

module.exports = {
    createTask,
    getAllTasks,
    getTaskById,
    updateTask,
    deleteTask
};