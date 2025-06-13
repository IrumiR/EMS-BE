const User = require('../models/userModel');
const bcrypt = require('bcryptjs');

const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = "" } = req.query;

        const query = {
            $or: [
                { userName: { $regex: search, $options: "i" } }
            ]
        };

        const users = await User.find(query)
            .select("-password")
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

const getUserReportData = async (req, res) => {
    try {
        const users = await User.find({}, 'userName email role contactNumber createdAt')
            .sort({ createdAt: 1 }); 

        res.status(200).json({
            message: "User report data retrieved successfully",
            users
        });
    } catch (error) {
        console.error("Error fetching user report data:", error);
        res.status(500).json({ message: "Something went wrong" });
    }
};

const getUserCountsByRole = async (req, res) => {
    try {
        const roleCounts = await User.aggregate([
            {
                $group: {
                    _id: "$role",
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    role: "$_id",
                    count: 1
                }
            }
        ]);

        // Ensure all roles are included
        const allRoles = ["admin", "manager", "team-member", "client"];

        const formattedCounts = allRoles.map(role => {
            const match = roleCounts.find(r => r.role === role);
            return {
                role,
                count: match ? match.count : 0
            };
        });

        res.status(200).json({
            message: "User role counts retrieved successfully",
            data: formattedCounts
        });
    } catch (error) {
        console.error("Error fetching user role counts:", error);
        res.status(500).json({ message: "Something went wrong" });
    }
};



const getUserById = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId).select("-password");

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
        const updatedData = { ...req.body };

        // Handle password update only if it's non-empty
        if (updatedData.password) {
            updatedData.password = await bcrypt.hash(updatedData.password, 10);
        } else {
            delete updatedData.password; // Prevent overwriting existing password with empty value
        }

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


module.exports = { getAllUsers, getUserById, getUserReportData, updateUser, deleteUser, getClientDropdown, getAssigneesDropdown, getUserCountsByRole };