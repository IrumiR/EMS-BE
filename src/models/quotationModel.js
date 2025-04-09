const mongoose = require('mongoose');

const quotationSchema = new mongoose.Schema({
    quotationId: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true, 
    },
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true,
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    quotationDate: {
        type: Date,
        required: true,
    },
    items: {
        type: [mongoose.Schema.Types.Mixed], // Array of JSON objects representing line items
        required: true,
    },
    subtotal: {
        type: Number,
        required: true,
        min: 0,
    },
    discount: {
        type: Number,
        default: 0,
        min: 0,
    },
    total: {
        type: Number,
        required: true,
        min: 0,
    },
    termsAndConditions: {
        type: String,
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