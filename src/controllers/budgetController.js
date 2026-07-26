const Budget = require('../models/budgetModel');
const Event = require('../models/eventModel');
const User = require('../models/userModel');
const mongoose = require('mongoose');
const { Types } = mongoose;
const { sendNotification } = require('./notificationController');

const calculateFinalAmount = (totalAmount, discount, providedFinalAmount) => {
    const parsedTotalAmount = Number(totalAmount || 0);
    const parsedDiscount = Number(discount || 0);
    const discountAmount = (parsedTotalAmount * parsedDiscount) / 100;

    return providedFinalAmount !== undefined && providedFinalAmount !== null
        ? Number(providedFinalAmount)
        : Math.max(parsedTotalAmount - discountAmount, 0);
};

const validateDiscount = (discount) => {
    const parsedDiscount = Number(discount ?? 0);

    if (!Number.isFinite(parsedDiscount)) {
        return { valid: false, message: "Discount must be a valid number" };
    }

    if (parsedDiscount < 0 || parsedDiscount > 5) {
        return { valid: false, message: "Discount cannot be negative or exceed 5%" };
    }

    return { valid: true, parsedDiscount };
};

const validateEventInventoryItems = async (eventId, inventoryItems = []) => {
    if (!eventId) {
        return { valid: true };
    }

    if (!Array.isArray(inventoryItems) || inventoryItems.length === 0) {
        return { valid: true };
    }

    const event = await Event.findById(eventId);
    if (!event) {
        return { valid: false, status: 404, message: "Associated event not found" };
    }

    const allowedItemIds = new Set(
        (event.inventoryItems || []).map((item) => item?.toString())
    );

    const invalidItems = inventoryItems.filter((item) => {
        const itemId = item?.itemId || item?._id || item?.id;
        return itemId && !allowedItemIds.has(itemId.toString());
    });

    if (invalidItems.length > 0) {
        return {
            valid: false,
            status: 400,
            message: "Only inventory items assigned to the event can be added to this budget",
            invalidItems,
        };
    }

    return { valid: true };
};

const createBudget = async (req, res) => {
    try {
        const { eventId, clientId, isApproved, expenses, inventoryItems, totalAmount, discount = 0, finalAmount, remarks, createdBy } = req.body;

        // const discountValidation = validateDiscount(discount);
        // if (!discountValidation.valid) {
        //     return res.status(400).json({ message: discountValidation.message });
        // }

        const parsedTotalAmount = Number(totalAmount || 0);
        const parsedDiscount = Number(discount || 0);
        // const parsedDiscount = discountValidation.parsedDiscount;
        const computedFinalAmount = calculateFinalAmount(parsedTotalAmount, parsedDiscount, finalAmount);

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: "Associated event not found" });
        }

        // Validation to ensure that only inventory items assigned to the event can be added to the budget
        // const inventoryValidation = await validateEventInventoryItems(eventId, inventoryItems);
        // if (!inventoryValidation.valid) {
        //     return res.status(inventoryValidation.status).json({ message: inventoryValidation.message });
        // }

        const newBudget = new Budget({
            eventId,
            clientId,
            isApproved,
            expenses,
            inventoryItems,
            totalAmount: parsedTotalAmount,
            discount: parsedDiscount,
            finalAmount: computedFinalAmount,
            remarks,
            createdBy
        });

        //Validation to prevent creation of multiple budgets for the same event
        // const existingBudget = await Budget.findOne({ eventId });
        // if (existingBudget) {
        //     const event = await Event.findById(eventId);
        //     if (event) {
        //         return res.status(400).json({ message: `Budget for ${event.eventName} already exists` });
        //     } else {
        //         return res.status(404).json({ message: "Event not found" });
        //     }
        // }

        // Add validation for damaged & single use items
        // if (Array.isArray(inventoryItems) && inventoryItems.length > 0) {
        //     const itemIds = inventoryItems
        //         .map((item) => item.itemId || item._id || item.id)
        //         .filter((id) => id);

        //     if (itemIds.length > 0) {
        //         const singleUseCount = await InventoryItem.countDocuments({
        //             _id: { $in: itemIds },
        //             isSingleUse: true,
        //         });

        //         if (singleUseCount > 5) {
        //             return res.status(400).json({ message: "More than 5 single-use items cannot be added to a budget" });
        //         }

        //         const damagedCount = await InventoryItem.countDocuments({
        //             _id: { $in: itemIds },
        //             condition: { $in: ["Damaged"] },
        //         });

        //         if (damagedCount > 0) {
        //             return res.status(400).json({ message: "Damaged inventory items cannot be added to a budget" });
        //         }
        //     }
        // }

        const savedBudget = await newBudget.save();

        await sendNotification({
            recipients: [clientId],
            type: 'budget',
            message: `New budget created for event ${event.eventName}.`,
            sender: createdBy
        });

        res.status(201).json({ message: "Budget created successfully", budget: savedBudget });
    } catch (error) {
        res.status(500).json({ message: "Something went wrong", error: error.message });
    }
}

const getAllBudgets = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = "", clientId, type } = req.query;
        const userId = req.user?.id;
        const userRole = req.user?.role;

        const query = {
            $or: [
                { expenses: { $elemMatch: { expenseName: { $regex: search, $options: "i" } } } },
                { remarks: { $regex: search, $options: "i" } }
            ]
        };

        // Filter by clientId if provided
        if (userRole == 'client') {
            query.$and = query.$and || [];
            query.$and.push({ clientId: userId });
        }

        // Filter by budget type (Approved, Pending, Rejected)
        if (type) {
            query.$and = query.$and || [];

            if (type === "Approved") {
                query.$and.push({ isApproved: true });
            } else if (type === "Rejected") {
                query.$and.push({ isApproved: false });
            } else if (type === "Pending") {
                query.$and.push({ isApproved: null });
            }
        }

        const budgets = await Budget.find(query)
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('eventId', 'eventName')
            .populate('clientId', 'userName')
            .populate('createdBy', 'userName role');

        const totalCount = await Budget.countDocuments(query);

        res.status(200).json({
            message: "Budgets retrieved successfully",
            budgets,
            pagination: {
                total: totalCount,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Something went wrong", error: error.message });
    }
};

const getBudgetReportData = async (req, res) => {
    try {
        const { dateRange } = req.query;

        const now = new Date();
        let startDate;

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

        const filter = {};

        if (startDate) {
            filter.createdAt = { $gte: startDate };
        }

        const budgets = await Budget.find(
            filter,
            'eventId clientId totalAmount isApproved createdAt createdBy'
        )
            .populate({ path: 'eventId', select: 'eventName' })
            .populate({ path: 'clientId', select: 'userName' })
            .populate({ path: 'createdBy', select: 'userName role' })
            .sort({ createdAt: 1 });

        res.status(200).json({
            message: "Budget report data retrieved successfully",
            budgets
        });
    } catch (error) {
        console.error("Error fetching budget report data:", error);
        res.status(500).json({ message: "Something went wrong" });
    }
};


const getBudgetCountsByStatus = async (req, res) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;

        const pipeline = [];

        if (userRole === 'client') {
            pipeline.push({
                $match: {
                    clientId: new Types.ObjectId(userId)
                }
            });
        }

        pipeline.push(
            {
                $group: {
                    _id: {
                        $switch: {
                            branches: [
                                { case: { $eq: ["$isApproved", true] }, then: "Approved" },
                                { case: { $eq: ["$isApproved", false] }, then: "Rejected" },
                            ],
                            default: "Pending",
                        },
                    },
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

        const statusCounts = await Budget.aggregate(pipeline);

        const allStatuses = ["Pending", "Approved", "Rejected"];

        const formattedCounts = allStatuses.map((status) => {
            const match = statusCounts.find((s) => s.status === status);
            return {
                status,
                count: match ? match.count : 0,
            };
        });

        res.status(200).json({
            message: "Budget status counts retrieved successfully",
            data: formattedCounts,
        });
    } catch (error) {
        console.error("Error fetching budget status counts:", error);
        res.status(500).json({ message: "Something went wrong", error: error.message });
    }
};


const getBudgetById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ message: "Invalid budget ID" });
        }

        const budget = await Budget.findById(id)
            .populate('eventId', 'eventName')
            .populate('clientId', 'userName')
            .populate('createdBy', 'userName role');

        if (!budget) {
            return res.status(404).json({ message: "Budget not found" });
        }

        res.status(200).json({ message: "Budget retrieved successfully", budget });
    } catch (error) {
        res.status(500).json({ message: "Something went wrong", error: error.message });
    }
}

const updateBudget = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const { inventoryItems = [] } = updates;

        if (!id) {
            return res.status(400).json({ message: "Invalid budget ID" });
        }

        if (updates.eventId) {
            const existingBudget = await Budget.findOne({ eventId: updates.eventId, clientId: updates.clientId, _id: { $ne: id } });
            if (existingBudget) {
                const event = await Event.findById(updates.eventId);
                if (event) {
                    return res.status(400).json({ message: `Budget for ${event.eventName} already exists` });
                } else {
                    return res.status(404).json({ message: "Event not found" });
                }
            }
        }

        const existingBudget = await Budget.findById(id);
        if (!existingBudget) {
            return res.status(404).json({ message: "Budget not found" });
        }

        const event = await Event.findById(updates.eventId || existingBudget.eventId);
        if (!event) {
            return res.status(404).json({ message: "Associated event not found" });
        }

        // Validation to ensure that only inventory items assigned to the event can be added to the budget
        // if (updates.inventoryItems !== undefined) {
        //     const inventoryValidation = await validateEventInventoryItems(
        //         updates.eventId || existingBudget.eventId,
        //         updates.inventoryItems
        //     );
        //     if (!inventoryValidation.valid) {
        //         return res.status(inventoryValidation.status).json({ message: inventoryValidation.message });
        //     }
        // }

        const updateData = { ...updates };

        if (updates.totalAmount !== undefined || updates.discount !== undefined) {
            const nextTotalAmount = updates.totalAmount !== undefined
                ? Number(updates.totalAmount)
                : Number(existingBudget.totalAmount || 0);

            let nextDiscount = updates.discount !== undefined
                ? updates.discount
                : existingBudget.discount;

            // if (updates.discount !== undefined) {
            //     const discountValidation = validateDiscount(updates.discount);
            //     if (!discountValidation.valid) {
            //         return res.status(400).json({ message: discountValidation.message });
            //     }
            //     nextDiscount = discountValidation.parsedDiscount;
            // }

            updateData.totalAmount = nextTotalAmount;
            updateData.discount = nextDiscount;
            // updateData.discount = Number(nextDiscount);

            if (updates.finalAmount === undefined) {
                updateData.finalAmount = calculateFinalAmount(nextTotalAmount, nextDiscount, undefined);
            }
        }

        if (updates.finalAmount !== undefined && updates.finalAmount !== null) {
            updateData.finalAmount = Number(updates.finalAmount);
        }

        // Prevent editing budgets that are already approved.
        // const existingBudget = await Budget.findById(id);

        // if (!existingBudget) {
        //     return res.status(404).json({ message: "Budget not found" });
        // }

        // if (existingBudget.isApproved === true) {
        //     return res.status(400).json({ message: "Approved budgets can't be edited" });
        // }

        // Add validation for damaged & single use items
        // if (Array.isArray(inventoryItems) && inventoryItems.length > 0) {
        //     const itemIds = inventoryItems
        //         .map((item) => item.itemId || item._id || item.id)
        //         .filter((id) => id);

        //     if (itemIds.length > 0) {
        //         const singleUseCount = await InventoryItem.countDocuments({
        //             _id: { $in: itemIds },
        //             isSingleUse: true,
        //         });

        //         if (singleUseCount > 5) {
        //             return res.status(400).json({ message: "More than 5 single-use items cannot be added to a budget" });
        //         }

        //         const damagedCount = await InventoryItem.countDocuments({
        //             _id: { $in: itemIds },
        //             condition: { $in: ["Damaged"] },
        //         });

        //         if (damagedCount > 0) {
        //             return res.status(400).json({ message: "Damaged inventory items cannot be added to a budget" });
        //         }
        //     }
        // }

        const updatedBudget = await Budget.findByIdAndUpdate(id, updateData, {
            new: true,
        });

        if (!updatedBudget) {
            return res.status(404).json({ message: "Budget not found" });
        }

        const sender = await User.findById(updatedBudget.createdBy);
        const clientId = event.clientId;

        await sendNotification({
            recipients: [clientId],
            type: "budget",
            message: `Budget has been updated for event ${event.eventName}.`,
            sender,
        });

        res
            .status(200)
            .json({ message: "Budget updated successfully", budget: updatedBudget });
    } catch (error) {
        res
            .status(500)
            .json({ message: "Something went wrong", error: error.message });
    }
};

const deleteBudget = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ message: "Invalid budget ID" });
        }

        //Validation to prevent deletion of approved budgets
        // const budget = await Budget.findById(id);

        // if (!budget) {
        //     return res.status(404).json({ message: "Budget not found" });
        // }

        // const isApproved = budget.isApproved;

        // if (isApproved === true) {
        //     return res.status(400).json({ message: "Budgets with status 'Approved' can't be deleted" });
        // }

        const deletedBudget = await Budget.findByIdAndDelete(id);

        if (!deletedBudget) {
            return res.status(404).json({ message: "Budget not found" });
        }

        const event = await Event.findById(deletedBudget.eventId);
        if (!event) {
            return res.status(404).json({ message: "Associated event not found" });
        }

        const deleterId = req.user?.id;
        const deleter = deleterId ? await User.findById(deleterId) : null;
        const clientId = event.clientId;
        const adminUsers = await User.find({ role: 'admin' }, '_id');
        const adminIds = adminUsers.map(admin => admin._id.toString());

        const recipients = [...new Set([...(clientId ? [clientId.toString()] : []), ...adminIds])];

        await sendNotification({
            recipients,
            type: "budget",
            message: `Budget has been deleted for event ${event.eventName}.`,
            sender: deleter?._id || deleterId,
        });

        res.status(200).json({ message: "Budget deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Something went wrong", error: error.message });
    }
}

const updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isApproved, remarks } = req.body;

        if (!id) {
            return res.status(400).json({ message: "Invalid budget ID" });
        }

        if ((isApproved === true || isApproved === false) && !remarks) {
            return res.status(400).json({ message: "Remarks are required when approving or rejecting a budget" });
        }

        let updateData;

        if (isApproved === null || isApproved === undefined) {
            updateData = {
                isApproved: null,
                status: "Pending",
                remarks: ""
            };
        } else if (isApproved === true) {
            updateData = {
                isApproved: true,
                status: "Approved",
                remarks: remarks
            };
        } else if (isApproved === false) {
            updateData = {
                isApproved: false,
                status: "Rejected",
                remarks: remarks
            };
        }

        const updatedBudget = await Budget.findByIdAndUpdate(id, updateData, { new: true });

        if (!updatedBudget) {
            return res.status(404).json({ message: "Budget not found" });
        }

        const event = await Event.findById(updatedBudget.eventId);
        if (!event) {
            return res.status(404).json({ message: "Associated event not found" });
        }
        const createdBy = updatedBudget.createdBy;
        const clientId = event.clientId;

        await sendNotification({
            recipients: createdBy,
            type: 'budget',
            message: `Budget is ${updateData.status} for event ${event.eventName}.`,
            sender: [clientId]
        });

        res.status(200).json({
            message: "Budget status updated successfully",
            budget: updatedBudget
        });
    } catch (error) {
        res.status(500).json({ message: "Something went wrong", error: error.message });
    }
}

module.exports = {
    createBudget,
    getAllBudgets,
    getBudgetReportData,
    getBudgetCountsByStatus,
    getBudgetById,
    updateBudget,
    deleteBudget,
    updateStatus
}