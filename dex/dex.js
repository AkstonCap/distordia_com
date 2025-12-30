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
    // Setup disconnect button (works for both Q-Wallet and native login)
    const disconnectBtn = document.getElementById('disconnectBtn');
    console.log('[Wallet] Setting up disconnect button, found:', disconnectBtn);
    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', () => {
            console.log('[Wallet] Disconnect button clicked!');
            disconnectWallet();
        });
        console.log('[Wallet] Disconnect listener attached');
    } else {
        console.warn('[Wallet] Disconnect button not found in DOM');
    }
    
    // Setup connect button event listener first
    const connectBtn = document.getElementById('connectWalletBtn');
    if (connectBtn) {
        console.log('[Wallet] Connect button found, attaching click handler');
        connectBtn.addEventListener('click', async () => {
            console.log('[Wallet] Connect button clicked');
            await connectWallet();
        });
    }
    
    // Wait for Q-Wallet to be injected (with timeout)
    const maxWaitTime = 3000; // 3 seconds
    const checkInterval = 100; // check every 100ms
    let waited = 0;
    
    while (typeof window.nexus === 'undefined' && waited < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        waited += checkInterval;
    }
    
    // Check if Q-Wallet is installed
    if (typeof window.nexus === 'undefined') {
        console.warn('Q-Wallet not detected after waiting');
        showWalletInstallPrompt();
        return;
    }

    console.log('Q-Wallet detected!');

    // Check if already connected from previous session
    try {
        const accounts = await window.nexus.getAccounts();
        if (accounts && accounts.length > 0) {
            console.log('Already connected to wallet:', accounts[0]);
            userAddress = accounts[0];
            walletConnected = true;
            updateWalletUI();
            return;
        }
    } catch (error) {
        console.log('Not connected to wallet yet:', error.message);
    }
}

// Connect to wallet
async function connectWallet() {
    console.log('[Wallet] Attempting to connect...');
    console.log('[Wallet] window.nexus exists:', typeof window.nexus !== 'undefined');
    
    if (typeof window.nexus === 'undefined') {
        alert('Q-Wallet not detected. Please install the Q-Wallet browser extension first.');
        showWalletInstallPrompt();
        return;
    }
    
    try {
        console.log('[Wallet] Calling window.nexus.connect()...');
        const accounts = await window.nexus.connect();
        console.log('[Wallet] connect() returned:', accounts);
        if (accounts && accounts.length > 0) {
            userAddress = accounts[0];
            walletConnected = true;
            console.log('[Wallet] Connected to wallet:', userAddress);
            updateWalletUI();
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
        // Call Q-Wallet disconnect method
        if (typeof window.nexus !== 'undefined') {
            await window.nexus.disconnect();
            console.log('[Wallet] Q-Wallet disconnected via API');
        }
        
        // Clear local state
        userAddress = null;
        walletConnected = false;
        
        // Update UI
        updateWalletUI();
        console.log('[Wallet] Wallet disconnected successfully');
    } catch (error) {
        console.error('[Wallet] Error disconnecting from Q-Wallet:', error);
        // Still clear local state even if API call fails
        userAddress = null;
        walletConnected = false;
        updateWalletUI();
    }
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
        const balance = await window.nexus.getBalance('default');
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
        // fetchRecentTrades will be called when a pair is selected
    ]);
    
    // Initialize trade functionality
    initializeTrade();
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
