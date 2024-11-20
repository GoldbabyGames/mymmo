const ArenaInterface = function ArenaInterface({ championData, room }) {
    const [matchState, setMatchState] = React.useState({
        phase: 'CONNECTING',
        currentLocation: '',
        statusMessage: 'Connecting to arena match...',
        eventLog: []
    });

    React.useEffect(() => {
        if (!room) return;

        room.onStateChange((state) => {
            setMatchState(prev => ({
                ...prev,
                phase: state.phase
            }));
        });

        room.onMessage("exploration-start", (message) => {
            setMatchState(prev => ({
                ...prev,
                phase: 'EXPLORATION',
                statusMessage: message.message,
                eventLog: [...prev.eventLog, "You enter the underground arena..."]
            }));
        });

        room.onMessage("position-update", (message) => {
            if (message.playerId === championData._id) {
                setMatchState(prev => ({
                    ...prev,
                    currentLocation: getTileDescription(message.tileType),
                    eventLog: [...prev.eventLog, getTileDescription(message.tileType)]
                }));
            }
        });

        return () => room.removeAllListeners();
    }, [room]);

    const getTileDescription = (tileType) => {
        const descriptions = {
            'water': "You come across a channel of murky water blocking your path.",
            'monster_den': "You discover a dark alcove. Sounds of creatures echo from within.",
            'loot_room': "You find a promising chamber that might hold valuable items.",
            'central': "You enter the arena's central chamber complex.",
            'junction': "You reach a major intersection of tunnels.",
            'regular': "You move through a standard sewer tunnel section."
        };
        return descriptions[tileType] || descriptions.regular;
    };

    return React.createElement('div', { className: 'arena-interface p-4' }, [
        React.createElement('div', { 
            key: 'status',
            className: 'text-center mb-4' 
        }, [
            React.createElement('h2', { 
                className: 'text-2xl font-bold mb-2' 
            }, 'Arena Combat'),
            React.createElement('p', { 
                className: 'text-lg' 
            }, matchState.statusMessage)
        ]),
        React.createElement('div', {
            key: 'location',
            className: 'bg-gray-800 rounded p-4 mb-4'
        }, matchState.currentLocation),
        React.createElement('div', {
            key: 'log',
            className: 'bg-gray-800 rounded p-4 max-h-60 overflow-y-auto'
        }, matchState.eventLog.map((entry, index) => 
            React.createElement('p', {
                key: index,
                className: 'mb-2'
            }, entry)
        ))
    ]);
};

window.ArenaInterface = ArenaInterface;