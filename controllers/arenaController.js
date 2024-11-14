// controllers/arenaController.js
const Champion = require('../models/champion');
const Outfit = require('../models/outfit');

class ArenaController {
    

    static async processMatchResults(winnerId, loserId) {
        try {
            // Update winner
            const winner = await Champion.findById(winnerId);
            if (winner) {
                winner.status = 'available';
                await winner.save();
            }

            // Update loser
            const loser = await Champion.findById(loserId);
            if (loser) {
                loser.status = 'recovering';
                await loser.save();

                // Set recovery timer
                setTimeout(async () => {
                    try {
                        const recoveredChampion = await Champion.findById(loserId);
                        if (recoveredChampion) {
                            recoveredChampion.status = 'available';
                            await recoveredChampion.save();
                            console.log(`Champion ${loserId} recovered and status set to available`);
                        }
                    } catch (error) {
                        console.error('Error recovering champion:', error);
                    }
                }, 5 * 60 * 1000); // 5 minutes recovery
            }

            return {
                winner: { championId: winnerId },
                loser: { 
                    championId: loserId,
                    recoveryTime: 5 * 60 // 5 minutes in seconds
                }
            };
        } catch (error) {
            console.error('Error processing match results:', error);
            throw error;
        }
    }

    static async cleanupChampionStatus(championId) {
        try {
            const champion = await Champion.findById(championId);
            if (champion) {
                champion.status = 'available';
                await champion.save();
            }
        } catch (error) {
            console.error('Error cleaning up champion status:', error);
            throw error;
        }
    }
}

module.exports = ArenaController;