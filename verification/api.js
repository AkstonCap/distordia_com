/**
 * Verification API - Read-only queries + request creation
 * 
 * This module handles:
 * - Reading verified registries (via register API - no auth needed)
 * - Reading disputes (via register API - no auth needed)
 * - Creating verification requests (via Q-Wallet)
 * - Creating dispute requests (via Q-Wallet)
 * 
 * The actual verification processing is done by the verification_daemon.py
 * script running locally with a Nexus node.
 */

const NEXUS_API_BASE = 'https://api.distordia.com';

// Verification tier thresholds (in DIST)
const TIER_THRESHOLDS = {
    L0: 1,
    L1: 1000,
    L2: 10000,
    L3: 100000
};

// Distordia namespace for verification assets
const DISTORDIA_NAMESPACE = 'distordia';

/**
 * NexusVerificationAPI - Read-only queries + request creation
 */
class NexusVerificationAPI {
    constructor(baseURL = NEXUS_API_BASE) {
        this.baseURL = baseURL;
        this.connected = false;
        this.walletAddress = null;
        this.userNamespace = null;
    }

    /**
     * Generic API request wrapper (read-only, no session needed)
     */
    async request(endpoint, params = {}) {
        try {
            const response = await fetch(`${this.baseURL}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params)
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(data.error?.message || 'API request failed');
            }

            return data.result;
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    }

    // =========================================================================
    // WALLET CONNECTION
    // =========================================================================

    /**
     * Connect to Q-Wallet
     */
    async connectWallet() {
        if (typeof window.qWallet === 'undefined') {
            throw new Error('Q-Wallet extension not installed. Please install Q-Wallet to submit requests.');
        }

        try {
            const accounts = await window.qWallet.connect();
            if (accounts && accounts.length > 0) {
                this.walletAddress = accounts[0];
                this.connected = true;
                
                // Try to get user's namespace
                await this.detectUserNamespace();
                
                // Set up event listeners
                window.qWallet.on('accountsChanged', (accounts) => {
                    this.walletAddress = accounts[0] || null;
                    this.connected = !!this.walletAddress;
                    if (this.connected) this.detectUserNamespace();
                });

                window.qWallet.on('disconnect', () => {
                    this.walletAddress = null;
                    this.userNamespace = null;
                    this.connected = false;
                });

                return this.walletAddress;
            }
            throw new Error('No accounts returned from wallet');
        } catch (error) {
            console.error('Wallet connection failed:', error);
            throw error;
        }
    }

    /**
     * Try to detect user's namespace from their connected wallet
     */
    async detectUserNamespace() {
        try {
            // This would need to be implemented based on how Q-Wallet exposes namespace info
            // For now, we'll leave it null and let users specify namespace in requests
            this.userNamespace = null;
        } catch (error) {
            console.log('Could not detect user namespace');
        }
    }

    // =========================================================================
    // READ-ONLY QUERIES (No authentication needed)
    // =========================================================================

    /**
     * Get verified namespaces for a specific tier
     */
    async getVerifiedForTier(tier) {
        const namespaces = [];
        let assetIndex = 1;
        let hasMore = true;

        while (hasMore) {
            try {
                const assetName = `${DISTORDIA_NAMESPACE}:${tier}-verified-${assetIndex}`;
                const result = await this.request('register/get/asset', {
                    name: assetName
                });

                if (result && result['distordia-type'] === 'verification-registry') {
                    const entries = JSON.parse(result.namespaces || '[]');
                    namespaces.push(...entries.map(e => ({
                        ...e,
                        tier: tier,
                        assetName: assetName
                    })));
                }

                assetIndex++;
            } catch (error) {
                // No more assets for this tier
                hasMore = false;
            }
        }

        return namespaces;
    }

    /**
     * Get all verified namespaces across all tiers
     */
    async getAllVerified() {
        const allNamespaces = [];
        
        for (const tier of ['L3', 'L2', 'L1']) {
            const tierNamespaces = await this.getVerifiedForTier(tier);
            allNamespaces.push(...tierNamespaces);
        }

        return allNamespaces;
    }

    /**
     * Get all disputes from the disputes registry
     */
    async getAllDisputes() {
        const disputes = [];
        let assetIndex = 1;
        let hasMore = true;

        while (hasMore) {
            try {
                const assetName = `${DISTORDIA_NAMESPACE}:disputes-${assetIndex}`;
                const result = await this.request('register/get/asset', {
                    name: assetName
                });

                if (result && result['distordia-type'] === 'disputes-registry') {
                    const entries = JSON.parse(result.disputes || '[]');
                    disputes.push(...entries.map(d => ({
                        ...d,
                        assetName: assetName
                    })));
                }

                assetIndex++;
            } catch (error) {
                // No more dispute assets
                hasMore = false;
            }
        }

        return disputes;
    }

    /**
     * Get namespace information
     */
    async getNamespaceInfo(namespace) {
        try {
            return await this.request('names/get/namespace', { name: namespace });
        } catch (error) {
            return null;
        }
    }

    /**
     * Get DIST verification account balance for a namespace
     */
    async getVerificationBalance(namespace) {
        try {
            const accountName = `${namespace}::DIST-verification`;
            const result = await this.request('register/get/account', {
                name: accountName
            });
            
            if (result && result.balance !== undefined) {
                return parseFloat(result.balance);
            }
            return 0;
        } catch (error) {
            // No verification account exists
            return 0;
        }
    }

    /**
     * Get eligible tier based on DIST balance
     */
    getEligibleTier(balance) {
        if (balance >= TIER_THRESHOLDS.L3) return 'L3';
        if (balance >= TIER_THRESHOLDS.L2) return 'L2';
        if (balance >= TIER_THRESHOLDS.L1) return 'L1';
        if (balance >= TIER_THRESHOLDS.L0) return 'L0';
        return null;
    }

    /**
     * Check namespace verification status
     */
    async checkNamespace(namespace) {
        const nsInfo = await this.getNamespaceInfo(namespace);
        if (!nsInfo) {
            return {
                namespace: namespace,
                exists: false,
                error: 'Namespace not found'
            };
        }

        const balance = await this.getVerificationBalance(namespace);
        const allVerified = await this.getAllVerified();
        const currentEntry = allVerified.find(v => v.namespace === namespace);
        const disputes = await this.getAllDisputes();
        const activeDisputes = disputes.filter(d => 
            d.namespace === namespace && d.status === 'active'
        );
        const totalPenalties = activeDisputes.reduce((sum, d) => sum + (d.penalty || 0), 0);
        const effectiveBalance = balance - totalPenalties;
        const eligibleTier = this.getEligibleTier(effectiveBalance);

        return {
            namespace: namespace,
            exists: true,
            genesis: nsInfo.address,
            balance: balance,
            penalties: totalPenalties,
            effectiveBalance: effectiveBalance,
            eligibleTier: eligibleTier,
            currentTier: currentEntry?.tier || null,
            currentEntry: currentEntry,
            disputes: activeDisputes,
            needsUpdate: currentEntry && eligibleTier !== currentEntry.tier,
            canVerify: eligibleTier && !currentEntry
        };
    }

    /**
     * Get list of verification assets
     */
    async getVerificationAssets() {
        const assets = { L3: [], L2: [], L1: [], disputes: [] };
        
        for (const tier of ['L3', 'L2', 'L1']) {
            let assetIndex = 1;
            let hasMore = true;
            while (hasMore) {
                try {
                    const assetName = `${DISTORDIA_NAMESPACE}:${tier}-verified-${assetIndex}`;
                    const result = await this.request('register/get/asset', {
                        name: assetName
                    });
                    if (result) {
                        const entries = JSON.parse(result.namespaces || '[]');
                        assets[tier].push({
                            name: assetName,
                            count: entries.length,
                            updated: result.updated
                        });
                    }
                    assetIndex++;
                } catch (error) {
                    hasMore = false;
                }
            }
        }

        // Get disputes assets
        let disputeIndex = 1;
        let hasMoreDisputes = true;
        while (hasMoreDisputes) {
            try {
                const assetName = `${DISTORDIA_NAMESPACE}:disputes-${disputeIndex}`;
                const result = await this.request('register/get/asset', {
                    name: assetName
                });
                if (result) {
                    const entries = JSON.parse(result.disputes || '[]');
                    assets.disputes.push({
                        name: assetName,
                        count: entries.length,
                        updated: result.updated
                    });
                }
                disputeIndex++;
            } catch (error) {
                hasMoreDisputes = false;
            }
        }

        return assets;
    }

    // =========================================================================
    // REQUEST CREATION (via Q-Wallet)
    // =========================================================================

    /**
     * Submit a verification request for a namespace
     * Creates an on-chain asset that the daemon will process
     */
    async submitVerificationRequest(namespace, requestedTier) {
        if (!this.connected) {
            throw new Error('Wallet not connected');
        }

        // Create unique request ID
        const requestId = `vreq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Asset data for verification request
        const assetData = {
            'distordia-type': 'verification-request',
            'request-id': requestId,
            'target-namespace': namespace,
            'requested-tier': requestedTier,
            'requester': this.walletAddress,
            'status': 'pending',
            'timestamp': new Date().toISOString()
        };

        try {
            // Create asset via Q-Wallet
            const result = await window.qWallet.createAsset({
                name: `verification-request-${requestId}`,
                data: assetData
            });

            return {
                success: true,
                requestId: requestId,
                txid: result.txid
            };
        } catch (error) {
            console.error('Failed to submit verification request:', error);
            throw new Error(`Failed to submit request: ${error.message}`);
        }
    }

    /**
     * Submit a dispute request against a namespace
     * Creates an on-chain asset that the daemon will process
     */
    async submitDisputeRequest(targetNamespace, penalty, reason) {
        if (!this.connected) {
            throw new Error('Wallet not connected');
        }

        // Create unique dispute ID
        const disputeId = `dreq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Asset data for dispute request
        const assetData = {
            'distordia-type': 'dispute-request',
            'dispute-id': disputeId,
            'target-namespace': targetNamespace,
            'penalty': penalty,
            'reason': reason,
            'requester': this.walletAddress,
            'status': 'pending',
            'timestamp': new Date().toISOString()
        };

        try {
            // Create asset via Q-Wallet
            const result = await window.qWallet.createAsset({
                name: `dispute-request-${disputeId}`,
                data: assetData
            });

            return {
                success: true,
                disputeId: disputeId,
                txid: result.txid
            };
        } catch (error) {
            console.error('Failed to submit dispute request:', error);
            throw new Error(`Failed to submit dispute: ${error.message}`);
        }
    }
}

// Create global instance
const verificationAPI = new NexusVerificationAPI();
