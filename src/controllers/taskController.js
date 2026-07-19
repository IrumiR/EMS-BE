const Task = require('../models/taskModel');
const Event = require('../models/eventModel');
const User = require('../models/userModel');
const Comment = require('../models/commentModel');
const mongoose = require('mongoose');
const { sendNotification } = require('./notificationController');

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

        //Assignee limit validation
        // if (assignees && Array.isArray(assignees) && assignees.length > 5) {
        //     return res.status(400).json({ message: "Only 5 assignees allowed per task." });
        // }

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

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: "Associated event not found" });
        }

        //Task creation validation
        // if (event.status !== "In Progress") {
        //     return res.status(400).json({ message: "Tasks can only be created for events with status 'In Progress'" });
        // }

        const savedTask = await newTask.save();

        const clientId = event.clientId;
        const adminUsers = await User.find({ role: 'admin' }, '_id');
        const adminIds = adminUsers.map(admin => admin._id.toString());

        const notifyAdminsAndClient = [...adminIds];
        if (clientId) notifyAdminsAndClient.push(clientId);
        {
            await sendNotification({
                recipients: notifyAdminsAndClient,
                type: "task",
                message: `New task ${taskName} created for event ${event.eventName}`,
                sender: createdBy,
            });
        }

        if (assignees && assignees.length > 0) {
            await sendNotification({
                recipients: assignees,
                type: "task",
                message: `You're assigned to task ${taskName} for event ${event.eventName}`,
                sender: createdBy,
            });
        }


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
        const { page = 1, limit = 10, search = "", status, priority, eventId } = req.query;
        const userId = req.user?.id;
        const userRole = req.user?.role;

        const query = {
            $or: [
                { taskName: { $regex: search, $options: "i" } },
                { taskDescription: { $regex: search, $options: "i" } }
            ]
        };

        if (
            userRole !== "admin" &&
            userRole !== "manager" &&
            userId &&
            userId !== "all" &&
            mongoose.Types.ObjectId.isValid(userId)
        ) {
            query["assignees.assigneeId"] = { $in: [new mongoose.Types.ObjectId(userId)] };
            //Team members will be able to see assigned tasks in my tasks screen 
            // query.assignees = { $in: [new mongoose.Types.ObjectId(userId)] };
        }

        if (status) {
            query.status = status;
        }

        if (priority) {
            query.priority = priority;
        }

        if (
            eventId &&
            eventId !== "all" &&
            mongoose.Types.ObjectId.isValid(eventId)
        ) {
            query.eventId = new mongoose.Types.ObjectId(eventId);
        }

        const tasks = await Task.find(query)
            .sort({ createdAt: -1 })
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
            .sort({ createdAt: -1 })
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
        const taskId = req.params.id;

        const originalTask = await Task.findById(taskId);
        if (!originalTask) {
            return res.status(404).json({ message: "Task not found" });
        }

        //validation for updating unassigned tasks
    //     const userId = req.user?.id;
    //     const userRole = req.user?.role;

    //     if (!userId) {
    //         return res.status(401).json({ message: "Unauthorized" });
    //     }

    //     if (userRole !== "admin" && userRole !== "manager") {
    //   const isAssigned = originalTask.assignees.some(
    //     (assignee) => assignee.toString() === userId,
    //   );
    //    if (!isAssigned) {
    //     const isUpdatingSubTasks = req.body.subTasks && Array.isArray(req.body.subTasks) && Object.keys(req.body).every((key) => (key === 'subTasks'));
    //     const errorMessage = isUpdatingSubTasks
    //       ? "You do not have permission to update subtasks of this task"
    //       : "You do not have permission to edit this task";
    //     return res.status(403).json({ message: errorMessage });
    //   }
    // }

        const oldAssigneeIds = originalTask.assignees.map(id => id.toString());

        //Assignee limit validation
        // if (req.body.assignees && Array.isArray(req.body.assignees) && req.body.assignees.length > 5) {
        //     return res.status(400).json({ message: "Only 5 assignees allowed per task." });
        // }

        const updatedTask = await Task.findByIdAndUpdate(taskId, req.body, { new: true });

        if (!updatedTask) {
            return res.status(404).json({ message: "Task not found after update" });
        }

        const newAssigneeIds = updatedTask.assignees.map(id => id.toString());

        await Event.updateOne(
            { "tasks.taskId": updatedTask._id },
            {
                $set: {
                    "tasks.$.taskName": updatedTask.taskName,
                    "tasks.$.assigneeId": newAssigneeIds[0] || null,
                    "tasks.$.commentId": updatedTask.comments?.[0] || null,
                }
            }
        );

        await calculateAndUpdateEventProgress(updatedTask.eventId);

        const event = await Event.findById(updatedTask.eventId);
        if (!event) {
            return res.status(404).json({ message: "Associated event not found" });
        }

        const sender = await User.findById(updatedTask.createdBy);
        const clientId = event.clientId?.toString();

        const adminUsers = await User.find({ role: 'admin' }, '_id');
        const adminIds = adminUsers.map(admin => admin._id.toString());

        const removedIds = oldAssigneeIds.filter(id => !newAssigneeIds.includes(id));
        const addedIds = newAssigneeIds.filter(id => !oldAssigneeIds.includes(id));

        const removedAssignees = await User.find({ _id: { $in: removedIds } }, 'userName');
        const addedAssignees = await User.find({ _id: { $in: addedIds } }, 'userName');

        for (const user of removedAssignees) {
            await sendNotification({
                recipients: [user._id],
                type: 'task',
                message: `You're removed from the task "${updatedTask.taskName}"`,
                sender,
            });

            const notifyAdminsAndClient = [...adminIds];
            if (clientId) notifyAdminsAndClient.push(clientId);
            {
                await sendNotification({
                    recipients: notifyAdminsAndClient,
                    type: 'task',
                    message: `${user.userName} has been removed from the task "${updatedTask.taskName}"`,
                    sender,
                });
            }
        }

        for (const user of addedAssignees) {
            await sendNotification({
                recipients: [user._id],
                type: 'task',
                message: `You're assigned to the task "${updatedTask.taskName}"`,
                sender,
            });

            const notifyAdminsAndClient = [...adminIds];
            if (clientId) notifyAdminsAndClient.push(clientId);
            {
                await sendNotification({
                    recipients: notifyAdminsAndClient,
                    type: 'task',
                    message: `${user.userName} has been assigned to the task "${updatedTask.taskName}"`,
                    sender,
                });
            }
        }

        const ignoredFields = ['assignees', '__v', 'updatedAt', 'createdAt', '_id'];
        const otherChanges = Object.keys(req.body).some(key => !ignoredFields.includes(key));

        if (otherChanges) {
            const recipients = [...new Set([...newAssigneeIds, clientId, ...adminIds].filter(Boolean))];
            await sendNotification({
                recipients,
                type: 'task',
                message: `Details of task "${updatedTask.taskName}" have been updated`,
                sender,
            });
        }

        res.status(200).json({
            message: "Task updated successfully",
            task: updatedTask,
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

        const existingTask = await Task.findById(id);

        if (!existingTask) {
            return res.status(404).json({ message: "Task not found" });
        }

        //Validation to ensure all subtasks as completed in order to update the status as completed
        // if (status === "Completed") {
        //   const hasIncompleteSubTasks = existingTask.subTasks.some(
        //     (subTask) => subTask.status !== "Completed",
        //   );

        //   if (hasIncompleteSubTasks) {
        //     return res
        //       .status(400)
        //       .json({
        //         message:
        //           "Cannot mark task as completed until all subtasks are completed.",
        //       });
        //   }
        // }

        // Check if the user has permission to update the status
        //  const userId = req.user?.id;
        //  const userRole = req.user?.role;

        //  if (!userId) {
        //    return res.status(401).json({ message: "You're not authorized" });
        //  }

        //  if (userRole !== "admin" && userRole !== "manager") {
        //    const isAssigned = existingTask.assignees.some(
        //      (assignee) => assignee.toString() === userId,
        //    );
        //    if (!isAssigned) {
        //      return res
        //        .status(403)
        //        .json({
        //          message:
        //            "You do not have permission to update the status of this task",
        //        });
        //    }
        //  }

        const updatedTask = await Task.findByIdAndUpdate(id, { status }, { new: true });

        if (!updatedTask) {
            return res.status(404).json({ message: "Task not found" });
        }

        const event = await Event.findById(updatedTask.eventId);

        if (!event) {
            return res.status(404).json({ message: "Associated event not found" });
        }

        const clientId = event.clientId?.toString();
        const sender = await User.findById(updatedTask.createdBy);
        const assigneeIds = updatedTask.assignees.map(id => id.toString());

        if (clientId) {
            await sendNotification({
                recipients: [clientId],
                type: "task",
                message: `Status of task "${updatedTask.taskName}" has been updated to ${status}`,
                sender,
            });
        }

        await calculateAndUpdateEventProgress(updatedTask.eventId);

        const now = new Date();
        const isOverdue = updatedTask.status === "In Progress" && updatedTask.endDate < now;

        if (isOverdue) {
            const adminUsers = await User.find({ role: 'admin' }, '_id');
            const adminIds = adminUsers.map(admin => admin._id.toString());

            const recipients = [...new Set([clientId, ...assigneeIds, ...adminIds].filter(Boolean))];

            if (recipients.length > 0) {
                await sendNotification({
                    recipients,
                    type: 'task',
                    message: `Task "${updatedTask.taskName}" is overdue.`,
                    sender,
                });
            }
        }

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

    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({ message: "You're not authorized" });
    }

    // 🔍 Fetch task first (DO NOT update yet)
    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // // 🔐 Permission check BEFORE update
    // if (userRole !== "admin" && userRole !== "manager") {
    //   const isAssigned = task.assignees.some(
    //     (assignee) => assignee.toString() === userId,
    //   );

    //   if (!isAssigned) {
    //     return res.status(403).json({
    //       message:
    //         "You do not have permission to update the priority of this task",
    //     });
    //   }
    // }

    task.priority = priority;
    await task.save();

    const event = await Event.findById(task.eventId);

    if (!event) {
      return res.status(404).json({ message: "Associated event not found" });
    }

    const clientId = event.clientId;
    const sender = await User.findById(task.createdBy);

    // 🔔 Send notification
    if (clientId) {
      await sendNotification({
        recipients: [clientId],
        type: "task",
        message: `Priority of task "${task.taskName}" has been updated to ${priority}`,
        sender,
      });
    }

    return res.status(200).json({
      message: "Task priority updated successfully",
      task,
    });
  } catch (error) {
    console.error("Error updating task priority:", error);
    return res.status(500).json({
      message: "Something went wrong",
      error: error.message,
    });
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

      const event = await Event.findById(taskToDelete.eventId);
      if (!event) {
        return res.status(404).json({ message: "Associated event not found" });
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
            tasks: { taskId: taskToDelete._id },
          },
        },
        { new: true },
      );

      const clientId = event.clientId?.toString();
      const assigneeIds = taskToDelete.assignees?.map(id => id.toString()) || [];
      const adminUsers = await User.find({ role: 'admin' }, '_id');
      const adminIds = adminUsers.map(admin => admin._id.toString());
      const recipients = [...new Set([...adminIds, clientId, ...assigneeIds].filter(Boolean))];
      const senderId = req.user?.id;

      if (recipients.length > 0) {
        await sendNotification({
          recipients,
          type: "task",
          message: `Task "${taskToDelete.taskName}" has been deleted from event "${event.eventName}"`,
          sender: senderId,
        });
      }

      // Step 5: Recalculate event progress after task removal
      await calculateAndUpdateEventProgress(taskToDelete.eventId);

      res
        .status(200)
        .json({ message: "Task and related data deleted successfully" });
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
    const clientId = req.user?.id;

    if (!clientId) {
        return res.status(400).json({ message: 'Client ID is required' });
    }

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Step 1: Get upcoming events by clientId
        const upcomingEvents = await Event.find({ clientId }).select('_id');

        const eventIds = upcomingEvents.map(event => event._id);

        if (eventIds.length === 0) {
            return res.status(200).json([]); // No events = no tasks
        }

        // Step 2: Get upcoming tasks related to those events
        const upcomingTasks = await Task.find({
            eventId: { $in: eventIds },
            endDate: { $gte: today },
        })
            .select('taskName startDate endDate status priority eventId subTasks') // only selected fields
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
            subTasks: task.subTasks || [],
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

const getTaskStatusCountsByClientId = async (req, res) => {
    const clientId = req.user?.id;

    if (!clientId) {
        return res.status(400).json({ message: 'Client ID is required' });
    }

    try {
        const events = await Event.find({ clientId }).select('_id');
        const eventIds = events.map(event => event._id);

        if (eventIds.length === 0) {
            const defaultStatuses = ["To Do", "In Progress", "Completed", "Cancelled"];
            const data = defaultStatuses.map(status => ({
                status,
                count: 0
            }));

            return res.status(200).json({
                message: 'Task status counts retrieved successfully',
                data
            });
        }

        const statusCounts = await Task.aggregate([
            {
                $match: {
                    eventId: { $in: eventIds }
                }
            },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        const defaultStatuses = ["To Do", "In Progress", "Completed", "Cancelled"];
        const counts = {};

        defaultStatuses.forEach(status => {
            counts[status] = 0;
        });

        statusCounts.forEach(item => {
            counts[item._id] = item.count;
        });

        const data = defaultStatuses.map(status => ({
            status,
            count: counts[status]
        }));

        return res.status(200).json({
            message: 'Task status counts retrieved successfully',
            data
        });

    } catch (error) {
        console.error('Error fetching task status counts:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

const getMonthlyTasks = async (req, res) => {
    try {
        const { year, month, clientId, assignees } = req.query;

        if (!year || !month) {
            return res.status(400).json({ message: "Year and month are required" });
        }

        const y = parseInt(year);
        const m = parseInt(month) - 1;

        const startOfMonth = new Date(y, m, 1);
        const endOfMonth = new Date(y, m + 1, 0, 23, 59, 59, 999);
        const daysInMonth = endOfMonth.getDate();

        // Base query for tasks overlapping the month
        const query = {
            startDate: { $lte: endOfMonth },
            endDate: { $gte: startOfMonth },
        };

        if (clientId) {
            const clientEvents = await Event.find({ clientId }, { _id: 1 });
            const eventIds = clientEvents.map(event => event._id);
            query.eventId = { $in: eventIds };
        }

        if (assignees) {
            query.assignees = { $in: [assignees] };
        }

        const tasks = await Task.find(query)
            .select("taskName status priority startDate endDate eventId assignees")
            .populate({
                path: "eventId",
                select: "eventName",
            })
            .populate({
                path: "assignees",
                select: "userName",
            })

        // Build a date-to-task map
        const taskMap = {};

        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            taskMap[dateKey] = [];
        }

        tasks.forEach(task => {
            const start = new Date(task.startDate);
            const end = new Date(task.endDate);
            const current = new Date(start);

            while (current <= end) {
                const currentYear = current.getFullYear();
                const currentMonth = current.getMonth() + 1;

                if (currentYear === y && currentMonth === parseInt(month)) {
                    const dayKey = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
                    if (taskMap[dayKey]) {
                        taskMap[dayKey].push({
                            taskName: task.taskName,
                            status: task.status,
                            priority: task.priority,
                            startDate: task.startDate,
                            endDate: task.endDate,
                            eventName: task.eventId?.eventName || "Unknown",
                            assignees: task.assignees || [],
                        });
                    }
                }

                current.setDate(current.getDate() + 1);
            }
        });

        res.status(200).json({
            message: "Monthly tasks retrieved successfully",
            tasks: taskMap,
        });

    } catch (error) {
        console.error("Error fetching monthly tasks:", error);
        res.status(500).json({ message: "Something went wrong", error: error.message });
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
    getUpcomingTasksByClientId,
    getTaskStatusCountsByClientId,
    getMonthlyTasks
};