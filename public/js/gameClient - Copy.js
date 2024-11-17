// public/js/gameClient.js
class GameClient {
    constructor() {
        console.log('GameClient initializing...');
        this.socket = window.gameSocket;
		this.hasChampion = false;
		this.currentChampion = null; // Add this to track current champion
		this.pendingChampion = null;
		this.currentOutfit = null;  // Initialize outfit data to null
		this.modalContainer = null;
        
        if (!this.socket) {
            console.error('Socket.IO not initialized!');
            return;
        }
		
		// Create ViewManager instance
        console.log('Creating ViewManager instance...');
        this.viewManager = new ViewManager(this);

        // Initialize only if not already initialized
        if (!this.initialized) {
            console.log('First time initialization of GameClient');
            this.setupSocketListeners();
            this.setupChampionSocketListeners();
			this.setupArenaListeners(); 
            this.initializeFormHandler();
            this.checkInitialState();
            this.initialized = true;
        }
		
		// Add simple connection event listeners for debugging
        this.socket.on('connect', () => {
            console.log('Socket connected successfully:', this.socket.id);
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            this.showError('Connection error. Please refresh the page.');
        });

        this.socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });
    }
	
	 // Add this method
	checkInitialState() {
        console.log('Checking initial game state...');
        const urlParams = new URLSearchParams(window.location.search);
        const testSession = urlParams.get('testSession');
        
        if (testSession) {
            console.log('Test session - showing outfit creation');
            this.hideGameArea();
            this.showOutfitCreation();
        } else {
            this.socket.emit('check-initial-state');
        }
    }
	
	
	showOutfitCreation() {
        const outfitCreation = document.getElementById('outfit-creation');
        if (outfitCreation) {
            outfitCreation.style.display = 'block';
        }
    }
	
	 hideGameArea() {
        const gameArea = document.getElementById('game-area');
        if (gameArea) {
            gameArea.style.display = 'none';
        }
    }
	
	
    setupSocketListeners() {
		// Add these new socket listeners for initial state
        this.socket.on('load-existing-outfit', (outfit) => {
            console.log('Loading existing outfit:', outfit);
			
			// Store outfit data first
            this.currentOutfit = { ...outfit };  // Make a copy of the outfit data
			this.currentOutfitId = outfit._id;
			
			// Update UI state
            this.hideOutfitCreation();
            this.showGameArea();
            this.updateOutfitDisplay(outfit);
            
			
            // Handle champion if it exists
            if (outfit.champion) {
                console.log('Outfit has champion:', outfit.champion);
                this.currentChampion = outfit.champion;
                this.hasChampion = true;
                this.updateChampionDisplay(outfit.champion);
				this.viewManager.setHasChampion(true);
            } else {
                this.currentChampion = null;
                this.hasChampion = false;
                this.updateChampionDisplay(null);
				this.viewManager.setHasChampion(false);
            }
			
			// Initialize the game state in ViewManager
			this.viewManager.initializeGameState(outfit);
			
        });
		
		this.socket.on('show-outfit-creation', () => {
            console.log('Showing outfit creation screen');
            document.getElementById('outfit-creation').style.display = 'block';
            document.getElementById('game-area').style.display = 'none';
        });
		
		// Game state events
		this.socket.on('outfit-created', (outfit) => {
            console.log('Received outfit-created event:', outfit);
            this.currentOutfitId = outfit._id;
            this.hideOutfitCreation();
            this.showGameArea();
            this.updateOutfitDisplay(outfit);
            // New outfit has no champion
            this.updateChampionDisplay(null);
        });

		this.socket.on('error', (error) => {
			console.error('Received error from server:', error);
			this.showError(error.message);
			this.enableFormElements();
		});

		this.socket.on('training-started', (data) => {
			this.updateOutfitDisplay(data.outfit);
			this.updateChampionDisplay(data.champion);
			this.showTrainingTimer(data.champion);
		});

		this.socket.on('champion-available', (champion) => {
			this.updateChampionDisplay(champion);
			this.hideTrainingTimer();
		});
		
		// Structure upgrade listeners
		this.socket.on('structure-upgraded', (data) => {
			console.log('Structure upgrade successful:', data);
    
			// Update the cached outfit data
			this.currentOutfit = data.outfit;  // Add this line
			
			// Update displays
			this.updateOutfitDisplay(data.outfit);
			this.viewManager.updateStructureCosts(data.outfit);
        
			// Update the game log if you have one
			if (this.addLogEntry) {
				this.addLogEntry(`Upgraded structure successfully!`, 'success');
			}
		});

		this.socket.on('upgrade-failed', (error) => {
			console.error('Upgrade failed:', error);
			this.showError(error.message);
		});
    
		this.socket.on('log-entry', (data) => {
			if (this.addLogEntry) {
				this.addLogEntry(data.message, data.type);
			}
		});
	}
	
	//champion socket listeners
	setupChampionSocketListeners() {
        console.log('Setting up champion socket listeners');
        
        this.socket.on('champion-generated', (champion) => {
			console.log('Champion generated:', champion);
			try {
				// Champion data from server should already include hireCost based on level
			this.pendingChampion = champion;
			this.updateChampionSelection(champion);
			this.viewManager.showChampionSelection();
			} catch (error) {
				console.error('Error updating champion selection:', error);
				this.showError('Failed to display champion');
			}
		});

        this.socket.on('champion-hired', (data) => {
			console.log('Champion hired:', data);
			const { champion, outfit } = data;
			
			// Update client state
			this.currentChampion = champion;
			this.hasChampion = true;
			this.pendingChampion = null; // Clear pending champion
			this.updateChampionDisplay(champion);
			this.updateOutfitDisplay(outfit);
			
			// Clean up modal if it exists
			if (this.modalContainer) {
				ReactDOM.unmountComponentAtNode(this.modalContainer);
			}
			
			this.viewManager.hideChampionSelection(); 
		});
		
		this.socket.on('champion-status-changed', (champion) => {
			console.log('Champion status changed:', champion);
			this.currentChampion = champion;
			this.updateChampionDisplay(champion);
			
			// Force tab refresh if we're on the champion tab
			if (this.viewManager.activeTab === 'champion') {
				this.viewManager.updateChampionTab();
			}
		});
		
		this.socket.on('champion-data-updated', (champion) => {
			console.log('Received updated champion data:', champion);
			this.currentChampion = champion;
			this.updateChampionDisplay(champion);
		});

		this.socket.on('training-completed', (champion) => {
			console.log('Training completed:', champion);
			this.currentChampion = champion;
			this.updateChampionDisplay(champion);
			
			// Force tab refresh if we're on the champion tab
			if (this.viewManager.activeTab === 'champion') {
				this.viewManager.updateChampionTab();
			}
		});
    }


	setupArenaListeners() {
		this.socket.on('queue-confirmed', (data) => {
			console.log('Successfully queued for arena:', data);
		});

		this.socket.on('match-found', (data) => {
			console.log('Match found! Room ID:', data.roomId);
			// Join the arena room
			this.socket.emit('join-arena', data);
		});

		this.socket.on('match-start', (data) => {
			console.log('Match is starting!', data);
		});

		this.socket.on('arena-error', (error) => {
			console.error('Arena error:', error);
			this.showError(error.message);
		});
	}



    findNewChampion() {
		console.log('Requesting new champion generation');
		if (!this.currentOutfitId) {
			console.error('No outfit ID available');
			this.showError('Game state error: No outfit selected');
			return;
		}

		try {
			this.socket.emit('generate-champion', {
				outfitId: this.currentOutfitId
			});
		} catch (error) {
			console.error('Error requesting champion generation:', error);
			this.showError('Failed to request new champion');
		}
	}

    hireChampion(tempChampionId) {
		console.log('Requesting to hire champion:', tempChampionId);
		if (!this.currentOutfitId) {
			console.error('No outfit ID available');
			this.showError('Game state error: No outfit selected');
			return;
		}

		// If there's already a champion, show confirmation modal
		if (this.hasChampion && this.currentChampion) {
			const newChampion = this.getPendingChampionData(tempChampionId);
			if (!newChampion) {
				this.showError('Error loading champion data');
				return;
			}

			// Use the new modal system
			window.showChampionModal({
				currentChampion: this.currentChampion,
				newChampion: newChampion,
				hireCost: newChampion.hireCost,
				onConfirm: () => this.confirmHireChampion(tempChampionId),
				onCancel: () => this.cancelChampionReplacement()
			});
		} else {
			// No existing champion, proceed with hire directly
			this.confirmHireChampion(tempChampionId);
		}
	}
	
	confirmHireChampion(tempChampionId) {
		console.log('Confirming champion hire:', tempChampionId);
		if (!this.currentOutfitId || !this.socket?.connected) {
			console.error('Invalid game state or connection');
			this.showError('Connection error or invalid game state');
			return;
		}

		this.socket.emit('hire-champion', {
			outfitId: this.currentOutfitId,
			tempChampionId: tempChampionId,
			replaceExisting: this.hasChampion
		});
	}

	cancelChampionReplacement() {
		console.log('Cancelling champion replacement');
		// No cleanup needed as it's handled by the modal system
	}


	// Simplified getPendingChampionData that uses stored data
	getPendingChampionData(tempChampionId) {
		console.log('Getting pending champion data for:', tempChampionId);
		if (this.pendingChampion && this.pendingChampion.tempId === tempChampionId) {
			return this.pendingChampion;  // This should include all champion data including hireCost
		}
		console.error('Pending champion not found:', tempChampionId);
		return null;
	}

    initializeFormHandler() {
    console.log('GameClient: Setting up form handler');
    const outfitForm = document.getElementById('create-outfit-form');
    const createButton = document.getElementById('create-outfit-btn');
    
    if (outfitForm && createButton) {
        console.log('Found form and button, removing any existing listeners');
        
        // Remove any existing listeners by cloning
        const newForm = outfitForm.cloneNode(true);
        outfitForm.parentNode.replaceChild(newForm, outfitForm);
        
        // Get the new button reference after cloning
        const newButton = newForm.querySelector('#create-outfit-btn');
        
        // Handle form submission
        newForm.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('Form submission intercepted');
            this.handleOutfitCreation();
        });

        // Handle button click
        if (newButton) {
            newButton.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Create button clicked');
                this.handleOutfitCreation();
            });
        }
    } else {
        console.error('Required elements not found:', {
            formFound: !!outfitForm,
            buttonFound: !!createButton
        });
    }
	}

    handleOutfitCreation() {
        const nameInput = document.getElementById('outfit-name');
        if (!nameInput) {
            console.error('Name input not found');
            return;
        }

        const name = nameInput.value.trim();
        console.log('Attempting to create outfit:', name);

        if (!name) {
            this.showError('Please enter an outfit name');
            return;
        }

        if (!this.socket.connected) {
            this.showError('Not connected to server. Please refresh the page.');
            return;
        }

        // Disable form elements while processing
        this.disableFormElements();

        // Emit the create-outfit event
        console.log('Emitting create-outfit event');
        this.socket.emit('create-outfit', { name });

        // Set up response timeout
        setTimeout(() => {
            if (document.getElementById('outfit-creation').style.display !== 'none') {
                this.showError('Server response timeout. Please try again.');
                this.enableFormElements();
            }
        }, 5000);
    }
	
	upgradeStructure(structureType) {
        console.log('Requesting structure upgrade:', structureType);
        
        // Add detailed socket state logging
        console.log('Current socket state:', {
            socketId: this.socket?.id,
            connected: this.socket?.connected,
            outfitId: this.currentOutfitId
        });

		// Add Champion validation to upgradeStructure method
        if (!this.hasChampion) {
            this.showError('You must hire a champion before upgrading structures');
            return;
        }

        if (!this.socket?.connected) {
            console.error('Socket not connected');
            this.showError('Connection error: Socket disconnected');
            return;
        }

        if (!this.currentOutfitId) {
            console.error('No outfit ID available');
            this.showError('Game state error: No outfit selected');
            return;
        }

        const upgradeData = {
            structureType: structureType,
            outfitId: this.currentOutfitId
        };

        console.log('Emitting upgrade-structure event:', upgradeData);
        this.socket.emit('upgrade-structure', upgradeData);
    }
	
	

    disableFormElements() {
        const nameInput = document.getElementById('outfit-name');
        const createButton = document.getElementById('create-outfit-btn');
        if (nameInput) nameInput.disabled = true;
        if (createButton) createButton.disabled = true;
    }

    enableFormElements() {
        const nameInput = document.getElementById('outfit-name');
        const createButton = document.getElementById('create-outfit-btn');
        if (nameInput) nameInput.disabled = false;
        if (createButton) createButton.disabled = false;
    }

    // Existing methods remain the same
    updateOutfitDisplay(outfit) {
		console.log('updateOutfitDisplay called with outfit:', outfit);
        const outfitInfo = document.getElementById('outfit-info');
        outfitInfo.innerHTML = `
            <h3>${this.escapeHtml(outfit.name)}</h3>
            <p>Base Level: ${outfit.level}</p>
            <p>Gold: ${outfit.gold}</p>
        `;

        const structures = document.getElementById('structures');
        structures.innerHTML = `
            <h3>Structures</h3>
            <p>Training Facility: Level ${outfit.structures.trainingFacility.level}</p>
            <p>Library: Level ${outfit.structures.library.level}</p>
        `;
    }

    updateChampionDisplay(champion) {
		console.log('Updating champion display with:', champion);
		const championsDiv = document.getElementById('champions');
		if (!champion) {
			championsDiv.innerHTML = '<p>No champion hired yet.</p>';
			this.hasChampion = false;
			this.viewManager.setHasChampion(false);
			return;
		}

		this.hasChampion = true;
		this.viewManager.setHasChampion(true);

		const statusClass = champion.status === 'available' ? 'status-available' : 'status-busy';
		
		championsDiv.innerHTML = `
			<div class="champion-stats" data-champion-id="${champion._id}">
				<h4>${this.escapeHtml(champion.name)} (Level ${champion.level})</h4>
				<div class="stat-group">
					<h5>Physical Attributes</h5>
					<p>Strength: ${champion.physical.strength.current}</p>
					<p>Agility: ${champion.physical.agility.current}</p>
					<p>Hardiness: ${champion.physical.hardiness.current}</p>
					<p>Stamina: ${champion.physical.stamina.current}</p>
				</div>
				<div class="stat-group">
					<h5>Mental Attributes</h5>
					<p>Intelligence: ${champion.mental.intelligence.current}</p>
					<p>Unarmed Skill: ${champion.mental.unarmedSkill.current}</p>
					<p>Weapon Skill: ${champion.mental.weaponSkill.current}</p>
					<p>Survival Skill: ${champion.mental.survivalSkill.current}</p>
				</div>
				<p class="champion-status ${statusClass}">Status: ${champion.status}</p>
			</div>
		`;
	}

    updateChampionSelection(champion) {
		console.log('Updating champion selection with:', champion);
		
		// Get the champion details container
		const details = document.getElementById('champion-details');
		if (!details) {
			console.error('Champion details container not found');
			return;
		}
		
		// Update the champion details
		details.innerHTML = `
			<h3>${this.escapeHtml(champion.name)}</h3>
			<div class="potential-champion" data-temp-champion-id="${champion.tempId}">
				<div class="stat-group">
					<h4>Physical Attributes:</h4>
					<p>Strength: ${champion.physical.strength.current}</p>
					<p>Agility: ${champion.physical.agility.current}</p>
					<p>Hardiness: ${champion.physical.hardiness.current}</p>
					<p>Stamina: ${champion.physical.stamina.current}</p>
				</div>
				<div class="stat-group">
					<h4>Mental Attributes:</h4>
					<p>Intelligence: ${champion.mental.intelligence.current}</p>
					<p>Unarmed Skill: ${champion.mental.unarmedSkill.current}</p>
					<p>Weapon Skill: ${champion.mental.weaponSkill.current}</p>
					<p>Survival Skill: ${champion.mental.survivalSkill.current}</p>
				</div>
			</div>
		`;

		// Set up the hire button event listener
		const modal = document.getElementById('champion-selection');
		const hireButton = modal.querySelector('[data-action="hire-champion"]');
		
		if (hireButton) {
			// Remove existing listeners
			const newHireButton = hireButton.cloneNode(true);
			hireButton.parentNode.replaceChild(newHireButton, hireButton);
			
			// Add new listener
			newHireButton.addEventListener('click', () => {
				const tempChampionId = details.querySelector('.potential-champion')?.dataset.tempChampionId;
				if (tempChampionId) {
					this.hireChampion(tempChampionId);
				} else {
					console.error('No temporary champion ID found');
				}
			});
		} else {
			console.error('Hire button not found in modal');
		}

		// Show the modal
		modal.style.display = 'block';
	}

    showTrainingTimer(champion) {
        const timerDiv = document.createElement('div');
        timerDiv.id = 'training-timer';
        timerDiv.innerHTML = `
            <p>${this.escapeHtml(champion.name)} is training...</p>
            <p>Time remaining: 5:00</p>
        `;
        document.getElementById('champions').appendChild(timerDiv);

        let timeLeft = 300; // 5 minutes in seconds
        const timer = setInterval(() => {
            timeLeft--;
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            timerDiv.querySelector('p:last-child').textContent = 
                `Time remaining: ${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            if (timeLeft <= 0) {
                clearInterval(timer);
            }
        }, 1000);
    }


	getCurrentOutfit() {
		console.log('Getting current outfit:', this.currentOutfit);
		return this.currentOutfit;
}


    hideOutfitCreation() {
        const outfitCreation = document.getElementById('outfit-creation');
        if (outfitCreation) {
            outfitCreation.style.display = 'none';
        }
    }

    showGameArea() {
        const gameArea = document.getElementById('game-area');
        if (gameArea) {
            gameArea.style.display = 'block';
        }
    }

    hideChampionSelection() {
        const championSelection = document.getElementById('champion-selection');
        if (championSelection) {
            championSelection.style.display = 'none';
        }
    }

    hideTrainingTimer() {
        const timer = document.getElementById('training-timer');
        if (timer) {
            timer.remove();
        }
    }

    showError(message) {
        console.error('Error:', message);
        const errorDiv = document.getElementById('name-error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Only initialize once when DOM is loaded
if (typeof window !== 'undefined') {
    window.GameClient = GameClient;
}

