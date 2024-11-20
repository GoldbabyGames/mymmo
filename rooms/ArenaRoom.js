const { Room } = require('colyseus');
const { Schema, MapSchema, defineTypes } = require('@colyseus/schema');
const { ArenaMap } = require('../models/ArenaMap');
const ArenaExplore = require('./ArenaExplore');
const Champion = require('../models/champion');
const ArenaController = require('../controllers/arenaController');

class PlayerState extends Schema {
    constructor(championData) {
        super();
        this.id = championData._id;
        this.name = championData.name;
        this.row = 0;  // Flattened position
        this.col = 0;
        this.currentHealth = 100;
        this.maxHealth = 100;
        this.status = "waiting";
    }
}

defineTypes(PlayerState, {
    id: "string",
    name: "string",
    row: "number",
    col: "number",
    currentHealth: "number",
    maxHealth: "number",
    status: "string"
});

class ArenaRoomState extends Schema {
    constructor() {
        super();
        this.phase = "WAITING";
        this.players = new MapSchema();
        this.map = new ArenaMap();
    }
}

defineTypes(ArenaRoomState, {
    phase: "string",
    players: { map: PlayerState },
    map: ArenaMap
});

class ArenaRoom extends Room {
    onCreate() {
        console.log("Creating Arena Room with settings:", {
            maxClients: this.maxClients,
            hasState: !!this.state
        });
        this.setState(new ArenaRoomState());
        this.maxClients = 2;
        this.explorePhase = new ArenaExplore(this);
        this.setSimulationInterval(() => this.gameLoop(), 1000);
    }

    async onJoin(client, options) {
        console.log("Arena Join Request:", {
            clientId: client.sessionId,
            championData: options.championData,
            currentPlayers: this.state.players.size
        });

        if (!options.championData) {
            throw new Error("No champion data provided");
        }

        try {
            const dbChampion = await Champion.findById(options.championData._id);
            console.log("Champion status check:", {
                championId: dbChampion._id,
                currentStatus: dbChampion.status
            });

            if (dbChampion.status === 'arena' || dbChampion.status === 'training') {
                throw new Error('Champion is busy with another activity');
            }

            dbChampion.status = 'arena';
            await dbChampion.save();

            const player = new PlayerState(options.championData);
            
            // Determine spawn side and get spawn points
            const side = this.state.players.size === 0 ? 'east' : 'west';
            const spawnPoints = this.state.map.getSpawnPoints(side);
            
            console.log("Setting spawn position:", {
                clientId: client.sessionId,
                side,
                spawnPoints,
                playerCount: this.state.players.size
            });

            // Select spawn point and set position
            [player.row, player.col] = spawnPoints[0];

            // Update map tile
            const spawnTile = this.state.map.getTile(player.row, player.col);
            if (spawnTile) {
                spawnTile.occupied = true;
                spawnTile.occupiedBy = client.sessionId;
                console.log("Tile occupation updated:", {
                    row: player.row,
                    col: player.col,
                    clientId: client.sessionId
                });
            }

            // Add player to room state
            this.state.players.set(client.sessionId, player);
            
            // Broadcast player joined
            this.broadcast("player-joined", {
                playerId: player.id,
                name: player.name,
                position: {
                    row: player.row,
                    col: player.col
                }
            });

            console.log("Player joined successfully:", {
                clientId: client.sessionId,
                playerCount: this.state.players.size,
                position: {
                    row: player.row,
                    col: player.col
                }
            });

            // Start exploration if we have 2 players
            if (this.state.players.size === 2) {
                console.log("Starting exploration phase with 2 players");
                this.startExploration();
            }

        } catch (error) {
            console.error("Error in onJoin:", error);
            throw error;
        }
    }

	async onLeave(client, consented) {
        console.log(`Client ${client.sessionId} leaving. Consented: ${consented}`);
        
        try {
            // Reset champion status in database
            const player = this.state.players.get(client.sessionId);
            if (player) {
                await Champion.findByIdAndUpdate(player.id, { status: 'available' });
                this.state.players.delete(client.sessionId);
            }

            // Let Colyseus handle room disposal if empty
            if (this.state.players.size === 0) {
                this.disconnect();
            }
        } catch (error) {
            console.error("Error in onLeave:", error);
        }
    }
	
	async onDispose() {
        console.log("Arena Room disposing...");
        
        try {
            // Clear the exploration phase if it exists
            if (this.explorePhase) {
                this.explorePhase.cleanup();
            }

            // Reset status for all players in the room
            const players = Array.from(this.state.players.values());
            for (const player of players) {
                await Champion.findByIdAndUpdate(player.id, { status: 'available' });
            }
            
            console.log("Arena Room cleanup completed");
        } catch (error) {
            console.error("Error in onDispose:", error);
        }
    }



    startExploration() {
        console.log("Initiating exploration phase");
        this.state.phase = "EXPLORATION";
        
        // Log initial player positions
        this.state.players.forEach((player, sessionId) => {
            console.log("Player starting position:", {
                sessionId,
                playerId: player.id,
                position: {
                    row: player.row,
                    col: player.col
                }
            });
        });

        this.explorePhase.start();
        
        this.broadcast("exploration-start", {
            message: "Exploration phase begun - find your opponent!"
        });
    }

    gameLoop() {
        if (this.state.phase === "EXPLORATION") {
            this.explorePhase.update();
        }
    }
}

module.exports = ArenaRoom;