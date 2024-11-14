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
			'missions',
            'arena'
        ];
		
        this.setupEventListeners();
        this.updateUpgradeButtons();
        this.setupChampionEventListeners();
		
		this.arenaQueueStatus = 'idle'; 
        this.setupArenaEventListeners(); 
    }

	// Add new method to handle initial state setup
    initializeGameState(outfit) {
        console.log('Initializing game state with outfit:', outfit);
		console.log('Current champion state:', this.hasChampion);
		
		 if (!outfit) {
            console.warn('No outfit data provided for initialization');
            return;
		 }
			
		
		// Update champion state if needed
        if (outfit.champion) {
			console.log('Setting champion state from outfit data');
            this.setHasChampion(true);
        }
        
		// Defer the initialization to next tick to ensure champion state is set
        setTimeout(() => {
            console.log('Deferred initialization - champion state:', this.hasChampion);
			
			// Update the current tab content (management by default)
            this.updateTabContent(this.activeTab);
			
			// Force update of structure costs
			this.updateStructureCosts(outfit);
        
			
        }, 0); 
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
        
        const upgradeTrainingBtn = document.querySelector('[data-action="upgrade-training"]');
        const upgradeLibraryBtn = document.querySelector('[data-action="upgrade-library"]');

        if (upgradeTrainingBtn) {
            upgradeTrainingBtn.addEventListener('click', (e) => {
                console.log('Training facility upgrade clicked');
                e.preventDefault();
                this.gameClient.upgradeStructure('trainingFacility');
            });
        }

        if (upgradeLibraryBtn) {
            upgradeLibraryBtn.addEventListener('click', (e) => {
                console.log('Library upgrade clicked');
                e.preventDefault();
                this.gameClient.upgradeStructure('library');
            });
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
        tabButtons.forEach(button => {
            const buttonTab = button.getAttribute('data-tab');
            if (buttonTab === tabName) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });

        // Show active tab content, hide others
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
            if (content.id === tabName) {
                content.style.display = 'block';
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
                this.updateManagementTab();
                break;

            case 'champion':
                this.updateChampionTab();
                break;

            case 'training-ground':
                this.updateTrainingGroundTab();
                break;

            case 'research':
                this.updateResearchTab();
                break;

			case 'missions':
                this.updateMissionsTab();
                break; 
			
            case 'arena':
                this.updateArenaTab();
                break;

            default:
                console.error('Unknown tab:', tabName);
        }
    }

    updateManagementTab() {
        console.log('Updating management tab');
        const currentOutfit = this.gameClient.getCurrentOutfit();
        if (currentOutfit) {
            console.log('Updating structure costs from management tab');
            this.updateStructureCosts(currentOutfit);
        } else {
            console.warn('No outfit data available for management tab update');
        }
    }

    updateChampionTab() {
        console.log('Updating champion tab');
        if (this.gameClient.currentChampion) {
            this.gameClient.updateChampionDisplay(this.gameClient.currentChampion);
        }
    }

    updateTrainingGroundTab() {
		console.log('Updating training ground tab - START');
		const trainingGround = document.getElementById('training-ground');
		const currentOutfit = this.gameClient.getCurrentOutfit();
		console.log('Current outfit data:', currentOutfit);

		if (trainingGround && currentOutfit?.structures?.trainingFacility) {
			const level = currentOutfit.structures.trainingFacility.level;
			console.log('Training Facility Level:', level);
			const content = trainingGround.querySelector('.training-ground-content');
			if (content) {
				content.innerHTML = `
					<h2>Training Ground: Level ${level}</h2>
					<div class="placeholder">Training ground functionality coming soon...</div>
				`;
			}
		}
		console.log('Updating training ground tab - END');
	}

    updateResearchTab() {
		console.log('Updating research tab');
		const research = document.getElementById('research');
		const currentOutfit = this.gameClient.getCurrentOutfit();
		console.log('Current outfit data:', currentOutfit);

		if (research && currentOutfit?.structures?.library) {
			const level = currentOutfit.structures.library.level;
			console.log('Library Level:', level);
			const content = research.querySelector('.research-content');
			if (content) {
				content.innerHTML = `
					<h2>Research: Level ${level}</h2>
					<div class="placeholder">Research functionality coming soon...</div>
				`;
			}
		} 
		console.log('Updating research tab - END');
	}

	updateMissionsTab() {
        console.log('Updating missions tab');
		const missionsContent = document.getElementById('missions');
        // Missions update logic will be implemented later
    }

    updateArenaTab() {
        console.log('Updating arena tab');
        const arenaParticipants = document.getElementById('arena-participants');
        // Arena update logic will be implemented later
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

    updateUpgradeButtons() {
        const upgradeButtons = document.querySelectorAll('[data-action^="upgrade-"]');
        upgradeButtons.forEach(button => {
            button.disabled = !this.hasChampion;
            if (!this.hasChampion) {
                button.title = "Hire a champion first before upgrading structures";
                button.classList.add('disabled-upgrade');
            } else {
                button.title = "";
                button.classList.remove('disabled-upgrade');
            }
        });
    }

    setHasChampion(value) {
		console.log('Setting hasChampion to:', value);
		this.hasChampion = value;
		this.updateUpgradeButtons();  // This line is important!
		
		// Force update structure costs when champion state changes
		const currentOutfit = this.gameClient.getCurrentOutfit();
		if (currentOutfit) {
			this.updateStructureCosts(currentOutfit);
		}
	}

    updateStructureCosts(outfit) {
        console.log('Updating structure costs for outfit:', outfit);
		console.log('Current hasChampion state:', this.hasChampion);
        
		// Early return if outfit data is not available
        if (!outfit || !outfit.structures) {
            console.warn('Invalid outfit data for structure costs update');
            return;
        }
		
        const trainingFacilityCost = 1000 * Math.pow(2, outfit.structures.trainingFacility.level - 1);
        const libraryCost = 1000 * Math.pow(2, outfit.structures.library.level - 1);

        console.log('Structure costs calculation:', {
            trainingFacilityCost,
            libraryCost,
            currentGold: outfit.gold,
            hasChampion: this.hasChampion
        });

        const upgradeTrainingBtn = document.querySelector('[data-action="upgrade-training"]');
        const upgradeLibraryBtn = document.querySelector('[data-action="upgrade-library"]');

        // Update Training Facility button
        if (upgradeTrainingBtn) {
            const canAffordTraining = outfit.gold >= trainingFacilityCost;
            upgradeTrainingBtn.textContent = `Upgrade Training Ground (${trainingFacilityCost} Gold)`;
            
            const shouldDisable = !canAffordTraining || !this.hasChampion;
            console.log('Training button state:', {
                canAfford: canAffordTraining,
                hasChampion: this.hasChampion,
                shouldDisable: shouldDisable
            });
            
            upgradeTrainingBtn.disabled = shouldDisable;
            upgradeTrainingBtn.classList.toggle('disabled-upgrade', shouldDisable);
            
            if (!this.hasChampion) {
                upgradeTrainingBtn.title = "Hire a champion first before upgrading structures";
            } else if (!canAffordTraining) {
                upgradeTrainingBtn.title = `Insufficient gold. Need ${trainingFacilityCost} gold.`;
            } else {
                upgradeTrainingBtn.title = "";
            }
        }


        // Update Library button
        if (upgradeLibraryBtn) {
            const canAffordLibrary = outfit.gold >= libraryCost;
            upgradeLibraryBtn.textContent = `Upgrade Research Facility (${libraryCost} Gold)`;
            
            const shouldDisable = !canAffordLibrary || !this.hasChampion;
            console.log('Library button state:', {
                canAfford: canAffordLibrary,
                hasChampion: this.hasChampion,
                shouldDisable: shouldDisable
            });
            
            upgradeLibraryBtn.disabled = shouldDisable;
            upgradeLibraryBtn.classList.toggle('disabled-upgrade', shouldDisable);
            
            if (!this.hasChampion) {
                upgradeLibraryBtn.title = "Hire a champion first before upgrading structures";
            } else if (!canAffordLibrary) {
                upgradeLibraryBtn.title = `Insufficient gold. Need ${libraryCost} gold.`;
            } else {
                upgradeLibraryBtn.title = "";
            }
        }
    }
	
	setupArenaEventListeners() {
        console.log('Setting up arena UI event listeners');
        
        // Queue button listener
        const queueButton = document.querySelector('[data-action="queue-arena"]');
		
        if (queueButton) {
			console.log('Found queue button, attaching listener');
			// Remove any existing listeners
			const newButton = queueButton.cloneNode(true);
			queueButton.parentNode.replaceChild(newButton, queueButton);
			
			newButton.addEventListener('click', (e) => {
				console.log('Arena queue button clicked');
				e.preventDefault();
				
				if (!this.gameClient.hasChampion) {
					this.gameClient.showError('You need a champion to enter the arena');
					return;
				}

				if (this.gameClient.currentChampion) {
					console.log('Emitting queue-arena event with champion:', this.gameClient.currentChampion._id);
					this.gameClient.socket.emit('queue-arena', {
						championId: this.gameClient.currentChampion._id
					});
				} else {
					console.error('Current champion not found in game client');
				}
			});
		} else {
			console.error('Queue button not found');
		}
    }

    updateArenaTab() {
        console.log('Updating arena tab');
        const arenaContent = document.getElementById('arena');
        
        if (!arenaContent) {
            console.error('Arena content container not found');
            return;
        }

        if (!this.gameClient.hasChampion) {
            arenaContent.innerHTML = `
                <div class="arena-status">
                    <p class="warning">You need a champion to enter the arena.</p>
                </div>`;
            return;
        }

        // Update arena UI based on queue status
        const statusDisplay = this.getQueueStatusDisplay();
        
        // Create the button HTML
		arenaContent.innerHTML = `
			<div class="arena-container">
				<div class="arena-status">
					<h3>Arena Status</h3>
					${this.gameClient.hasChampion ? 
						`<p>Your champion is ready for battle!</p>` : 
						`<p class="warning">You need a champion to enter the arena.</p>`
					}
				</div>
				<div class="arena-actions">
					<button class="button" 
							data-action="queue-arena"
							${!this.gameClient.hasChampion ? 'disabled' : ''}>
						Enter Arena Queue
					</button>
				</div>
			</div>
		`;

        // Reattach event listeners
        this.setupArenaEventListeners();
    }

    updateArenaQueueStatus(status) {
        console.log('Updating arena queue status:', status);
        this.arenaQueueStatus = status;
        
        // Only update UI if arena tab is active
        if (this.activeTab === 'arena') {
            this.updateArenaTab();
        }

        // Update queue button if it exists
        const queueButton = document.querySelector('[data-action="queue-arena"]');
        if (queueButton) {
            queueButton.disabled = (status !== 'idle');
            queueButton.textContent = this.getQueueButtonText();
        }
    }

    getQueueStatusDisplay() {
        const statusMessages = {
            idle: 'Ready to enter arena',
            queued: `
                <div class="queue-status">
                    <p>Searching for opponents...</p>
                    <div class="loading-spinner"></div>
                </div>`,
            matched: `
                <div class="queue-status success">
                    <p>Match found! Preparing arena...</p>
                </div>`,
            starting: `
                <div class="queue-status success">
                    <p>Match is starting!</p>
                </div>`,
            expired: `
                <div class="queue-status warning">
                    <p>Queue expired. Please try again.</p>
                </div>`
        };

        return statusMessages[this.arenaQueueStatus] || statusMessages.idle;
    }

    getQueueButtonText() {
        const buttonText = {
            idle: 'Enter Arena Queue',
            queued: 'In Queue...',
            matched: 'Match Found!',
            starting: 'Starting...',
            expired: 'Enter Arena Queue'
        };

        return buttonText[this.arenaQueueStatus] || 'Enter Arena Queue';
    }

}

// Make ViewManager available globally
if (typeof window !== 'undefined') {
    window.ViewManager = ViewManager;
}