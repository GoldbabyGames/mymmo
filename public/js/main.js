document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded');
    
    // Get test session parameter from URL
    const urlParams = new URLSearchParams(window.location.search);
    const testSession = urlParams.get('testSession');
    
    if (testSession) {
        console.log('Initializing test session:', testSession);
        // For test sessions, show outfit creation immediately
        document.getElementById('outfit-creation').style.display = 'block';
        document.getElementById('game-area').style.display = 'none';
    }
    
    if (!window.gameSocket) {
        console.log('Initializing socket connection...');
        window.gameSocket = io({
            query: { testSession }
        });

        // Add connection logging
        window.gameSocket.on('connect', () => {
            console.log('Socket connected:', {
                id: window.gameSocket.id,
                testSession: testSession || 'none'
            });
        });
    }
    
    if (!window.gameClient) {
        console.log('Creating new GameClient instance');
        window.gameClient = new GameClient();
    }
});