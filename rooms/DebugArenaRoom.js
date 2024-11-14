// rooms/DebugArenaRoom.js
const { Room } = require('colyseus');
const { Schema, MapSchema, defineTypes } = require('@colyseus/schema');

class PlayerState extends Schema {
    constructor(name) {
        super();
        this.name = name;
        this.joinedAt = Date.now();
    }
}

defineTypes(PlayerState, {
    name: "string",
    joinedAt: "number"
});

class DebugState extends Schema {
    constructor() {
        super();
        this.phase = "WAITING";
        this.players = new MapSchema();
        this.timestamp = Date.now();
    }
}

defineTypes(DebugState, {
    phase: "string",
    timestamp: "number",
    players: { map: PlayerState }
});

class DebugArenaRoom extends Room {
    constructor() {
        super();
        this.maxClients = 2;
        this.autoDispose = false;  // Prevent automatic disposal
        console.log("DebugArenaRoom constructor called");
    }

    onCreate(options) {
        console.log("DebugArenaRoom onCreate called with options:", options);
        
        // Initialize state
        this.setState(new DebugState());
        
        // Monitor state changes
        this.state.listen("phase", (newValue, previousValue) => {
            console.log(`Phase changed from ${previousValue} to ${newValue}`);
        });

        // Set up state check interval
        this.setSimulationInterval(() => this.checkAndUpdateState(), 1000);

        // Set up periodic presence check
        this.setPatchRate(1000); // Update clients every second
    }

    async onAuth(client, options) {
        console.log("onAuth called for client", client.sessionId, "with options:", options);
        return true; // Allow connection
    }

    onJoin(client, options) {
        console.log("Client attempting to join:", client.sessionId, "with options:", options);
        
        try {
            // Create player state
            const player = new PlayerState(options.playerName || `Player${client.sessionId}`);
            
            // Add to state
            this.state.players.set(client.sessionId, player);
            
            console.log("Current room state after join:", {
                phase: this.state.phase,
                playerCount: this.state.players.size,
                players: Array.from(this.state.players.entries()).map(([id, p]) => ({
                    id,
                    name: p.name
                }))
            });

            // If we have 2 players, start the match
            if (this.state.players.size === 2) {
                this.startMatchSequence();
            }
        } catch (error) {
            console.error("Error in onJoin:", error);
            throw error;
        }
    }

    startMatchSequence() {
        if (this.state.phase !== "WAITING") return;

        console.log("Starting match sequence");
        this.state.phase = "STARTING";
        this.state.timestamp = Date.now();
        
        this.broadcast("match-starting", {
            message: "Match is starting!",
            countdown: 5,
            timestamp: this.state.timestamp,
            players: Array.from(this.state.players.entries()).map(([id, player]) => ({
                id,
                name: player.name
            }))
        });

        this.clock.setTimeout(() => {
            if (this.state.phase === "STARTING") {
                this.state.phase = "COMBAT";
                this.state.timestamp = Date.now();
                this.broadcast("combat-start", {
                    message: "Combat is starting!",
                    timestamp: this.state.timestamp
                });
            }
        }, 5000);
    }

    checkAndUpdateState() {
        console.log("Room status check:", {
            phase: this.state.phase,
            players: this.state.players.size,
            locked: this.locked,
            clients: this.clients.length
        });
    }

    onLeave(client, consented) {
        console.log("Client leaving:", client.sessionId, "consented:", consented);
        
        const player = this.state.players.get(client.sessionId);
        if (player) {
            this.state.players.delete(client.sessionId);
            console.log(`Player ${player.name} (${client.sessionId}) has left`);
        }

        if (this.state.phase !== "WAITING") {
            this.state.phase = "WAITING";
            this.state.timestamp = Date.now();
            this.broadcast("match-cancelled", { reason: "Player left" });
        }
    }

    onDispose() {
        console.log("DebugArenaRoom disposing with state:", {
            phase: this.state.phase,
            players: this.state.players.size
        });
    }
}

module.exports = DebugArenaRoom;