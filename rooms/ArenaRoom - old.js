const { Room } = require('colyseus');
const { Schema, MapSchema, ArraySchema } = require('@colyseus/schema');

// Define combat-related schemas
class CombatAction extends Schema {
    constructor() {
        super();
        this.type = ""; // attack, defend, special
        this.timestamp = 0;
        this.sourceId = "";
        this.targetId = "";
        this.value = 0; // damage/defense value
    }
}

class ChampionState extends Schema {
    constructor(championData) {
        super();
        // Basic info
        this.id = championData._id;
        this.name = championData.name;
        this.level = championData.level;
        
        // Combat stats - copied from champion data
        this.currentHealth = 100; // Base health
        this.maxHealth = 100;
        this.strength = championData.physical.strength.current;
        this.agility = championData.physical.agility.current;
        this.hardiness = championData.physical.hardiness.current;
        this.stamina = championData.physical.stamina.current;
        
        // Combat state
        this.isReady = false;
        this.stance = "neutral"; // neutral, aggressive, defensive
        this.lastActionTimestamp = 0;
        this.status = "waiting"; // waiting, active, defeated
    }
}

class ArenaState extends Schema {
    constructor() {
        super();
        this.champions = new MapSchema();
        this.actions = new ArraySchema();
        this.phase = "WAITING"; // WAITING -> READY -> COMBAT -> FINISHED
        this.roundNumber = 0;
        this.roundStartTime = 0;
        this.winner = null;
    }
}

class ArenaRoom extends Room {
    constructor() {
        super();
        // Constants for combat
        this.ROUND_DURATION = 10000; // 10 seconds per round
        this.MAX_ROUNDS = 10;
        this.COMBAT_INTERVAL = 1000; // Process combat every second
    }

    onCreate(options) {
        console.log('Creating arena room with options:', options);
        this.setState(new ArenaState());
        this.maxClients = 2;
        console.log('Room state initialized:', this.state);
        this.setCombatInterval();
    }

    onJoin(client, options) {
        console.log(`Champion ${options.championId} joining arena ${this.roomId}`);
        
        // Create and store champion state
        const championState = new ChampionState(options.championData);
        this.state.champions.set(client.sessionId, championState);
		console.log('Current champions in room:', this.state.champions.size);
		
        // If we have two players, start preparing the match
        if (this.state.champions.size === 2) {
			console.log('Two champions joined, preparing match...');
            this.prepareMatch();
        }
    }

    onLeave(client, consented) {
        console.log(`Champion leaving arena ${this.roomId}`);
        
        // Remove champion from state
        this.state.champions.delete(client.sessionId);
        
        // If during combat, declare other player as winner
        if (this.state.phase === "COMBAT") {
            const remainingChampion = Array.from(this.state.champions.values())[0];
            if (remainingChampion) {
                this.endMatch(remainingChampion.id);
            }
        }
    }

    onDispose() {
		console.log(`Arena room ${this.roomId} disposing`);
		// Clear any intervals
		if (this.combatInterval) {
			clearInterval(this.combatInterval);
		}

		// Reset champion statuses
		const champions = Array.from(this.state.champions.values());
		champions.forEach(async (champion) => {
			try {
				const dbChampion = await Champion.findById(champion.id);
				if (dbChampion) {
					dbChampion.status = 'available';
					await dbChampion.save();
					console.log(`Reset champion ${champion.id} status to available`);
				}
			} catch (error) {
				console.error(`Error resetting champion status:`, error);
			}
		});
	}

    // Combat-related methods
    setCombatInterval() {
        this.combatInterval = setInterval(() => {
            if (this.state.phase === "COMBAT") {
                this.processCombatRound();
            }
        }, this.COMBAT_INTERVAL);
    }

    prepareMatch() {
        console.log('Preparing match in room:', this.roomId);
        this.state.phase = "READY";
        this.state.roundNumber = 0;
        
        // Reset all champions to full health
        this.state.champions.forEach(champion => {
            champion.currentHealth = champion.maxHealth;
            champion.status = "waiting";
        });

        // Broadcast match preparation
		console.log('Broadcasting match preparation...');
        this.broadcast("match-preparing", {
            countdown: 5,
            champions: Array.from(this.state.champions.values())
        });

		 console.log('Starting countdown to combat...');
        // Start combat after 5 second countdown
        setTimeout(() => {
            this.startCombat();
        }, 5000);
    }

    startCombat() {
        console.log('Starting combat in room:', this.roomId);
        this.state.phase = "COMBAT";
        this.state.roundNumber = 1;
        this.state.roundStartTime = Date.now();

        // Set all champions to active
        this.state.champions.forEach(champion => {
            champion.status = "active";
        });

        this.broadcast("combat-started", {
            roundNumber: this.state.roundNumber,
            startTime: this.state.roundStartTime
        });
    }

    processCombatRound() {
        if (this.state.roundNumber > this.MAX_ROUNDS) {
            this.endMatch(); // Time limit reached
            return;
        }

        // Process all champion actions
        const champions = Array.from(this.state.champions.values());
        champions.forEach(champion => {
            if (champion.status === "active") {
                this.processChampionAction(champion);
            }
        });

        // Check for round end
        if (Date.now() - this.state.roundStartTime >= this.ROUND_DURATION) {
            this.startNewRound();
        }

        // Check for match end conditions
        this.checkMatchEnd();
    }

    processChampionAction(champion) {
        // Basic combat logic based on stance
        const opponents = Array.from(this.state.champions.values())
            .filter(c => c.id !== champion.id);
        
        if (opponents.length === 0) return;
        
        const opponent = opponents[0];
        let damage = 0;

        switch (champion.stance) {
            case "aggressive":
                damage = this.calculateDamage(champion, opponent) * 1.2;
                break;
            case "defensive":
                damage = this.calculateDamage(champion, opponent) * 0.5;
                break;
            default: // neutral
                damage = this.calculateDamage(champion, opponent);
        }

        // Apply damage
        opponent.currentHealth = Math.max(0, opponent.currentHealth - damage);

        // Record the action
        const action = new CombatAction();
        action.type = "attack";
        action.sourceId = champion.id;
        action.targetId = opponent.id;
        action.value = damage;
        action.timestamp = Date.now();
        this.state.actions.push(action);

        // Broadcast combat update
        this.broadcast("combat-update", {
            action: action,
            champions: Array.from(this.state.champions.values())
        });
    }

    calculateDamage(attacker, defender) {
        // Basic damage formula using champion stats
        const baseDamage = (attacker.strength * 0.8) + (attacker.agility * 0.2);
        const defense = (defender.hardiness * 0.6) + (defender.agility * 0.4);
        const damage = Math.max(1, Math.floor(baseDamage - (defense * 0.5)));
        
        return damage;
    }

    startNewRound() {
        this.state.roundNumber++;
        this.state.roundStartTime = Date.now();

        // Broadcast round start
        this.broadcast("round-start", {
            roundNumber: this.state.roundNumber,
            startTime: this.state.roundStartTime
        });
    }

    checkMatchEnd() {
        const champions = Array.from(this.state.champions.values());
        
        // Check for defeated champions
        champions.forEach(champion => {
            if (champion.currentHealth <= 0) {
                champion.status = "defeated";
            }
        });

        // Find winner if any
        const activeChampions = champions.filter(c => c.status === "active");
        if (activeChampions.length <= 1) {
            const winner = activeChampions[0];
            this.endMatch(winner?.id);
        }
    }

    endMatch(winnerId = null) {
        this.state.phase = "FINISHED";
        this.state.winner = winnerId;

        // If no winner specified (e.g., time limit), determine by health percentage
        if (!winnerId) {
            const champions = Array.from(this.state.champions.values());
            const healthPercentages = champions.map(c => ({
                id: c.id,
                percentage: (c.currentHealth / c.maxHealth) * 100
            }));
            const winner = healthPercentages.reduce((a, b) => 
                a.percentage > b.percentage ? a : b
            );
            this.state.winner = winner.id;
        }

        // Broadcast match end
        this.broadcast("match-ended", {
            winner: this.state.winner,
            champions: Array.from(this.state.champions.values())
        });

        // Schedule room disposal
        setTimeout(() => {
            this.disconnect();
        }, 5000);
    }

    // Handle client messages
    onMessage(client, message) {
        if (!message.type) return;

        switch (message.type) {
            case "set-stance":
                this.handleSetStance(client, message.stance);
                break;
            case "ready":
                this.handleReady(client);
                break;
        }
    }

    handleSetStance(client, stance) {
        const champion = this.state.champions.get(client.sessionId);
        if (champion && ["neutral", "aggressive", "defensive"].includes(stance)) {
            champion.stance = stance;
            champion.lastActionTimestamp = Date.now();
        }
    }

    handleReady(client) {
        const champion = this.state.champions.get(client.sessionId);
        if (champion) {
            champion.isReady = true;

            // Check if all champions are ready
            const allReady = Array.from(this.state.champions.values())
                .every(c => c.isReady);
            
            if (allReady) {
                this.startCombat();
            }
        }
    }
}

module.exports = ArenaRoom;