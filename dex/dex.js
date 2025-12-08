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
    // 1. Check if Q-Wallet is installed
    if (typeof window.nexus === 'undefined') {
        console.warn('Q-Wallet not detected');
        showWalletInstallPrompt();
        return;
    }

    console.log('Q-Wallet detected!');

    // 2. Check if already connected
    try {
        const accounts = await window.nexus.getAccounts();
        if (accounts.length > 0) {
            console.log('Already connected to wallet:', accounts[0]);
            userAddress = accounts[0];
            walletConnected = true;
            updateWalletUI();
            return;
        }
    } catch (error) {
        console.log('Not connected to wallet yet');
    }

    // 3. Setup connect button event listener
    const connectBtn = document.getElementById('connectWalletBtn');
    if (connectBtn) {
        connectBtn.addEventListener('click', async () => {
            console.log('Connect button clicked');
            console.log('window.nexus exists:', typeof window.nexus !== 'undefined');
            try {
                console.log('Calling window.nexus.connect()...');
                const accounts = await window.nexus.connect();
                console.log('connect() returned:', accounts);
                if (accounts && accounts.length > 0) {
                    userAddress = accounts[0];
                    walletConnected = true;
                    console.log('Connected to wallet:', userAddress);
                    updateWalletUI();
                } else {
                    console.warn('No accounts returned');
                    alert('No accounts found. Please make sure Q-Wallet is unlocked.');
                }
            } catch (error) {
                console.error('Failed to connect wallet. Error type:', typeof error);
                console.error('Error:', error);
                console.error('Error message:', error.message);
                console.error('Error stack:', error.stack);
                
                if (error.message && error.message.includes('denied')) {
                    alert('Connection denied. Please approve the connection in your Q-Wallet.');
                } else if (error.message && error.message.includes('not connected')) {
                    alert('Please open Q-Wallet extension and log in first.\n\n1. Click the Q-Wallet icon in your browser toolbar\n2. Enter your password to unlock the wallet\n3. Then try connecting again');
                } else {
                    alert('Failed to connect to wallet.\n\nError: ' + error.message + '\n\nPlease make sure Q-Wallet is installed and unlocked.');
                }
            }
        });
    }

    // Setup disconnect button
    const disconnectBtn = document.getElementById('disconnectBtn');
    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', disconnectWallet);
    }
}

// Disconnect wallet
function disconnectWallet() {
    userAddress = null;
    walletConnected = false;
    
    updateWalletUI();
    console.log('Wallet disconnected');
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
        updateTradeButtonVisibility();
    } else {
        // Show connect button, hide wallet info
        if (connectBtn) connectBtn.style.display = 'block';
        if (walletInfo) walletInfo.style.display = 'none';
        
        // Update trade button visibility
        updateTradeButtonVisibility();
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
