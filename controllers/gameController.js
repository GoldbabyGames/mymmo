// controllers/gameController.js
const Champion = require('../models/champion');
const Outfit = require('../models/outfit');
const mongoose = require('mongoose');
const ChampionGenerator = require('../utils/championGenerator');
const { BASE_CHAMPION_COST, TRAINING_COST, OFFENSIVE_WORDS } = require('../config/gameConstants');


class GameController {
    static pendingChampions = new Map(); // Store temporarily generated champions
	
	static async getOutfitByPlayerId(playerId) {
        try {
            const outfit = await Outfit.findOne({ playerId });
            return outfit;
        } catch (error) {
            console.error('Error finding outfit:', error);
            throw error;
        }
    }
	
	
	static async createOutfit(playerId, name) {
        console.log('Creating outfit with:', { playerId, name });
        
        try {
            // Check if player already has an outfit
            const existingOutfit = await Outfit.findOne({ playerId });
            if (existingOutfit) {
                throw new Error('You already have an outfit');
            }

            // Check if outfit name is taken
            const nameExists = await Outfit.findOne({ name });
            if (nameExists) {
                throw new Error('An outfit with this name already exists');
            }

            // Validate outfit name
            if (!this.validateOutfitName(name)) {
                throw new Error('Invalid outfit name');
            }

            const outfit = new Outfit({
                playerId,
                name,
                level: 1,
                gold: 1000,
                structures: {
                    trainingFacility: { level: 1 },
                    library: { level: 1 }
                }
            });

            const savedOutfit = await outfit.save();
            return savedOutfit;
        } catch (error) {
            console.error('Error in createOutfit:', error);
            throw error;
        }
    }

    static validateOutfitName(name) {
        name = name.toLowerCase().trim();
        const isValid = name.length >= 3 && !OFFENSIVE_WORDS.some(word => name.includes(word));
        console.log('Name validation result:', { name, isValid });
        return isValid;
    }

    static async generateChampion(outfitId) {
		try {
			const outfit = await Outfit.findById(outfitId);
			if (!outfit) {
				throw new Error('Outfit not found');
			}

			// Generate champion data using our generator
			const championData = await ChampionGenerator.generateChampion(outfit);
			
			// Store the generated champion data temporarily with an expiration
			const tempId = new mongoose.Types.ObjectId();
			GameController.pendingChampions.set(tempId.toString(), {  // Use GameController.pendingChampions
				championData,
				outfitId,
				timestamp: Date.now()
			});

			// Clean up old pending champions (older than 5 minutes)
			this.cleanupPendingChampions();

			// Return champion data with temporary ID for client display
			return { ...championData, tempId: tempId.toString() };
		} catch (error) {
			console.error('Error in generateChampion:', error);
			throw error;
		}
	}
	
	// Add cleanup method
	static cleanupPendingChampions() {
		const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
		for (const [id, data] of GameController.pendingChampions.entries()) {
			if (data.timestamp < fiveMinutesAgo) {
				GameController.pendingChampions.delete(id);
			}
		}
	}


	// TODO: Production Enhancement Needed
	// - Implement MongoDB replica set for transaction support
	// - Add proper atomic operations
	// - Consider implementing compensation/rollback logic for failed operations
	// In GameController class, update the hireChampion method
	static async hireChampion(outfitId, tempChampionId, replaceExisting = false) {
		console.log('Hiring champion:', { outfitId, tempChampionId, replaceExisting });
		
		try {
			// Get the pending champion data
			const pendingChampion = GameController.pendingChampions.get(tempChampionId);
			if (!pendingChampion) {
				throw new Error('Champion not found or expired. Please generate a new champion.');
			}

			// Find the outfit and populate champion
			const outfit = await Outfit.findById(outfitId).populate('champion');
			if (!outfit) {
				throw new Error('Outfit not found');
			}

			// Calculate hire cost
			const hireCost = pendingChampion.championData.hireCost;

			// Verify gold amount
			if (outfit.gold < hireCost) {
				throw new Error(`Insufficient gold. Hiring costs ${hireCost} gold.`);
			}

			// Handle existing champion check
			if (outfit.champion && !replaceExisting) {
				throw new Error('Outfit already has a champion. Dismiss current champion before hiring a new one.');
			}

			try {
				// If replacing, remove old champion first
				if (outfit.champion) {
					console.log('Removing existing champion:', outfit.champion._id);
					await Champion.findByIdAndDelete(outfit.champion._id);
				}

				// Create new champion
				const champion = new Champion({
					outfitId,
					...pendingChampion.championData,
					status: 'available'
				});
				
				await champion.save();

				// Update outfit atomically
				const updatedOutfit = await Outfit.findOneAndUpdate(
					{ _id: outfitId },
					{ 
						$set: { champion: champion._id },
						$inc: { gold: -hireCost }
					},
					{ new: true }
				).populate('champion');

				if (!updatedOutfit) {
					// Rollback - remove the champion if outfit update failed
					await Champion.findByIdAndDelete(champion._id);
					throw new Error('Failed to update outfit.');
				}

				// Clean up pending champion
				GameController.pendingChampions.delete(tempChampionId);

				return {
					champion,
					outfit: updatedOutfit
				};

			} catch (error) {
				console.error('Error during champion hire process:', error);
				// If we get here, something went wrong during the hire process
				// We'll let the error propagate up after logging
				throw new Error('Failed to complete champion hire process. Please try again.');
			}

		} catch (error) {
			console.error('Error in hireChampion:', error);
			throw error;
		}
	}


	static async getOutfitByPlayerId(playerId) {
        try {
            const outfit = await Outfit.findOne({ playerId })
                .populate('champion');
            return outfit;
        } catch (error) {
            console.error('Error finding outfit:', error);
            throw error;
        }
    }

    static calculateBaseStats(outfitLevel) {
        const baseRange = {
            min: Math.max(10, (outfitLevel - 1) * 5),
            max: Math.min(50, outfitLevel * 10)
        };

        return {
            physical: {
                strength: this.randomStat(baseRange),
                agility: this.randomStat(baseRange),
                hardiness: this.randomStat(baseRange),
                stamina: this.randomStat(baseRange)
            },
            mental: {
                intelligence: this.randomStat(baseRange),
                unarmedSkill: this.randomStat(baseRange),
                weaponSkill: this.randomStat(baseRange),
                survivalSkill: this.randomStat(baseRange)
            }
        };
    }

    static randomStat(range) {
        return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
    }

    static generateChampionName() {
        const firstNames = ["John", "Emma", "Liam", "Olivia", "Noah", "Ava", "Ethan", "Sophia"];
        const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller"];
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        return `${firstName} ${lastName}`;
    }
	
	static async upgradeStructure(outfitId, structureType) {
    console.log('Upgrading structure:', { outfitId, structureType });
    
		try {
			const outfit = await Outfit.findById(outfitId);
			if (!outfit) {
				throw new Error('Outfit not found');
			}


			// Check if outfit has any champions
            const championCount = await Champion.countDocuments({ outfitId });
            if (championCount === 0) {
                throw new Error('You must hire a champion before upgrading structures');
            }


			// Validate structure type
			if (!['trainingFacility', 'library'].includes(structureType)) {
				throw new Error('Invalid structure type');
			}

			// Calculate upgrade cost based on current level
			const currentLevel = outfit.structures[structureType].level;
			const upgradeCost = 1000 * Math.pow(2, currentLevel - 1);

			console.log('Upgrade details:', {
				currentLevel,
				upgradeCost,
				availableGold: outfit.gold
			});

			// Check if outfit has enough gold
			if (outfit.gold < upgradeCost) {
				throw new Error(`Insufficient gold. Upgrade costs ${upgradeCost} gold.`);
			}

			// Check maximum level (10)
			if (currentLevel >= 10) {
				throw new Error(`${structureType} is already at maximum level`);
			}

			// Update structure level and deduct gold
			outfit.structures[structureType].level += 1;
			outfit.gold -= upgradeCost;

			// Always update outfit level to the minimum of both structure levels
			const trainingLevel = outfit.structures.trainingFacility.level;
			const libraryLevel = outfit.structures.library.level;
			const newOutfitLevel = Math.min(trainingLevel, libraryLevel);
			
			// Update outfit level
			if (outfit.level !== newOutfitLevel) {
				console.log('Updating outfit level:', {
					oldLevel: outfit.level,
					newLevel: newOutfitLevel,
					trainingLevel,
					libraryLevel
				});
				outfit.level = newOutfitLevel;
			}

			// Save changes
			await outfit.save();
        
			console.log('Structure upgraded successfully:', outfit);
			return outfit;
		} catch (error) {
			console.error('Error upgrading structure:', error);
			throw error;
		}
	}
}

module.exports = GameController;