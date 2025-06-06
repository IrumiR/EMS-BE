const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
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
    isApproved: {
        type: Boolean,
        default: false,
    },
    expenses: [
        {
            expenseName: {
                type: String,
                required: true,
            },
            amount: {
                type: Number,
                required: true,
            }
        }
    ],
    totalAmount: {
        type: Number,
        required: true,
    },
    discount: {
        type: Number,
        default: 0,
    },
    remarks: {
        type: String,
        default: '',
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    }
}, { timestamps: true });

module.exports = mongoose.model('Budget', budgetSchema);