// Q-Wallet Authentication Handler for Distordia Social

// Check if Q-Wallet extension is installed
function isQWalletInstalled() {
    return typeof window.qWallet !== 'undefined';
}

// Setup Q-Wallet event listeners (call this after Q-Wallet is detected)
function setupQWalletListeners() {
    if (!isQWalletInstalled()) {
        return;
    }
    
    // Listen for account changes
    window.qWallet.on('accountsChanged', (accounts) => {
        console.log('Accounts changed:', accounts);
        if (accounts && accounts.length > 0) {
            const address = accounts[0];
            sessionStorage.setItem('nexus_genesis', address);
            if (typeof updateWalletUI === 'function') {
                updateWalletUI(address);
            }
        } else {
            if (typeof disconnectWallet === 'function') {
                disconnectWallet();
            }
        }
    });
    
    // Listen for disconnection
    window.qWallet.on('disconnect', () => {
        console.log('Wallet disconnected');
        if (typeof disconnectWallet === 'function') {
            disconnectWallet();
        }
    });
    
    console.log('[Auth] Q-Wallet event listeners setup complete');
}

// Wait for Q-Wallet and setup listeners
async function initializeQWallet() {
    const maxWaitTime = 3000;
    const checkInterval = 100;
    let waited = 0;
    
    while (!isQWalletInstalled() && waited < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        waited += checkInterval;
    }
    
    if (isQWalletInstalled()) {
        setupQWalletListeners();
    }
}

// Auto-initialize Q-Wallet listeners when DOM loads
document.addEventListener('DOMContentLoaded', async () => {
    await initializeQWallet();
});
