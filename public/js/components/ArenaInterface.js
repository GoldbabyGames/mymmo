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
                const tileDesc = getTileDescription(message.tileType);
                setMatchState(prev => ({
                    ...prev,
                    currentLocation: tileDesc,
                    eventLog: [...prev.eventLog, tileDesc]
                }));
            }
        });
		
		room.onMessage("player-joined", (message) => {
			setMatchState(prev => ({
				...prev,
				eventLog: [...prev.eventLog, `${message.name} has joined the arena`]
			}));
		});

		room.onMessage("combat-start", (message) => {
			setMatchState(prev => ({
				...prev,
				phase: 'COMBAT',
				eventLog: [...prev.eventLog, 'Combat has begun!']
			}));
		});
		

        return () => room.removeAllListeners();
    }, [room, championData._id]);

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

    return React.createElement('div', { 
        className: 'arena-interface p-4 bg-gray-900 rounded-lg' 
    }, [
        // Header Section
        React.createElement('div', { 
            key: 'header',
            className: 'text-center mb-4' 
        }, [
            React.createElement('h2', { 
                key: 'title',
                className: 'text-2xl font-bold mb-2 text-blue-400' 
            }, 'Arena Combat'),
            React.createElement('p', { 
                key: 'status',
                className: 'text-lg text-gray-300' 
            }, matchState.statusMessage)
        ]),
        
        // Current Location Section
        React.createElement('div', {
            key: 'location',
            className: 'bg-gray-800 rounded p-4 mb-4 text-gray-300'
        }, matchState.currentLocation || 'Awaiting location update...'),
        
        // Event Log Section
        React.createElement('div', {
            key: 'log-container',
            className: 'bg-gray-800 rounded p-4 max-h-60 overflow-y-auto'
        }, [
            React.createElement('h3', {
                key: 'log-title',
                className: 'text-lg font-semibold mb-2 text-blue-400'
            }, 'Event Log'),
            ...matchState.eventLog.map((entry, index) => 
                React.createElement('p', {
                    key: `log-${index}`,
                    className: 'mb-2 text-gray-300'
                }, entry)
            )
        ])
    ]);
};

// Make component available globally
window.ArenaInterface = ArenaInterface;