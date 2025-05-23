const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    reportName: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        required: true,
    },
   eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);