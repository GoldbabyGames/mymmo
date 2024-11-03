// utils/ChampionGenerator.js
class ChampionGenerator {
    // Name generation data
    static firstNames = [
        "Marcus", "Luna", "Thorne", "Aria", "Caspian", "Nova", "Drake", "Senna", 
        "Phoenix", "Raven", "Storm", "Aurora", "Wolf", "Viper", "Shadow", "Blade"
    ];
    
    static lastNames = [
        "Steelbringer", "Duskwalker", "Bloodfist", "Ironheart", "Shadowweave",
        "Stormforge", "Nightshade", "Dawnbringer", "Frostborn", "Flamecaller"
    ];

    static titles = [
        "the Fierce", "the Cunning", "the Mighty", "the Swift", "the Wise",
        "the Merciless", "the Unstoppable", "the Tactical", "the Survivor"
    ];

    // Generate a champion with attributes influenced by outfit level and structures
    static async generateChampion(outfit) {
        try {
            // Calculate base stat ranges based on outfit level and structures
            const baseRange = this.calculateStatRanges(outfit);
            
            // Generate champion stats
            const stats = this.generateStats(baseRange);
            
            // Generate unique name
            const name = this.generateName();

            // Create champion object
            const championData = {
                outfitId: outfit._id,
                name: name,
                physical: stats.physical,
                mental: stats.mental,
                status: 'available'
            };

            return championData;

        } catch (error) {
            console.error('Error generating champion:', error);
            throw error;
        }
    }

    // Calculate stat ranges based on outfit properties
    static calculateStatRanges(outfit) {
        const baseMin = Math.max(20, (outfit.level - 1) * 5);
        const baseMax = Math.min(60, outfit.level * 10);
        
        // Training facility boosts physical stats
        const physicalBonus = (outfit.structures.trainingFacility.level - 1) * 2;
        
        // Library boosts mental stats
        const mentalBonus = (outfit.structures.library.level - 1) * 2;

        return {
            physical: {
                min: baseMin + physicalBonus,
                max: baseMax + physicalBonus
            },
            mental: {
                min: baseMin + mentalBonus,
                max: baseMax + mentalBonus
            }
        };
    }

    // Generate balanced stats within ranges
    static generateStats(ranges) {
        return {
            physical: {
                strength: this.generateStatValue(ranges.physical),
                agility: this.generateStatValue(ranges.physical),
                hardiness: this.generateStatValue(ranges.physical),
                stamina: this.generateStatValue(ranges.physical)
            },
            mental: {
                intelligence: this.generateStatValue(ranges.mental),
                unarmedSkill: this.generateStatValue(ranges.mental),
                weaponSkill: this.generateStatValue(ranges.mental),
                survivalSkill: this.generateStatValue(ranges.mental)
            }
        };
    }

    // Generate a single stat value with slight randomization
    static generateStatValue(range) {
        const value = Math.floor(
            Math.random() * (range.max - range.min + 1) + range.min
        );
        return Math.min(100, Math.max(1, value)); // Ensure between 1-100
    }

    // Generate a unique champion name
    static generateName() {
        const firstName = this.firstNames[Math.floor(Math.random() * this.firstNames.length)];
        const lastName = this.lastNames[Math.floor(Math.random() * this.lastNames.length)];
        
        // 30% chance to add a title
        const addTitle = Math.random() < 0.3;
        if (addTitle) {
            const title = this.titles[Math.floor(Math.random() * this.titles.length)];
            return `${firstName} ${lastName} ${title}`;
        }
        
        return `${firstName} ${lastName}`;
    }
}

module.exports = ChampionGenerator;