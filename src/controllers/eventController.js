const Event = require("../models/eventModel");
const InventoryItem = require("../models/inventoryItemModel");
const Client = require("../models/clientsModel");
const User = require("../models/userModel");
const Assignees = require("../models/assigneesModel");
const mongoose = require("mongoose");

const createEvent = async (req, res) => {
    try {
        const { eventId, eventName, eventType, eventDescription, eventImage, startDate, endDate, startTime, endTime, proposedLocation, clientId, assignees, tasks, status, inventoryItems, createdBy } = req.body;

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
            createdBy
        });

        const savedEvent = await newEvent.save();

        res.status(201).json({ message: "Event created successfully", event: savedEvent });
    } catch (error) {
        res.status(500).json({ message: "Something went wrong" });
    }
};

const getAllEvents = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = "", clientId } = req.query;

        const query = {
            $or: [
                { eventName: { $regex: search, $options: "i" } },
                { eventDescription: { $regex: search, $options: "i" } }
            ]
        };

        // Add clientId to query if provided
        if (clientId) {
            query.$and = query.$and || [];
            query.$and.push({ clientId });
        }

        const events = await Event.find(query)
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('clientId', 'userName')
            .populate('inventoryItems', 'itemName')
            .populate('createdBy', 'userName');

        const totalCount = await Event.countDocuments(query);

        res.status(200).json({
            message: "Events retrieved successfully",
            events,
            pagination: {
                total: totalCount,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(totalCount / limit),
            }
        });
    } catch (error) {
        console.error("Error fetching events:", error);
        res.status(500).json({ message: "Something went wrong", error: error.message });
    }
};

const getMonthlyEvents = async (req, res) => {
    try {
        const { year, month } = req.query;

        if (!year || !month) {
            return res.status(400).json({ message: "Year and month are required" });
        }

        const y = parseInt(year);
        const m = parseInt(month) - 1;

        const startOfMonth = new Date(y, m, 1);
        const endOfMonth = new Date(y, m + 1, 0, 23, 59, 59, 999);
        const daysInMonth = endOfMonth.getDate();

        const events = await Event.find({
            $or: [
                {
                    startDate: { $lte: endOfMonth },
                    endDate: { $gte: startOfMonth }
                }
            ]
        }).select('_id eventName startDate endDate startTime proposedLocation clientId , status')
        .populate('clientId', 'userName');

        const eventMap = {};

        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            eventMap[dateKey] = [];
        }

        events.forEach(event => {
            const start = new Date(event.startDate);
            const end = new Date(event.endDate);

            const current = new Date(start);

            while (current <= end) {
                const currentYear = current.getFullYear();
                const currentMonth = current.getMonth() + 1;

                if (currentYear === y && currentMonth === parseInt(month)) {
                    const dayKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
                    if (eventMap[dayKey]) {
                        eventMap[dayKey].push({
                            _id: event._id,
                            eventName: event.eventName,
                            startDate: event.startDate,
                            endDate: event.endDate,
                            startTime: event.startTime,
                            proposedLocation: event.proposedLocation,
                            clientName: event.clientId?.userName || "Unknown",
                            status: event.status
                        });
                    }
                }
                current.setDate(current.getDate() + 1);
            }
        });

        res.status(200).json({
            message: "Monthly events retrieved successfully",
            events: eventMap
        });

    } catch (error) {
        console.error("Error fetching monthly events:", error);
        res.status(500).json({ message: "Something went wrong", error: error.message });
    }
};

const getEventCountsByStatus = async (req, res) => {
    try {
        const statusCounts = await Event.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    status: "$_id",
                    count: 1
                }
            },
            {
                $sort: { status: 1 }
            }
        ]);

        const allStatuses = [
            "Pending Approval",
            "Approved",
            "In Progress",
            "Hold",
            "Completed",
            "Cancelled"
        ];

        const formattedCounts = allStatuses.map(status => {
            const match = statusCounts.find(s => s.status === status);
            return {
                status,
                count: match ? match.count : 0
            };
        });

        res.status(200).json({
            message: "Event status counts retrieved successfully",
            data: formattedCounts
        });
    } catch (error) {
        console.error("Error fetching event status counts:", error);
        res.status(500).json({ message: "Something went wrong" });
    }
};


const getEventReportData = async (req, res) => {
    try {
        const events = await Event.find({}, 'eventName eventType startDate endDate proposedLocation clientId createdAt')
            .populate({
                path: 'clientId',
                select: 'userName' // Only bring in userName from the User model
            })
            .sort({ createdAt: 1 }); // Oldest first

        res.status(200).json({
            message: "Event report data retrieved successfully",
            events
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
            'eventName startDate endDate status proposedLocation clientId'
        )
        .populate({
            path: 'clientId',
            select: 'userName'
        })
        .sort({ startDate: 1 })
        .limit(5); 

        res.status(200).json({
            message: "Upcoming events retrieved successfully",
            events
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
                        month: { $month: "$startDate" }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: {
                    "_id.year": 1,
                    "_id.month": 1
                }
            },
            {
                $project: {
                    _id: 0,
                    year: "$_id.year",
                    month: "$_id.month",
                    count: 1
                }
            }
        ]);

        res.status(200).json({
            message: "Monthly event counts retrieved successfully",
            data: eventCounts
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
            .populate('clientId','userName')
            .populate('inventoryItems', 'itemName')
            .populate('createdBy', 'userName')

        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        res.status(200).json({ message: "Event retrieved successfully", event });
    } catch (error) {
        console.error("Error fetching event by ID:", error);
        res.status(500).json({ message: "Something went wrong", error: error.message });
    }
};

const updateEvent = async (req, res) => {
    try {
        const updatedEvent = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedEvent) {
            return res.status(404).json({ message: "Event not found" });
        }
        res.status(200).json({ message: "Event updated successfully", event: updatedEvent });
    } catch (error) {
        res.status(500).json({ message: "Something went wrong" });
    }
};

const deleteEvent = async (req, res) => {
    try {
        const deletedEvent = await Event.findByIdAndDelete(req.params.id);
        if (!deletedEvent) {
            return res.status(404).json({ message: "Event not found" });
        }
        res.status(200).json({ message: "Event deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Something went wrong" });
    }
};

const updateStatus = async (req, res) => {
    try {
        // Changed from _id to id to match your route parameter
        const id = req.params.id;
        const { status } = req.body;

        console.log("Received ID:", id); // Add logging to see what ID is received

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid event ID format" });
        }

        const updatedEvent = await Event.findByIdAndUpdate(id, { status }, { new: true });
        if (!updatedEvent) {
            return res.status(404).json({ message: "Event not found" });
        }
        res.status(200).json({ message: "Event status updated successfully" });
    } catch (error) {
        console.error("Error updating event status:", error);
        res.status(500).json({ message: "Something went wrong", error: error.message });
    }
};

const getEventsDropdown = async (req, res) => {
    try {
        const events = await Event.find(
            { status: { $in: ["Approved", "In Progress", "Completed"] } },
            { eventName: 1, eventId: 1 }
        );
        res.status(200).json({ message: "Events retrieved successfully", events });
    } catch (error) {
        console.error("Error fetching events for dropdown:", error);
        res.status(500).json({ message: "Something went wrong", error: error.message });
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
    getEventCountsByStatus
};