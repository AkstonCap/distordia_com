// Q-Wallet Authentication Handler for Distordia Social

// Check if Q-Wallet extension is installed
function isQWalletInstalled() {
    return typeof window.nexus !== 'undefined';
}

// Listen for Q-Wallet events
if (isQWalletInstalled()) {
    // Listen for account changes
    window.nexus.on('accountsChanged', (accounts) => {
        console.log('Accounts changed:', accounts);
        if (accounts && accounts.length > 0) {
            const address = accounts[0];
            sessionStorage.setItem('nexus_genesis', address);
            updateWalletUI(address);
        } else {
            disconnectWallet();
        }
    });
    
    // Listen for disconnection
    window.nexus.on('disconnect', () => {
        console.log('Wallet disconnected');
        disconnectWallet();
    });
}

// Verify session is still valid
async function verifySession() {
    const session = sessionStorage.getItem('nexus_session');
    const genesis = sessionStorage.getItem('nexus_genesis');
    
    if (!session || !genesis) {
        return false;
    }
    
    try {
        // Try to make a simple authenticated request
        const response = await fetch('https://nexus.io:8080/users/get/status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session: session
            })
        });
        
        const data = await response.json();
        return !data.error;
    } catch (error) {
        console.error('Session verification failed:', error);
        return false;
    }
}

// Auto-reconnect if session exists
document.addEventListener('DOMContentLoaded', async () => {
    const connected = sessionStorage.getItem('nexus_connected') === 'true';
    
    if (connected) {
        const isValid = await verifySession();
        if (!isValid) {
            // Session expired, clear storage
            disconnectWallet();
        }
    }
});
