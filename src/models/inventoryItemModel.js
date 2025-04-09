const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
    inventoryItemId: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true,  // Auto-generates a unique ObjectId
    },
    itemName: {
        type: String,
        required: true,
        trim: true,
    },
    category: {
        type: String,
        required: true,
    },
    quantity: {
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
        type: String,
        enum: ["New", "Used", "Refurbished"],
        required: true,
    },
    variations: {
        type: String,
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
    availability: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    }
}, { timestamps: true });

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);