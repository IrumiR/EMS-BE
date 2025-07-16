const Event = require("../models/eventModel");
const InventoryItem = require("../models/inventoryItemModel");
const Client = require("../models/clientsModel");
const User = require("../models/userModel");
const Assignees = require("../models/assigneesModel");
const Task = require("../models/taskModel");
const Comment = require("../models/commentModel");
const mongoose = require("mongoose");
const { Types } = mongoose;
const { sendNotification } = require('./notificationController');

const createEvent = async (req, res) => {
  try {
    const {
      eventId,
      eventName,
      eventType,
      eventDescription,
      eventImage,
      startDate,
      endDate,
      startTime,
      endTime,
      proposedLocation,
      clientId,
      assignees,
      tasks,
      status,
      inventoryItems,
      createdBy,
    } = req.body;

    const newEvent = new Event({
      eventId,
      eventName,
      eventType,
      eventDescription,
      eventImage,
      startDate,
      endDate,
      startTime,
      endTime,
      proposedLocation,
      clientId,
      assignees,
      tasks,
      status,
      inventoryItems,
      createdBy,
    });

    const savedEvent = await newEvent.save();
    
    if (clientId) {
      await sendNotification({
        recipients: [clientId],
        type: "event",
        message: `New event "${eventName}" created`,
        sender: createdBy,
      });
    }

    if (assignees && assignees.length > 0) {
      await sendNotification({
        recipients: assignees,
        type: "event",
        message: `You're assigned to event "${eventName}"`,
        sender: createdBy,
      });
    }

    res
      .status(201)
      .json({ message: "Event created successfully", event: savedEvent });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
};

const getAllEvents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      clientId,
      status,
      eventType,
    } = req.query;

    const query = {
      $or: [
        { eventName: { $regex: search, $options: "i" } },
        { eventDescription: { $regex: search, $options: "i" } },
      ],
    };

    if (clientId) {
      query.$and = query.$and || [];
      query.$and.push({ clientId });
    }

    if (status) {
      query.$and = query.$and || [];
      query.$and.push({ status });
    }

    if (eventType) {
      const eventTypes = Array.isArray(eventType) ? eventType : [eventType];
      query.$and = query.$and || [];
      query.$and.push({ eventType: { $in: eventTypes } });
    }

    const events = await Event.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("clientId", "userName")
      .populate("inventoryItems", "itemName")
      .populate("createdBy", "userName")
      .populate("assignees", "userName")
      .sort({ createdAt: -1 });

    const totalCount = await Event.countDocuments(query);

    res.status(200).json({
      message: "Events retrieved successfully",
      events,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    res
      .status(500)
      .json({ message: "Something went wrong", error: error.message });
  }
};

const getMonthlyEvents = async (req, res) => {
  try {
    const { year, month, userId, clientId } = req.query;

    if (!year || !month) {
      return res.status(400).json({ message: "Year and month are required" });
    }

    const y = parseInt(year);
    const m = parseInt(month) - 1;

    const startOfMonth = new Date(y, m, 1);
    const endOfMonth = new Date(y, m + 1, 0, 23, 59, 59, 999);
    const daysInMonth = endOfMonth.getDate();

    const query = {
      $or: [
        {
          startDate: { $lte: endOfMonth },
          endDate: { $gte: startOfMonth },
        },
      ],
    };

    if (userId) {
      query.assignees = { $in: [userId] };
    }

    if (clientId) {
      query.clientId = clientId;
    }

    const events = await Event.find(query)
      .select(
        "_id eventName startDate endDate startTime proposedLocation clientId status"
      )
      .populate("clientId", "userName");

    const eventMap = {};

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}`;
      eventMap[dateKey] = [];
    }

    events.forEach((event) => {
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      const current = new Date(start);

      while (current <= end) {
        const currentYear = current.getFullYear();
        const currentMonth = current.getMonth() + 1;

        if (currentYear === y && currentMonth === parseInt(month)) {
          const dayKey = `${currentYear}-${String(currentMonth).padStart(
            2,
            "0"
          )}-${String(current.getDate()).padStart(2, "0")}`;
          if (eventMap[dayKey]) {
            eventMap[dayKey].push({
              _id: event._id,
              eventName: event.eventName,
              startDate: event.startDate,
              endDate: event.endDate,
              startTime: event.startTime,
              proposedLocation: event.proposedLocation,
              clientName: event.clientId?.userName || "Unknown",
              status: event.status,
            });
          }
        }

        current.setDate(current.getDate() + 1);
      }
    });

    res.status(200).json({
      message: "Monthly events retrieved successfully",
      events: eventMap,
    });
  } catch (error) {
    console.error("Error fetching monthly events:", error);
    res
      .status(500)
      .json({ message: "Something went wrong", error: error.message });
  }
};

const getEventCountsByStatus = async (req, res) => {
  try {
    const { clientId } = req.query;

    // Build match stage with proper ObjectId if clientId is provided
    const matchStage = clientId
      ? { $match: { clientId: new Types.ObjectId(clientId) } }
      : { $match: {} };

    const statusCounts = await Event.aggregate([
      matchStage,
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
      },
      {
        $sort: { status: 1 },
      },
    ]);

    const allStatuses = [
      "Pending Approval",
      "Approved",
      "In Progress",
      "Hold",
      "Completed",
      "Cancelled",
    ];

    const formattedCounts = allStatuses.map((status) => {
      const match = statusCounts.find((s) => s.status === status);
      return {
        status,
        count: match ? match.count : 0,
      };
    });

    res.status(200).json({
      message: "Event status counts retrieved successfully",
      data: formattedCounts,
    });
  } catch (error) {
    console.error("Error fetching event status counts:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

const getEventReportData = async (req, res) => {
  try {
    const { range } = req.query;
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0)); 
    let fromDate, toDate;

    if (range === "past_day") {
      fromDate = new Date(today);
      fromDate.setDate(fromDate.getDate() - 1); 
      toDate = new Date(today); 
    } else if (range === "past_week") {
 
      toDate = new Date(today);
      fromDate = new Date(today);
      fromDate.setDate(fromDate.getDate() - 7);
    } else if (range === "past_month") {

      toDate = new Date(today);
      fromDate = new Date(today);
      fromDate.setDate(fromDate.getDate() - 30);
    }

    const filter = fromDate && toDate ? {
      endDate: {
        $gte: fromDate,
        $lt: toDate,
      }
    } : {};

    const events = await Event.find(
      filter,
      "eventName eventType startDate endDate proposedLocation clientId createdAt"
    )
      .populate({
        path: "clientId",
        select: "userName",
      })
      .sort({ createdAt: 1 });

    res.status(200).json({
      message: "Event report data retrieved successfully",
      events,
    });
  } catch (error) {
    console.error("Error fetching event report data:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

const getEventUpcomingData = async (req, res) => {
  try {
    const today = new Date();
    const events = await Event.find(
      { startDate: { $gte: today } },
      "eventName startDate endDate status proposedLocation clientId progress"
    )
      .populate({
        path: "clientId",
        select: "userName",
      })
      .sort({ startDate: 1 })
      .limit(5);

    res.status(200).json({
      message: "Upcoming events retrieved successfully",
      events,
    });
  } catch (error) {
    console.error("Error fetching upcoming events:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

const getMonthlyEventCounts = async (req, res) => {
  try {
    const eventCounts = await Event.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$startDate" },
            month: { $month: "$startDate" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
        },
      },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          month: "$_id.month",
          count: 1,
        },
      },
    ]);

    res.status(200).json({
      message: "Monthly event counts retrieved successfully",
      data: eventCounts,
    });
  } catch (error) {
    console.error("Error fetching monthly event counts:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

const getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Invalid event ID format" });
    }

    const event = await Event.findById(id)
      .populate("clientId", "userName")
      .populate("inventoryItems", "itemName")
      .populate("assignees", "userName")
      .populate("createdBy", "userName");

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.status(200).json({ message: "Event retrieved successfully", event });
  } catch (error) {
    console.error("Error fetching event by ID:", error);
    res
      .status(500)
      .json({ message: "Something went wrong", error: error.message });
  }
};

const updateEvent = async (req, res) => {
  try {
    const eventId = req.params.id;

    const existingEvent = await Event.findById(eventId);
    if (!existingEvent) {
      return res.status(404).json({ message: "Event not found" });
    }

    const oldAssignees = existingEvent.assignees.map(id => id.toString());

    const updatedEvent = await Event.findByIdAndUpdate(eventId, req.body, { new: true }).populate('assignees', 'name');
    const { eventName, clientId, assignees: newAssignees, createdBy } = updatedEvent;
    const newAssigneesStr = newAssignees.map(user => user._id.toString());


    const removedAssigneeIds = oldAssignees.filter(id => !newAssigneesStr.includes(id));
    const addedAssigneeIds = newAssigneesStr.filter(id => !oldAssignees.includes(id));


    const removedAssignees = await User.find({ _id: { $in: removedAssigneeIds } }, 'userName');
    const addedAssignees = await User.find({ _id: { $in: addedAssigneeIds } }, 'userName');

    for (const user of removedAssignees) {
      await sendNotification({
        recipients: [user._id],
        type: 'event',
        message: `You're removed from the event "${eventName}"`,
        sender: createdBy
      });

      if (clientId) {
        await sendNotification({
          recipients: [clientId],
          type: 'event',
          message: `${user.userName} has been removed from the event "${eventName}"`,
          sender: createdBy
        });
      }
    }


    for (const user of addedAssignees) {
      await sendNotification({
        recipients: [user._id],
        type: 'event',
        message: `You're assigned to the event "${eventName}"`,
        sender: createdBy
      });

      if (clientId) {
        await sendNotification({
          recipients: [clientId],
          type: 'event',
          message: `${user.userName} has been added to the event "${eventName}"`,
          sender: createdBy
        });
      }
    }

    const ignoredFields = ['assignees', '__v', 'updatedAt', 'createdAt', '_id'];
    const otherChanges = Object.keys(req.body).some(key => !ignoredFields.includes(key));

    if (otherChanges) {
      const generalRecipients = [...new Set([clientId?.toString(), ...newAssigneesStr])];
      await sendNotification({
        recipients: generalRecipients,
        type: 'event',
        message: `Details of event "${eventName}" have been updated`,
        sender: createdBy
      });
    }

    res.status(200).json({ message: "Event updated successfully", event: updatedEvent });

  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};



const deleteEvent = async (req, res) => {
  try {
    const eventId = req.params.id;

    // Find and delete the event
    const deletedEvent = await Event.findByIdAndDelete(eventId);
    if (!deletedEvent) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Find tasks linked to this event
    const tasks = await Task.find({ eventId });

    // Collect all comment IDs from the tasks
    const commentIds = tasks.flatMap(task => task.comments || []);

    // Delete all related comments
    if (commentIds.length > 0) {
      await Comment.deleteMany({ _id: { $in: commentIds } });
    }

    // Delete all tasks related to the event
    await Task.deleteMany({ eventId });

    res.status(200).json({ message: "Event and related data deleted successfully" });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

const updateStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body;

    console.log("Received ID:", id); 

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid event ID format" });
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    if (!updatedEvent) {
      return res.status(404).json({ message: "Event not found" });
    }

    const { eventName, clientId, assignees, createdBy } = updatedEvent;
    const recipients = [...new Set([clientId, ...assignees])];

    await sendNotification({
      recipients,
      type: 'event',
      message: `Status of ${eventName} has been updated to ${status}`,
      sender: createdBy
    });

    res.status(200).json({ message: "Event status updated successfully" });
  } catch (error) {
    console.error("Error updating event status:", error);
    res
      .status(500)
      .json({ message: "Something went wrong", error: error.message });
  }
};


const getEventsDropdown = async (req, res) => {
  try {
    const { clientId } = req.query;

    const query = {
      status: { $in: ["Approved", "In Progress", "Completed"] },
    };

    if (clientId && mongoose.Types.ObjectId.isValid(clientId)) {
      query.clientId = new mongoose.Types.ObjectId(clientId);
    }

    const events = await Event.find(query, { eventName: 1 });

    res.status(200).json({
      message: "Events retrieved successfully",
      events,
    });
  } catch (error) {
    console.error("Error fetching events for dropdown:", error);
    res.status(500).json({
      message: "Something went wrong",
      error: error.message,
    });
  }
};


module.exports = {
  createEvent,
  getAllEvents,
  getEventById,
  getEventsDropdown,
  updateEvent,
  deleteEvent,
  updateStatus,
  getMonthlyEvents,
  getEventReportData,
  getEventUpcomingData,
  getMonthlyEventCounts,
  getEventCountsByStatus,
};
