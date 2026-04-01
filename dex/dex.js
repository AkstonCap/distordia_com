// Main DEX initialization and coordination

// Wallet State
let walletConnected = false;
let userAddress = null;

// Initialize DEX
document.addEventListener('DOMContentLoaded', () => {
    initializeWallet();
    initializeDEX();
    setupEventListeners();
    startDataUpdates();
});

// ====================
// WALLET CONNECTION
// ====================

// Initialize wallet connection
async function initializeWallet() {
    // Setup disconnect button
    const disconnectBtn = document.getElementById('disconnectBtn');
    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', () => {
            disconnectWallet();
        });
    }

    // Setup connect button event listener
    const connectBtn = document.getElementById('connectWalletBtn');
    if (connectBtn) {
        connectBtn.addEventListener('click', async () => {
            await connectWallet();
        });
    }

    // Setup dashboard refresh buttons
    setupDashboardListeners();

    // Wait for Q-Wallet to be injected (with timeout)
    const maxWaitTime = 3000;
    const checkInterval = 100;
    let waited = 0;

    while (typeof window.qWallet === 'undefined' && waited < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        waited += checkInterval;
    }

    // Check if Q-Wallet is installed
    if (typeof window.qWallet === 'undefined') {
        console.warn('Q-Wallet not detected after waiting');
        showWalletInstallPrompt();
        return;
    }

    console.log('Q-Wallet detected!');

    // Use isLoggedIn() for pre-check if available
    try {
        if (typeof window.qWallet.isLoggedIn === 'function') {
            const loggedIn = await window.qWallet.isLoggedIn();
            console.log('[Wallet] isLoggedIn:', loggedIn);
            if (!loggedIn) {
                console.log('[Wallet] User not logged in to Q-Wallet');
                return;
            }
        }
    } catch (e) {
        console.log('[Wallet] isLoggedIn check not available');
    }

    // Use isWalletConnected() for quick reconnection
    try {
        if (typeof window.qWallet.isWalletConnected === 'function') {
            const connected = await window.qWallet.isWalletConnected();
            if (connected) {
                const accounts = await window.qWallet.getAccounts();
                if (accounts && accounts.length > 0) {
                    userAddress = accounts[0];
                    walletConnected = true;
                    updateWalletUI();
                    onWalletConnected();
                    return;
                }
            }
        }
    } catch (e) {
        console.log('[Wallet] isWalletConnected check not available');
    }

    // Fallback: check getAccounts directly
    try {
        const accounts = await window.qWallet.getAccounts();
        if (accounts && accounts.length > 0) {
            userAddress = accounts[0];
            walletConnected = true;
            updateWalletUI();
            onWalletConnected();
            return;
        }
    } catch (error) {
        console.log('Not connected to wallet yet:', error.message);
    }

    // Listen for account change events
    try {
        if (typeof window.qWallet.on === 'function') {
            window.qWallet.on('accountsChanged', (accounts) => {
                console.log('[Wallet] accountsChanged event:', accounts);
                if (accounts && accounts.length > 0) {
                    userAddress = accounts[0];
                    walletConnected = true;
                    updateWalletUI();
                    onWalletConnected();
                } else {
                    userAddress = null;
                    walletConnected = false;
                    updateWalletUI();
                    onWalletDisconnected();
                }
            });
        }
    } catch (e) {
        console.log('[Wallet] Event listener not available');
    }
}

// Connect to wallet
async function connectWallet() {
    console.log('[Wallet] Attempting to connect...');
    console.log('[Wallet] window.qWallet exists:', typeof window.qWallet !== 'undefined');
    
    if (typeof window.qWallet === 'undefined') {
        alert('Q-Wallet not detected. Please install the Q-Wallet browser extension first.');
        showWalletInstallPrompt();
        return;
    }
    
    try {
        // Connect to Q-Wallet
        console.log('[Wallet] Calling window.qWallet.connect()...');
        const accounts = await window.qWallet.connect();
        console.log('[Wallet] connect() returned:', accounts);
        if (accounts && accounts.length > 0) {
            userAddress = accounts[0];
            walletConnected = true;
            console.log('[Wallet] Connected to wallet:', userAddress);
            updateWalletUI();
            onWalletConnected();
        } else {
            console.warn('[Wallet] No accounts returned');
            alert('No accounts found. Please make sure Q-Wallet is unlocked.');
        }
    } catch (error) {
        console.error('[Wallet] Failed to connect. Error:', error);
        
        if (error.message && error.message.includes('denied')) {
            alert('Connection denied. Please approve the connection in your Q-Wallet.');
        } else if (error.message && error.message.includes('not connected')) {
            alert('Please open Q-Wallet extension and log in first.\n\n1. Click the Q-Wallet icon in your browser toolbar\n2. Enter your password to unlock the wallet\n3. Then try connecting again');
        } else {
            alert('Failed to connect to wallet.\n\nError: ' + error.message + '\n\nPlease make sure Q-Wallet is installed and unlocked.');
        }
    }
}

// Disconnect wallet
async function disconnectWallet() {
    console.log('[Wallet] Disconnecting wallet...');

    try {
        if (typeof window.qWallet !== 'undefined') {
            await window.qWallet.disconnect();
        }
    } catch (error) {
        console.error('[Wallet] Error disconnecting from Q-Wallet:', error);
    }

    userAddress = null;
    walletConnected = false;
    updateWalletUI();
    onWalletDisconnected();
}

// Update wallet UI
function updateWalletUI() {
    const connectBtn = document.getElementById('connectWalletBtn');
    const walletInfo = document.getElementById('walletInfo');
    const walletAddressEl = document.getElementById('walletAddress');

    if (walletConnected && userAddress) {
        // Show wallet info, hide connect button
        if (connectBtn) connectBtn.style.display = 'none';
        if (walletInfo) walletInfo.style.display = 'flex';
        
        // Display shortened address
        if (walletAddressEl) {
            const shortAddress = userAddress.length > 16 
                ? userAddress.substring(0, 8) + '...' + userAddress.substring(userAddress.length - 6)
                : userAddress;
            walletAddressEl.textContent = shortAddress;
            walletAddressEl.title = userAddress; // Show full address on hover
        }
        
        // Update trade button visibility
        if (typeof updateTradeButtonVisibility === 'function') {
            updateTradeButtonVisibility();
        }
        
        // Update trading panel overlay
        if (typeof updateTradingPanelOverlay === 'function') {
            updateTradingPanelOverlay();
        }
    } else {
        // Show connect button, hide wallet info
        if (connectBtn) {
            connectBtn.style.display = 'block';
            // Reset button text in case it was changed to "Install Q-Wallet"
            if (connectBtn.textContent === 'Install Q-Wallet') {
                connectBtn.textContent = 'Connect Wallet';
            }
        }
        if (walletInfo) walletInfo.style.display = 'none';
        
        // Update trade button visibility
        if (typeof updateTradeButtonVisibility === 'function') {
            updateTradeButtonVisibility();
        }
        
        // Update trading panel overlay
        if (typeof updateTradingPanelOverlay === 'function') {
            updateTradingPanelOverlay();
        }
    }
}

// Show wallet install prompt
function showWalletInstallPrompt() {
    const connectBtn = document.getElementById('connectWalletBtn');
    if (connectBtn) {
        connectBtn.textContent = 'Install Q-Wallet';
        connectBtn.addEventListener('click', () => {
            window.open('https://github.com/AkstonCap/q-wallet', '_blank');
        });
    }
}

// Get wallet balance
async function getWalletBalance() {
    if (!walletConnected) {
        console.warn('Wallet not connected');
        return null;
    }

    try {
        const balance = await window.qWallet.getBalance('default');
        console.log('Wallet balance:', balance, 'NXS');
        return balance;
    } catch (error) {
        console.error('Failed to get balance:', error);
        return null;
    }
}

// Initialize DEX
async function initializeDEX() {
    showLoadingState();
    await Promise.all([
        fetchNetworkStats(),
        fetchMarketPairs()
    ]);

    // Initialize trade functionality
    initializeTrade();

    // Update header stats from market data
    updateHeaderStats();
}

// Show loading indicators
function showLoadingState() {
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
        // Refresh user dashboard if connected
        if (walletConnected) {
            refreshUserDashboard();
        }
        updateHeaderStats();
    }, 50000);
}

// ====================
// DASHBOARD & PORTFOLIO
// ====================

// Called when wallet connects
function onWalletConnected() {
    console.log('[Dashboard] Wallet connected, loading dashboard');
    showUserDashboard();
    refreshUserDashboard();
}

// Called when wallet disconnects
function onWalletDisconnected() {
    console.log('[Dashboard] Wallet disconnected, hiding dashboard');
    hideUserDashboard();
}

// Show user dashboard section
function showUserDashboard() {
    const dashboard = document.getElementById('user-dashboard');
    if (dashboard) {
        dashboard.style.display = 'block';
    }
}

// Hide user dashboard section
function hideUserDashboard() {
    const dashboard = document.getElementById('user-dashboard');
    if (dashboard) {
        dashboard.style.display = 'none';
    }
}

// Refresh all user dashboard data
async function refreshUserDashboard() {
    if (!walletConnected) return;

    await Promise.all([
        loadPortfolio(),
        loadMyOrders(),
        loadMyHistory()
    ]);
}

// Load portfolio balances using getAllBalances or listAccounts
async function loadPortfolio() {
    if (!walletConnected || typeof window.qWallet === 'undefined') return;

    try {
        let accounts;

        // Prefer getAllBalances() if available for comprehensive view
        if (typeof window.qWallet.getAllBalances === 'function') {
            accounts = await window.qWallet.getAllBalances();
        } else if (typeof window.qWallet.listAccounts === 'function') {
            accounts = await window.qWallet.listAccounts();
        } else {
            // Fallback to basic balance
            const balance = await window.qWallet.getBalance('default');
            accounts = [{ name: 'default', ticker: 'NXS', balance: balance }];
        }

        renderPortfolio(accounts);
    } catch (error) {
        console.error('[Portfolio] Error loading portfolio:', error);
        const grid = document.getElementById('portfolio-grid');
        if (grid) {
            grid.innerHTML = '<div class="portfolio-empty">Failed to load balances</div>';
        }
    }
}

// Load user's open orders
async function loadMyOrders() {
    if (!walletConnected) return;

    try {
        const orders = await fetchUserOrders();
        renderMyOrders(orders);
    } catch (error) {
        console.error('[MyOrders] Error:', error);
    }
}

// Load user's trade history
async function loadMyHistory() {
    if (!walletConnected) return;

    try {
        const history = await fetchUserExecuted();
        renderMyHistory(history);
    } catch (error) {
        console.error('[MyHistory] Error:', error);
    }
}

// Handle cancel order button click
async function handleCancelOrder(txid) {
    if (!txid) {
        showNotification('No order ID available', 'error');
        return;
    }

    // Find and disable the button
    const buttons = document.querySelectorAll('.cancel-order-btn');
    let targetBtn = null;
    buttons.forEach(btn => {
        if (btn.getAttribute('onclick').includes(txid)) {
            targetBtn = btn;
        }
    });

    if (targetBtn) {
        targetBtn.disabled = true;
        targetBtn.textContent = 'Canceling...';
    }

    try {
        await cancelOrder(txid);
        showNotification('Order canceled successfully', 'success');

        // Refresh orders and order book
        await loadMyOrders();
        if (currentPair) {
            loadOrderBook(currentPair);
        }
    } catch (error) {
        console.error('[Cancel] Error:', error);
        showNotification('Failed to cancel order: ' + error.message, 'error');
        if (targetBtn) {
            targetBtn.disabled = false;
            targetBtn.textContent = 'Cancel';
        }
    }
}

// Setup dashboard refresh button listeners
function setupDashboardListeners() {
    const refreshPortfolioBtn = document.getElementById('refresh-portfolio-btn');
    const refreshOrdersBtn = document.getElementById('refresh-orders-btn');
    const refreshHistoryBtn = document.getElementById('refresh-history-btn');

    if (refreshPortfolioBtn) {
        refreshPortfolioBtn.addEventListener('click', async () => {
            refreshPortfolioBtn.classList.add('spinning');
            await loadPortfolio();
            setTimeout(() => refreshPortfolioBtn.classList.remove('spinning'), 800);
        });
    }

    if (refreshOrdersBtn) {
        refreshOrdersBtn.addEventListener('click', async () => {
            refreshOrdersBtn.classList.add('spinning');
            await loadMyOrders();
            setTimeout(() => refreshOrdersBtn.classList.remove('spinning'), 800);
        });
    }

    if (refreshHistoryBtn) {
        refreshHistoryBtn.addEventListener('click', async () => {
            refreshHistoryBtn.classList.add('spinning');
            await loadMyHistory();
            setTimeout(() => refreshHistoryBtn.classList.remove('spinning'), 800);
        });
    }
}

// Update header market stats
function updateHeaderStats() {
    // Active markets count
    const activeMarketsEl = document.getElementById('stat-active-markets');
    if (activeMarketsEl && marketData.pairs) {
        const activeCount = marketData.pairs.filter(p => p.price > 0).length;
        activeMarketsEl.textContent = `${activeCount} / ${marketData.pairs.length}`;
    }

    // 24h volume (sum across all pairs)
    const volumeEl = document.getElementById('stat-24h-volume');
    if (volumeEl && marketData.pairs) {
        const totalVolume = marketData.pairs.reduce((sum, p) => sum + (p.volume24h || 0), 0);
        if (totalVolume > 0) {
            volumeEl.textContent = formatNumber(totalVolume);
        } else {
            volumeEl.textContent = '-';
        }
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
});
