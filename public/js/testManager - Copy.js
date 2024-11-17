// public/js/testManager.js
class TestSessionManager {
    constructor() {
        this.sessions = [];
        this.nextId = 1;
        // Only initialize in main window (not test sessions)
        if (!new URLSearchParams(window.location.search).get('testSession')) {
            this.createInterface();
        }
    }

    createInterface() {
        this.container = document.createElement('div');
        this.container.id = 'test-manager';
        this.container.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(44, 62, 80, 0.9);
            color: #ecf0f1;
            padding: 10px;
            border-radius: 4px;
            z-index: 9999;
            font-family: Arial, sans-serif;
            font-size: 12px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        `;

        this.container.innerHTML = `
            <div style="margin-bottom: 8px; font-weight: bold;">🛠️ Test Controls</div>
            <div style="display: flex; gap: 8px;">
                <button id="create-test-session" style="
                    padding: 4px 8px;
                    background: #3498db;
                    border: none;
                    border-radius: 3px;
                    color: white;
                    cursor: pointer;
                ">New Test Player</button>
                <button id="close-all-sessions" style="
                    padding: 4px 8px;
                    background: #e74c3c;
                    border: none;
                    border-radius: 3px;
                    color: white;
                    cursor: pointer;
                ">Close All</button>
            </div>
            <div id="session-list" style="
                margin-top: 8px;
                font-size: 11px;
                max-height: 100px;
                overflow-y: auto;
            "></div>
            <div style="
                margin-top: 4px;
                font-size: 10px;
                color: #bdc3c7;
            ">Press Ctrl+T to toggle</div>
        `;

        document.body.appendChild(this.container);

        // Add event listeners
        document.getElementById('create-test-session').onclick = () => this.createNewSession();
        document.getElementById('close-all-sessions').onclick = () => this.closeAllSessions();

        // Add keyboard shortcut (Ctrl + T)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 't') {
                e.preventDefault(); // Prevent new tab opening
                this.toggleVisibility();
            }
        });

        this.updateSessionList();
    }

    toggleVisibility() {
        this.container.style.display = 
            this.container.style.display === 'none' ? 'block' : 'none';
    }

    createNewSession() {
        if (this.sessions.length >= 6) {
            alert('Maximum of 6 test sessions reached');
            return;
        }

        const width = 800;
        const height = 600;
        const left = (window.screen.width - width) / 2 + (this.nextId * 50);
        const top = (window.screen.height - height) / 2 + (this.nextId * 50);

        console.log('Creating new test session:', this.nextId);
        const sessionUrl = `${window.location.origin}?testSession=${this.nextId}`;
        const newWindow = window.open(
            sessionUrl, 
            `TestSession${this.nextId}`, 
            `width=${width},height=${height},left=${left},top=${top}`
        );
        
        if (newWindow) {
            this.sessions.push({ 
                id: this.nextId, 
                window: newWindow 
            });
            this.nextId++;
            this.updateSessionList();
        }
    }

    closeAllSessions() {
        console.log('Closing all test sessions');
        this.sessions.forEach(session => {
            if (!session.window.closed) {
                session.window.close();
            }
        });
        this.sessions = [];
        this.updateSessionList();
    }

    updateSessionList() {
        const listElement = document.getElementById('session-list');
        if (!listElement) return;

        listElement.innerHTML = this.sessions.length ? 
            this.sessions.map(session => `
                <div style="
                    margin: 3px 0;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                ">
                    <span style="
                        width: 8px;
                        height: 8px;
                        border-radius: 50%;
                        background: ${session.window.closed ? '#e74c3c' : '#2ecc71'};
                        display: inline-block;
                    "></span>
                    Test Player ${session.id}
                </div>
            `).join('') :
            '<div style="color: #95a5a6;">No test sessions active</div>';
    }
}

// Initialize only in main window
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        window.testManager = new TestSessionManager();
    });
}