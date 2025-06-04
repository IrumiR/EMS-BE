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
        required: false,
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
    reservations: [
  {
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
    }
  }
],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    }
}, { timestamps: true });

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);