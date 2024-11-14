// public/js/components/ArenaInterface.js
const ArenaInterface = ({ roomId, championData }) => {
    // Initialize useState hooks first
    const [matchState, setMatchState] = React.useState({
        phase: 'WAITING',
        currentRound: 0,
        timeRemaining: 0,
        champions: [],
        combatLog: []
    });
    const [selectedStance, setSelectedStance] = React.useState('neutral');

    // Effect hook for room connection
    React.useEffect(() => {
        console.log('Setting up arena connection for room:', roomId);
        let room = null;

        const connectToRoom = async () => {
            try {
                room = await window.colyseusClient.joinArenaRoom(roomId, {
                    championId: championData._id,
                    championData: championData
                });

                console.log('Connected to arena room');

                room.onStateChange((state) => {
                    console.log('Room state updated:', state);
                    setMatchState(prevState => ({
                        ...prevState,
                        phase: state.phase,
                        currentRound: state.roundNumber,
                        champions: Array.from(state.champions.values()),
                        timeRemaining: Math.max(0, 10 - Math.floor((Date.now() - state.roundStartTime) / 1000))
                    }));
                });

                room.onMessage("combat-update", (message) => {
                    console.log('Combat update received:', message);
                    setMatchState(prevState => ({
                        ...prevState,
                        combatLog: [...prevState.combatLog, message.action]
                    }));
                });

            } catch (error) {
                console.error('Error connecting to arena room:', error);
            }
        };

        connectToRoom();

        return () => {
            if (room) {
                console.log('Leaving arena room');
                room.leave();
            }
        };
    }, [roomId, championData]);

    // Handler functions
    const handleStanceChange = (newStance) => {
        console.log('Changing stance to:', newStance);
        setSelectedStance(newStance);
        window.gameSocket.emit('set-stance', {
            roomId: roomId,
            stance: newStance
        });
    };

    // Render functions
    const renderChampionStatus = (champion) => {
        if (!champion) return null;
        
        const isCurrentChampion = champion.id === championData._id;
        return (
            <div key={champion.id} className={`champion-status ${isCurrentChampion ? 'current' : 'opponent'}`}>
                <h3 className="text-xl font-bold mb-2">{champion.name}</h3>
                <div className="health-bar">
                    <div 
                        className="health-fill" 
                        style={{
                            width: `${(champion.currentHealth / champion.maxHealth) * 100}%`,
                            backgroundColor: isCurrentChampion ? '#4ade80' : '#ef4444'
                        }}
                    />
                </div>
                <p className="mt-2">Health: {champion.currentHealth}/{champion.maxHealth}</p>
                <p>Stance: {champion.stance}</p>
            </div>
        );
    };

    const renderCombatLog = () => (
        <div className="combat-log mt-4 p-4 bg-gray-800 rounded max-h-40 overflow-y-auto">
            <h3 className="text-lg font-bold mb-2">Combat Log</h3>
            {matchState.combatLog.map((action, index) => (
                <p key={index} className="text-sm">
                    {`${action.type}: ${action.sourceId} → ${action.targetId} (${action.value})`}
                </p>
            ))}
        </div>
    );

    // Main render with null checks
    if (!matchState) return <div>Loading...</div>;

    return (
        <div className="arena-interface p-4">
            <div className="mb-4 text-center">
                <h2 className="text-2xl font-bold">
                    Arena Match - Round {matchState.currentRound}
                </h2>
                {matchState.phase === 'COMBAT' && (
                    <p className="text-xl mt-2">
                        Time Remaining: {Math.floor(matchState.timeRemaining / 60)}:
                        {(matchState.timeRemaining % 60).toString().padStart(2, '0')}
                    </p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                {matchState.champions.map(champion => renderChampionStatus(champion))}
            </div>

            {matchState.phase === 'COMBAT' && (
                <div className="mt-4">
                    <h3 className="text-lg font-bold mb-2">Combat Stance</h3>
                    <div className="flex gap-2">
                        {['neutral', 'aggressive', 'defensive'].map(stance => (
                            <button
                                key={stance}
                                className={`px-4 py-2 rounded ${
                                    selectedStance === stance 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-gray-600 text-gray-200'
                                }`}
                                onClick={() => handleStanceChange(stance)}
                            >
                                {stance.charAt(0).toUpperCase() + stance.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {renderCombatLog()}
        </div>
    );
};

// Make it available globally
if (typeof window !== 'undefined') {
    window.ArenaInterface = ArenaInterface;
}