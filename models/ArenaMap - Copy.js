// models/ArenaMap.js
const { Schema, ArraySchema, defineTypes } = require('@colyseus/schema');

/**
 * Represents a single tile in the arena map
 */
class TileState extends Schema {
    constructor() {
        super();
        this.type = 'regular';  // regular, monster_den, loot_room, water, junction, central
        this.occupied = false;
        this.occupiedBy = null; // sessionId of occupying player/monster
        this.description = '';
        this.phase = 1;         // 1, 2, or 3 for different game phases
        this.isFlooded = false;
    }
}

defineTypes(TileState, {
    type: "string",
    occupied: "boolean",
    occupiedBy: "string",
    description: "string",
    phase: "number",
    isFlooded: "boolean"
});

/**
 * Represents a row of tiles in the arena map
 */
class MapRow extends Schema {
    constructor() {
        super();
        this.tiles = new ArraySchema();
        // Initialize 25 tiles per row
        for (let i = 0; i < 25; i++) {
            this.tiles.push(new TileState());
        }
    }
}

defineTypes(MapRow, {
    tiles: [TileState]
});

/**
 * Represents the complete arena map with all features and helper methods
 */
class ArenaMap extends Schema {
    constructor() {
        super();
        this.rows = new ArraySchema();
        // Initialize 25 rows
        for (let i = 0; i < 25; i++) {
            this.rows.push(new MapRow());
        }
        this.initializeMapFeatures();
    }

    /**
     * Initialize special features on the map like monster dens, loot rooms, etc.
     */
    initializeMapFeatures() {
        // Set special tile types based on the map layout
        const features = {
            monster_den: [
                [0, 5], [0, 19],       // First row (0), evenly spaced from edges
                [4, 0], [4, 24],       // Row 4, edges
                [20, 5], [20, 19],     // Row 20, evenly spaced from edges
                [24, 5], [24,19]       // Removed [24, 0] and [24, 24] as these are player spawns
            ],
            loot_room: [
				[4, 6], [4, 18],     // Row 4, evenly spaced from edges
				[10, 6], [10, 18],   // Row 10, evenly spaced
				[14, 6], [14, 18],   // Row 14, evenly spaced
				[20, 6], [20, 18]    // Row 20, evenly spaced from edges
			],
            water: [
                // Upper channels
                [3, 4], [3, 5], [3, 9], [3, 10],         // Row 3
                [4, 3], [4, 11], [4, 15], [4, 16],       // Row 4
                [5, 3], [5, 11], [5, 15], [5, 16],       // Row 5
                // Middle channels
                [9, 3], [9, 11], [9, 15], [9, 16],       // Row 9
                [10, 3], [10, 11], [10, 15], [10, 16],   // Row 10
                [15, 3], [15, 11], [15, 15], [15, 16],   // Row 15
                [16, 3], [16, 11], [16, 15], [16, 16],   // Row 16
                [17, 4], [17, 5], [17, 9], [17, 10]      // Row 17
            ],
            junction: [
                [2, 2], [2, 22],     // Row 2
                [4, 5], [4, 19],     // Row 4
                [7, 4], [7, 20],     // Row 7
                [10, 4], [10, 20],   // Row 10
                [14, 4], [14, 20],   // Row 14
                [17, 2], [17, 22]    // Row 17
            ],
            central: [
                [10, 10], [10, 11], [10, 12], [10, 13], [10, 14],
                [11, 10], [11, 11], [11, 12], [11, 13], [11, 14],
                [12, 10], [12, 11], [12, 12], [12, 13], [12, 14],
                [13, 10], [13, 11], [13, 12], [13, 13], [13, 14],
                [14, 10], [14, 11], [14, 12], [14, 13], [14, 14]
            ]
        };

        // Set features
        for (const [type, coordinates] of Object.entries(features)) {
            coordinates.forEach(([row, col]) => {
                if (this.isValidPosition(row, col)) {
                    this.rows[row].tiles[col].type = type;
                    this.rows[row].tiles[col].description = this.getBaseDescription(type);
                } else {
                    console.warn(`Invalid position for ${type}: [${row}, ${col}]`);
                }
            });
        }
    }

    /**
     * Get the base description for a tile type
     * @param {string} type - The type of tile
     * @returns {string} Description of the tile
     */
    getBaseDescription(type) {
        const descriptions = {
            monster_den: "A dark alcove where creatures lurk in the shadows.",
            loot_room: "A promising chamber that might hold valuable items.",
            water: "A channel of murky water flows through here.",
            junction: "A major intersection of tunnels.",
            central: "Part of the arena's central chamber complex.",
            regular: "A standard sewer tunnel section."
        };
        return descriptions[type] || descriptions.regular;
    }

    /**
     * Get a tile at specific coordinates
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @returns {TileState|null} The tile at the specified position or null if invalid
     */
    getTile(row, col) {
        if (this.isValidPosition(row, col)) {
            return this.rows[row].tiles[col];
        }
        return null;
    }

    /**
     * Find all tiles of a specific type
     * @param {string} type - The type of tile to find
     * @returns {Array} Array of objects containing row, col, and tile reference
     */
    getTilesByType(type) {
        const tiles = [];
        for (let i = 0; i < 25; i++) {
            for (let j = 0; j < 25; j++) {
                if (this.rows[i].tiles[j].type === type) {
                    tiles.push({ row: i, col: j, tile: this.rows[i].tiles[j] });
                }
            }
        }
        return tiles;
    }

    /**
     * Check if coordinates are within map bounds
     * @param {number} row - Row index to check
     * @param {number} col - Column index to check
     * @returns {boolean} Whether the position is valid
     */
    isValidPosition(row, col) {
        return row >= 0 && row < 25 && col >= 0 && col < 25;  // Fixed bounds check
    }

    /**
     * Get all adjacent tiles (excluding diagonals)
     * @param {number} row - Current row
     * @param {number} col - Current column
     * @returns {Array} Array of adjacent tile objects
     */
    getAdjacentTiles(row, col) {
        const adjacent = [];
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // Up, Down, Left, Right
        
        directions.forEach(([dRow, dCol]) => {
            const newRow = row + dRow;
            const newCol = col + dCol;
            if (this.isValidPosition(newRow, newCol)) {
                adjacent.push({
                    row: newRow,
                    col: newCol,
                    tile: this.getTile(newRow, newCol)
                });
            }
        });
        
        return adjacent;
    }

    /**
     * Get spawn points for a specific side (East or West)
     * @param {string} side - 'east' or 'west'
     * @returns {Array} Array of spawn point coordinates
     */
    getSpawnPoints(side) {
        const spawnPoints = {
            east: [
                [0, 0],   // P1 (SE)
                [0, 24],  // P2 (NE)
                [8, 0],   // P3 (E)
                [8, 24]   // P4 (E)
            ],
            west: [
                [16, 0],  // P5 (W)
                [16, 24], // P6 (W)
                [24, 0],  // P7 (SW)
                [24, 24]  // P8 (NW)
            ]
        };
        
        return spawnPoints[side] || [];
    }
}

defineTypes(ArenaMap, {
    rows: [MapRow]
});

module.exports = { TileState, MapRow, ArenaMap };