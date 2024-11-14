document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded');
    
    if (!window.gameSocket) {
        console.log('Initializing socket connection...');
        // Get test session parameter from URL
        const urlParams = new URLSearchParams(window.location.search);
        const testSession = urlParams.get('testSession');
        
        // Initialize socket with query parameter
        window.gameSocket = io({
            query: { testSession }
        });
    }
    
    if (!window.gameClient) {
        console.log('Creating new GameClient instance');
        window.gameClient = new GameClient();
    }
});