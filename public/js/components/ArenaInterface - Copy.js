console.log('Loading complete ArenaInterface...');

const ArenaInterface = function ArenaInterface({ championData }) {
    console.log('ArenaInterface rendering with champion:', championData);

    // Set up state using React hooks
    const [matchState, setMatchState] = React.useState({
        phase: 'CONNECTING',
        currentRound: 0,
        timeRemaining: 0,
        champions: [],
        combatLog: [],
        statusMessage: 'Connecting to arena...'
    });
    const [selectedStance, setSelectedStance] = React.useState('neutral');
    const [room, setRoom] = React.useState(null);
    const roomRef = React.useRef(null);

    // Set up Colyseus connection
    React.useEffect(() => {
        let mounted = true;

        async function connectToArena() {
            try {
                console.log('Connecting to arena with champion:', championData);
                const client = new Colyseus.Client('ws://localhost:2567');
                
                const room = await client.joinOrCreate("arena_room", {
                    championData: championData
                });
                
                if (!mounted) {
                    room.leave();
                    return;
                }

                console.log('Connected to arena room:', room.id);
                roomRef.current = room;
                setRoom(room);

                // Set up room event handlers
                room.onStateChange((state) => {
                    if (!mounted) return;
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
                    if (!mounted) return;
                    setMatchState(prev => ({
                        ...prev,
                        combatLog: [...prev.combatLog, message]
                    }));
                });

            } catch (error) {
                console.error("Error connecting to arena:", error);
                if (!mounted) return;
                setMatchState(prev => ({
                    ...prev,
                    phase: 'ERROR',
                    statusMessage: `Connection error: ${error.message}`
                }));
            }
        }

        connectToArena();
        return () => {
            mounted = false;
            if (roomRef.current) {
                roomRef.current.leave();
            }
        };
    }, [championData]);

    // Handle stance changes
    const handleStanceChange = (newStance) => {
        if (roomRef.current && matchState.phase === 'COMBAT') {
            setSelectedStance(newStance);
            roomRef.current.send("stance", { stance: newStance });
        }
    };

    // Render stance buttons
    const renderStanceButtons = () => {
        return ['neutral', 'aggressive', 'defensive'].map(stance => 
            React.createElement('button', {
                key: stance,
                onClick: () => handleStanceChange(stance),
                className: `px-4 py-2 rounded ${
                    selectedStance === stance 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-600 hover:bg-gray-500'
                }`
            }, stance.charAt(0).toUpperCase() + stance.slice(1))
        );
    };

    // Render champion cards
    const renderChampionCards = () => {
        return matchState.champions.map(champion => 
            React.createElement('div', {
                key: champion.id,
                className: 'champion-card p-4 rounded bg-gray-800'
            }, [
                React.createElement('h3', { 
                    key: 'name',
                    className: 'text-lg font-bold' 
                }, champion.name),
                React.createElement('p', { key: 'health' }, 
                    `Health: ${champion.currentHealth}/${champion.maxHealth}`
                ),
                React.createElement('p', { key: 'stance' }, 
                    `Stance: ${champion.stance}`
                )
            ])
        );
    };

    // Render combat log
    const renderCombatLog = () => {
        return matchState.combatLog.map((entry, index) => 
            React.createElement('p', {
                key: index,
                className: 'text-sm mb-1'
            }, entry.type === "damage" 
                ? `${entry.detail.attackerName} dealt ${entry.detail.damageDealt} damage to ${entry.detail.defenderName}`
                : `${entry.championId} changed stance to ${entry.stance}`
            )
        );
    };

    // Main render
    return React.createElement('div', { className: 'arena-interface' },
        React.createElement('div', { className: 'text-center p-4' }, [
            // Title and status
            React.createElement('h2', { 
                key: 'title',
                className: 'text-2xl font-bold' 
            }, 'Arena Combat'),
            React.createElement('p', { 
                key: 'status',
                className: 'mt-2' 
            }, matchState.statusMessage),

            // Stance controls (if in combat)
            matchState.phase === 'COMBAT' && React.createElement('div', {
                key: 'stance-controls',
                className: 'stance-controls mt-4'
            }, [
                React.createElement('h3', { 
                    key: 'stance-title',
                    className: 'text-lg font-bold mb-2' 
                }, 'Combat Stance'),
                React.createElement('div', {
                    key: 'stance-buttons',
                    className: 'flex gap-2 justify-center'
                }, renderStanceButtons())
            ]),

            // Champion cards
            matchState.champions.length > 0 && React.createElement('div', {
                key: 'champion-cards',
                className: 'grid grid-cols-2 gap-4 mt-4'
            }, renderChampionCards()),

            // Combat log
            React.createElement('div', {
                key: 'combat-log',
                className: 'combat-log mt-4 bg-gray-800 rounded-lg p-4'
            }, [
                React.createElement('h3', {
                    key: 'log-title',
                    className: 'text-lg font-bold mb-2'
                }, 'Combat Log'),
                React.createElement('div', {
                    key: 'log-entries',
                    className: 'max-h-40 overflow-y-auto'
                }, renderCombatLog())
            ])
        ])
    );
};

// Set on window object
window.ArenaInterface = ArenaInterface;
console.log('ArenaInterface component loaded successfully');