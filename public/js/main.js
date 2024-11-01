// main.js
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded');
    
    // Only initialize if no gameClient exists
    if (!window.gameClient) {
        // Make sure we don't create a new socket if one exists
        if (!window.gameSocket) {
            console.log('Initializing socket connection...');
            window.gameSocket = io();
            
            window.gameSocket.on('connect', () => {
                console.log('Socket connected:', window.gameSocket.id);
            });
        }
        
        console.log('Creating new GameClient instance');
        window.gameClient = new GameClient();
    }
});