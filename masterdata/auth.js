/**
 * Q-Wallet Authentication Module
 * Handles wallet connection and authentication for the Product Catalogue
 */

class WalletAuth {
    constructor() {
        this.connected = false;
        this.account = null;
        this.initEventListeners();
        this.checkConnection();
    }

    initEventListeners() {
        const connectBtn = document.getElementById('connectWalletBtn');
        const disconnectBtn = document.getElementById('disconnectBtn');

        if (connectBtn) {
            connectBtn.addEventListener('click', () => this.connect());
        }

        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', () => this.disconnect());
        }
    }

    async checkConnection() {
        // Wait for Q-Wallet to be injected (with timeout)
        const maxWaitTime = 3000;
        const checkInterval = 100;
        let waited = 0;
        
        while (typeof window.qWallet === 'undefined' && waited < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            waited += checkInterval;
        }
        
        // Check if Q-Wallet extension is installed
        if (typeof window.qWallet === 'undefined') {
            console.log('Q-Wallet extension not installed after waiting');
            return false;
        }

        try {
            // Check if already connected
            const accounts = await window.qWallet.getAccounts();
            if (accounts && accounts.length > 0) {
                this.account = accounts[0];
                this.connected = true;
                this.updateUI();
                this.onConnectionChange(true);
                console.log('Already connected to wallet:', accounts[0]);
                return true;
            }
        } catch (error) {
            console.error('Error checking connection:', error);
        }

        return false;
    }

    async connect() {
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
            this.showError('Q-Wallet extension not found. Please install Q-Wallet to continue.');
            return false;
        }

        try {
            // Request connection with fee (1 DIST for 24 hours)
            const feeConfig = {
                tokenName: 'DIST',
                amount: 1,
                recipientAddress: 'DIST',
                validitySeconds: 24 * 60 * 60 // 24 hours
            };
            
            const accounts = await window.qWallet.connectWithFee(feeConfig);
            
            if (accounts && accounts.length > 0) {
                this.account = accounts[0];
                this.connected = true;
                this.updateUI();
                this.onConnectionChange(true);
                this.showSuccess('Wallet connected successfully!');
                console.log('Wallet connected:', accounts[0]);
                return true;
            }
        } catch (error) {
            console.error('Connection failed:', error);
            if (error.message && error.message.includes('denied')) {
                this.showError('Connection denied. Please approve the connection in Q-Wallet.');
            } else {
                this.showError('Failed to connect wallet. Please try again.');
            }
            return false;
        }

        return false;
    }

    async disconnect() {
        console.log('Disconnecting wallet...');
        
        try {
            // Call Q-Wallet disconnect method
            if (typeof window.qWallet !== 'undefined' && window.qWallet.disconnect) {
                await window.qWallet.disconnect();
                console.log('Q-Wallet disconnected via API');
            }
        } catch (error) {
            console.error('Error disconnecting from Q-Wallet:', error);
        }
        
        // Clear local state
        this.connected = false;
        this.account = null;
        this.updateUI();
        this.onConnectionChange(false);
        this.showInfo('Wallet disconnected');
    }

    updateUI() {
        const connectBtn = document.getElementById('connectWalletBtn');
        const walletInfo = document.getElementById('walletInfo');
        const walletAddress = document.getElementById('walletAddress');
        const addProductBtn = document.getElementById('addProductBtn');

        if (this.connected && this.account) {
            // Show wallet info, hide connect button
            if (connectBtn) connectBtn.style.display = 'none';
            if (walletInfo) walletInfo.style.display = 'flex';
            
            // Display shortened address
            const shortAddress = this.shortenAddress(this.account);
            if (walletAddress) walletAddress.textContent = shortAddress;

            // Show add product button
            if (addProductBtn) addProductBtn.style.display = 'flex';
        } else {
            // Show connect button, hide wallet info
            if (connectBtn) connectBtn.style.display = 'block';
            if (walletInfo) walletInfo.style.display = 'none';
            if (addProductBtn) addProductBtn.style.display = 'none';
        }
    }

    shortenAddress(address) {
        if (!address || address.length < 16) return address;
        return `${address.substring(0, 8)}...${address.substring(address.length - 6)}`;
    }

    async getBalance() {
        if (!this.connected) return null;

        try {
            const balance = await window.qWallet.getBalance('default');
            return balance;
        } catch (error) {
            console.error('Error getting balance:', error);
            return null;
        }
    }

    onConnectionChange(connected) {
        // Emit custom event for other modules
        window.dispatchEvent(new CustomEvent('walletConnectionChange', {
            detail: { connected, account: this.account }
        }));
    }

    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    showError(message) {
        this.showAlert(message, 'error');
    }

    showInfo(message) {
        this.showAlert(message, 'info');
    }

    showAlert(message, type = 'info') {
        // Create alert element
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        
        // Insert at top of products section
        const section = document.querySelector('.products-section .container');
        if (section) {
            section.insertBefore(alert, section.firstChild);
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                alert.style.opacity = '0';
                setTimeout(() => alert.remove(), 300);
            }, 5000);
        }
    }

    isConnected() {
        return this.connected;
    }

    getAccount() {
        return this.account;
    }
}

// Initialize wallet auth when page loads
let walletAuth;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        walletAuth = new WalletAuth();
    });
} else {
    walletAuth = new WalletAuth();
}
