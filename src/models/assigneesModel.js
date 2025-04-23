const mongoose = require('mongoose');

const assigneesSchema = new mongoose.Schema({
    role: {
        type: String,
        required: true,
        enum: ["manager", "team-member"],
    },
    assigneeName: {
        type: String,
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, { timestamps: true });

module.exports = mongoose.model('Assignees', assigneesSchema);