const User = require('../models/userModel');

const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = "" } = req.query;

        const query = {
            $or: [
                { userName: { $regex: search, $options: "i" } }
            ]
        };

        const users = await User.find(query)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const totalCount = await User.countDocuments(query);

        res.status(200).json({
            message: "Users retrieved successfully",
            users,
            pagination: {
                total: totalCount,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(totalCount / limit),
            }
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: "Something went wrong", error: error.message });
    }
};

const getUserById = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            message: "User retrieved successfully",
            user,
        });
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Something went wrong", error: error.message });
    }
};

const updateUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const updatedData = req.body;

        const user = await User.findByIdAndUpdate(userId, updatedData, { new: true });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            message: "User updated successfully",
            user,
        });
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ message: "Something went wrong", error: error.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findByIdAndDelete(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            message: "User deleted successfully",
            user,
        });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ message: "Something went wrong", error: error.message });
    }
};

const getClientDropdown = async (req, res) => {
    try {
        const clients = await User.find({ role: "client" }).select("userName");
        const formattedClients = clients.map(client => ({
            userName: client.userName,
            userId: client._id.toString(),
        }));

        res.status(200).json({
            message: "Clients retrieved successfully",
            clients: formattedClients,
        });
    } catch (error) {
        console.error("Error fetching dropdown clients:", error);
        res.status(500).json({ message: "Something went wrong" });
    }
};

const getAssigneesDropdown = async (req, res) => {
    try {
        const assignees = await User.find({ role: "team-member" }).select("userName");
        const formattedAssignees = assignees.map(assignee => ({
            userName: assignee.userName,
            userId: assignee._id.toString(),
        }));

        res.status(200).json({
            message: "Assignees retrieved successfully",
            assignees: formattedAssignees,
        });
    } catch (error) {
        console.error("Error fetching dropdown assignees:", error);
        res.status(500).json({ message: "Something went wrong" });
    }
};


module.exports = { getAllUsers, getUserById, updateUser, deleteUser, getClientDropdown, getAssigneesDropdown };