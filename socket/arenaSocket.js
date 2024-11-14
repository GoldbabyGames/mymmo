// socket/arenaSocket.js
const ArenaController = require('../controllers/arenaController');
const { matchMaker } = require("colyseus");
const Champion = require('../models/champion');

const initializeArenaSocket = (io, gameServer) => {
    io.on('connection', (socket) => {
        socket.on('queue-arena', async (data) => {
            try {
                // 1. Get and validate champion
                const champion = await Champion.findById(data.championId);
                
                // 2. Prepare clean data structure
                const cleanChampionData = prepareChampionData(champion);
                
                // 3. Join/Create room using Colyseus matchmaker
                const roomConnection = await matchMaker.joinOrCreate("arena_room", {
                    championData: cleanChampionData
                });
                
                // 4. Notify client
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