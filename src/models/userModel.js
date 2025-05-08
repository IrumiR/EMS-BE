const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        required: true,
        enum: ["admin", "manager", "team-member", "client"],
    },
    address: {
        type: String,
        required: true,
    },
    contactNumber: {
        type: String,
        required: true,
        unique: true,
    },
    profileImage: {
        type: String,
        required: false, 
    },
    isActive: {
        type: Boolean,
        default: true,
    },
},
    {
        timestamps: true,
    });

module.exports = mongoose.model('User', userSchema);