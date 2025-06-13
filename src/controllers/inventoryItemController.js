const InventoryItem = require('../models/inventoryItemModel');
const Event = require('../models/eventModel');

const createInventoryItem = async (req, res) => {
    try {
        const { itemName, itemDescription, category, totalQuantity, remainingQuantity, price, condition, variations, images, isExternal, assignedEvent, createdBy } = req.body;

        const newInventoryItem = new InventoryItem({
            itemName,
            itemDescription,
            category,
            totalQuantity,
            remainingQuantity: totalQuantity,
            price,
            condition,
            variations,
            images,
            isExternal,
            assignedEvent,
            createdBy
        });

        const savedInventoryItem = await newInventoryItem.save();

        res.status(201).json({ message: "Inventory item created successfully", inventoryItem: savedInventoryItem });
    } catch (error) {
        console.error("Error creating inventory item:", error);
        res.status(500).json({ message: "Something went wrong" });
    }
};

const getAllInventoryItems = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = "", itemType } = req.query; // Changed from isExternal to itemType

        const query = {
            $or: [
                { itemName: { $regex: search, $options: "i" } },
                { itemDescription: { $regex: search, $options: "i" } }
            ]
        };

        // Add itemType filter
        if (itemType && itemType !== 'all') {
            query.isExternal = itemType === 'external'; // Convert itemType to boolean for isExternal field
        }

        const inventoryItems = await InventoryItem.find(query)
            .populate('reservations.eventId', 'eventName')
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const totalCount = await InventoryItem.countDocuments(query);

        res.status(200).json({
            message: "Inventory items retrieved successfully",
            inventoryItems,
            pagination: {
                total: totalCount,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(totalCount / limit),
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Something went wrong", error: error.message });
    }
};

const getAllDropdown = async (req, res) => {
    console.log("Fetching all inventory items for dropdown");
    try {
        // Query items and select only the required fields
        const dropdownItems = await InventoryItem.find(
            { remainingQuantity: { $gt: 0 } }, // Only include items with remaining quantity
            'itemName _id remainingQuantity' // Select only the required fields
        ).sort({ itemName: 1 }); // Sort alphabetically by name

        const formattedItems = dropdownItems.map(item => ({
            itemId: item._id,
            itemName: item.itemName,
            remainingQuantity: item.remainingQuantity
        }));

        res.status(200).json({
            message: "Dropdown items retrieved successfully",
            items: formattedItems
        });
    } catch (error) {
        console.error("Error fetching dropdown items:", error);
        res.status(500).json({ message: "Something went wrong" });
    }
};

const getInventoryReportData = async (req, res) => {
    try {
        const inventoryItems = await InventoryItem.find({}, 'itemName totalQuantity createdAt category isExternal condition price')
            .sort({ createdAt: 1 }); 

        res.status(200).json({
            message: "Inventory report data retrieved successfully",
            items: inventoryItems
        });
    } catch (error) {
        console.error("Error fetching inventory report data:", error);
        res.status(500).json({ message: "Something went wrong" });
    }
};


const getInventoryItemById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ message: "Invalid inventory item ID format" });
        }

        const inventoryItem = await InventoryItem.findById(id)
        .populate({
          path: 'reservations.eventId',
          model: 'Event',
          select: 'eventName'
        });

        if (!inventoryItem) {
            return res.status(404).json({ message: "Inventory item not found" });
        }

        res.status(200).json({ message: "Inventory item retrieved successfully", inventoryItem });
    } catch (error) {
        res.status(500).json({ message: "Something went wrong" });
    }
};

const updateInventoryItem = async (req, res) => {
    try {
        const updatedInventoryItem = await InventoryItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedInventoryItem) {
            return res.status(404).json({ message: "Inventory item not found" });
        }
        res.status(200).json({ message: "Inventory item updated successfully", inventoryItem: updatedInventoryItem });
    } catch (error) {
        res.status(500).json({ message: "Something went wrong" });
    }
};

const deleteInventoryItem = async (req, res) => {
    try {
        const deletedInventoryItem = await InventoryItem.findByIdAndDelete(req.params.id);
        if (!deletedInventoryItem) {
            return res.status(404).json({ message: "Inventory item not found" });
        }
        res.status(200).json({ message: "Inventory item deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Something went wrong" });
    }
};

const createReservation = async (req, res) => {
    try {
        const { itemId, eventId, date, reservedQuantity } = req.body;

        if (!itemId || !eventId || !date || !reservedQuantity) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const item = await InventoryItem.findById(itemId);
        if (!item) {
            return res.status(404).json({ message: "Inventory item not found" });
        }

        // Find total reserved quantity for the selected date
        const existingReservations = item.reservations?.filter(r =>
            new Date(r.date).toDateString() === new Date(date).toDateString()
        ) || [];

        const totalReservedForDate = existingReservations.reduce(
            (sum, r) => sum + r.reservedQuantity,
            0
        );

        const availableQuantity = item.totalQuantity - totalReservedForDate;

        if (reservedQuantity > availableQuantity) {
            return res.status(400).json({ message: `Only ${availableQuantity} item(s) available for the selected date` });
        }

        // Add new reservation
        item.reservations.push({
            eventId,
            date,
            reservedQuantity
        });

        await item.save();

        res.status(201).json({ message: "Reservation created successfully", item });
    } catch (error) {
        console.error("Error creating reservation:", error);
        res.status(500).json({ message: "Something went wrong" });
    }
};



module.exports = { createInventoryItem, getAllInventoryItems, getAllDropdown, getInventoryItemById,getInventoryReportData, updateInventoryItem, deleteInventoryItem, createReservation };