class ViewManager {
    constructor(gameClient) {
        console.log('ViewManager initialization starting...', {
            isTestSession: new URLSearchParams(window.location.search).get('testSession'),
            hasGameClient: !!gameClient
        });
        
        // Validate required dependencies
        if (!gameClient) {
            throw new Error('ViewManager requires gameClient instance');
        }

        // Initialize in strict order using protected methods
        this._initializeState(gameClient);
        this._initializeEventHandlers();
        this._initializeUI();
        
        console.log('ViewManager initialization completed');
    }

	initializeGameState(outfit) {
		console.log('Initializing game state:', {
			isTestSession: new URLSearchParams(window.location.search).get('testSession'),
			outfit,
			currentTab: this.activeTab,
			hasChampion: outfit?.champion !== null
		});
		
		if (!this.isFullyInitialized()) {
			console.error('Attempted to initialize game state before full initialization');
			return;
		}

		if (!outfit) {
			console.warn('No outfit data provided for initialization');
			return;
		}

		try {
			// Store outfit reference
			this.currentOutfit = outfit;

			// Update champion state if needed
			if (outfit.champion) {
				console.log('Setting champion state from outfit data');
				this.setHasChampion(true);
			}

			// Update all tab states
			this.tabs.forEach(tab => {
				console.log(`Initial update for tab: ${tab}`);
				this.updateTabContent(tab);
			});

			// Force initial tab display
			this.switchTab(this.activeTab);

			console.log('Game state initialization complete');
		} catch (error) {
			console.error('Error during game state initialization:', error);
			throw error;
		}
	}


    // PHASE 1: State Initialization
    _initializeState(gameClient) {
		console.log('Initializing ViewManager state...', {
			gameClient: !!gameClient
		});
		
		// Core state
		this.gameClient = gameClient;
		this.hasChampion = false;
		this.activeTab = 'management';
		this.currentOutfit = null;
		
		// React component roots
		this.arenaRoot = null;
		this.trainingRoot = null;
		
		// Tab configuration
		this.tabs = [
			'management',
			'champion',
			'training-ground',
			'research',
			'missions',
			'arena'
		];

		// Feature-specific state
		this.arenaQueueStatus = 'idle';
		this.arenaListenersInitialized = false;
		
		this._stateInitialized = true;
		console.log('State initialization complete');
	}

    // PHASE 2: Event Handler Setup
    _initializeEventHandlers() {
        if (!this._stateInitialized) {
            throw new Error('Cannot initialize event handlers before state');
        }

        console.log('Initializing event handlers...');
        
        try {
            this.setupEventListeners();
            this.setupChampionEventListeners();
            this.setupArenaEventListeners();
            
            this._handlersInitialized = true;
            console.log('Event handlers initialized');
        } catch (error) {
            console.error('Failed to initialize event handlers:', error);
            throw error;
        }
    }

    // PHASE 3: UI Initialization
    _initializeUI() {
        if (!this._stateInitialized || !this._handlersInitialized) {
            throw new Error('Cannot initialize UI before state and handlers');
        }

        console.log('Initializing UI components...');
        
        try {
            this.updateUpgradeButtons();
            this._validateTabState();
            console.log('UI initialization complete');
        } catch (error) {
            console.error('Failed to initialize UI:', error);
            throw error;
        }
    }

    // Core validation methods
    _validateTabState() {
        const activeTabElement = document.querySelector(`[data-tab="${this.activeTab}"]`);
        if (!activeTabElement) {
            console.warn(`Active tab '${this.activeTab}' element not found in DOM`);
        }

        this.tabs.forEach(tab => {
            const tabContent = document.getElementById(tab);
            if (!tabContent) {
                console.warn(`Tab content container for '${tab}' not found`);
            }
        });
    }

    isFullyInitialized() {
        return this._stateInitialized && 
               this._handlersInitialized && 
               this.gameClient !== null;
    }

    // EVENT HANDLERS
    setupEventListeners() {
		console.log('Setting up tab button listeners...', {
			stateInitialized: this._stateInitialized
		});

		// Remove the initialization check that was causing the error
		const tabButtons = document.querySelectorAll('.tab-button');
		console.log('Found tab buttons:', tabButtons.length);
		
		tabButtons.forEach(button => {
			const tabName = button.getAttribute('data-tab');
			console.log('Setting up listener for tab:', tabName);
			
			// Remove old listener if it exists by cloning the button
			const newButton = button.cloneNode(true);
			button.parentNode.replaceChild(newButton, button);
			
			newButton.addEventListener('click', (e) => {
				console.log('Tab clicked:', tabName);
				this.switchTab(tabName);
			});
		});

		// Structure upgrade buttons
		const upgradeTrainingBtn = document.querySelector('[data-action="upgrade-training"]');
		const upgradeLibraryBtn = document.querySelector('[data-action="upgrade-library"]');

		if (upgradeTrainingBtn) {
			const newUpgradeTrainingBtn = upgradeTrainingBtn.cloneNode(true);
			upgradeTrainingBtn.parentNode.replaceChild(newUpgradeTrainingBtn, upgradeTrainingBtn);
			
			newUpgradeTrainingBtn.addEventListener('click', (e) => {
				e.preventDefault();
				this.gameClient.upgradeStructure('trainingFacility');
			});
		}

		if (upgradeLibraryBtn) {
			const newUpgradeLibraryBtn = upgradeLibraryBtn.cloneNode(true);
			upgradeLibraryBtn.parentNode.replaceChild(newUpgradeLibraryBtn, upgradeLibraryBtn);
			
			newUpgradeLibraryBtn.addEventListener('click', (e) => {
				e.preventDefault();
				this.gameClient.upgradeStructure('library');
			});
		}
	}


    setupChampionEventListeners() {
        const findChampionBtn = document.querySelector('[data-action="find-champion"]');
        if (findChampionBtn) {
            findChampionBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.gameClient.findNewChampion();
            });
        }

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

        const findAnotherBtn = document.querySelector('[data-action="find-another"]');
        if (findAnotherBtn) {
            findAnotherBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.gameClient.findNewChampion();
            });
        }

        const cancelBtn = document.querySelector('[data-action="cancel-champion"]');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideChampionSelection();
            });
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

                    const room = await window.colyseusClient.joinArenaMatch(cleanChampionData);
                    this.showArenaMatch(room, cleanChampionData);
                } catch (error) {
                    console.error('Error joining arena:', error);
                    this.gameClient.showError('Failed to join arena: ' + error.message);
                }
            });
        }
    }

    // TAB MANAGEMENT
    switchTab(tabName) {
		console.log('switchTab called:', {
			tabName,
			stateInitialized: this._stateInitialized,
			currentTab: this.activeTab
		});

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

    // TAB CONTENT UPDATES
    updateTabContent(tabName) {
        if (!this.isFullyInitialized()) {
            console.error('Attempted to update tab content before initialization');
            return;
        }

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

    // Individual tab update methods...
	
// TAB UPDATE METHODS
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
        console.log('Current outfit data for training:', currentOutfit);

        if (!trainingGround) {
            console.error('Training ground container not found');
            return;
        }

        const facilityLevel = currentOutfit?.structures?.trainingFacility?.level || 1;
        console.log('Training Facility Level:', facilityLevel);

        const content = trainingGround.querySelector('.training-ground-content');
        if (content) {
            if (!window.React || !window.ReactDOM || !window.TrainingInterface) {
                console.error('Required dependencies not loaded:', {
                    react: !!window.React,
                    reactDOM: !!window.ReactDOM,
                    trainingInterface: !!window.TrainingInterface
                });
                return;
            }

            try {
                if (!this.trainingRoot) {
                    console.log('Creating new training root');
                    this.trainingRoot = ReactDOM.createRoot(content);
                }

                console.log('Rendering TrainingInterface with level:', facilityLevel);
                this.trainingRoot.render(
                    React.createElement(window.TrainingInterface, {
                        facilityLevel: facilityLevel
                    })
                );
            } catch (error) {
                console.error('Error rendering TrainingInterface:', error);
                content.innerHTML = '<div class="error">Error loading training interface</div>';
            }
        }
    }

    updateResearchTab() {
        console.log('Updating research tab');
        const research = document.getElementById('research');
        const currentOutfit = this.gameClient.getCurrentOutfit();
        
        const libraryLevel = currentOutfit?.structures?.library?.level || 1;
        console.log('Library Level:', libraryLevel);

        if (research) {
            const content = research.querySelector('.research-content');
            if (content) {
                content.innerHTML = `
                    <h2>Research Laboratory Level ${libraryLevel}</h2>
                    <div class="research-interface">
                        <p>Research new technologies and upgrades for your outfit.</p>
                        <div class="research-options">
                            <p>Research options will be available soon...</p>
                        </div>
                    </div>
                `;
            }
        }
    }

    updateMissionsTab() {
        console.log('Updating missions tab');
        // Missions functionality to be implemented
    }

    updateArenaTab() {
        if (!this.isFullyInitialized()) {
            console.error('Attempted to update arena tab before initialization');
            return;
        }

        console.log('updateArenaTab called:', {
            hasChampion: this.hasChampion,
            clientHasChampion: this.gameClient?.hasChampion,
            currentChampion: this.gameClient?.currentChampion,
            activeTab: this.activeTab
        });
        
        const arenaQueueScreen = document.getElementById('arena-queue-screen');
        if (!arenaQueueScreen) {
            console.error('Arena queue screen element not found');
            return;
        }

        // Check champion status
        const hasChampion = this.gameClient?.currentChampion !== null;
        console.log('Champion status check:', {
            hasChampion,
            viewManagerHasChampion: this.hasChampion,
            clientCurrentChampion: this.gameClient?.currentChampion
        });

        if (!hasChampion) {
            arenaQueueScreen.innerHTML = `
                <div class="arena-status">
                    <p class="warning">You need a champion to enter the arena.</p>
                </div>`;
            return;
        }

        // Ensure queue button is present for champions
        if (!arenaQueueScreen.querySelector('[data-action="queue-arena"]')) {
            console.log('Creating arena queue button');
            arenaQueueScreen.innerHTML = `
                <h3>Arena Queue</h3>
                <div class="arena-actions">
                    <button class="button" data-action="queue-arena">Enter Arena Queue</button>
                </div>`;
            
            this.setupArenaEventListeners();
        }

        if (!this.arenaListenersInitialized) {
            this.setupArenaEventListeners();
            this.arenaListenersInitialized = true;
        }
    }

    // ARENA METHODS
    showArenaMatch(room) {
        console.log('Showing arena match interface');
        
        const queueScreen = document.getElementById('arena-queue-screen');
        const matchScreen = document.getElementById('arena-match-screen');
        
        if (!queueScreen || !matchScreen) {
            console.error('Arena screens not found:', { queueScreen, matchScreen });
            return;
        }

        console.log('Debug info:', {
            reactLoaded: !!window.React,
            reactDOMLoaded: !!window.ReactDOM,
            arenaInterfaceLoaded: !!window.ArenaInterface,
            matchScreen: !!document.getElementById('arena-match-screen')
        });

        if (!window.React || !window.ReactDOM || !window.ArenaInterface) {
            console.error('Required dependencies not loaded');
            return;
        }

        try {
            queueScreen.style.display = 'none';
            matchScreen.style.display = 'block';

            if (!this.arenaRoot) {
                console.log('Creating new ReactDOM root');
                this.arenaRoot = ReactDOM.createRoot(matchScreen);
            }

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
            console.error(error.stack);
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

    // STATE UPDATE METHODS
    setHasChampion(value) {
        if (!this.isFullyInitialized()) {
            console.error('Attempted to set champion status before initialization');
            return;
        }

        console.log('ViewManager.setHasChampion called:', {
            newValue: value,
            previousValue: this.hasChampion,
            activeTab: this.activeTab,
            currentTab: document.querySelector('.tab-button.active')?.dataset?.tab
        });
        
        this.hasChampion = value;
        this.updateUpgradeButtons();
        this.updateArenaTab();
        
        console.log('ViewManager state after setHasChampion:', {
            hasChampion: this.hasChampion,
            activeTab: this.activeTab
        });
    }

    // STRUCTURE MANAGEMENT
    updateStructureCosts(outfit) {
        if (!this.isFullyInitialized()) {
            console.error('Attempted to update structure costs before initialization');
            return;
        }

        console.log('Updating structure costs for outfit:', outfit);
        console.log('Current hasChampion state:', this.hasChampion);
        
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

        this._updateUpgradeButton('training', trainingFacilityCost, outfit.gold);
        this._updateUpgradeButton('library', libraryCost, outfit.gold);
    }

    _updateUpgradeButton(type, cost, currentGold) {
        const buttonSelector = type === 'training' ? 
            '[data-action="upgrade-training"]' : 
            '[data-action="upgrade-library"]';
        const button = document.querySelector(buttonSelector);
        
        if (button) {
            const canAfford = currentGold >= cost;
            const facilityName = type === 'training' ? 'Training Ground' : 'Research Facility';
            button.textContent = `Upgrade ${facilityName} (${cost} Gold)`;
            
            const shouldDisable = !canAfford || !this.hasChampion;
            button.disabled = shouldDisable;
            button.classList.toggle('disabled-upgrade', shouldDisable);
            
            if (!this.hasChampion) {
                button.title = "Hire a champion first before upgrading structures";
            } else if (!canAfford) {
                button.title = `Insufficient gold. Need ${cost} gold.`;
            } else {
                button.title = "";
            }
        }
    }

    // UI UTILITY METHODS
    updateUpgradeButtons() {
        if (!this.isFullyInitialized()) {
            console.error('Attempted to update upgrade buttons before initialization');
            return;
        }

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

    // Make ViewManager available globally
    static initialize() {
        if (typeof window !== 'undefined') {
            window.ViewManager = ViewManager;
            console.log('ViewManager registered globally');
        }
    }
}

// Initialize ViewManager
ViewManager.initialize();