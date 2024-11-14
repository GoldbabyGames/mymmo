// public/js/components/ChampionConfirmationModal.js

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
                    // Current Champion Card
                    React.createElement('div', {
                        className: 'champion-card',
                        key: 'current'
                    }, [
                        React.createElement('h3', { key: 'title' }, 'Current Champion'),
                        React.createElement('p', { 
                            className: 'champion-name',
                            key: 'name'
                        }, currentChampion.name),
                        createStatGroup('Physical Stats', currentChampion.physical, 'physical'),
                        createStatGroup('Mental Stats', currentChampion.mental, 'mental')
                    ]),
                    // New Champion Card
                    React.createElement('div', {
                        className: 'champion-card',
                        key: 'new'
                    }, [
                        React.createElement('h3', { key: 'title' }, 'New Champion'),
                        React.createElement('p', { 
                            className: 'champion-name',
                            key: 'name'
                        }, newChampion.name),
                        createStatGroup('Physical Stats', newChampion.physical, 'physical'),
                        createStatGroup('Mental Stats', newChampion.mental, 'mental')
                    ])
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

// Make it available globally
if (typeof window !== 'undefined') {
    window.ChampionConfirmationModal = ChampionConfirmationModal;
}