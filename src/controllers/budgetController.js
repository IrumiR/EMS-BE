const Budget = require('../models/budgetModel');
const mongoose = require('mongoose');
const { Types } = mongoose;
const { sendNotification } = require('./notificationController');

const createBudget = async (req, res) => {
    try {
        const { eventId, clientId, isApproved, expenses, totalAmount, discount, remarks, createdBy } = req.body;

        const newBudget = new Budget({
            eventId,
            clientId,
            isApproved,
            expenses,
            totalAmount,
            discount,
            remarks,
            createdBy
        });

        const savedBudget = await newBudget.save();

        await sendNotification({
            recipients: [clientId],
            type: 'budget',
            message: `New budget for your event.`,
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

        const query = {
            $or: [
                { expenses: { $elemMatch: { expenseName: { $regex: search, $options: "i" } } } },
                { remarks: { $regex: search, $options: "i" } }
            ]
        };

        // Filter by clientId if provided
        if (clientId) {
            query.$and = query.$and || [];
            query.$and.push({ clientId });
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
            .populate('createdBy', 'userName');

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
        const budgets = await Budget.find(
            { isApproved: true }, 
            'eventId clientId totalAmount createdAt createdBy'
        )
        .populate({
            path: 'eventId',
            select: 'eventName'
        })
        .populate({
            path: 'clientId',
            select: 'userName'
        })
        .populate({
            path: 'createdBy',
            select: 'userName'
        })
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
        const { clientId } = req.query;

        const pipeline = [];

        if (clientId) {
            pipeline.push({
                $match: {
                    clientId: new Types.ObjectId(clientId)
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
            .populate('createdBy', 'userName');

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

        if (!id) {
            return res.status(400).json({ message: "Invalid budget ID" });
        }

        const updatedBudget = await Budget.findByIdAndUpdate(id, updates, { new: true });

        if (!updatedBudget) {
            return res.status(404).json({ message: "Budget not found" });
        }

        res.status(200).json({ message: "Budget updated successfully", budget: updatedBudget });
    } catch (error) {
        res.status(500).json({ message: "Something went wrong", error: error.message });
    }
}

const deleteBudget = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ message: "Invalid budget ID" });
        }

        const deletedBudget = await Budget.findByIdAndDelete(id);

        if (!deletedBudget) {
            return res.status(404).json({ message: "Budget not found" });
        }

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

        // Require remarks for both approval and rejection
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