const mongoose = require('mongoose');

const ReservationSchema = new mongoose.Schema({
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: false
    },
    date: {
        type: Date,
        required: false
    },
    reservedQuantity: {
        type: Number,
        required: false,
        min: 1
    },
}, {
    timestamps: true
});


const inventoryItemSchema = new mongoose.Schema({
    itemName: {
        type: String,
        required: true,
    },
    itemDescription: {
        type: String,
        required: false,
    },
    category: {
        type: [String],
        required: true,
    },
    totalQuantity: {
        type: Number,
        required: true,
        min: 0,
    },
    remainingQuantity: {
        type: Number,
        required: true,
        min: 0,
    },
    price: {
        type: Number,
        required: true,
        min: 0,
    },
    condition: {
        type: [String],
        required: true,
    },
    variations: {
        type: [String],
        required: false,
    },
    images: [
        {
            data: Buffer,
            contentType: String
        }
    ],
    isExternal: {
        type: Boolean,
        default: true,
    },
    isSingleUse: {
        type: Boolean,
        default: false,
    },
    reservations: [ReservationSchema],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    }
}, { timestamps: true });

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);