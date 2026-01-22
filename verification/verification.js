/**
 * Verification Manager - Main Application Logic
 * 
 * Read-only interface for viewing verification status,
 * plus request submission via Q-Wallet.
 * 
 * Processing of requests is done by verification_daemon.py
 */

class VerificationManager {
    constructor() {
        this.api = verificationAPI;
        this.currentFilter = 'all';
        this.verifiedNamespaces = [];
        this.disputes = [];
        this.currentCheckResult = null;
        
        this.init();
    }

    async init() {
        this.bindEvents();
        this.initMobileMenu();
        
        // Load initial data
        await this.loadData();
        
        // Check for existing wallet connection
        if (typeof window.qWallet !== 'undefined') {
            try {
                const accounts = await window.qWallet.getAccounts();
                if (accounts && accounts.length > 0) {
                    await this.handleWalletConnected(accounts[0]);
                }
            } catch (error) {
                console.log('No existing wallet connection');
            }
        }
    }

    bindEvents() {
        // Wallet connection
        document.getElementById('connectWallet').addEventListener('click', () => this.connectWallet());
        
        // Check namespace
        document.getElementById('checkBtn').addEventListener('click', () => this.checkNamespace());
        document.getElementById('checkNamespace').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.checkNamespace();
        });
        
        // Request actions (now submits requests instead of direct modifications)
        document.getElementById('requestVerificationBtn')?.addEventListener('click', () => this.submitVerificationRequest());
        
        // Disputes
        document.getElementById('submitDisputeBtn').addEventListener('click', () => this.submitDisputeRequest());
        
        // Registry actions
        document.getElementById('refreshRegistryBtn').addEventListener('click', () => this.loadData());
        
        // Asset actions
        document.getElementById('exportBtn').addEventListener('click', () => this.exportRegistry());
        
        // Tab filtering
        document.querySelectorAll('.registry-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.registry-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.tier;
                this.renderRegistry();
            });
        });
        
        // Modal
        document.getElementById('modalCancel')?.addEventListener('click', () => this.closeModal());
        document.querySelector('.modal-backdrop')?.addEventListener('click', () => this.closeModal());
    }

    initMobileMenu() {
        const toggle = document.querySelector('.menu-toggle');
        const menu = document.querySelector('.nav-links');
        
        toggle?.addEventListener('click', () => {
            menu?.classList.toggle('active');
        });
    }

    // =========================================================================
    // WALLET CONNECTION
    // =========================================================================

    async connectWallet() {
        try {
            const address = await this.api.connectWallet();
            await this.handleWalletConnected(address);
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    async handleWalletConnected(address) {
        this.api.walletAddress = address;
        this.api.connected = true;
        
        // Update UI
        const btn = document.getElementById('connectWallet');
        btn.textContent = `${address.slice(0, 8)}...${address.slice(-6)}`;
        btn.classList.add('connected');
        
        const statusEl = document.getElementById('walletStatus');
        if (statusEl) {
            const indicator = statusEl.querySelector('.status-indicator');
            indicator?.classList.remove('disconnected');
            indicator?.classList.add('connected');
            const textEl = statusEl.querySelector('span:last-child');
            if (textEl) {
                textEl.textContent = this.api.userNamespace 
                    ? `Connected: ${this.api.userNamespace}`
                    : 'Wallet connected';
            }
        }
        
        this.showToast('Wallet connected', 'success');
    }

    // =========================================================================
    // DATA LOADING (Read-only)
    // =========================================================================

    async loadData() {
        try {
            this.showToast('Loading verification data...', 'info');
            
            // Load verified namespaces
            this.verifiedNamespaces = await this.api.getAllVerified();
            
            // Load disputes
            this.disputes = await this.api.getAllDisputes();
            
            // Load asset info
            const assets = await this.api.getVerificationAssets();
            
            // Update UI
            this.updateTierCounts();
            this.renderRegistry();
            this.renderDisputes();
            this.renderAssets(assets);
            
            this.showToast('Data loaded', 'success');
            
        } catch (error) {
            console.error('Failed to load data:', error);
            this.showToast('Failed to load verification data', 'error');
            this.renderEmptyState();
        }
    }

    updateTierCounts() {
        const counts = { L0: 0, L1: 0, L2: 0, L3: 0 };
        
        for (const ns of this.verifiedNamespaces) {
            if (counts[ns.tier] !== undefined) {
                counts[ns.tier]++;
            }
        }
        
        document.getElementById('l0Count').textContent = '-';
        document.getElementById('l1Count').textContent = counts.L1;
        document.getElementById('l2Count').textContent = counts.L2;
        document.getElementById('l3Count').textContent = counts.L3;
    }

    // =========================================================================
    // NAMESPACE CHECKING
    // =========================================================================

    async checkNamespace() {
        const namespace = document.getElementById('checkNamespace').value.trim();
        if (!namespace) {
            this.showToast('Please enter a namespace', 'warning');
            return;
        }

        const checkBtn = document.getElementById('checkBtn');
        checkBtn.disabled = true;
        checkBtn.textContent = 'Checking...';

        try {
            const status = await this.api.checkNamespaceStatus(namespace);
            this.currentCheckResult = status;
            this.renderCheckResult(status);
        } catch (error) {
            this.showToast(`Failed to check namespace: ${error.message}`, 'error');
        } finally {
            checkBtn.disabled = false;
            checkBtn.textContent = 'Check Status';
        }
    }

    renderCheckResult(status) {
        const resultEl = document.getElementById('checkResult');
        resultEl.style.display = 'block';

        if (!status.exists) {
            document.getElementById('resultNamespace').textContent = status.namespace;
            document.getElementById('resultTier').textContent = 'Not Found';
            document.getElementById('resultTier').className = 'result-tier';
            document.getElementById('resultGenesis').textContent = '-';
            document.getElementById('resultBalance').textContent = '-';
            document.getElementById('resultPenalties').textContent = '-';
            document.getElementById('resultEffective').textContent = '-';
            document.getElementById('resultStatus').textContent = 'Namespace does not exist';
            document.getElementById('resultEligible').textContent = '-';
            document.getElementById('resultActions').style.display = 'none';
            return;
        }

        document.getElementById('resultNamespace').textContent = status.namespace;
        
        const tierEl = document.getElementById('resultTier');
        tierEl.textContent = status.currentTier;
        tierEl.className = `result-tier tier-${status.currentTier.toLowerCase()}`;
        
        document.getElementById('resultGenesis').textContent = 
            status.genesis ? `${status.genesis.slice(0, 12)}...${status.genesis.slice(-8)}` : '-';
        document.getElementById('resultBalance').textContent = `${status.balance.toLocaleString()} DIST`;
        document.getElementById('resultPenalties').textContent = 
            status.penalties > 0 ? `${status.penalties.toLocaleString()} DIST` : 'None';
        document.getElementById('resultEffective').textContent = `${status.effectiveBalance.toLocaleString()} DIST`;
        
        // Status
        let statusText = '';
        let statusClass = '';
        if (status.currentTier === 'L0') {
            statusText = 'Not verified';
            statusClass = '';
        } else if (status.isValid) {
            statusText = 'Valid ✓';
            statusClass = 'color: var(--success-color)';
        } else {
            statusText = 'Balance below threshold';
            statusClass = 'color: var(--warning-color)';
        }
        const statusSpan = document.getElementById('resultStatus');
        statusSpan.textContent = statusText;
        statusSpan.style = statusClass;
        
        document.getElementById('resultEligible').textContent = status.eligibleTier;
        
        // Show request section if wallet connected and eligible for higher tier
        const actionsEl = document.getElementById('resultActions');
        if (this.api.connected && status.eligibleTier !== 'L0' && 
            (status.currentTier === 'L0' || !status.isValid)) {
            actionsEl.style.display = 'flex';
            
            // Update tier selector
            const tierSelect = document.getElementById('requestTierSelect');
            if (tierSelect) {
                tierSelect.innerHTML = '';
                const tierOrder = { 'L1': 1, 'L2': 2, 'L3': 3 };
                const eligibleOrder = tierOrder[status.eligibleTier] || 0;
                
                for (const tier of ['L1', 'L2', 'L3']) {
                    if (tierOrder[tier] <= eligibleOrder) {
                        const option = document.createElement('option');
                        option.value = tier;
                        option.textContent = `${tier} - ${TIER_THRESHOLDS[tier].toLocaleString()} DIST`;
                        if (tier === status.eligibleTier) option.selected = true;
                        tierSelect.appendChild(option);
                    }
                }
            }
        } else {
            actionsEl.style.display = 'none';
        }
    }

    // =========================================================================
    // REQUEST SUBMISSION
    // =========================================================================

    async submitVerificationRequest() {
        if (!this.currentCheckResult) return;
        if (!this.api.connected) {
            this.showToast('Please connect your Q-Wallet first', 'warning');
            return;
        }
        
        const status = this.currentCheckResult;
        const tierSelect = document.getElementById('requestTierSelect');
        const requestedTier = tierSelect?.value || status.eligibleTier;
        
        this.showModal(
            'Submit Verification Request',
            `Request verification for ${status.namespace} as ${requestedTier}?`,
            `
                <div><strong>Namespace:</strong> ${status.namespace}</div>
                <div><strong>Requested Tier:</strong> ${requestedTier}</div>
                <div><strong>Required Balance:</strong> ${TIER_THRESHOLDS[requestedTier].toLocaleString()} DIST</div>
                <div><strong>Your Balance:</strong> ${status.effectiveBalance.toLocaleString()} DIST</div>
                <div style="margin-top: 1rem; color: var(--text-secondary); font-size: 0.9rem;">
                    This will create an on-chain request asset. The verification daemon will 
                    process your request and update the verified registry.
                </div>
            `,
            async () => {
                try {
                    await this.api.submitVerificationRequest(status.namespace, requestedTier);
                    this.showToast('Verification request submitted! It will be processed shortly.', 'success');
                } catch (error) {
                    this.showToast(`Request failed: ${error.message}`, 'error');
                }
            }
        );
    }

    async submitDisputeRequest() {
        if (!this.api.connected) {
            this.showToast('Please connect your Q-Wallet first', 'warning');
            return;
        }

        const namespace = document.getElementById('disputeNamespace').value.trim();
        const penalty = document.getElementById('penaltyAmount').value;
        const reason = document.getElementById('disputeReason').value.trim();

        if (!namespace || !penalty || !reason) {
            this.showToast('Please fill in all fields', 'warning');
            return;
        }

        this.showModal(
            'Submit Dispute Request',
            `Submit a dispute against ${namespace}?`,
            `
                <div><strong>Namespace:</strong> ${namespace}</div>
                <div><strong>Penalty:</strong> ${parseFloat(penalty).toLocaleString()} DIST</div>
                <div><strong>Reason:</strong> ${reason}</div>
                <div style="margin-top: 1rem; color: var(--text-secondary); font-size: 0.9rem;">
                    This will create an on-chain dispute request. Only authorized admins' 
                    disputes will be processed by the daemon.
                </div>
            `,
            async () => {
                try {
                    await this.api.submitDisputeRequest(namespace, penalty, reason);
                    this.showToast('Dispute request submitted!', 'success');
                    
                    // Clear form
                    document.getElementById('disputeNamespace').value = '';
                    document.getElementById('penaltyAmount').value = '';
                    document.getElementById('disputeReason').value = '';
                } catch (error) {
                    this.showToast(`Request failed: ${error.message}`, 'error');
                }
            }
        );
    }

    // =========================================================================
    // RENDERING
    // =========================================================================

    renderRegistry() {
        const tbody = document.getElementById('registryBody');
        
        let filtered = this.verifiedNamespaces;
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(ns => ns.tier === this.currentFilter);
        }

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr class="loading-row">
                    <td colspan="6">No verified namespaces found</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map(ns => {
            const penalties = this.disputes
                .filter(d => d.namespace === ns.namespace && d.status === 'active')
                .reduce((sum, d) => sum + d.penalty, 0);
            
            return `
                <tr data-namespace="${ns.namespace}">
                    <td><strong>${ns.namespace}</strong></td>
                    <td class="mono" style="font-size: 0.8rem;">${ns.genesis ? ns.genesis.slice(0, 12) + '...' : '-'}</td>
                    <td><span class="result-tier tier-${ns.tier.toLowerCase()}">${ns.tier}</span></td>
                    <td>${ns.balance ? ns.balance.toLocaleString() : '-'} DIST</td>
                    <td>${penalties > 0 ? `<span style="color: var(--warning-color)">${penalties.toLocaleString()}</span>` : '-'}</td>
                    <td>
                        <button class="btn btn-sm btn-secondary" onclick="verificationManager.checkSpecificNamespace('${ns.namespace}')">
                            Check
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderDisputes() {
        const tbody = document.getElementById('disputesBody');
        
        if (this.disputes.length === 0) {
            tbody.innerHTML = `
                <tr class="loading-row">
                    <td colspan="5">No disputes registered</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.disputes.map(d => `
            <tr>
                <td>${new Date(d.created).toLocaleString()}</td>
                <td><strong>${d.namespace}</strong></td>
                <td style="color: var(--warning-color)">${d.penalty.toLocaleString()} DIST</td>
                <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;">${d.reason}</td>
                <td><span class="status-badge ${d.status === 'active' ? 'warning' : 'valid'}">${d.status}</span></td>
            </tr>
        `).join('');
    }

    renderAssets(assets) {
        for (const tier of ['L3', 'L2', 'L1']) {
            const container = document.getElementById(`${tier.toLowerCase()}Assets`)?.querySelector('.asset-list');
            if (!container) continue;
            
            if (assets[tier].length === 0) {
                container.innerHTML = '<span style="color: var(--text-muted)">No assets created</span>';
            } else {
                container.innerHTML = assets[tier].map(a => `
                    <div class="asset-item">
                        <span class="asset-name">${a.name.split(':')[1]}</span>
                        <span class="asset-count">${a.count} entries</span>
                    </div>
                `).join('');
            }
        }

        // Disputes
        const disputeContainer = document.getElementById('disputeAssets')?.querySelector('.asset-list');
        if (disputeContainer) {
            if (assets.disputes.length === 0) {
                disputeContainer.innerHTML = '<span style="color: var(--text-muted)">No assets created</span>';
            } else {
                disputeContainer.innerHTML = assets.disputes.map(a => `
                    <div class="asset-item">
                        <span class="asset-name">${a.name.split(':')[1]}</span>
                        <span class="asset-count">${a.count} entries</span>
                    </div>
                `).join('');
            }
        }
    }

    renderEmptyState() {
        document.getElementById('registryBody').innerHTML = `
            <tr class="loading-row">
                <td colspan="6">Unable to load verified namespaces</td>
            </tr>
        `;
        
        document.getElementById('disputesBody').innerHTML = `
            <tr class="loading-row">
                <td colspan="5">Unable to load disputes</td>
            </tr>
        `;
    }

    // =========================================================================
    // UTILITIES
    // =========================================================================

    checkSpecificNamespace(namespace) {
        document.getElementById('checkNamespace').value = namespace;
        this.checkNamespace();
        
        // Scroll to check section
        document.querySelector('.verification-actions').scrollIntoView({ behavior: 'smooth' });
    }

    exportRegistry() {
        const data = {
            exported: new Date().toISOString(),
            verified: this.verifiedNamespaces,
            disputes: this.disputes
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `verification-registry-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('Registry exported', 'success');
    }

    // =========================================================================
    // UI HELPERS
    // =========================================================================

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = message;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    showModal(title, message, details, onConfirm, confirmText = 'Submit Request') {
        const modal = document.getElementById('confirmModal');
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalMessage').textContent = message;
        document.getElementById('modalDetails').innerHTML = details;
        
        const confirmBtn = document.getElementById('modalConfirm');
        confirmBtn.textContent = confirmText;
        
        // Remove old listener
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        
        newConfirmBtn.addEventListener('click', async () => {
            newConfirmBtn.disabled = true;
            newConfirmBtn.textContent = 'Submitting...';
            
            try {
                await onConfirm();
            } finally {
                this.closeModal();
            }
        });
        
        modal.classList.add('active');
    }

    closeModal() {
        document.getElementById('confirmModal').classList.remove('active');
    }
}

// Initialize on DOM load
let verificationManager;
document.addEventListener('DOMContentLoaded', () => {
    verificationManager = new VerificationManager();
});
