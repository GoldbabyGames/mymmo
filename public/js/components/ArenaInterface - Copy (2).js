console.log('Loading ArenaInterface combat component...');

const ArenaInterface = function ArenaInterface({ championData, room }) {
    console.log('ArenaInterface rendering with champion:', championData);

    // State management
    const [matchState, setMatchState] = React.useState({
        phase: 'CONNECTING',
        currentRound: 0,
        timeRemaining: 0,
        champions: [],
        combatLog: [],
        statusMessage: 'Connecting to arena match...'
    });
    const [selectedStance, setSelectedStance] = React.useState('neutral');
    const roomRef = React.useRef(room);

    // Set up room event handlers
    React.useEffect(() => {
        if (!room) return;
        
        console.log('Setting up room event handlers');
        
        room.onStateChange((state) => {
            console.log("Room state changed:", state);
            setMatchState(prev => ({
                ...prev,
                phase: state.phase,
                currentRound: state.roundNumber,
                champions: Array.from(state.champions.values()),
                timeRemaining: state.roundStartTime ? 
                    Math.max(0, 10 - Math.floor((Date.now() - state.roundStartTime) / 1000)) : 0
            }));
        });

        room.onMessage("combat-update", (message) => {
            setMatchState(prev => ({
                ...prev,
                combatLog: [...prev.combatLog, message]
            }));
        });

        return () => {
            console.log('Cleaning up room event handlers');
            room.leave();
        };
    }, [room]);

    // Handle stance changes
    const handleStanceChange = (newStance) => {
        if (room && matchState.phase === 'COMBAT') {
            setSelectedStance(newStance);
            room.send("stance", { stance: newStance });
        }
    };

    // Render the combat interface
    return React.createElement('div', { className: 'arena-interface p-4' }, [
        // Combat header
        React.createElement('div', { 
            key: 'header',
            className: 'text-center mb-4' 
        }, [
            React.createElement('h2', { 
                key: 'title',
                className: 'text-2xl font-bold' 
            }, 'Arena Combat'),
            React.createElement('p', { 
                key: 'status',
                className: 'text-lg' 
            }, matchState.phase === 'COMBAT' 
                ? `Round ${matchState.currentRound} - ${matchState.timeRemaining}s` 
                : matchState.statusMessage
            )
        ]),

        // Champions display
        matchState.champions.length > 0 && React.createElement('div', {
            key: 'champions',
            className: 'grid grid-cols-2 gap-4 mb-4'
        }, matchState.champions.map(champion => 
            React.createElement('div', {
                key: champion.id,
                className: 'p-4 bg-gray-800 rounded-lg'
            }, [
                React.createElement('h3', {
                    key: 'name',
                    className: 'text-lg font-bold'
                }, champion.name),
                React.createElement('div', {
                    key: 'health-bar',
                    className: 'bg-gray-700 h-4 rounded-full mt-2'
                }, React.createElement('div', {
                    className: 'bg-green-500 h-full rounded-full transition-all',
                    style: {
                        width: `${(champion.currentHealth / champion.maxHealth) * 100}%`
                    }
                })),
                React.createElement('p', {
                    key: 'health-text',
                    className: 'mt-1'
                }, `Health: ${champion.currentHealth}/${champion.maxHealth}`),
                React.createElement('p', {
                    key: 'stance'
                }, `Stance: ${champion.stance}`)
            ])
        )),

        // Combat controls
        matchState.phase === 'COMBAT' && React.createElement('div', {
            key: 'controls',
            className: 'mb-4'
        }, [
            React.createElement('h3', {
                key: 'controls-title',
                className: 'text-lg font-bold mb-2'
            }, 'Combat Stance'),
            React.createElement('div', {
                key: 'stance-buttons',
                className: 'flex gap-2 justify-center'
            }, ['neutral', 'aggressive', 'defensive'].map(stance =>
                React.createElement('button', {
                    key: stance,
                    onClick: () => handleStanceChange(stance),
                    className: `px-4 py-2 rounded ${
                        selectedStance === stance 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-600 hover:bg-gray-500'
                    }`
                }, stance.charAt(0).toUpperCase() + stance.slice(1))
            ))
        ]),

        // Combat log
        React.createElement('div', {
            key: 'combat-log',
            className: 'bg-gray-800 rounded-lg p-4'
        }, [
            React.createElement('h3', {
                key: 'log-title',
                className: 'text-lg font-bold mb-2'
            }, 'Combat Log'),
            React.createElement('div', {
                key: 'log-entries',
                className: 'max-h-40 overflow-y-auto'
            }, matchState.combatLog.map((entry, index) =>
                React.createElement('p', {
                    key: index,
                    className: 'text-sm mb-1'
                }, entry.type === "damage" 
                    ? `${entry.detail.attackerName} dealt ${entry.detail.damageDealt} damage to ${entry.detail.defenderName}`
                    : `${entry.championId} changed stance to ${entry.stance}`
                )
            ))
        ])
    ]);
};

// Set on window object
window.ArenaInterface = ArenaInterface;
console.log('ArenaInterface component loaded successfully');