// test/dbTest.js
const mongoose = require('mongoose');
const Outfit = require('../models/outfit');

async function testDatabase() {
    try {
        // Connect to MongoDB
        await mongoose.connect('mongodb://localhost:27017/rpg_game', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');

        // Test outfit creation
        const testOutfit = new Outfit({
            name: 'Test Outfit',
            userId: new mongoose.Types.ObjectId(),
            level: 1,
            gold: 1000,
            structures: {
                trainingFacility: { level: 1 },
                library: { level: 1 }
            }
        });

        // Save the test outfit
        const savedOutfit = await testOutfit.save();
        console.log('Test outfit saved:', savedOutfit);

        // Verify it exists in the database
        const foundOutfit = await Outfit.findById(savedOutfit._id);
        console.log('Found outfit in database:', foundOutfit);

        // List all outfits
        const allOutfits = await Outfit.find({});
        console.log('All outfits in database:', allOutfits);

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Database connection closed');
    }
}

testDatabase();