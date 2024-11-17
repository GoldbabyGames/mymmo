// socket/gameSocket.js
const mongoose = require('mongoose');
const GameController = require('../controllers/gameController');
const Champion = require('../models/champion');  // Add this
const TrainingManager = require('../utils/TrainingManager');  // Add this
const { BASE_CHAMPION_COST } = require('../config/gameConstants');

function initializeGameSockets(io) {
	console.log('Game socket initialization started');
	
    io.on('connection', async (socket) => {
        const testSession = socket.request.session.isTestSession;
        const playerId = socket.request.session.playerId;

        if (testSession) {
            console.log('Test session connected:', {
                socketId: socket.id,
                playerId,
                testSession
            });
        } else {
            console.log('Regular session connected:', {
                socketId: socket.id,
                playerId
            });
        }

        // Initial state check when player connects
        socket.on('check-initial-state', async () => {
            try {
                if (testSession) {
                    console.log(`Test session ${testSession} - showing outfit creation`);
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

        // Update create-outfit handler to support test sessions
        socket.on('create-outfit', async (data) => {
            console.log('Create outfit request received:', {
                name: data.name,
                playerId,
                isTestSession: testSession || 'none'
            });
            
            try {
                const outfit = await GameController.createOutfit(playerId, data.name);
                console.log('Outfit created successfully:', outfit._id);
                socket.emit('outfit-created', outfit);
            } catch (error) {
                console.error('Error creating outfit:', error);
                socket.emit('error', { message: error.message });
            }
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            console.log('Player disconnected:', {
                socketId: socket.id,
                playerId,
                isTestSession: testSession || 'none'
            });
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

		socket.on('fetch-champion-data', async (data) => {
			console.log('Fetch champion data request received:', data);
			try {
				const outfit = await GameController.getOutfitByPlayerId(playerId);
				if (outfit && outfit.champion) {
					console.log('Sending fresh champion data to client');
					socket.emit('champion-data-updated', outfit.champion);
				} else {
					socket.emit('champion-data-updated', null);
				}
			} catch (error) {
				console.error('Error fetching champion data:', error);
				socket.emit('error', { message: error.message });
			}
		});


		socket.on('start-training', async (data) => {
			console.log('Start training request received:', data);
			
			try {
				// Get outfit first
				const outfit = await GameController.getOutfitByPlayerId(playerId);
				if (!outfit) {
					throw new Error('Outfit not found');
				}

				// Get champion using the outfit's champion reference
				const champion = await Champion.findById(outfit.champion);
				if (!champion) {
					throw new Error('No champion found');
				}
				
				console.log('Training request validation:', {
					outfitId: outfit._id,
					championId: champion._id,
					championStatus: champion.status,
					outfitGold: outfit.gold,
					championLevel: champion.level
				});

				if (champion.status !== 'available') {
					throw new Error('Champion is not available for training');
				}

				const trainingCost = champion.level * 100;
				if (outfit.gold < trainingCost) {
					throw new Error('Insufficient gold for training');
				}

				const result = await TrainingManager.startTraining(outfit, champion);
				console.log('Training started successfully:', result);

				socket.emit('training-started', {
					champion: result.champion,
					outfit: result.outfit,
					endTime: result.trainingEndTime
				});

				// Set timeout to complete training
				setTimeout(async () => {
					try {
						const trainingResult = await TrainingManager.completeTraining(champion);
						console.log('Training completed:', trainingResult);
						
						socket.emit('training-complete', {
							champion: trainingResult.champion,
							improvements: trainingResult.improvements,
							messages: trainingResult.messages
						});
					} catch (error) {
						console.error('Error completing training:', error);
						socket.emit('error', { message: 'Error completing training: ' + error.message });
					}
				}, TrainingManager.TRAINING_DURATION);

			} catch (error) {
				console.error('Training error:', error);
				socket.emit('error', { message: error.message });
			}
		});
       
	   
		socket.on('training-complete', async (data) => {
			try {
				const trainingResult = await TrainingManager.completeTraining(champion);
				socket.emit('training-complete', {
					champion: trainingResult.champion,
					improvements: trainingResult.improvements,
					messages: trainingResult.messages
				});
			} catch (error) {
				socket.emit('error', { message: 'Error completing training: ' + error.message });
			}
		});


    });
}

module.exports = initializeGameSockets;