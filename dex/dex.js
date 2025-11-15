// Main DEX initialization and coordination

// Initialize DEX
document.addEventListener('DOMContentLoaded', () => {
    initializeDEX();
    setupEventListeners();
    startDataUpdates();
});

// Initialize DEX
async function initializeDEX() {
    showLoadingState();
    await Promise.all([
        fetchNetworkStats(),
        fetchMarketPairs()
        // fetchRecentTrades will be called when a pair is selected
    ]);
}

// Show loading indicators
function showLoadingState() {
    // Show loading indicators
    const pairsList = document.getElementById('pairs-list');
    if (pairsList) {
        pairsList.innerHTML = '<div class="loading">Loading market pairs...</div>';
    }
}

// Start periodic data updates
function startDataUpdates() {
    // Update every 50 seconds
    updateInterval = setInterval(() => {
        fetchNetworkStats();
        if (currentPair) {
            loadOrderBook(currentPair);
            fetchRecentTrades(currentPair.pair);
        }
    }, 50000);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
});
