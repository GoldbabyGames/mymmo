// socket/gameSocket.js
const mongoose = require('mongoose');
const GameController = require('../controllers/gameController');
const { BASE_CHAMPION_COST } = require('../config/gameConstants');

function initializeGameSockets(io) {
	console.log('Game socket initialization started');
	
    io.on('connection', async (socket) => {
		const playerId = socket.request.session.playerId;
		console.log('Player connected:', socket.id);
		// Use handshake.query instead of request.query
        const isTestSession = socket.handshake.query.testSession;
		
		console.log('Player connected:', {
            socketId: socket.id,
            playerId: playerId,
            isTestSession: isTestSession
        });


		// Initial state check when player connects
        socket.on('check-initial-state', async () => {
            try {
                if (isTestSession) {
                    console.log('Test session - showing outfit creation');
                    socket.emit('show-outfit-creation');
                } else {
                    const outfit = await GameController.getOutfitByPlayerId(playerId);
                    if (outfit) {
                        console.log('Existing outfit found for player:', playerId);
                        socket.emit('load-existing-outfit', outfit);
                    } else {
                        console.log('No existing outfit found for player:', playerId);
                        socket.emit('show-outfit-creation');
                    }
                }
            } catch (error) {
                console.error('Error checking initial state:', error);
                socket.emit('error', { message: 'Error loading game state' });
            }
        });


        socket.on('create-outfit', async (data) => {
            console.log('Create outfit request received:', data);
            try {
                const outfit = await GameController.createOutfit(playerId, data.name);
                console.log('Outfit created successfully:', outfit._id);
                socket.emit('outfit-created', outfit);
            } catch (error) {
                console.error('Error creating outfit:', error);
                socket.emit('error', { message: error.message });
            }
        });

        //Structure upgrade handler
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
			console.log('Generate champion request received:', data);
			
            try {
                if (!data.outfitId) {
                    throw new Error('Missing outfit ID');
                }

                const champion = await GameController.generateChampion(data.outfitId);
                console.log('Champion generated successfully:', champion);
                socket.emit('champion-generated', champion);

            } catch (error) {
                console.error('Error generating champion:', error);
                socket.emit('error', { message: error.message });
            }
        });

		// Champion hiring handler - updated to handle single champion
        socket.on('hire-champion', async (data) => {
			console.log('Hire champion request received:', data);
			
			try {
				if (!data.outfitId || !data.tempChampionId) {
					throw new Error('Missing required hire parameters');
				}

				const result = await GameController.hireChampion(
					data.outfitId,
					data.tempChampionId,
					data.replaceExisting || false
				);

				// Emit success event with updated data
				socket.emit('champion-hired', {
					champion: result.champion,
					outfit: result.outfit
				});
				
				// Add log entries for the action
				socket.emit('log-entry', {
					message: `Hired ${result.champion.name} for ${result.champion.hireCost} gold`,
					type: 'success'
				});

				if (data.replaceExisting) {
					socket.emit('log-entry', {
						message: 'Previous champion has been dismissed',
						type: 'info'
					});
				}

			} catch (error) {
				console.error('Champion hire failed:', error);
				socket.emit('hire-failed', { message: error.message });
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