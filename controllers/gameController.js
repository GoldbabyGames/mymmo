// controllers/gameController.js
const Champion = require('../models/champion');
const Outfit = require('../models/outfit');
const mongoose = require('mongoose');

// Game constants
const OFFENSIVE_WORDS = ['shit', 'fuck', 'nigger']; // In production, move to separate config file
const TRAINING_COST = 50;
const BASE_CHAMPION_COST = 200;

class GameController {
    static async createOutfit(userId, name) {
        console.log('Creating outfit with:', { userId, name });
        
        try {
			// Check if outfit with this name already exists
			const existingOutfit = await Outfit.findOne({ name });
			if (existingOutfit) {
            console.log('Outfit with this name already exists');
            throw new Error('An outfit with this name already exists');
			}
			
			
            // Validate outfit name
            if (!this.validateOutfitName(name)) {
                throw new Error('Invalid outfit name');
            }

            const outfit = new Outfit({
                userId,
                name,
                level: 1,
                gold: 1000,
                structures: {
                    trainingFacility: { level: 1 },
                    library: { level: 1 }
                }
            });

            console.log('Outfit model created:', outfit);

            // Validate the document before saving
            const validationError = outfit.validateSync();
            if (validationError) {
                console.error('Validation error:', validationError);
                throw validationError;
            }

            const savedOutfit = await outfit.save();
            console.log('Outfit saved successfully:', savedOutfit);
            
            // Double-check the save
            const verifiedOutfit = await Outfit.findById(savedOutfit._id);
            console.log('Verified outfit in database:', verifiedOutfit);

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

            const baseStats = this.calculateBaseStats(outfit.level);
            const champion = new Champion({
                outfitId,
                name: this.generateChampionName(),
                physical: baseStats.physical,
                mental: baseStats.mental,
                status: 'available'
            });

            return champion;
        } catch (error) {
            console.error('Error generating champion:', error);
            throw error;
        }
    }

    static async trainChampion(championId, attribute) {
        try {
            const champion = await Champion.findById(championId);
            if (!champion) {
                throw new Error('Champion not found');
            }

            const outfit = await Outfit.findById(champion.outfitId);
            if (!outfit) {
                throw new Error('Outfit not found');
            }

            if (champion.status !== 'available') {
                throw new Error('Champion is not available for training');
            }

            if (outfit.gold < TRAINING_COST) {
                throw new Error(`Insufficient gold. Training costs ${TRAINING_COST} gold.`);
            }

            // Update champion stats
            if (champion.physical[attribute]) {
                champion.physical[attribute] = Math.min(champion.physical[attribute] + 1, 100);
            } else if (champion.mental[attribute]) {
                champion.mental[attribute] = Math.min(champion.mental[attribute] + 1, 100);
            } else {
                throw new Error('Invalid attribute specified for training');
            }

            // Update status and gold
            champion.status = 'training';
            outfit.gold -= TRAINING_COST;

            // Save both documents
            await Promise.all([
                champion.save(),
                outfit.save()
            ]);

            return { champion, outfit };
        } catch (error) {
            console.error('Error training champion:', error);
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