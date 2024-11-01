class ViewManager {
    constructor(gameClient) {
        console.log('ViewManager initializing...');
        this.gameClient = gameClient;
        this.activeTab = 'management'; // Default tab
        this.setupEventListeners();
    }

    setupEventListeners() {
		console.log('ViewManager: Setting up event listeners');
        // Tab Switching
        console.log('Setting up tab button listeners...');
        const tabButtons = document.querySelectorAll('.tab-button');
        console.log('Found tab buttons:', tabButtons.length);
        
        tabButtons.forEach(button => {
            const tabName = button.getAttribute('data-tab');
            console.log('Setting up listener for tab:', tabName);
            
            button.addEventListener('click', (e) => {
                console.log('Tab button clicked:', tabName);
                this.switchTab(tabName);
            });
        });

        // Outfit Management Structure Upgrades
        console.log('Setting up structure upgrade buttons...');
		
		// Log the actual HTML content where we expect the buttons
        const actionButtons = document.querySelector('.action-buttons');
        console.log('Action buttons container:', actionButtons?.innerHTML);
		
		
        const upgradeTrainingBtn = document.querySelector('[data-action="upgrade-training"]');
        const upgradeLibraryBtn = document.querySelector('[data-action="upgrade-library"]');

        console.log('Found upgrade buttons:', {
            training: upgradeTrainingBtn,
            library: upgradeLibraryBtn
        });

        if (upgradeTrainingBtn) {
            console.log('Adding click listener to training button');
            upgradeTrainingBtn.addEventListener('click', (e) => {
                console.log('Training facility upgrade clicked');
                e.preventDefault();
                this.gameClient.upgradeStructure('trainingFacility');
            });
        } else {
            console.warn('Training facility upgrade button not found');
        }

        if (upgradeLibraryBtn) {
            console.log('Adding click listener to library button');
            upgradeLibraryBtn.addEventListener('click', (e) => {
                console.log('Library upgrade clicked');
                e.preventDefault();
                this.gameClient.upgradeStructure('library');
            });
        } else {
            console.warn('Library upgrade button not found');
        }
    }

    switchTab(tabName) {
        console.log('Switching to tab:', tabName);
        
        // Update active tab state
        this.activeTab = tabName;

        // Update tab button styles
        const tabButtons = document.querySelectorAll('.tab-button');
        console.log('Updating tab buttons:', tabButtons.length);
        
        tabButtons.forEach(button => {
            const buttonTab = button.getAttribute('data-tab');
            console.log('Processing button:', buttonTab);
            
            if (buttonTab === tabName) {
                console.log('Activating button:', buttonTab);
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });

        // Show active tab content, hide others
        const tabContents = document.querySelectorAll('.tab-content');
        console.log('Found tab contents:', tabContents.length);
        
        tabContents.forEach(content => {
            console.log('Processing content:', content.id);
            if (content.id === tabName) {
                console.log('Showing content:', content.id);
                content.style.display = 'block';
            } else {
                content.style.display = 'none';
            }
        });
    }

    updateStructureCosts(outfit) {
        console.log('Updating structure costs for outfit:', outfit);
        
        const trainingFacilityCost = 1000 * Math.pow(2, outfit.structures.trainingFacility.level - 1);
        const libraryCost = 1000 * Math.pow(2, outfit.structures.library.level - 1);

        console.log('Calculated costs:', {
            trainingFacility: trainingFacilityCost,
            library: libraryCost
        });

        const upgradeTrainingBtn = document.querySelector('[data-action="upgrade-training"]');
        const upgradeLibraryBtn = document.querySelector('[data-action="upgrade-library"]');

        if (upgradeTrainingBtn) {
            console.log('Updating training facility button');
            upgradeTrainingBtn.textContent = `Upgrade Training Facility (${trainingFacilityCost} Gold)`;
            upgradeTrainingBtn.disabled = outfit.gold < trainingFacilityCost;
        }

        if (upgradeLibraryBtn) {
            console.log('Updating library button');
            upgradeLibraryBtn.textContent = `Upgrade Library (${libraryCost} Gold)`;
            upgradeLibraryBtn.disabled = outfit.gold < libraryCost;
        }
    }
}

// Make sure ViewManager is properly instantiated
if (typeof window !== 'undefined') {
    window.ViewManager = ViewManager;
}