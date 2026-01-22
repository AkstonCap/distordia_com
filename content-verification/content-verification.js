/**
 * Content Verification Main Module
 */

class ContentVerification {
    constructor() {
        this.currentResult = null;
        this.initEventListeners();
    }

    initEventListeners() {
        const form = document.getElementById('verificationForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleVerification(e));
        }
    }

    async handleVerification(e) {
        e.preventDefault();

        const urlInput = document.getElementById('urlInput');
        const verifyBtn = document.getElementById('verifyBtn');
        const btnText = verifyBtn.querySelector('.btn-text');
        const btnLoading = verifyBtn.querySelector('.btn-loading');

        if (!urlInput || !urlInput.value) {
            this.showError('Please enter a valid URL');
            return;
        }

        const url = urlInput.value.trim();

        // Validate URL format
        try {
            new URL(url);
        } catch (err) {
            this.showError('Please enter a valid URL (e.g., https://example.com/article)');
            return;
        }

        // Show loading state
        verifyBtn.disabled = true;
        if (btnText) btnText.style.display = 'none';
        if (btnLoading) btnLoading.style.display = 'inline-flex';

        // Hide previous results
        this.hideAllResults();

        try {
            // Search for content on blockchain
            const asset = await contentAPI.verifyContentByURL(url);

            if (asset) {
                this.displayVerifiedContent(asset, url);
            } else {
                this.displayNotFound(url);
            }
        } catch (error) {
            console.error('Verification error:', error);
            this.showError(error.message || 'Failed to verify content. Please try again.');
        } finally {
            // Reset button state
            verifyBtn.disabled = false;
            if (btnText) btnText.style.display = 'inline';
            if (btnLoading) btnLoading.style.display = 'none';
        }
    }

    displayVerifiedContent(asset, url) {
        const resultsSection = document.getElementById('resultsSection');
        const verifiedResult = document.getElementById('verifiedResult');

        if (!resultsSection || !verifiedResult) return;

        // Populate data
        document.getElementById('resultTitle').textContent = url;
        document.getElementById('creatorGenesis').textContent = asset.owner || 'Unknown';
        document.getElementById('creatorUsername').textContent = asset.username || asset.creator || 'Not specified';
        document.getElementById('registrationDate').textContent = contentAPI.formatDate(asset.created);
        
        document.getElementById('assetAddress').textContent = asset.address;
        document.getElementById('txid').textContent = asset.txid || 'N/A';
        document.getElementById('modifiedDate').textContent = contentAPI.formatDate(asset.modified || asset.created);

        // Display content details
        const contentDetails = document.getElementById('contentDetails');
        if (contentDetails) {
            contentDetails.innerHTML = this.buildContentDetails(asset);
        }

        // Show results
        resultsSection.style.display = 'block';
        verifiedResult.style.display = 'block';

        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    buildContentDetails(asset) {
        const details = [];
        
        // Add all asset properties except system ones
        const excludeKeys = ['owner', 'created', 'modified', 'address', 'txid', 'version', 'type', 'distordia'];
        
        for (const [key, value] of Object.entries(asset)) {
            if (!excludeKeys.includes(key) && value) {
                details.push(`
                    <div class="info-row">
                        <span class="label">${this.formatKey(key)}:</span>
                        <span class="value">${this.escapeHtml(String(value))}</span>
                    </div>
                `);
            }
        }

        return details.length > 0 ? details.join('') : '<p style="color: var(--text-secondary);">No additional details provided</p>';
    }

    displayNotFound(url) {
        const resultsSection = document.getElementById('resultsSection');
        const notFoundResult = document.getElementById('notFoundResult');

        if (!resultsSection || !notFoundResult) return;

        resultsSection.style.display = 'block';
        notFoundResult.style.display = 'block';

        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    showError(message) {
        const resultsSection = document.getElementById('resultsSection');
        const errorResult = document.getElementById('errorResult');
        const errorMessage = document.getElementById('errorMessage');

        if (!resultsSection || !errorResult || !errorMessage) return;

        errorMessage.textContent = message;
        
        resultsSection.style.display = 'block';
        errorResult.style.display = 'block';

        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    hideAllResults() {
        const verifiedResult = document.getElementById('verifiedResult');
        const notFoundResult = document.getElementById('notFoundResult');
        const errorResult = document.getElementById('errorResult');

        if (verifiedResult) verifiedResult.style.display = 'none';
        if (notFoundResult) notFoundResult.style.display = 'none';
        if (errorResult) errorResult.style.display = 'none';
    }

    formatKey(key) {
        // Convert camelCase or snake_case to Title Case
        return key
            .replace(/([A-Z])/g, ' $1')
            .replace(/_/g, ' ')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Info Modal functions
function openInfoModal() {
    const modal = document.getElementById('infoModal');
    if (modal) {
        modal.classList.add('show');
    }
}

function closeInfoModal() {
    const modal = document.getElementById('infoModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Wallet Connection
let walletConnected = false;
let walletAddress = null;

async function connectWallet() {
    if (typeof window.qWallet === 'undefined') {
        alert('Q-Wallet extension not found. Please install Q-Wallet.');
        return;
    }

    try {
        const accounts = await window.qWallet.connect();
        if (accounts && accounts.length > 0) {
            walletAddress = accounts[0];
            walletConnected = true;
            updateWalletUI();
            console.log('Wallet connected:', walletAddress);
        }
    } catch (error) {
        console.error('Wallet connection failed:', error);
        alert('Failed to connect wallet. Please try again.');
    }
}

async function disconnectWallet() {
    try {
        if (typeof window.qWallet !== 'undefined' && window.qWallet.disconnect) {
            await window.qWallet.disconnect();
        }
    } catch (error) {
        console.error('Error disconnecting:', error);
    }
    
    walletAddress = null;
    walletConnected = false;
    updateWalletUI();
}

function updateWalletUI() {
    const connectBtn = document.getElementById('connectWalletBtn');
    const walletInfo = document.getElementById('walletInfo');
    const addressEl = document.getElementById('walletAddress');
    
    if (walletConnected && walletAddress) {
        if (connectBtn) connectBtn.style.display = 'none';
        if (walletInfo) walletInfo.style.display = 'flex';
        if (addressEl) addressEl.textContent = `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`;
    } else {
        if (connectBtn) connectBtn.style.display = 'block';
        if (walletInfo) walletInfo.style.display = 'none';
    }
}

async function checkExistingConnection() {
    if (typeof window.qWallet !== 'undefined') {
        try {
            const accounts = await window.qWallet.getAccounts();
            if (accounts && accounts.length > 0) {
                walletAddress = accounts[0];
                walletConnected = true;
                updateWalletUI();
            }
        } catch (error) {
            console.log('No existing wallet connection');
        }
    }
}

// Initialize when DOM is ready
let contentVerification;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        contentVerification = new ContentVerification();
        
        // Setup info button
        const infoBtn = document.getElementById('infoBtn');
        if (infoBtn) {
            infoBtn.addEventListener('click', openInfoModal);
        }
        
        // Setup wallet buttons
        const connectBtn = document.getElementById('connectWalletBtn');
        if (connectBtn) {
            connectBtn.addEventListener('click', connectWallet);
        }
        const disconnectBtn = document.getElementById('disconnectBtn');
        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', disconnectWallet);
        }
        
        // Check for existing connection
        checkExistingConnection();
    });
} else {
    contentVerification = new ContentVerification();
    
    // Setup info button
    const infoBtn = document.getElementById('infoBtn');
    if (infoBtn) {
        infoBtn.addEventListener('click', openInfoModal);
    }
    
    // Setup wallet buttons
    const connectBtn = document.getElementById('connectWalletBtn');
    if (connectBtn) {
        connectBtn.addEventListener('click', connectWallet);
    }
    const disconnectBtn = document.getElementById('disconnectBtn');
    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', disconnectWallet);
    }
    
    // Check for existing connection
    checkExistingConnection();
}
