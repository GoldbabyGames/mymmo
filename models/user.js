// models/user.js
const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minLength: 3,
        maxLength: 20
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    outfits: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Outfit'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Add passport-local-mongoose plugin
UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', UserSchema);