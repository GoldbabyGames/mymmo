// models/champion.js
const mongoose = require('mongoose');

// Define a schema for a stat that has both current and potential values
const StatSchema = new mongoose.Schema({
    current: { type: Number, min: 1, max: 100, required: true },
    potential: { type: Number, min: 1, max: 100, required: true }
});

const ChampionSchema = new mongoose.Schema({
    outfitId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Outfit',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    level: {
        type: Number,
        required: true,
        min: 1,
        max: 10
    },
    physical: {
        strength: StatSchema,
        agility: StatSchema,
        hardiness: StatSchema,
        stamina: StatSchema
    },
    mental: {
        intelligence: StatSchema,
        unarmedSkill: StatSchema,
        weaponSkill: StatSchema,
        survivalSkill: StatSchema
    },
    status: {
        type: String,
        enum: ['available', 'training', 'arena', 'recovering'],
        default: 'available'
    }
});

module.exports = mongoose.model('Champion', ChampionSchema);