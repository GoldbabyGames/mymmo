// utils/TrainingManager.js
class TrainingManager {
    static TRAINING_DURATION = 6000; // 1 hour in milliseconds, test = 1minute
    
    static calculateTrainingCost(championLevel) {
        return championLevel * 100;
    }

    static generateTrainingResults(champion) {
        // Get available stats that haven't reached their potential
        const availableStats = this.getAvailableStats(champion);
        
        if (availableStats.length === 0) {
            return {
                improvements: {},
                messages: ['Your champion has reached their maximum potential in all attributes!']
            };
        }

        // Generate 1-4 random stat improvements
        const numberOfImprovements = Math.floor(Math.random() * 4) + 1;
        const improvements = {};
        const messages = [];
        
        for (let i = 0; i < numberOfImprovements && availableStats.length > 0; i++) {
            // Pick a random stat from available stats
            const statIndex = Math.floor(Math.random() * availableStats.length);
            const { stat, category, current, potential } = availableStats[statIndex];
            
            // Remove the stat from available stats to avoid duplicates
            availableStats.splice(statIndex, 1);
            
            // Generate improvement value (1-4 points)
            const maxImprovement = Math.min(4, potential - current);
            
            if (maxImprovement > 0) {
                const improvement = Math.floor(Math.random() * maxImprovement) + 1;
                improvements[stat] = {
                    category,
                    amount: improvement,
                    newValue: current + improvement
                };

                // Check if this improvement reaches the potential
                if (current + improvement >= potential) {
                    messages.push(`${this.formatStatName(stat)} has reached its maximum potential of ${potential}!`);
                }
            }
        }
        
        return { improvements, messages };
    }

    static getAvailableStats(champion) {
        const availableStats = [];

        // Check physical stats
        for (const [stat, values] of Object.entries(champion.physical)) {
            if (values.current < values.potential) {
                availableStats.push({
                    stat,
                    category: 'physical',
                    current: values.current,
                    potential: values.potential
                });
            }
        }

        // Check mental stats
        for (const [stat, values] of Object.entries(champion.mental)) {
            if (values.current < values.potential) {
                availableStats.push({
                    stat,
                    category: 'mental',
                    current: values.current,
                    potential: values.potential
                });
            }
        }

        return availableStats;
    }

    static formatStatName(stat) {
        return stat
            .replace(/([A-Z])/g, ' $1') // Add space before capital letters
            .replace(/^./, str => str.toUpperCase()); // Capitalize first letter
    }

    static async startTraining(outfit, champion) {
        const trainingCost = this.calculateTrainingCost(champion.level);
        
        // Validate gold
        if (outfit.gold < trainingCost) {
            throw new Error('Insufficient gold for training');
        }
        
        // Validate champion status
        if (champion.status !== 'available') {
            throw new Error('Champion is not available for training');
        }

        // Check if any stats can still be improved
        const availableStats = this.getAvailableStats(champion);
        if (availableStats.length === 0) {
            throw new Error('Your champion has reached their maximum potential in all attributes!');
        }
        
        // Update champion status and outfit gold
        champion.status = 'training';
        outfit.gold -= trainingCost;
        
        // Save changes
        await Promise.all([
            champion.save(),
            outfit.save()
        ]);
        
        return {
            champion,
            outfit,
            trainingEndTime: Date.now() + this.TRAINING_DURATION
        };
    }

    static async completeTraining(champion) {
        // Generate improvements and messages
        const { improvements, messages } = this.generateTrainingResults(champion);
        
        // Apply improvements
        for (const [stat, data] of Object.entries(improvements)) {
            if (data.category === 'physical') {
                champion.physical[stat].current = data.newValue;
            } else if (data.category === 'mental') {
                champion.mental[stat].current = data.newValue;
            }
        }
        
        // Update status
        champion.status = 'available';
        await champion.save();
        
        return {
            champion,
            improvements,
            messages
        };
    }
}

module.exports = TrainingManager;