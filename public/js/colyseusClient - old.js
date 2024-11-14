// public/js/colyseusClient.js
class ColyseusClient {
    constructor() {
        // Use the correct WebSocket endpoint
        this.client = new Colyseus.Client('ws://localhost:3000/colyseus');
        console.log('Colyseus client initialized');
    }

    async joinArenaMatch(championData) {
		try {
			console.log('Attempting to join arena match with champion:', championData);

			// Join or create a room, providing champion data
			const room = await this.client.joinOrCreate("arena_room", {
				championData: {
					_id: championData._id,
					name: championData.name,
					physical: {
						strength: championData.physical.strength,
						agility: championData.physical.agility,
						hardiness: championData.physical.hardiness,
						stamina: championData.physical.stamina
					},
					mental: {
						intelligence: championData.mental.intelligence,
						unarmedSkill: championData.mental.unarmedSkill,
						weaponSkill: championData.mental.weaponSkill,
						survivalSkill: championData.mental.survivalSkill
					}
				}
			});

			console.log('Successfully joined arena room:', room.sessionId);
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