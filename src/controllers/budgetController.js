const Budget = require('../models/budgetModel');
const mongoose = require('mongoose');

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

        res.status(201).json({ message: "Budget created successfully", budget: savedBudget });
    } catch (error) {
        res.status(500).json({ message: "Something went wrong", error: error.message });
    }
}

const getAllBudgets = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = "", clientId } = req.query;

        const query = {
            $or: [
                { expenses: { $elemMatch: { expenseName: { $regex: search, $options: "i" } } } },
                { remarks: { $regex: search, $options: "i" } }
            ]
        };

        // Add clientId to query if provided
        if (clientId) {
            query.$and = query.$and || [];
            query.$and.push({ clientId });
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
}

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
    getBudgetById,
    updateBudget,
    deleteBudget,
    updateStatus
}