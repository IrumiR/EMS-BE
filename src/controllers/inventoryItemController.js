const InventoryItem = require('../models/inventoryItemModel');

const createInventoryItem = async (req, res) => {
    try {
        const { itemName, category, quantity, price, condition, variations, images, isExternal, availability, assignedEvent, createdBy } = req.body;

        const newInventoryItem = new InventoryItem({
            itemName,
            category,
            quantity,
            price,
            condition,
            variations,
            images,
            isExternal,
            availability,
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
        const { page = 1, limit = 10, search = "" } = req.query;

        const query = {
            $or: [
                { itemName: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } }
            ]
        };

        const inventoryItems = await InventoryItem.find(query)
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

const getInventoryItemById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ message: "Invalid inventory item ID format" });
        }

        const inventoryItem = await InventoryItem.findById(id);

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
        const updatedInventoryItem = await InventoryItem.findByIdAndUpdate(req.params.id, req.body  , { new: true });
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

module.exports = { createInventoryItem, getAllInventoryItems, getInventoryItemById, updateInventoryItem, deleteInventoryItem };