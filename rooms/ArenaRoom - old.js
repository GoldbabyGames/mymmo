const { Room } = require('colyseus');
const { Schema, MapSchema, defineTypes } = require('@colyseus/schema');
const Champion = require('../models/champion');  // Add this for status updates
const ArenaController = require('../controllers/arenaController');

/// Define champion state schema
class ChampionState extends Schema {
    constructor(championData) {
		super();
		
        console.log("Creating champion state from:", JSON.stringify(championData, null, 2));
        
        if (!championData) {
            throw new Error("Champion data is required");
        }

        try {
            // Basic info
            this.id = championData._id;
            this.name = championData.name;
            this.currentHealth = 100;
            this.maxHealth = 100;
            this.stance = "neutral";
            this.status = "waiting";
            
            // Verify the nested structure exists
            if (!championData.physical || !championData.mental) {
                throw new Error("Invalid champion data structure - missing physical or mental attributes");
            }

            // Physical stats
            this.strength = Number(championData.physical.strength.current);
            this.agility = Number(championData.physical.agility.current);
            this.hardiness = Number(championData.physical.hardiness.current);
            this.stamina = Number(championData.physical.stamina.current);
            
            // Mental stats
            this.intelligence = Number(championData.mental.intelligence.current);
            this.unarmedSkill = Number(championData.mental.unarmedSkill.current);
            this.weaponSkill = Number(championData.mental.weaponSkill.current);
            this.survivalSkill = Number(championData.mental.survivalSkill.current);

            console.log("Processed champion stats:", {
                id: this.id,
                name: this.name,
                strength: this.strength,
                agility: this.agility,
                hardiness: this.hardiness,
                stamina: this.stamina,
                intelligence: this.intelligence,
                unarmedSkill: this.unarmedSkill,
                weaponSkill: this.weaponSkill,
                survivalSkill: this.survivalSkill
            });
        } catch (error) {
            console.error("Error processing champion stats:", error);
            throw error;
        }
    }
}

defineTypes(ChampionState, {
    id: "string",
    name: "string",
    currentHealth: "number",
    maxHealth: "number",
    stance: "string",
    // Physical stats
    strength: "number",
    agility: "number",
    hardiness: "number",
    stamina: "number",
    // Mental stats
    intelligence: "number",
    unarmedSkill: "number",
    weaponSkill: "number",
    survivalSkill: "number",
    status: "string"
});



// Define room state schema
class ArenaState extends Schema {
    constructor() {
        super();
        this.phase = "WAITING";
        this.roundNumber = 0;
        this.roundStartTime = 0;
        this.champions = new MapSchema();
        this.winner = "";
        this.countdown = 5;
    }
}

defineTypes(ArenaState, {
    phase: "string",
    roundNumber: "number",
    roundStartTime: "number",
    champions: { map: ChampionState },
    winner: "string",
    countdown: "number"
});

class ArenaRoom extends Room {
    constructor() {
        super();
        this.maxClients = 2;
		this.autoDispose = true;
        this.setPatchRate(50); // 20fps (1000/20 = 50ms)
        this.gameLoopInterval = null;
    }


    onCreate(options) {
        console.log("Creating Arena Room");
        this.setState(new ArenaState());
        
        // Set up message handlers
        this.onMessage("stance", (client, message) => {
            const champion = this.state.champions.get(client.sessionId);
            if (champion && ["neutral", "aggressive", "defensive"].includes(message.stance)) {
                champion.stance = message.stance;
                this.broadcast("combat-update", {
                    type: "stance",
                    championId: champion.id,
                    stance: message.stance
                });
            }
        });

        // Initialize game loop
        this.setSimulationInterval(() => this.gameLoop(), 1000);
    }

	//this is set to start with 2 players, this will need to be changed for more players
	async onJoin(client, options) {
		console.log(`Client ${client.sessionId} joining with champion data:`, options.championData);
		
		if (!options.championData) {
			throw new Error("No champion data provided");
		}

		// Get champion and check status
		const dbChampion = await Champion.findById(options.championData._id);
		if (dbChampion.status === 'arena' || dbChampion.status === 'training') {
			throw new Error('Champion is busy with another activity');
		}
		
		// Update champion status
		dbChampion.status = 'arena';
		await dbChampion.save();
		
		// Add champion to room state
		const champion = new ChampionState(options.championData);
		this.state.champions.set(client.sessionId, champion);
		
		// Check if we should start the match
		if (this.state.champions.size === 2) {
			console.log("Two champions joined - starting match");
			this.startMatch();
		}
	}


	startMatch() {
        console.log("Starting match");
        // Lock the room as soon as combat is about to begin
        this.lock();
        
        // Change phase to STARTING for countdown
        this.state.phase = "STARTING";
        this.state.countdown = 5;
        
        this.broadcast("match-starting", {
            countdown: this.state.countdown,
            champions: Array.from(this.state.champions.values())
        });
    }
	

    // When a client leaves
    async onLeave(client, consented) {
        console.log(`Client ${client.sessionId} leaving. Consented: ${consented}`);
        
        try {
            // Reset champion status in database
            if (client.championDbId) {
                await Champion.findByIdAndUpdate(client.championDbId, { status: 'available' });
            }

            if (this.state.champions.has(client.sessionId)) {
                this.state.champions.delete(client.sessionId);
            }

            // If match is ongoing and someone leaves, determine winner
            if (this.state.phase === "COMBAT" && !consented) {
                const remainingChampion = Array.from(this.state.champions.values())[0];
                if (remainingChampion) {
                    this.declareWinner(remainingChampion.id);
                }
            }

            // Let Colyseus handle room disposal if empty
            if (this.state.champions.size === 0) {
                // Room will be automatically disposed due to autoDispose = true
                this.disconnect();
            }
        } catch (error) {
            console.error("Error in onLeave:", error);
        }
    }


    // Clean up
    async onDispose() {
        console.log("Arena Room disposing...");
        
        try {
            // Clear the game loop interval
            if (this.gameLoopInterval) {
                this.clock.clear(this.gameLoopInterval);
            }

            // Reset status for all champions in the room
            const champions = Array.from(this.state.champions.values());
            for (const champion of champions) {
                await Champion.findByIdAndUpdate(champion.id, { status: 'available' });
            }

            console.log("Arena Room cleanup completed");
        } catch (error) {
            console.error("Error in onDispose:", error);
        }
    }

    // Match management methods
    
	handleStartingPhase() {
        if (this.state.countdown > 0) {
            this.state.countdown--;
            console.log(`Countdown: ${this.state.countdown}`);
            this.broadcast("countdown", { 
                seconds: this.state.countdown,
                message: `Match starting in ${this.state.countdown}...`
            });
        } else {
            console.log("Countdown complete, transitioning to combat phase");
            this.state.phase = "COMBAT";
            this.setMetadata({ phase: "COMBAT" });
            this.state.roundNumber = 1;
            this.state.roundStartTime = Date.now();
            
            console.log("Broadcasting combat-start event");
            this.broadcast("combat-start", {
                roundNumber: this.state.roundNumber,
                startTime: this.state.roundStartTime,
                champions: Array.from(this.state.champions.values())
            });
        }
    }

    async declareWinner(winnerId) {
        console.log(`Declaring winner: ${winnerId}`);
        
        try {
            this.state.phase = "FINISHED";
            this.state.winner = winnerId;

            const loserId = Array.from(this.state.champions.values())
                .find(c => c.id !== winnerId)?.id;

            if (winnerId && loserId) {
                await ArenaController.processMatchResults(winnerId, loserId);
            }

            this.broadcast("match-end", {
                winner: winnerId,
                champions: Array.from(this.state.champions.values())
            });

            // No need to lock here since room is already locked
            // Just disconnect all clients
            this.disconnect();

        } catch (error) {
            console.error("Error declaring winner:", error);
            this.disconnect();
        }
    }


    

    // Game loop update (runs at simulation interval)
    gameLoop() {
        if (this.state.phase === "STARTING") {
            this.handleCountdown();
        } else if (this.state.phase === "COMBAT") {
            this.processCombat();
        }
    }


	handleCountdown() {
        if (this.state.countdown > 0) {
            this.state.countdown--;
            this.broadcast("countdown", { seconds: this.state.countdown });
        } else {
            // Start combat
            this.state.phase = "COMBAT";
            this.state.roundNumber = 1;
            this.state.roundStartTime = Date.now();
            
            this.broadcast("combat-start", {
                roundNumber: this.state.roundNumber,
                startTime: this.state.roundStartTime
            });
        }
    }


    processCombat() {
        const champions = Array.from(this.state.champions.values());
        if (champions.length !== 2) return;

        champions.forEach(attacker => {
            const defender = champions.find(c => c.id !== attacker.id);
            if (defender) {
                const damage = this.calculateDamage(attacker, defender);
                defender.currentHealth = Math.max(0, defender.currentHealth - damage);

                // Broadcast combat update
                this.broadcast("combat-update", {
                    type: "damage",
                    detail: this.getCombatDetail(attacker, defender, damage)
                });

                // Check for match end
                if (defender.currentHealth <= 0) {
                    this.declareWinner(attacker.id);
                }
            }
        });
    }


    calculateDamage(attacker, defender) {
        // Base offensive power calculation
        const physicalPower = (
            (attacker.strength * 0.4) + 
            (attacker.agility * 0.3) +
            (attacker.stamina * 0.3)
        );
        
        const skillBonus = (
            (attacker.unarmedSkill * 0.4) +
            (attacker.weaponSkill * 0.4) +
            (attacker.intelligence * 0.2)
        );

        const baseDamage = physicalPower + (skillBonus * 0.5);

        // Defense calculation
        const physicalDefense = (
            (defender.hardiness * 0.5) +
            (defender.agility * 0.3) +
            (defender.stamina * 0.2)
        );

        const skillDefense = (
            (defender.unarmedSkill * 0.3) +
            (defender.survivalSkill * 0.3) +
            (defender.intelligence * 0.4)
        );

        const totalDefense = physicalDefense + (skillDefense * 0.3);

        // Apply stance modifiers
        let damage = baseDamage - totalDefense;
        
        // Stance modifications
        switch (attacker.stance) {
            case "aggressive": 
                damage *= 1.2;
                break;
            case "defensive":
                damage *= 0.7;
                break;
        }

        switch (defender.stance) {
            case "defensive":
                damage *= 0.7;
                break;
            case "aggressive":
                damage *= 1.2;
                break;
        }

        // Ensure minimum damage of 1
        return Math.max(1, Math.floor(damage));
    }

    getCombatDetail(attacker, defender, damage) {
        return {
            attackerName: attacker.name,
            defenderName: defender.name,
            attackerStance: attacker.stance,
            defenderStance: defender.stance,
            damageDealt: damage,
            remainingHealth: defender.currentHealth
        };
    }

    processRoundEnd() {
        this.state.roundNumber++;
        this.state.roundStartTime = Date.now();

        // Check for max rounds
        if (this.state.roundNumber > 10) {
            // End match, winner is player with most health
            const champions = Array.from(this.state.champions.values());
            const winner = champions.reduce((a, b) => 
                (a.currentHealth / a.maxHealth) > (b.currentHealth / b.maxHealth) ? a : b
            );
            this.endMatch(winner.id);
        } else {
            this.broadcast("round-start", {
                roundNumber: this.state.roundNumber,
                startTime: this.state.roundStartTime
            });
        }
    }
}

module.exports = ArenaRoom;