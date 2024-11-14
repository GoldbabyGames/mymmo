// controllers/arenaController.js
const Champion = require('../models/champion');
const ArenaQueue = require('../models/arenaQueue');
const mongoose = require('mongoose');

class ArenaController {
    static async queueForArena(championId) {
        try {
            // Get champion details
            const champion = await Champion.findById(championId).populate('outfitId');
            if (!champion) {
                throw new Error('Champion not found');
            }

            if (champion.status !== 'available') {
                throw new Error('Champion is not available for arena');
            }

            // Check if already in queue
            const existingQueue = await ArenaQueue.findOne({ championId });
            if (existingQueue) {
                throw new Error('Champion is already in queue');
            }

            // Add to queue
            const queueEntry = new ArenaQueue({
                championId: champion._id,
                level: champion.level,
                outfitId: champion.outfitId
            });

            await queueEntry.save();
            console.log('Champion added to arena queue:', championId);
            
            return queueEntry;
        } catch (error) {
            console.error('Error queueing for arena:', error);
            throw error;
        }
    }

    static async findMatch(queueEntry) {
        try {
            // Find another player of the same level
            const opponent = await ArenaQueue.findOne({
                level: queueEntry.level,
                _id: { $ne: queueEntry._id },
                queuedAt: { $gte: new Date(Date.now() - 60000) } // Within last minute
            });

            if (opponent) {
                console.log('Match found:', {
                    champion1: queueEntry.championId,
                    champion2: opponent.championId,
                    level: queueEntry.level
                });
                
                // Remove both players from queue
                await ArenaQueue.deleteMany({
                    _id: { $in: [queueEntry._id, opponent._id] }
                });

                return {
                    matched: true,
                    players: [queueEntry, opponent]
                };
            }

            return { matched: false };
        } catch (error) {
            console.error('Error finding match:', error);
            throw error;
        }
    }

    static async cancelQueue(championId) {
        try {
            const result = await ArenaQueue.deleteOne({ championId });
            console.log('Queue cancelled for champion:', championId);
            return result.deletedCount > 0;
        } catch (error) {
            console.error('Error cancelling queue:', error);
            throw error;
        }
    }

    static async getQueueStatus(championId) {
        try {
            const queueEntry = await ArenaQueue.findOne({ championId });
            return {
                inQueue: !!queueEntry,
                queuedAt: queueEntry?.queuedAt
            };
        } catch (error) {
            console.error('Error getting queue status:', error);
            throw error;
        }
    }
}

module.exports = ArenaController;