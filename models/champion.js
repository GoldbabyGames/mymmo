// models/champion.js
const mongoose = require('mongoose');

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
    physical: {
        strength: { type: Number, min: 0, max: 100 },
        agility: { type: Number, min: 0, max: 100 },
        hardiness: { type: Number, min: 0, max: 100 },
        stamina: { type: Number, min: 0, max: 100 }
    },
    mental: {
        intelligence: { type: Number, min: 0, max: 100 },
        unarmedSkill: { type: Number, min: 0, max: 100 },
        weaponSkill: { type: Number, min: 0, max: 100 },
        survivalSkill: { type: Number, min: 0, max: 100 }
    },
    status: {
        type: String,
        enum: ['available', 'training', 'arena', 'recovering'],
        default: 'available'
    }
});

module.exports = mongoose.model('Champion', ChampionSchema);