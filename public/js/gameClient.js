// public/js/gameClient.js
class GameClient {
    constructor() {
        console.log('GameClient initializing...');
        this.socket = window.gameSocket;
		this.hasChampion = false;
		this.currentChampion = null; // Add this to track current champion
		this.currentOutfit = null;  // Initialize outfit data to null
        
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
			this.socket.emit('check-initial-state');
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
            this.currentChampion = champion;
            this.hasChampion = true;
            this.updateChampionDisplay(champion);
            this.updateOutfitDisplay(outfit);
            this.viewManager.hideChampionSelection();
        });

        this.socket.on('hire-failed', (error) => {
            console.error('Hire failed:', error);
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

		this.socket.emit('hire-champion', {
			outfitId: this.currentOutfitId,
			tempChampionId: tempChampionId
		});
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
            <p>Level: ${outfit.level}</p>
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
        const championsDiv = document.getElementById('champions');
        if (!champion) {
            championsDiv.innerHTML = '<p>No champion hired yet.</p>';
            this.hasChampion = false;
            this.viewManager.setHasChampion(false);
            return;
        }

		this.hasChampion = true;
        this.viewManager.setHasChampion(true);

        championsDiv.innerHTML = `
            <div class="champion-stats" data-champion-id="${champion._id}">
                <h4>${this.escapeHtml(champion.name)}</h4>
                <div class="stat-group">
                    <h5>Physical Attributes</h5>
                    <p>Strength: ${champion.physical.strength}</p>
                    <p>Agility: ${champion.physical.agility}</p>
                    <p>Hardiness: ${champion.physical.hardiness}</p>
                    <p>Stamina: ${champion.physical.stamina}</p>
                </div>
                <div class="stat-group">
                    <h5>Mental Attributes</h5>
                    <p>Intelligence: ${champion.mental.intelligence}</p>
                    <p>Unarmed Skill: ${champion.mental.unarmedSkill}</p>
                    <p>Weapon Skill: ${champion.mental.weaponSkill}</p>
                    <p>Survival Skill: ${champion.mental.survivalSkill}</p>
                </div>
                <p class="champion-status">Status: ${champion.status}</p>
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
					<p>Strength: ${champion.physical.strength}</p>
					<p>Agility: ${champion.physical.agility}</p>
					<p>Hardiness: ${champion.physical.hardiness}</p>
					<p>Stamina: ${champion.physical.stamina}</p>
				</div>
				<div class="stat-group">
					<h4>Mental Attributes:</h4>
					<p>Intelligence: ${champion.mental.intelligence}</p>
					<p>Unarmed Skill: ${champion.mental.unarmedSkill}</p>
					<p>Weapon Skill: ${champion.mental.weaponSkill}</p>
					<p>Survival Skill: ${champion.mental.survivalSkill}</p>
				</div>
			</div>
		`;

		// Set up the hire button event listener
		const hireButton = document.getElementById('hire-champion');
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
			console.error('Hire button not found');
		}
		
		// Show the modal
		const modal = document.getElementById('champion-selection');
		if (modal) {
			modal.style.display = 'block';
		} else {
			console.error('Champion selection modal not found');
		}
			
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

