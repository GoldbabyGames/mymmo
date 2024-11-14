// models/arenaQueue.js
const mongoose = require('mongoose');

const ArenaQueueSchema = new mongoose.Schema({
    championId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Champion',
        required: true
    },
    level: {
        type: Number,
        required: true
    },
    outfitId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Outfit',
        required: true
    },
    queuedAt: {
        type: Date,
        default: Date.now
    }
});

// Auto-delete queue entries after 5 minutes
ArenaQueueSchema.index({ queuedAt: 1 }, { expireAfterSeconds: 300 });

module.exports = mongoose.model('ArenaQueue', ArenaQueueSchema);