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
        const { page = 1, limit = 10, search = "" } = req.query;

        const query = {
            $or: [
                { eventName: { $regex: search, $options: "i" } },
                { eventDescription: { $regex: search, $options: "i" } }
            ]
        };

        const events = await Event.find(query)
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('clientId','userName')
            .populate('inventoryItems', 'itemName')
            .populate('createdBy', 'userName')
            .populate({
                path: 'assignees',
                select: 'assigneeName role'
            })

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
            .populate({
                path: 'assignees',
                select: 'assigneeName role'
            })

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

module.exports = {
    createEvent,
    getAllEvents,
    getEventById,
    updateEvent,
    deleteEvent,
    updateStatus
};