const InventoryItem = require('../models/inventoryItemModel');
const Event = require('../models/eventModel');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage });

const uploadInventoryImage = upload.array('image');

const createInventoryItem = async (req, res) => {
    try {
        const { itemName, itemDescription, category, totalQuantity, remainingQuantity, price, condition, variations, isExternal, isSingleUse, isLeased, assignedEvent, createdBy } = req.body;

        const images = req.files?.map(file => ({
            data: file.buffer,
            contentType: file.mimetype
        })) || [];


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
            isSingleUse,
            isLeased,
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
        const { page = 1, limit = 10, search = "", itemType, category } = req.query;

        const query = {
            $or: [
                { itemName: { $regex: search, $options: "i" } },
                { itemDescription: { $regex: search, $options: "i" } }
            ]
        };

        // Filter by itemType
        if (itemType && itemType !== 'all') {
            query.isExternal = itemType === 'external';
        }

        // Filter by category
        if (category && category !== 'all') {
            query.category = category;
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
    try {
        const dropdownItems = await InventoryItem.find(
            {
                $or: [
                    { $and: [{ isSingleUse: true }, { remainingQuantity: { $gt: 0 } }] },
                    { $and: [{ isLeased: true }, { totalQuantity: { $gt: 0 } }] },
                    { $and: [{ isSingleUse: false }, { isLeased: false }, { totalQuantity: { $gt: 0 } }] }
                ]
            },
            'itemName _id remainingQuantity totalQuantity isSingleUse price'
        ).sort({ itemName: 1 });

        const formattedItems = dropdownItems.map(item => ({
            itemId: item._id,
            itemName: item.itemName,
            remainingQuantity: item.isSingleUse ? item.remainingQuantity : item.totalQuantity,
            price: item.price
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

const getInventoryItemCount = async (req, res) => {
    try {
        const [totalCount, internalCount, externalCount] = await Promise.all([
            InventoryItem.countDocuments(),
            InventoryItem.countDocuments({ isExternal: false }),
            InventoryItem.countDocuments({ isExternal: true })
        ]);

        res.status(200).json({
            message: "Inventory item counts retrieved successfully",
            data: {
                totalCount,
                internalCount,
                externalCount
            }
        });
    } catch (error) {
        console.error("Error fetching inventory item count:", error);
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
        const { itemName, itemDescription, category, totalQuantity, remainingQuantity, price, condition, variations, isExternal, isSingleUse, isLeased, assignedEvent, createdBy } = req.body;

        let images = [];
        if (req.files && req.files.length > 0) {
            images = req.files.map(file => ({
                data: file.buffer,
                contentType: file.mimetype
            }));
        }

        const updateData = {
            itemName,
            itemDescription,
            category,
            totalQuantity,
            remainingQuantity: isSingleUse ? totalQuantity : remainingQuantity,
            price,
            condition,
            variations,
            images,
            isExternal,
            isSingleUse,
            isLeased,
            assignedEvent,
            createdBy
        };

        // If new images are provided, update them
        if (images.length > 0) {
            updateData.images = images;
        }

        const updatedInventoryItem = await InventoryItem.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        if (!updatedInventoryItem) {
            return res.status(404).json({ message: "Inventory item not found" });
        }

        res.status(200).json({ message: "Inventory item updated successfully", inventoryItem: updatedInventoryItem });
    } catch (error) {
        console.error("Error updating inventory item:", error);
        res.status(500).json({ message: "Something went wrong" });
    }
};


const deleteInventoryItem = async (req, res) => {
    try {
        const inventoryItemId = req.params.id;

        const deletedInventoryItem = await InventoryItem.findByIdAndDelete(inventoryItemId);

        if (!deletedInventoryItem) {
            return res.status(404).json({ message: "Inventory item not found" });
        }

        await Event.updateMany(
            { inventoryItems: inventoryItemId },
            { $pull: { inventoryItems: inventoryItemId } }
        );

        res.status(200).json({ message: "Inventory item deleted and references removed from events" });
    } catch (error) {
        console.error("Delete inventory error:", error);
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

        //Damaged item check
        // if (item.condition.includes("Damaged")) {
        //   return res.status(400).json({
        //     message: "Can`t create reservation for a damaged item",
        //   });
        // }

        //for reserving item within the event start date and end date
        // const event = await Event.findById(eventId);
        // if (!event) {
        //     return res.status(404).json({ message: "Event not found" });
        // }

        // const reservationDate = new Date(date);

        // const eventStart = new Date(event.startDate);
        // eventStart.setHours(0,0,0,0);

        // const eventEnd = new Date(event.endDate);
        // eventEnd.setHours(23,59,59,999);

        // if(reservationDate < eventStart || reservationDate > eventEnd){
        //  return res.status(400).json({
        //     message: "Reservation date must be within selected event dates"
        //  })
        // }

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

const ReserveSingleUseItems = async (req, res) => {
    try {
        const { itemId, eventId, date, reservedQuantity } = req.body;

        if (!itemId || !eventId || !reservedQuantity) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const item = await InventoryItem.findById(itemId);
        if (!item) {
            return res.status(404).json({ message: "Inventory item not found" });
        }

        if (!item.isSingleUse) {
            return res.status(400).json({ message: "Reservations are only allowed for single-use items." });
        }

        const availableQuantity = item.remainingQuantity;

        if (reservedQuantity > availableQuantity) {
            return res.status(400).json({ message: `Only ${availableQuantity} item(s) are available` });
        }

        // Add reservation
        item.reservations.push({
            eventId,
            date,
            reservedQuantity
        });

        // Reduce remaining quantity
        item.remainingQuantity -= reservedQuantity;

        await item.save();

        res.status(201).json({ message: "Reservation created successfully", item });
    } catch (error) {
        console.error("Error creating reservation:", error);
        res.status(500).json({ message: "Something went wrong" });
    }
};


const getAllReservations = async (req, res) => {
    try {
        const { dateRange } = req.query;

        let startDate;
        const now = new Date();

        if (dateRange === "pastDay") {
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 1); 
        } else if (dateRange === "pastWeek") {
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7); 
        } else if (dateRange === "pastMonth") {
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 1); 
        }

        const itemsWithReservations = await InventoryItem.find({ "reservations.0": { $exists: true } })
            .populate("reservations.eventId", "eventName");

        const reservations = itemsWithReservations.flatMap(item =>
            item.reservations
                .filter(r => {
                    if (!startDate) return true; 
                    return r.createdAt && new Date(r.createdAt) >= startDate;
                })
                .map(r => ({
                    itemId: item._id,
                    itemName: item.itemName,
                    date: r.date,
                    reservedQuantity: r.reservedQuantity,
                    event: r.eventId ? {
                        _id: r.eventId._id,
                        name: r.eventId.eventName
                    } : null,
                    isSingleUse: item.isSingleUse,
                    isExternal: item.isExternal,
                    createdAt: r.createdAt
                }))
        );

        res.status(200).json({
            message: "All reservation report data retrieved successfully",
            reservations
        });
    } catch (error) {
        console.error("Error fetching reservations:", error);
        res.status(500).json({ message: "Something went wrong" });
    }
};
  


module.exports = { createInventoryItem, getAllInventoryItems, getAllDropdown, getInventoryItemCount, getInventoryItemById, getInventoryReportData, updateInventoryItem, deleteInventoryItem, createReservation, ReserveSingleUseItems, uploadInventoryImage, getAllReservations };