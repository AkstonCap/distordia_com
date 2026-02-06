/**
 * NFT Marketplace - Q-Wallet Authentication Module
 * Handles wallet connection and authentication
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

        if (typeof window.qWallet === 'undefined') {
            console.log('Q-Wallet extension not installed after waiting');
            return false;
        }

        try {
            const accounts = await window.qWallet.getAccounts();
            if (accounts && accounts.length > 0) {
                this.account = accounts[0];
                this.connected = true;
                this.updateUI();
                this.onConnectionChange(true);
                console.log('✅ Already connected to wallet:', accounts[0]);
                return true;
            }
        } catch (error) {
            console.error('Error checking connection:', error);
        }

        return false;
    }

    async connect() {
        // Wait for Q-Wallet to be injected
        const maxWaitTime = 3000;
        const checkInterval = 100;
        let waited = 0;

        while (typeof window.qWallet === 'undefined' && waited < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            waited += checkInterval;
        }

        if (typeof window.qWallet === 'undefined') {
            this.showNotification('Q-Wallet extension not found. Please install Q-Wallet to continue.', 'error');
            return false;
        }

        try {
            const accounts = await window.qWallet.connect();
            if (accounts && accounts.length > 0) {
                this.account = accounts[0];
                this.connected = true;
                this.updateUI();
                this.onConnectionChange(true);
                this.showNotification('Wallet connected successfully!', 'success');
                return true;
            }
        } catch (error) {
            console.error('Error connecting wallet:', error);
            if (error.message && error.message.includes('denied')) {
                this.showNotification('Connection denied. Please approve the wallet connection.', 'error');
            } else {
                this.showNotification('Failed to connect wallet: ' + error.message, 'error');
            }
        }

        return false;
    }

    async disconnect() {
        try {
            if (typeof window.qWallet !== 'undefined') {
                await window.qWallet.disconnect();
            }
        } catch (error) {
            console.error('Error disconnecting:', error);
        }

        this.connected = false;
        this.account = null;
        this.updateUI();
        this.onConnectionChange(false);
        this.showNotification('Wallet disconnected.', 'info');
    }

    updateUI() {
        const connectBtn = document.getElementById('connectWalletBtn');
        const walletInfo = document.getElementById('walletInfo');
        const walletAddress = document.getElementById('walletAddress');

        if (this.connected && this.account) {
            if (connectBtn) connectBtn.style.display = 'none';
            if (walletInfo) walletInfo.style.display = 'flex';
            if (walletAddress) {
                const truncated = this.account.length > 16
                    ? this.account.substring(0, 8) + '...' + this.account.substring(this.account.length - 6)
                    : this.account;
                walletAddress.textContent = truncated;
                walletAddress.title = this.account;
            }
        } else {
            if (connectBtn) connectBtn.style.display = 'inline-flex';
            if (walletInfo) walletInfo.style.display = 'none';
        }
    }

    onConnectionChange(connected) {
        // Dispatch custom event for other modules
        window.dispatchEvent(new CustomEvent('walletConnectionChange', {
            detail: { connected, account: this.account }
        }));
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        if (!container) return;

        const notif = document.createElement('div');
        notif.className = `notification ${type}`;
        notif.innerHTML = `
            <span class="notif-message">${message}</span>
            <button class="notif-close">&times;</button>
        `;

        container.appendChild(notif);

        notif.querySelector('.notif-close').addEventListener('click', () => notif.remove());

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notif.parentNode) {
                notif.style.opacity = '0';
                notif.style.transform = 'translateX(100%)';
                notif.style.transition = 'all 0.3s ease';
                setTimeout(() => notif.remove(), 300);
            }
        }, 5000);
    }
}

// Initialize auth
const walletAuth = new WalletAuth();
