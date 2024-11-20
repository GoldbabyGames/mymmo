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
        console.log("Creating Arena Room");
        this.setState(new ArenaRoomState());
        this.maxClients = 2;
        this.explorePhase = new ArenaExplore(this);
        this.setSimulationInterval(() => this.gameLoop(), 1000);
    }

    async onJoin(client, options) {
        console.log(`Client ${client.sessionId} joining with champion data:`, options.championData);
        
        if (!options.championData) {
            throw new Error("No champion data provided");
        }

        try {
            // Get champion and check status
            const dbChampion = await Champion.findById(options.championData._id);
            if (dbChampion.status === 'arena' || dbChampion.status === 'training') {
                throw new Error('Champion is busy with another activity');
            }
            
            // Update champion status
            dbChampion.status = 'arena';
            await dbChampion.save();

            // Create player state
            const player = new PlayerState(options.championData);
            
            // Set spawn position
            const spawnPoints = this.state.players.size === 0 ? 
                this.state.map.getSpawnPoints('east') : 
                this.state.map.getSpawnPoints('west');
            
            // Use flattened position properties
            [player.row, player.col] = spawnPoints[0];

            // Update map tile
            const spawnTile = this.state.map.getTile(player.row, player.col);
            if (spawnTile) {
                spawnTile.occupied = true;
                spawnTile.occupiedBy = client.sessionId;
            }

            // Add player to room state
            this.state.players.set(client.sessionId, player);

            // Check if we should start exploration
            if (this.state.players.size === 2) {
                this.startExploration();
            }

        } catch (error) {
            console.error("Error in onJoin:", error);
            throw error;
        }
    }

    async onLeave(client, consented) {
        try {
            const player = this.state.players.get(client.sessionId);
            if (player) {
                const tile = this.state.map.getTile(player.row, player.col);
                if (tile) {
                    tile.occupied = false;
                    tile.occupiedBy = null;
                }
                
                this.state.players.delete(client.sessionId);
                await ArenaController.cleanupChampionStatus(player.id);
            }
        } catch (error) {
            console.error("Error in onLeave:", error);
        }
    }

    startExploration() {
        this.state.phase = "EXPLORATION";
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