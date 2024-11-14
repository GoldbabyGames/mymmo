// public/js/components/ChampionConfirmationModal.js

// Global component for browser use
const ChampionConfirmationModal = ({ 
    currentChampion, 
    newChampion, 
    hireCost, 
    onConfirm, 
    onCancel 
}) => {
    return React.createElement('div', {
        className: 'modal-overlay'
    }, 
        React.createElement('div', {
            className: 'confirmation-modal'
        }, [
            React.createElement('div', {
                className: 'modal-header',
                key: 'header'
            }, 
                React.createElement('h2', null, 'Replace Champion?')
            ),
            React.createElement('div', {
                className: 'modal-content',
                key: 'content'
            }, [
                React.createElement('div', {
                    className: 'alert warning',
                    key: 'alert'
                }, 
                    React.createElement('p', null, 
                        'Hiring a new champion will permanently dismiss your current champion. This action cannot be undone.'
                    )
                ),
                React.createElement('div', {
                    className: 'champion-comparison',
                    key: 'comparison'
                }, [
                    createChampionCard('Current Champion', currentChampion, 'current'),
                    createChampionCard('New Champion', newChampion, 'new')
                ]),
                React.createElement('p', {
                    className: 'hire-cost',
                    key: 'cost'
                }, `Hiring Cost: ${hireCost} Gold`),
                React.createElement('div', {
                    className: 'modal-actions',
                    key: 'actions'
                }, [
                    React.createElement('button', {
                        className: 'button secondary',
                        onClick: onCancel,
                        key: 'cancel'
                    }, 'Cancel'),
                    React.createElement('button', {
                        className: 'button primary',
                        onClick: onConfirm,
                        key: 'confirm'
                    }, 'Confirm Replacement')
                ])
            ])
        ])
    );
};

// Helper function to create champion cards
function createChampionCard(title, champion, key) {
    return React.createElement('div', {
        className: 'champion-card',
        key: key
    }, [
        React.createElement('h3', { key: 'title' }, title),
        React.createElement('p', { 
            className: 'champion-name',
            key: 'name'
        }, champion.name),
        createStatGroup('Physical Stats', champion.physical, 'physical'),
        createStatGroup('Mental Stats', champion.mental, 'mental')
    ]);
}

// Helper function to create stat groups
function createStatGroup(title, stats, key) {
    return React.createElement('div', {
        className: 'stat-group',
        key: key
    }, [
        React.createElement('h4', { key: 'title' }, title),
        ...Object.entries(stats).map(([statName, statValue]) => 
            React.createElement('p', { key: statName }, 
                `${statName.charAt(0).toUpperCase() + statName.slice(1)}: ${statValue.current}`
            )
        )
    ]);
}

// Helper function to create and manage modal roots
function showChampionModal(props) {
    const container = document.createElement('div');
    container.id = 'champion-modal-container';
    document.body.appendChild(container);
    
    const root = ReactDOM.createRoot(container);
    
    const cleanup = () => {
        root.unmount();
        container.remove();
    };
    
    root.render(
        React.createElement(ChampionConfirmationModal, {
            ...props,
            onConfirm: () => {
                props.onConfirm();
                cleanup();
            },
            onCancel: () => {
                props.onCancel();
                cleanup();
            }
        })
    );
    
    return cleanup;
}

// Make components available globally
if (typeof window !== 'undefined') {
    window.ChampionConfirmationModal = ChampionConfirmationModal;
    window.showChampionModal = showChampionModal;
}