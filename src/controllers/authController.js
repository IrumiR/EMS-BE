const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
    try {
        const { userName, email, password, role, address, contactNumber, profileImage, isActive } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            userName,
            email,
            password: hashedPassword,
            role,
            address,
            contactNumber,
            profileImage,
            isActive
        });
        await newUser.save();
        res.status(201).json({ message: `User registered successfully` });
    }
    catch (error) {
        res.status(500).json({ message: "Something went wrong" });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User
            .findOne({ email });
        if (!user) {
            return res.status(404).json({ message: `User not found` });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: `Invalid credentials` });
        }

        const token = jwt.sign({ id: user._id, role: user.role, userName: user.userName }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({
            token
        });

    } catch (error) {
        res.status(500).json({ message: "Something went wrong" });
    }
};


module.exports = {
    register,
    login
};