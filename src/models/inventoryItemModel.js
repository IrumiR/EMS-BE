const mongoose = require('mongoose');

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
        min: 0, // Ensures non-negative quantity
    },
    remainingQuantity: {
        type: Number,
        required: true,
        min: 0, // Ensures non-negative quantity
    },
    price: {
        type: Number,
        required: true,
        min: 0, // Ensures non-negative price
    },
    condition: {
        type: [String],
        required: true,
    },
    variations: {
        type: [String],
        required: true,
    },
    images: {
        type: [String],
        required: false,
    },
    isExternal: {
        type: Boolean,
        default: true,
    },
    assignedEvent: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Event',
            required: false,
        }
    ],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    }
}, { timestamps: true });

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);