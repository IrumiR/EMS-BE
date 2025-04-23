const mongoose = require('mongoose');

const quotationSchema = new mongoose.Schema({
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true,
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true,
    },
    items: {
        type: [String], 
        required: true,
    },
    subtotal: {
        type: Number,
        required: true,
        min: 0,
    },
    conditions: {
        type: [String],
        required: true,
    },
    status: {
        type: String,
        enum: ["Draft", "PendingApproval", "Approved", "Rejected"],
        default: "Draft",
    },
    rejectionReason: {
        type: String,
        default: null, 
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    }
}, { timestamps: true });

module.exports = mongoose.model('Quotation', quotationSchema);