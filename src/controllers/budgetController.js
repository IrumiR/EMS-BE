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

        res.status(200).json({ message: "Budgets retrieved successfully", budgets, totalCount });
    } catch (error) {
        res.status(500).json({ message: "Something went wrong", error: error.message });
    }
}

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
        const { isApproved } = req.body;

        if (!id) {
            return res.status(400).json({ message: "Invalid budget ID" });
        }

        const updatedBudget = await Budget.findByIdAndUpdate(id, { isApproved }, { new: true });

        if (!updatedBudget) {
            return res.status(404).json({ message: "Budget not found" });
        }

        res.status(200).json({ message: "Budget status updated successfully", budget: updatedBudget });
    } catch (error) {
        res.status(500).json({ message: "Something went wrong", error: error.message });
    }
}

module.exports = {
    createBudget,
    getAllBudgets,
    getBudgetById,
    updateBudget,
    deleteBudget,
    updateStatus
}