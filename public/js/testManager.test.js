// public/js/testManager.js
console.log('Test Manager Loading...');

class TestSessionManager {
    constructor() {
        console.log('Test Manager Initializing...');
        this.createInterface();
    }

    createInterface() {
        console.log('Creating Test Interface...');
        // Create container
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
        `;

        // Add simple content
        this.container.innerHTML = `
            <div>Test Manager</div>
            <button id="create-test-session">New Test Session</button>
        `;

        // Add to document
        document.body.appendChild(this.container);

        // Add click handler
        document.getElementById('create-test-session').onclick = () => {
            console.log('Creating new test session...');
            this.createNewSession();
        };
    }

    createNewSession() {
        const url = `${window.location.origin}?testSession=${Date.now()}`;
        window.open(url, '_blank', 'width=800,height=600');
    }
}

// Initialize when the document is ready
if (typeof window !== 'undefined') {
    console.log('Setting up Test Manager initialization...');
    window.addEventListener('DOMContentLoaded', () => {
        // Only initialize in main window (not test sessions)
        if (!new URLSearchParams(window.location.search).get('testSession')) {
            console.log('Creating Test Manager instance...');
            window.testManager = new TestSessionManager();
        }
    });
}