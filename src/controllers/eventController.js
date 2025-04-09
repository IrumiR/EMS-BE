const Event = require("../models/eventModel");

const createEvent = async (req, res) => {
    try {
        const { eventId, eventName, eventType, eventDescription, eventImage, startDate, endDate, proposedLocation, clientId, assignees,  tasks, status, createdBy } = req.body;

        const newEvent = new Event({
            eventId,
            eventName,
            eventType,
            eventDescription,
            eventImage,
            startDate,
            endDate,
            proposedLocation,
            clientId,
            assignees,
            tasks,
            status,
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
        const events = await Event.find(); 
        res.status(200).json({ message: "All events retrieved successfully", events });
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

        const event = await Event.findById(id);

        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        res.status(200).json({message: "Event retrieved successfully", event});
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

module.exports = {
    createEvent,
    getAllEvents,
    getEventById,
    updateEvent,
    deleteEvent
};