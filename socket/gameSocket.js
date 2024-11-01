// socket/gameSocket.js
const mongoose = require('mongoose');
const GameController = require('../controllers/gameController');

function initializeGameSockets(io) {
	console.log('Game socket initialization started');
	
    io.on('connection', async (socket) => {
		console.log('Player connected:', socket.id);

        socket.on('create-outfit', async (data) => {
            console.log('Create outfit request received:', data);
			
			
			try {
                const tempUserId = new mongoose.Types.ObjectId();
                console.log('Processing outfit creation:', {
                    userId: tempUserId,
                    name: data.name
                });

                const outfit = await GameController.createOutfit(tempUserId, data.name);
                console.log('Outfit created successfully:', outfit._id);
                socket.emit('outfit-created', outfit);

            } catch (error) {
                console.error('Error creating outfit:', error);
                socket.emit('error', { message: error.message });
            }
        });

        // Add structure upgrade handler
        socket.on('upgrade-structure', async (data) => {
            console.log('Received upgrade-structure request:', data);
            
            try {
                // Validate input
                if (!data.outfitId || !data.structureType) {
                    throw new Error('Missing required upgrade parameters');
                }

                // Call controller method
                const outfit = await GameController.upgradeStructure(
                    data.outfitId,
                    data.structureType
                );

                console.log('Structure upgraded successfully:', outfit);

                // Emit success event with updated outfit data
                socket.emit('structure-upgraded', { outfit });
                
                // Also emit an event for the activity log
                socket.emit('log-entry', {
                    message: `Upgraded ${data.structureType} to level ${outfit.structures[data.structureType].level}`,
                    type: 'success'
                });

            } catch (error) {
                console.error('Structure upgrade failed:', error);
                socket.emit('upgrade-failed', { 
                    message: error.message,
                    structureType: data.structureType 
                });
            }
        });

        socket.on('generate-champion', async (data) => {
            try {
                const champion = await GameController.generateChampion(data.outfitId);
                socket.emit('champion-generated', champion);
            } catch (error) {
                socket.emit('error', { message: error.message });
            }
        });

        socket.on('train-champion', async (data) => {
            try {
                const result = await GameController.trainChampion(data.championId, data.attribute);
                socket.emit('training-started', result);
            } catch (error) {
                socket.emit('error', { message: error.message });
            }
        });

        socket.on('disconnect', () => {
            console.log('Player disconnected:', socket.id);
        });
    });
}

module.exports = initializeGameSockets;