const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    reportId: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true, 
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    type: {
        type: String,
        enum: ["Event", "Financial", "Inventory", "Task Progress"],
        required: true,
    },
    parameters: {
        type: mongoose.Schema.Types.Mixed, // Stores JSON parameters for the report
        default: {},
    },
    format: {
        type: String,
        enum: ["PDF", "Excel"],
        required: true,
    },
    generatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    filePath: {
        type: String,
        default: null, // Nullable field to store the file path
    }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);