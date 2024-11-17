class ViewManager {
    constructor(gameClient) {
        console.log('ViewManager initializing...');
        this.gameClient = gameClient;
        this.hasChampion = false;
        this.activeTab = 'management'; // Default tab
		this.arenaRoot = null; // Add this line to store React root
        this.tabs = [
            'management',
            'champion',
            'training-ground',
            'research',
			'missions',
            'arena'
        ];
		
		
		// Add these diagnostic logs
		console.log('Checking arena DOM structure...');
		console.log('Queue screen:', document.getElementById('arena-queue-screen'));
		console.log('Match screen:', document.getElementById('arena-match-screen'));
		
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
				
				// If switching to champion tab, show loading state
				if (tabName === 'champion') {
					const championsDiv = document.getElementById('champions');
					if (championsDiv) {
						championsDiv.innerHTML = '<div class="loading">Loading champion data...</div>';
					}
				}
				
				// Update the content
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
		console.log('Updating champion tab - requesting fresh data');
		
		// Request fresh champion data from server
		if (this.gameClient.socket) {
			this.gameClient.socket.emit('fetch-champion-data');
		} else {
			console.error('Socket connection not available');
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
				// Create root if it doesn't exist
				if (!this.trainingRoot) {
					this.trainingRoot = ReactDOM.createRoot(content);
				}
				
				// Render the training interface with the facility level
				console.log('Rendering TrainingInterface with level:', level);
				this.trainingRoot.render(
					React.createElement(window.TrainingInterface, {
						facilityLevel: level
					})
				);
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
		const queueButton = document.querySelector('[data-action="queue-arena"]');
		
		if (queueButton) {
			const newButton = queueButton.cloneNode(true);
			queueButton.parentNode.replaceChild(newButton, queueButton);
			
			newButton.addEventListener('click', async (e) => {
				e.preventDefault();
				
				if (!this.gameClient.currentChampion) {
					this.gameClient.showError('You need a champion to enter the arena');
					return;
				}

				try {
					// Clean champion data here before passing to Colyseus
					const cleanChampionData = {
						_id: this.gameClient.currentChampion._id,
						name: this.gameClient.currentChampion.name,
						physical: {
							strength: { current: this.gameClient.currentChampion.physical.strength.current },
							agility: { current: this.gameClient.currentChampion.physical.agility.current },
							hardiness: { current: this.gameClient.currentChampion.physical.hardiness.current },
							stamina: { current: this.gameClient.currentChampion.physical.stamina.current }
						},
						mental: {
							intelligence: { current: this.gameClient.currentChampion.mental.intelligence.current },
							unarmedSkill: { current: this.gameClient.currentChampion.mental.unarmedSkill.current },
							weaponSkill: { current: this.gameClient.currentChampion.mental.weaponSkill.current },
							survivalSkill: { current: this.gameClient.currentChampion.mental.survivalSkill.current }
						}
					};

					console.log('Cleaned champion data:', cleanChampionData);
					const room = await window.colyseusClient.joinArenaMatch(cleanChampionData);
					this.showArenaMatch(room, cleanChampionData);
				} catch (error) {
					console.error('Error joining arena:', error);
					this.gameClient.showError('Failed to join arena: ' + error.message);
				}
			});
		}
	}


	showArenaMatch(room) {
		console.log('Showing arena match interface');
		
		const queueScreen = document.getElementById('arena-queue-screen');
		const matchScreen = document.getElementById('arena-match-screen');
		
		if (!queueScreen || !matchScreen) {
			console.error('Arena screens not found:', { queueScreen, matchScreen });
			return;
		}

		// Add debug info here, before attempting to render
		console.log('Debug info:', {
			reactLoaded: !!window.React,
			reactDOMLoaded: !!window.ReactDOM,
			arenaInterfaceLoaded: !!window.ArenaInterface,
			matchScreen: !!document.getElementById('arena-match-screen')
		});

		// Verify React and ReactDOM are available
		if (!window.React || !window.ReactDOM) {
			console.error('React or ReactDOM not loaded');
			return;
		}

		// Verify ArenaInterface component is available
		if (!window.ArenaInterface) {
			console.error('ArenaInterface component not loaded');
			return;
		}

		try {
			queueScreen.style.display = 'none';
			matchScreen.style.display = 'block';

			// Create root if it doesn't exist
			if (!this.arenaRoot) {
				console.log('Creating new ReactDOM root');
				this.arenaRoot = ReactDOM.createRoot(matchScreen);
			}

			// Render the component
			console.log('Rendering ArenaInterface component');
			this.arenaRoot.render(
				React.createElement(window.ArenaInterface, {
					room: room,
					championData: this.gameClient.currentChampion
				})
			);

			console.log('ArenaInterface component rendered successfully');
		} catch (error) {
			console.error('Error rendering ArenaInterface:', error);
			console.error(error.stack); // Add stack trace
			this.gameClient.showError('Failed to initialize arena interface');
		}
	}


	hideArenaMatch() {
		console.log('Hiding arena match interface');
		const queueScreen = document.getElementById('arena-queue-screen');
		const matchScreen = document.getElementById('arena-match-screen');
		
		if (queueScreen && matchScreen) {
			matchScreen.style.display = 'none';
			queueScreen.style.display = 'block';
			
			if (this.arenaRoot) {
				this.arenaRoot.unmount();
				this.arenaRoot = null;
			}
		}
	}


    updateArenaTab() {
    console.log('Updating arena tab');
    
    if (!this.gameClient.hasChampion) {
        document.getElementById('arena-queue-screen').innerHTML = `
            <div class="arena-status">
                <p class="warning">You need a champion to enter the arena.</p>
            </div>`;
        return;
    }

    // Only setup event listeners once
    if (!this.arenaListenersInitialized) {
        this.setupArenaEventListeners();
        this.arenaListenersInitialized = true;
    }
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