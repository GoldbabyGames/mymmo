// socket/arenaSocket.js
const ArenaController = require('../controllers/arenaController');
const { matchMaker } = require("colyseus");
const Champion = require('../models/champion');

const initializeArenaSocket = (io, gameServer) => {
    io.on('connection', (socket) => {
        socket.on('queue-arena', async (data) => {
            try {
                console.log('Queue request received:', data);

                // Get champion with clean stat structure
                const champion = await Champion.findById(data.championId);
                const cleanChampionData = {
                    _id: champion._id.toString(),
                    name: champion.name,
                    level: champion.level,
                    physical: {
                        strength: champion.physical.strength.current,
                        agility: champion.physical.agility.current,
                        hardiness: champion.physical.hardiness.current,
                        stamina: champion.physical.stamina.current
                    },
                    mental: {
                        intelligence: champion.mental.intelligence.current,
                        unarmedSkill: champion.mental.unarmedSkill.current,
                        weaponSkill: champion.mental.weaponSkill.current,
                        survivalSkill: champion.mental.survivalSkill.current
                    }
                };

                // Query for available rooms
                console.log('Checking for available rooms...');
                const availableRooms = await matchMaker.query({ 
                    name: "arena_room",
                    // Only query based on room being unlocked, let Colyseus handle capacity
                    locked: false
                });

                console.log('Available rooms found:', availableRooms.length);

                let roomConnection;
                if (availableRooms.length > 0) {
                    // Join existing room
                    console.log('Joining existing room:', availableRooms[0].roomId);
                    roomConnection = await matchMaker.joinById(availableRooms[0].roomId, {
                        championData: cleanChampionData
                    });
                } else {
                    // Create new room
                    console.log('No suitable rooms found, creating new room');
                    roomConnection = await matchMaker.create("arena_room", {
                        championData: cleanChampionData
                    });
                }

                console.log('Room connection established:', roomConnection.room.roomId);

                
                socket.emit('room-joined', {
                    roomId: roomConnection.room.roomId,
                    sessionId: roomConnection.sessionId
                });

            } catch (error) {
                console.error('Arena queue error:', error);
                socket.emit('arena-error', { message: error.message });
                await ArenaController.cleanupChampionStatus(data.championId);
            }
        });
    });
};

module.exports = { initializeArenaSocket };