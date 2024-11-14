class ColyseusClient {
    constructor() {
        console.log('Initializing Colyseus client...');
        this.client = new Colyseus.Client('ws://localhost:2567');
    }

    async joinArenaMatch(championData) {
        try {
            console.log('Attempting to join arena match with champion:', championData);
            
            // Try to join existing room or create new one
            const room = await this.client.joinOrCreate("arena_room", { championData });
            console.log("Joined arena room:", room.id);
            
            return room;
        } catch (error) {
            console.error('Error joining arena match:', error);
            throw error;
        }
    }
}

// Make it globally available
if (typeof window !== 'undefined') {
    window.colyseusClient = new ColyseusClient();
}