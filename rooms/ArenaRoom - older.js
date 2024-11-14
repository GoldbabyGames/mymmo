// rooms/ArenaRoom.js
const { Room } = require('colyseus');
const schema = require('@colyseus/schema');
const Schema = schema.Schema;
const MapSchema = schema.MapSchema;

class ArenaState extends Schema {
    constructor() {
        super();
        this.players = new MapSchema();
        this.phase = 'WAITING';    // WAITING -> STARTING -> ACTIVE
        this.matchStartTime = null;
    }
}

class ArenaRoom extends Room {
    onCreate(options) {
        console.log('Arena room created:', this.roomId);
        this.setState(new ArenaState());
        this.maxClients = 2;  // Start with 2 players for testing
    }

    onJoin(client, options) {
        console.log(`Champion ${options.championId} joined arena ${this.roomId}`);
        
        // Add player to room state
        this.state.players.set(client.sessionId, {
            championId: options.championId,
            level: options.level,
            ready: false
        });

        // Log current player count
        console.log(`Players in room ${this.roomId}:`, this.state.players.size);

        // If room is full, prepare to start
        if (this.state.players.size === this.maxClients) {
            console.log(`Room ${this.roomId} is full, preparing to start match`);
            this.startMatch();
        }
    }

    startMatch() {
        this.state.phase = 'STARTING';
        this.state.matchStartTime = Date.now();
        console.log(`Match starting in room ${this.roomId}`);
        
        // Broadcast match start to all clients
        this.broadcast('match-start', {
            roomId: this.roomId,
            players: Array.from(this.state.players.entries())
        });
    }

    onLeave(client, consented) {
        console.log(`Champion left arena ${this.roomId}`, client.sessionId);
        this.state.players.delete(client.sessionId);
    }

    onDispose() {
        console.log(`Arena room ${this.roomId} disposed`);
    }
}

module.exports = ArenaRoom;