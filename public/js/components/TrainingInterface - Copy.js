console.log('Loading TrainingInterface component...');

const TrainingInterface = function TrainingInterface({ facilityLevel }) {
    const [trainingState, setTrainingState] = React.useState({
        isTraining: false,
        timeRemaining: 0,
        trainingCost: 0,
        canAffordTraining: false
    });
    
    const [trainingResults, setTrainingResults] = React.useState(null);

    // Calculate training cost based on champion level and check if affordable
    React.useEffect(() => {
        if (window.gameClient?.currentChampion) {
            const championLevel = window.gameClient.currentChampion.level;
            const trainingCost = championLevel * 100;
            const currentGold = window.gameClient.currentOutfit?.gold || 0;
            
            console.log('Training cost calculation:', {
                championLevel,
                trainingCost,
                currentGold,
                canAfford: currentGold >= trainingCost
            });

            setTrainingState(prev => ({
                ...prev,
                trainingCost,
                canAffordTraining: currentGold >= trainingCost
            }));
        }
    }, []);

    const formatTimeRemaining = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleStartTraining = () => {
        if (window.gameClient) {
            console.log('Starting training session');
            window.gameClient.socket.emit('start-training', {
                championId: window.gameClient.currentChampion._id,
                outfitId: window.gameClient.currentOutfit._id
            });
        }
    };

    React.useEffect(() => {
        if (window.gameClient?.socket) {
            window.gameClient.socket.on('training-started', (data) => {
                console.log('Training started:', data);
                setTrainingState(prev => ({
                    ...prev,
                    isTraining: true,
                    timeRemaining: 3600,
                }));
                setTrainingResults(null);
            });

            window.gameClient.socket.on('training-complete', (data) => {
                console.log('Training completed:', data);
                setTrainingState(prev => ({
                    ...prev,
                    isTraining: false,
                    timeRemaining: 0
                }));
                setTrainingResults({
                    improvements: data.improvements,
                    messages: data.messages
                });

                if (data.champion && window.gameClient.updateChampionDisplay) {
                    window.gameClient.updateChampionDisplay(data.champion);
                }
            });

            window.gameClient.socket.on('error', (error) => {
                console.error('Training error received:', error);
                setTrainingState(prev => ({
                    ...prev,
                    isTraining: false,
                    error: error.message
                }));
            });

            return () => {
                window.gameClient.socket.off('training-started');
                window.gameClient.socket.off('training-complete');
                window.gameClient.socket.off('error');
            };
        }
    }, []);

    // Timer effect
    React.useEffect(() => {
        let timer;
        if (trainingState.isTraining && trainingState.timeRemaining > 0) {
            timer = setInterval(() => {
                setTrainingState(prev => ({
                    ...prev,
                    timeRemaining: prev.timeRemaining - 1
                }));
            }, 1000);
        }

        return () => {
            if (timer) clearInterval(timer);
        };
    }, [trainingState.isTraining, trainingState.timeRemaining]);

    return React.createElement('div', { className: 'training-ground-content' }, [
        React.createElement('h2', { key: 'title' }, `Training Ground: Level ${facilityLevel}`),
        
        React.createElement('div', { 
            key: 'content',
            className: 'p-4 bg-gray-800 rounded-lg mt-4' 
        }, 
            trainingState.isTraining ? 
                React.createElement('div', { className: 'space-y-4' }, 
                    React.createElement('div', { className: 'bg-gray-700 p-4 rounded-lg' }, [
                        React.createElement('h3', { 
                            key: 'training-title',
                            className: 'text-lg font-semibold mb-2' 
                        }, 'Training in Progress'),
                        React.createElement('p', { 
                            key: 'timer',
                            className: 'text-2xl font-mono' 
                        }, formatTimeRemaining(trainingState.timeRemaining))
                    ])
                ) :
                React.createElement('div', { className: 'space-y-4' },
                    trainingResults ?
                        React.createElement('div', { className: 'bg-gray-700 p-4 rounded-lg' }, [
                            React.createElement('h3', { 
                                key: 'results-title',
                                className: 'text-lg font-semibold mb-2' 
                            }, 'Training Results'),
                            ...Object.entries(trainingResults.improvements).map(([stat, data]) =>
                                React.createElement('p', { 
                                    key: `stat-${stat}`,
                                    className: 'text-green-400' 
                                }, `${stat} +${data.amount} (New value: ${data.newValue})`)
                            ),
                            ...(trainingResults.messages || []).map((message, index) =>
                                React.createElement('p', { 
                                    key: `msg-${index}`,
                                    className: 'text-yellow-400 mt-2' 
                                }, message)
                            ),
                            React.createElement('button', {
                                key: 'new-session',
                                onClick: () => setTrainingResults(null),
                                className: 'button mt-4 w-full p-2 bg-blue-600 hover:bg-blue-700 rounded-lg'
                            }, 'Start New Training Session')
                        ]) :
                        [
                            React.createElement('p', { 
                                key: 'instruction',
                                className: 'text-sm' 
                            }, 'Start training to improve your champion\'s attributes'),
                            React.createElement('button', {
                                key: 'start-training',
                                onClick: handleStartTraining,
                                disabled: !trainingState.canAffordTraining,
                                className: `button w-full p-2 rounded-lg ${
                                    trainingState.canAffordTraining 
                                        ? 'bg-blue-600 hover:bg-blue-700' 
                                        : 'bg-gray-600 cursor-not-allowed'
                                }`
                            }, `Start Training (${trainingState.trainingCost} Gold)`)
                        ]
                )
        )
    ]);
};

// Expose to window object
window.TrainingInterface = TrainingInterface;
console.log('TrainingInterface loaded:', !!window.TrainingInterface);