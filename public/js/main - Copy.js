document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded');
    
    if (!window.gameSocket) {
        console.log('Initializing socket connection...');
        window.gameSocket = io();
        
        window.gameSocket.on('connect', () => {
            console.log('Socket connected:', window.gameSocket.id);
        });

        window.gameSocket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });
    }
    
    if (!window.gameClient) {
        console.log('Creating new GameClient instance');
        window.gameClient = new GameClient();
    }
});