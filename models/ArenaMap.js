// models/ArenaMap.js
const { Schema, ArraySchema, defineTypes } = require('@colyseus/schema');

class TileState extends Schema {
    constructor() {
        super();
        this.type = 'regular';  // regular, monster_den, loot_room, water, junction, central
        this.occupied = false;
        this.occupiedBy = null;
        this.phase = 1;
        this.isFlooded = false;
    }
}

defineTypes(TileState, {
    type: "string",
    occupied: "boolean",
    occupiedBy: "string",
    phase: "number",
    isFlooded: "boolean"
});

class MapRow extends Schema {
    constructor() {
        super();
        this.tiles = new ArraySchema();
        for (let i = 0; i < 25; i++) {
            this.tiles.push(new TileState());
        }
    }
}

defineTypes(MapRow, {
    tiles: [TileState]
});

class ArenaMap extends Schema {
    constructor() {
        super();
        this.rows = new ArraySchema();
        for (let i = 0; i < 25; i++) {
            this.rows.push(new MapRow());
        }
        this.initializeMapFeatures();
    }

    initializeMapFeatures() {
        const features = {
            monster_den: [
                [0, 5], [0, 19],
                [4, 0], [4, 24],
                [20, 5], [20, 19],
                [24, 5], [24,19]
            ],
            loot_room: [
                [4, 6], [4, 18],
                [10, 6], [10, 18],
                [14, 6], [14, 18],
                [20, 6], [20, 18]
            ],
            water: [
                [3, 4], [3, 5], [3, 9], [3, 10],
                [4, 3], [4, 11], [4, 15], [4, 16],
                [5, 3], [5, 11], [5, 15], [5, 16],
                [9, 3], [9, 11], [9, 15], [9, 16],
                [10, 3], [10, 11], [10, 15], [10, 16],
                [15, 3], [15, 11], [15, 15], [15, 16],
                [16, 3], [16, 11], [16, 15], [16, 16],
                [17, 4], [17, 5], [17, 9], [17, 10]
            ],
            junction: [
                [2, 2], [2, 22],
                [4, 5], [4, 19],
                [7, 4], [7, 20],
                [10, 4], [10, 20],
                [14, 4], [14, 20],
                [17, 2], [17, 22]
            ],
            central: [
                [10, 10], [10, 11], [10, 12], [10, 13], [10, 14],
                [11, 10], [11, 11], [11, 12], [11, 13], [11, 14],
                [12, 10], [12, 11], [12, 12], [12, 13], [12, 14],
                [13, 10], [13, 11], [13, 12], [13, 13], [13, 14],
                [14, 10], [14, 11], [14, 12], [14, 13], [14, 14]
            ]
        };

        for (const [type, coordinates] of Object.entries(features)) {
            coordinates.forEach(([row, col]) => {
                if (this.isValidPosition(row, col)) {
                    this.rows[row].tiles[col].type = type;
                }
            });
        }
    }

    getTile(row, col) {
        if (this.isValidPosition(row, col)) {
            return this.rows[row].tiles[col];
        }
        return null;
    }

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

    isValidPosition(row, col) {
        return row >= 0 && row < 25 && col >= 0 && col < 25;
    }

    getAdjacentTiles(row, col) {
        const adjacent = [];
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        
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

    getSpawnPoints(side) {
        const spawnPoints = {
            east: [
                [0, 0], [0, 24],
                [8, 0], [8, 24]
            ],
            west: [
                [16, 0], [16, 24],
                [24, 0], [24, 24]
            ]
        };
        return spawnPoints[side] || [];
    }
}

defineTypes(ArenaMap, {
    rows: [MapRow]
});

module.exports = { TileState, MapRow, ArenaMap };