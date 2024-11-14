// public/js/test-colyseus-client.js

let clientCount = 0;
const connectedRooms = new Set();

function log(message, type = 'info') {
    const logContainer = document.getElementById('logContainer');
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
    logContainer.appendChild(entry);
    console.log(message);
    logContainer.scrollTop = logContainer.scrollHeight;
}

async function testConnection() {
    const statusDiv = document.getElementById('status');
    const clientNum = ++clientCount;
    
    try {
        log(`Client ${clientNum}: Creating Colyseus client...`);
        const client = new Colyseus.Client('ws://localhost:2567');
        
        log(`Client ${clientNum}: Attempting to join room...`);
        statusDiv.textContent = "Status: Connecting...";

        const room = await client.joinOrCreate("debug_arena", {
            playerName: `Player${clientNum}_${Math.floor(Math.random() * 1000)}`
        });

        connectedRooms.add(room);
        log(`Client ${clientNum}: Successfully joined room ${room.id}`);
        statusDiv.textContent = `Status: Connected to room ${room.id}`;

        // State change handler
        room.onStateChange((state) => {
            log(`Client ${clientNum}: Room state updated - Phase: ${state.phase}, Players: ${state.players.size}`);
        });

        // Message handlers
        room.onMessage("match-starting", (message) => {
            log(`Client ${clientNum}: Match starting - ${JSON.stringify(message)}`);
        });

        room.onMessage("combat-start", (message) => {
            log(`Client ${clientNum}: Combat starting - ${JSON.stringify(message)}`);
        });

        // Error handler
        room.onError((code, message) => {
            log(`Client ${clientNum}: Room error ${code} - ${message}`, 'error');
            statusDiv.textContent = `Status: Error (${code})`;
        });

        // Leave handler
        room.onLeave((code) => {
            log(`Client ${clientNum}: Left room (${code})`);
            statusDiv.textContent = "Status: Disconnected";
            connectedRooms.delete(room);
        });

        // Add player join/leave listeners once the room is connected
        if (room.state.players) {
            room.state.players.onAdd((player, key) => {
                log(`Client ${clientNum}: Player joined - ${key}`);
            });

            room.state.players.onRemove((player, key) => {
                log(`Client ${clientNum}: Player left - ${key}`);
            });
        }

    } catch (error) {
        log(`Client ${clientNum}: Connection failed - ${error.message}`, 'error');
        console.error('Full connection error:', error);
        statusDiv.textContent = "Status: Connection Failed";
    }
}

// Add WebSocket state monitoring
window.addEventListener('online', () => log('Browser went online'));
window.addEventListener('offline', () => log('Browser went offline'));

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    connectedRooms.forEach(room => room.leave());
});

document.addEventListener('DOMContentLoaded', () => {
    log("Page loaded, setting up listeners...");
    log(`WebSocket Support: ${typeof WebSocket !== 'undefined'}`);
    
    document.getElementById('testButton').onclick = () => {
        log("Attempting connection...");
        testConnection().catch(err => {
            log(`Connection attempt failed: ${err.message}`, 'error');
            console.error('Connection error:', err);
        });
    };
    
    document.getElementById('testButton2').onclick = () => {
        log("Attempting second connection...");
        testConnection().catch(err => {
            log(`Second connection attempt failed: ${err.message}`, 'error');
            console.error('Connection error:', err);
        });
    };
});