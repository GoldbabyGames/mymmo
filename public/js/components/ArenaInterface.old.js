const ArenaInterface = ({ championData }) => {
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

    // Connect to arena on component mount
    React.useEffect(() => {
        let mounted = true;

        async function connectToArena() {
            try {
                console.log('Connecting to arena with champion:', championData);
                const client = new Colyseus.Client('ws://localhost:2567');
                
                const room = await client.joinOrCreate("arena_room", {
                    championData: championData
                });
                
                // Only update state if component is still mounted
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

                room.onError((code, message) => {
                    console.error("Room error:", code, message);
                    if (!mounted) return;
                    setMatchState(prev => ({
                        ...prev,
                        statusMessage: `Error: ${message}`,
                        phase: 'ERROR'
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

        // Cleanup function
        return () => {
            mounted = false;
            if (roomRef.current) {
                console.log('Leaving arena room');
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

    // Rest of the component implementation...
    return (
        <div className="arena-interface">
            <div className="text-center p-4">
                <h2 className="text-2xl font-bold">Arena Combat</h2>
                <p className="mt-2">{matchState.statusMessage}</p>
                
                {matchState.phase === 'COMBAT' && (
                    <div className="stance-controls mt-4">
                        <h3 className="text-lg font-bold mb-2">Combat Stance</h3>
                        <div className="flex gap-2 justify-center">
                            {['neutral', 'aggressive', 'defensive'].map(stance => (
                                <button
                                    key={stance}
                                    onClick={() => handleStanceChange(stance)}
                                    className={`px-4 py-2 rounded ${
                                        selectedStance === stance 
                                        ? 'bg-blue-600 text-white' 
                                        : 'bg-gray-600 hover:bg-gray-500'
                                    }`}
                                >
                                    {stance.charAt(0).toUpperCase() + stance.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {matchState.champions.length > 0 && (
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        {matchState.champions.map(champion => (
                            <div key={champion.id} className="champion-card p-4 rounded bg-gray-800">
                                <h3 className="text-lg font-bold">{champion.name}</h3>
                                <p>Health: {champion.currentHealth}/{champion.maxHealth}</p>
                                <p>Stance: {champion.stance}</p>
                            </div>
                        ))}
                    </div>
                )}

                <div className="combat-log mt-4 bg-gray-800 rounded-lg p-4">
                    <h3 className="text-lg font-bold mb-2">Combat Log</h3>
                    <div className="max-h-40 overflow-y-auto">
                        {matchState.combatLog.map((entry, index) => (
                            <p key={index} className="text-sm mb-1">
                                {entry.type === "damage" 
                                    ? `${entry.detail.attackerName} dealt ${entry.detail.damageDealt} damage to ${entry.detail.defenderName}`
                                    : `${entry.championId} changed stance to ${entry.stance}`
                                }
                            </p>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Make it available globally
if (typeof window !== 'undefined') {
    window.ArenaInterface = ArenaInterface;
}

export default ArenaInterface;