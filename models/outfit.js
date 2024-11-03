// models/outfit.js
const mongoose = require('mongoose');

const OutfitSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        minLength: 3,
        maxLength: 30
    },
    playerId: {
        type: String,
        required: true,
        index: true
    },
    level: {
        type: Number,
        default: 1,
        min: 1,
        max: 10
    },
    gold: {
        type: Number,
        default: 1000,
        min: 0
    },
    // Single champion reference instead of array
    champion: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Champion'
    },
    structures: {
        trainingFacility: {
            level: { type: Number, default: 1, min: 1 }
        },
        library: {
            level: { type: Number, default: 1, min: 1 }
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Outfit', OutfitSchema);