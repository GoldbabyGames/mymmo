// tests/testArenaMap.js
const { ArenaMap } = require('../models/ArenaMap');

/**
 * Simple test runner
 */
class MapTester {
    constructor() {
        this.map = new ArenaMap();
        this.testResults = [];
    }

    runTest(testName, testFn) {
        try {
            testFn();
            this.testResults.push(`✅ ${testName} passed`);
        } catch (error) {
            this.testResults.push(`❌ ${testName} failed: ${error.message}`);
            console.error(`Test "${testName}" error details:`, error);
        }
    }

    printResults() {
        console.log('\nTest Results:');
        this.testResults.forEach(result => console.log(result));
    }

    // Test map initialization
    testMapDimensions() {
        this.runTest('Map Dimensions', () => {
            if (this.map.rows.length !== 25) throw new Error('Invalid row count');
            if (this.map.rows[0].tiles.length !== 25) throw new Error('Invalid column count');
        });
    }

    // Test special tile placement
    testSpecialTiles() {
        this.runTest('Special Tiles Placement', () => {
            // Test monster den placement
            const monsterDens = this.map.getTilesByType('monster_den');
            if (monsterDens.length !== 8) throw new Error('Invalid monster den count');

            // Test loot room placement
            const lootRooms = this.map.getTilesByType('loot_room');
            if (lootRooms.length !== 8) throw new Error('Invalid loot room count');

            // Test central chamber - now expecting 25 tiles (5x5)
            const centralTiles = this.map.getTilesByType('central');
            if (centralTiles.length !== 25) throw new Error('Invalid central chamber size');

            // Test central chamber symmetry
            const center = centralTiles.find(t => t.row === 12 && t.col === 12);
            if (!center) throw new Error('No center tile found at 12,12');

            // Verify equal distribution around center
            const eastCount = centralTiles.filter(t => t.col > 12).length;
            const westCount = centralTiles.filter(t => t.col < 12).length;
            if (eastCount !== westCount) throw new Error('Central chamber not symmetrical E/W');
        });
    }

    // Test tile access methods
    testTileAccess() {
        this.runTest('Tile Access', () => {
            const tile = this.map.getTile(0, 0);
            if (!tile) throw new Error('Could not access tile at 0,0');
            
            const invalidTile = this.map.getTile(25, 25);
            if (invalidTile) throw new Error('Should return null for invalid coordinates');
        });
    }

    // Test spawn points
    testSpawnPoints() {
        this.runTest('Spawn Points', () => {
            const eastSpawns = this.map.getSpawnPoints('east');
            const westSpawns = this.map.getSpawnPoints('west');
            
            if (eastSpawns.length !== 4) throw new Error('Invalid east spawn count');
            if (westSpawns.length !== 4) throw new Error('Invalid west spawn count');
        });
    }

    // Test adjacent tiles
    testAdjacentTiles() {
        this.runTest('Adjacent Tiles', () => {
            // Center tile should have 4 adjacent
            const centerAdjacent = this.map.getAdjacentTiles(12, 12);
            if (centerAdjacent.length !== 4) throw new Error('Center tile should have 4 adjacent tiles');

            // Corner tile should have 2 adjacent
            const cornerAdjacent = this.map.getAdjacentTiles(0, 0);
            if (cornerAdjacent.length !== 2) throw new Error('Corner tile should have 2 adjacent tiles');
        });
    }

    // Test tile occupation
    testTileOccupation() {
        this.runTest('Tile Occupation', () => {
            const tile = this.map.getTile(0, 0);
            tile.occupied = true;
            tile.occupiedBy = 'player1';
            
            if (!tile.occupied) throw new Error('Tile should be marked as occupied');
            if (tile.occupiedBy !== 'player1') throw new Error('Tile should track occupant');
        });
    }

    // Visual map representation
    printMapSection(startRow, startCol, rows, cols) {
        console.log('\nMap Section:');
        for (let i = startRow; i < startRow + rows && i < 25; i++) {
            let row = '';
            for (let j = startCol; j < startCol + cols && j < 25; j++) {
                const tile = this.map.getTile(i, j);
                switch(tile.type) {
                    case 'monster_den': row += 'M '; break;
                    case 'loot_room': row += 'L '; break;
                    case 'water': row += '~ '; break;
                    case 'junction': row += 'X '; break;
                    case 'central': row += 'C '; break;
                    default: row += '. '; break;
                }
            }
            console.log(row);
        }
    }
	
	// Enhanced visual map representation
    printFullMap() {
        console.log('\nFull 25x25 Arena Map:');
        console.log('Legend: M=Monster Den, L=Loot Room, ~=Water, X=Junction, C=Central, .=Regular, P=Player Spawn');
        
        // Print column numbers (corrected to show 0-24)
        console.log('    0 1 2 3 4 5 6 7 8 9 101112131415161718192021222324');
        console.log('    -------------------------------------------------');
        
        for (let i = 0; i < 25; i++) {
            // Add row numbers
            let row = `${i.toString().padStart(2, ' ')} |`;
            
            for (let j = 0; j < 25; j++) {
                const tile = this.map.getTile(i, j);
                
                // Check if it's a spawn point
                const isEastSpawn = this.map.getSpawnPoints('east').some(([r, c]) => r === i && c === j);
                const isWestSpawn = this.map.getSpawnPoints('west').some(([r, c]) => r === i && c === j);
                
                if (isEastSpawn || isWestSpawn) {
                    row += 'P ';
                } else {
                    switch(tile.type) {
                        case 'monster_den': row += 'M '; break;
                        case 'loot_room': row += 'L '; break;
                        case 'water': row += '~ '; break;
                        case 'junction': row += 'X '; break;
                        case 'central': row += 'C '; break;
                        default: row += '. '; break;
                    }
                }
            }
            console.log(row + '|');
        }
        console.log('    -------------------------------------------------');
    }
	
	

    // Run all tests
    runAllTests() {
        console.log('Starting Arena Map Tests...\n');
        
        this.testMapDimensions();
        this.testSpecialTiles();
        this.testTileAccess();
        this.testSpawnPoints();
        this.testAdjacentTiles();
        this.testTileOccupation();
        
        this.printResults();
        
        // Print the full map
        this.printFullMap();
    }
}

// Run the tests
const tester = new MapTester();
tester.runAllTests();