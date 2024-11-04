class ViewManager {
    constructor(gameClient) {
        console.log('ViewManager initializing...');
        this.gameClient = gameClient;
        this.hasChampion = false;
		this.activeTab = 'management'; // Default tab
		this.tabs = [
            'management',
            'champion',
            'training-ground',
            'research',
            'arena'
        ];
        this.setupEventListeners();
		this.updateUpgradeButtons();
		this.setupChampionEventListeners();
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

	setupChampionEventListeners() {
        console.log('Setting up champion event listeners');

        // Find New Champion button
        const findChampionBtn = document.querySelector('[data-action="find-champion"]');
        if (findChampionBtn) {
            console.log('Found Find Champion button');
            findChampionBtn.addEventListener('click', (e) => {
                console.log('Find Champion button clicked');
                e.preventDefault();
                this.gameClient.findNewChampion();
            });
        } else {
            console.warn('Find Champion button not found');
        }

        // Hire Champion button
        const hireChampionBtn = document.querySelector('[data-action="hire-champion"]');
		if (hireChampionBtn) {
			hireChampionBtn.addEventListener('click', (e) => {
				e.preventDefault();
				const championDetails = document.querySelector('.potential-champion');
				if (championDetails) {
					const tempChampionId = championDetails.dataset.tempChampionId;
					if (tempChampionId) {
						this.gameClient.hireChampion(tempChampionId);
					}
				}
			});
		}



        // Find Another Champion button
        const findAnotherBtn = document.querySelector('[data-action="find-another"]');
        if (findAnotherBtn) {
            findAnotherBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.gameClient.findNewChampion();
            });
        }

        // Cancel button in champion selection modal
        const cancelBtn = document.querySelector('[data-action="cancel-champion"]');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideChampionSelection();
            });
        }
    }

    showChampionSelection() {
        const modal = document.getElementById('champion-selection');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    hideChampionSelection() {
        const modal = document.getElementById('champion-selection');
        if (modal) {
            modal.style.display = 'none';
        }
    }


	//new method to update button states
    updateUpgradeButtons() {
        const upgradeButtons = document.querySelectorAll('[data-action^="upgrade-"]');
        upgradeButtons.forEach(button => {
            button.disabled = !this.hasChampion;
            // Add a tooltip to explain why it's disabled
            if (!this.hasChampion) {
                button.title = "Hire a champion first before upgrading structures";
                button.classList.add('disabled-upgrade');
            } else {
                button.title = "";
                button.classList.remove('disabled-upgrade');
            }
        });
    }


	// Add method to update champion status
    setHasChampion(value) {
        this.hasChampion = value;
        this.updateUpgradeButtons();
    }

    switchTab(tabName) {
        console.log('Switching to tab:', tabName);
        
		// Validate tab name
        if (!this.tabs.includes(tabName)) {
            console.error('Invalid tab name:', tabName);
            return;
        }
		
        // Update active tab state
        this.activeTab = tabName;

        // Update tab button styles
        const tabButtons = document.querySelectorAll('.tab-button');
        // claude removed this line on 4th Nov "adding new tabs" chat:   console.log('Updating tab buttons:', tabButtons.length);
        
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
				// Trigger content update for the selected tab
                this.updateTabContent(tabName);
            } else {
                content.style.display = 'none';
            }
        });
    }

		updateTabContent(tabName) {
        console.log('Updating content for tab:', tabName);
        switch (tabName) {
            case 'management':
                // Update management tab content
                this.updateManagementTab();
                break;

            case 'champion':
                // Update champion tab content
                this.updateChampionTab();
                break;

            case 'training-ground':
                // Update training ground tab content
                this.updateTrainingGroundTab();
                break;

            case 'research':
                // Update research tab content
                this.updateResearchTab();
                break;

            case 'arena':
                // Update arena tab content
                this.updateArenaTab();
                break;

            default:
                console.error('Unknown tab:', tabName);
        }
    }

	// Individual tab update methods
	updateManagementTab() {
		console.log('Updating management tab');
			// Update structures display
			const structures = document.getElementById('structures');
			if (structures && this.gameClient.currentOutfit) {
				// Update structures display logic here
			}
		}

	updateChampionTab() {
		console.log('Updating champion tab');
			// Update champion display
			if (this.gameClient.currentChampion) {
				this.updateChampionDisplay(this.gameClient.currentChampion);
			}
		}

	updateTrainingGroundTab() {
		console.log('Updating training ground tab');
			// Training ground update logic will be implemented later
		}

	updateResearchTab() {
		console.log('Updating research tab');
			// Research update logic will be implemented later
		}

	updateArenaTab() {
		console.log('Updating arena tab');
			// Update arena participants and status
			const arenaParticipants = document.getElementById('arena-participants');
			if (arenaParticipants) {
				// Update arena display logic here
			}
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