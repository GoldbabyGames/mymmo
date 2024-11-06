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

	static CHAMPION_COSTS = {
        1: 0,     // Free
        2: 200,
        3: 400,
        4: 800,
        5: 1600,
        6: 3200,
        7: 6400,
        8: 12800,
        9: 25600,
        10: 51200
    };
	
	
	static calculateStatRanges(outfit) {
        // Base stat ranges for Level 1 champions
        const level1 = {
            min: 1,
            max: 10,
            potential_max: 20
        };

        // If outfit wants higher level champion, adjust ranges
        const championLevel = outfit.level;
        
        // Base ranges
        if (championLevel === 1) {
            return {
                physical: level1,
                mental: level1,
                level: championLevel
            };
        }

        // Higher level ranges (we can adjust these later)
        const baseMin = Math.max(5, (championLevel - 1) * 8);
        const baseMax = Math.min(100, championLevel * 10);
        
        // Training facility boosts physical stats
        const physicalBonus = (outfit.structures.trainingFacility.level - 1) * 2;
        // Library boosts mental stats
        const mentalBonus = (outfit.structures.library.level - 1) * 2;

        return {
            physical: {
                min: baseMin + physicalBonus,
                max: baseMax + physicalBonus,
                potential_max: Math.min(100, baseMax * 1.5)  // Example potential calculation
            },
            mental: {
                min: baseMin + mentalBonus,
                max: baseMax + mentalBonus,
                potential_max: Math.min(100, baseMax * 1.5)  // Example potential calculation
            },
            level: championLevel
        };
    }

    static generateStatWithPotential(range) {
        // Generate current stat using normal distribution
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        
        const mean = (range.max + range.min) / 2;
        const stdDev = (range.max - range.min) / 6;
        let currentValue = Math.round(mean + z * stdDev);
        
        // Clamp current value to valid range
        currentValue = Math.max(range.min, Math.min(range.max, currentValue));

        // Generate potential
        let potentialValue;
        if (range.level === 1) {
            // For Level 1 champions, potential is between current value and 20
            potentialValue = Math.floor(Math.random() * (20 - currentValue + 1)) + currentValue;
        } else {
            // For higher levels, potential is between current value and potential_max
            potentialValue = Math.floor(Math.random() * (range.potential_max - currentValue + 1)) + currentValue;
        }

        return {
            current: currentValue,
            potential: potentialValue
        };
    }

    static async generateChampion(outfit, requestedLevel = null) {
        try {
            const championLevel = requestedLevel || outfit.level;
            const baseRange = this.calculateStatRanges(outfit);

            // Generate stats with potential
            const stats = {
                physical: {
                    strength: this.generateStatWithPotential(baseRange.physical),
                    agility: this.generateStatWithPotential(baseRange.physical),
                    hardiness: this.generateStatWithPotential(baseRange.physical),
                    stamina: this.generateStatWithPotential(baseRange.physical)
                },
                mental: {
                    intelligence: this.generateStatWithPotential(baseRange.mental),
                    unarmedSkill: this.generateStatWithPotential(baseRange.mental),
                    weaponSkill: this.generateStatWithPotential(baseRange.mental),
                    survivalSkill: this.generateStatWithPotential(baseRange.mental)
                }
            };

            // Calculate average current stats for title determination
            const avgPhysical = Object.values(stats.physical)
                .reduce((a, b) => a + b.current, 0) / 4;
            const avgMental = Object.values(stats.mental)
                .reduce((a, b) => a + b.current, 0) / 4;

            const isSpecial = avgPhysical > baseRange.physical.max * 0.8 || 
                            avgMental > baseRange.mental.max * 0.8;

            // Generate name with potential title
            const name = this.generateName(isSpecial, stats);

            // Return champion with new stat structure
            return {
                outfitId: outfit._id,
                name,
                level: championLevel,
                physical: stats.physical,
                mental: stats.mental,
                status: 'available',
                hireCost: this.CHAMPION_COSTS[championLevel]
            };

        } catch (error) {
            console.error('Error generating champion:', error);
            throw error;
        }
    }

    // Modify name generator to use current values
    static generateName(isSpecial, stats) {
        const firstName = this.firstNames[Math.floor(Math.random() * this.firstNames.length)];
        const lastName = this.lastNames[Math.floor(Math.random() * this.lastNames.length)];
        
        if (!isSpecial) return `${firstName} ${lastName}`;

        // Use current values for determining titles
        const allStats = {
            strength: stats.physical.strength.current,
            agility: stats.physical.agility.current,
            hardiness: stats.physical.hardiness.current,
            stamina: stats.physical.stamina.current,
            intelligence: stats.mental.intelligence.current,
            unarmedSkill: stats.mental.unarmedSkill.current,
            weaponSkill: stats.mental.weaponSkill.current,
            survivalSkill: stats.mental.survivalSkill.current
        };

        const highestStat = Object.entries(allStats).reduce((a, b) => 
            b[1] > a[1] ? b : a
        );

        const titles = {
            strength: "the Strong",
            agility: "the Swift",
            hardiness: "the Tough",
            stamina: "the Enduring",
            intelligence: "the Wise",
            unarmedSkill: "the Skilled",
            weaponSkill: "the Warrior",
            survivalSkill: "the Survivor"
        };

        return `${firstName} ${lastName} ${titles[highestStat[0]]}`;
    }
}

module.exports = ChampionGenerator;

module.exports = ChampionGenerator;