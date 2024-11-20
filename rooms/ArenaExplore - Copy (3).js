// rooms/ArenaExplore.js
class ArenaExplore {
    constructor(room) {
        this.room = room;
        this.moveIntervals = new Map();
        this.mapCenter = { row: 12, col: 12 }; // Center of 25x25 map
    }

    start() {
        console.log("Starting automated exploration phase");
        this.room.state.players.forEach((player, sessionId) => {
            this.startPlayerMovement(sessionId, player);
        });
    }

    calculateDirectionWeights(row, col) {
        const weights = {
            north: 1,
            south: 1,
            east: 1,
            west: 1
        };

        // Increase weight for directions that move closer to center
        if (row > this.mapCenter.row) weights.north += 2;
        if (row < this.mapCenter.row) weights.south += 2;
        if (col > this.mapCenter.col) weights.west += 2;
        if (col < this.mapCenter.col) weights.east += 2;

        // Add randomness (30% chance of random direction)
        if (Math.random() < 0.3) {
            const directions = Object.keys(weights);
            weights[directions[Math.floor(Math.random() * directions.length)]] += 3;
        }

        return weights;
    }

    selectDirection(row, col) {
        const weights = this.calculateDirectionWeights(row, col);
        const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;
        
        for (const [direction, weight] of Object.entries(weights)) {
            random -= weight;
            if (random <= 0) return direction;
        }
        
        return Object.keys(weights)[0];
    }

    startPlayerMovement(sessionId, player) {
        const interval = setInterval(() => {
            const direction = this.selectDirection(player.row, player.col);
            const newPosition = this.validateMove(player.row, player.col, direction);
            
            if (newPosition) {
                this.updatePlayerPosition(sessionId, player, newPosition);
            }
        }, 2000); // Move every 2 seconds

        this.moveIntervals.set(sessionId, interval);
    }

    validateMove(currentRow, currentCol, direction) {
        const moves = {
            'north': [-1, 0],
            'south': [1, 0],
            'east': [0, 1],
            'west': [0, -1]
        };

        const [dRow, dCol] = moves[direction];
        const newRow = currentRow + dRow;
        const newCol = currentCol + dCol;

        const tile = this.room.state.map.getTile(newRow, newCol);
        if (tile && !tile.occupied && this.isValidTile(tile)) {
            return { row: newRow, col: newCol };
        }
        return null;
    }

    isValidTile(tile) {
        // Don't allow movement into water tiles
        return tile.type !== 'water';
    }

    updatePlayerPosition(sessionId, player, newPosition) {
        console.log(`Updating position for player ${sessionId}:`, newPosition);

        try {
            // Clear old position
            const oldTile = this.room.state.map.getTile(player.row, player.col);
            if (oldTile) {
                oldTile.occupied = false;
                oldTile.occupiedBy = null;
            }

            // Update to new position
            player.row = newPosition.row;
            player.col = newPosition.col;
            
            const newTile = this.room.state.map.getTile(newPosition.row, newPosition.col);
            if (newTile) {
                newTile.occupied = true;
                newTile.occupiedBy = sessionId;
            }

            // Broadcast position update
            this.room.broadcast("position-update", {
                playerId: player.id,
                row: newPosition.row,
                col: newPosition.col,
                tileType: newTile ? newTile.type : 'regular'
            });

            this.checkForCombat(sessionId, newPosition);
        } catch (error) {
            console.error('Error updating player position:', error);
        }
    }

    checkForCombat(sessionId, position) {
        const adjacentPlayers = Array.from(this.room.state.players.values())
            .filter(p => p.id !== sessionId && 
                        p.row === position.row && 
                        p.col === position.col);

        if (adjacentPlayers.length > 0) {
            // Clear all movement intervals
            this.moveIntervals.forEach((interval) => clearInterval(interval));
            this.moveIntervals.clear();

            // Trigger combat phase
            this.room.state.phase = "COMBAT";
            this.room.broadcast("combat-start", {
                players: [sessionId, adjacentPlayers[0].id],
                row: position.row,
                col: position.col
            });
        }
    }

    update() {
        // Handle any per-tick updates (currently unused)
    }

    cleanup() {
        // Clear all movement intervals
        this.moveIntervals.forEach((interval) => clearInterval(interval));
        this.moveIntervals.clear();
    }
}

module.exports = ArenaExplore;