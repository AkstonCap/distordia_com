/**
 * NFT Marketplace - Nexus Blockchain API Module
 * Handles all blockchain interactions: asset creation, tokenization, market orders, browsing
 */

class NexusAPI {
    constructor(baseURL = 'https://api.distordia.com') {
        this.baseURL = baseURL;
    }

    /**
     * Generic POST request to Nexus API
     */
    async request(endpoint, params = {}) {
        const url = `${this.baseURL}/${endpoint}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params)
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(data.error?.message || `API request failed: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`API request error [${endpoint}]:`, error);
            throw error;
        }
    }

    // =========================================================================
    //  ASSET (NFT) OPERATIONS
    // =========================================================================

    /**
     * Mint (create) a new NFT asset on-chain via Q-Wallet
     * Uses readonly format with JSON-encoded metadata
     * Fields: distordia-type, name, description, image, category, collection, creator, external_url
     */
    async mintNFT(nftData) {
        this.requireWallet();

        // Build asset params in basic format so fields are searchable
        const assetParams = {
            format: 'basic',
            name: `nft-${this.slugify(nftData.name)}-${Date.now()}`,

            // Distordia standard
            'distordia-type': 'nft',
            'status': 'active',

            // NFT metadata
            'nft-name': nftData.name,
            'description': nftData.description,
            'image': nftData.image,          // open image URL
            'category': nftData.category,
            'collection': nftData.collection || '',
            'creator': nftData.creator || '',
            'external_url': nftData.external_url || ''
        };

        try {
            const result = await window.qWallet.executeBatchCalls([
                {
                    endpoint: 'assets/create/asset',
                    params: assetParams
                }
            ]);

            if (result.successfulCalls === 0) {
                throw new Error('NFT creation failed. Please try again.');
            }

            console.log('✅ NFT minted:', result);
            return result;
        } catch (error) {
            console.error('Error minting NFT:', error);
            throw error;
        }
    }

    /**
     * Get a specific asset by address (public, no wallet needed)
     */
    async getAsset(address) {
        try {
            const result = await this.request('register/get/assets:asset', { address });
            return result.result || result;
        } catch (error) {
            console.error('Error getting asset:', error);
            throw error;
        }
    }

    /**
     * List all NFT assets on the blockchain (public browse)
     * Filters for distordia-type=nft
     */
    async listAllNFTs() {
        const params = {
            where: "results.distordia-type=nft"
        };

        try {
            const result = await this.request('register/list/assets:asset', params);
            return result.result || [];
        } catch (error) {
            console.error('Error listing NFTs:', error);
            return [];
        }
    }

    /**
     * List NFTs owned by the connected wallet user
     */
    async listUserNFTs() {
        this.requireWallet();

        try {
            const result = await window.qWallet.executeBatchCalls([
                {
                    endpoint: 'assets/list/asset',
                    params: {}
                }
            ]);

            if (result.successfulCalls === 0) {
                return [];
            }

            // Filter for NFT type assets
            const allAssets = result.results?.[0]?.result || [];
            return allAssets.filter(a => a['distordia-type'] === 'nft');
        } catch (error) {
            console.error('Error listing user NFTs:', error);
            return [];
        }
    }

    /**
     * List user's partial ownership of tokenized assets
     */
    async listPartialOwnership() {
        this.requireWallet();

        try {
            const result = await window.qWallet.executeBatchCalls([
                {
                    endpoint: 'assets/list/partial',
                    params: {}
                }
            ]);

            if (result.successfulCalls === 0) return [];
            return result.results?.[0]?.result || [];
        } catch (error) {
            console.error('Error listing partial ownership:', error);
            return [];
        }
    }

    // =========================================================================
    //  TOKENIZATION
    // =========================================================================

    /**
     * Create a token and tokenize the asset in a batch call
     * Step 1: finance/create/token  - creates the fungible token
     * Step 2: assets/tokenize/asset - links the token to the asset
     *
     * The token must exist before the tokenize call, so we do two sequential
     * batch calls (the user approves PIN once per batch).
     */
    async tokenizeNFT(assetAddress, tokenName, supply, decimals = 0) {
        this.requireWallet();

        // Step 1: Create the token
        try {
            console.log('Step 1: Creating token', tokenName);
            const tokenResult = await window.qWallet.executeBatchCalls([
                {
                    endpoint: 'finance/create/token',
                    params: {
                        name: tokenName,
                        supply: supply,
                        decimals: decimals
                    }
                }
            ]);

            if (tokenResult.successfulCalls === 0) {
                throw new Error('Token creation failed.');
            }

            console.log('✅ Token created:', tokenResult);
        } catch (error) {
            console.error('Error creating token:', error);
            throw new Error('Token creation failed: ' + error.message);
        }

        // Step 2: Tokenize the asset with the newly created token
        try {
            console.log('Step 2: Tokenizing asset with token', tokenName);
            const tokenizeResult = await window.qWallet.executeBatchCalls([
                {
                    endpoint: 'assets/tokenize/asset',
                    params: {
                        address: assetAddress,
                        token: tokenName     // use global token name
                    }
                }
            ]);

            if (tokenizeResult.successfulCalls === 0) {
                throw new Error('Asset tokenization failed. The token was created but not linked. You can retry tokenization from the NFT detail view.');
            }

            console.log('✅ Asset tokenized:', tokenizeResult);
            return tokenizeResult;
        } catch (error) {
            console.error('Error tokenizing asset:', error);
            throw error;
        }
    }

    /**
     * Verify if a token is linked to a tokenized asset
     */
    async verifyTokenizedAsset(tokenAddress) {
        try {
            const result = await this.request('assets/verify/partial', { token: tokenAddress });
            return result.result || result;
        } catch (error) {
            console.error('Error verifying tokenized asset:', error);
            return { valid: false };
        }
    }

    // =========================================================================
    //  MARKET ORDERS (Trading)
    // =========================================================================

    /**
     * Create an ASK order (sell NFT tokens for NXS)
     * market pair: TOKEN/NXS
     */
    async createAskOrder(tokenTicker, price, amount, fromAccount, toAccount = 'default') {
        this.requireWallet();

        const market = `${tokenTicker}/NXS`;

        try {
            const result = await window.qWallet.executeBatchCalls([
                {
                    endpoint: 'market/create/ask',
                    params: {
                        market: market,
                        price: price,
                        amount: amount,
                        from: fromAccount,
                        to: toAccount
                    }
                }
            ]);

            if (result.successfulCalls === 0) {
                throw new Error('Failed to create ask order.');
            }

            console.log('✅ Ask order created:', result);
            return result;
        } catch (error) {
            console.error('Error creating ask order:', error);
            throw error;
        }
    }

    /**
     * Create a BID order (buy NFT tokens with NXS)
     * market pair: TOKEN/NXS
     */
    async createBidOrder(tokenTicker, price, amount, fromAccount = 'default', toAccount) {
        this.requireWallet();

        const market = `${tokenTicker}/NXS`;

        try {
            const result = await window.qWallet.executeBatchCalls([
                {
                    endpoint: 'market/create/bid',
                    params: {
                        market: market,
                        price: price,
                        amount: amount,
                        from: fromAccount,
                        to: toAccount
                    }
                }
            ]);

            if (result.successfulCalls === 0) {
                throw new Error('Failed to create bid order.');
            }

            console.log('✅ Bid order created:', result);
            return result;
        } catch (error) {
            console.error('Error creating bid order:', error);
            throw error;
        }
    }

    /**
     * Execute (fill) an existing market order
     */
    async executeOrder(txid, fromAccount, toAccount) {
        this.requireWallet();

        try {
            const result = await window.qWallet.executeBatchCalls([
                {
                    endpoint: 'market/execute/order',
                    params: {
                        txid: txid,
                        from: fromAccount,
                        to: toAccount
                    }
                }
            ]);

            if (result.successfulCalls === 0) {
                throw new Error('Failed to execute order.');
            }

            console.log('✅ Order executed:', result);
            return result;
        } catch (error) {
            console.error('Error executing order:', error);
            throw error;
        }
    }

    /**
     * Cancel an active market order
     */
    async cancelOrder(txid) {
        this.requireWallet();

        try {
            const result = await window.qWallet.executeBatchCalls([
                {
                    endpoint: 'market/cancel/order',
                    params: { txid: txid }
                }
            ]);

            if (result.successfulCalls === 0) {
                throw new Error('Failed to cancel order.');
            }

            console.log('✅ Order cancelled:', result);
            return result;
        } catch (error) {
            console.error('Error cancelling order:', error);
            throw error;
        }
    }

    /**
     * List market orders for a specific token pair (public)
     */
    async listMarketOrders(tokenTicker) {
        const market = `${tokenTicker}/NXS`;

        try {
            const result = await this.request('market/list/order', { market: market });
            return result.result || result;
        } catch (error) {
            console.error('Error listing market orders:', error);
            return { bids: [], asks: [] };
        }
    }

    /**
     * Get user's own market orders
     */
    async listUserOrders(tokenAddress) {
        this.requireWallet();

        try {
            const result = await window.qWallet.executeBatchCalls([
                {
                    endpoint: 'market/user/order',
                    params: { token: tokenAddress }
                }
            ]);

            if (result.successfulCalls === 0) return { orders: [], executed: [] };
            return result.results?.[0]?.result || { orders: [], executed: [] };
        } catch (error) {
            console.error('Error listing user orders:', error);
            return { orders: [], executed: [] };
        }
    }

    // =========================================================================
    //  TRANSFER / CLAIM (direct asset transfer without market)
    // =========================================================================

    /**
     * Transfer asset directly to another user
     */
    async transferAsset(assetAddress, recipient) {
        this.requireWallet();

        try {
            const result = await window.qWallet.executeBatchCalls([
                {
                    endpoint: 'assets/transfer/asset',
                    params: {
                        address: assetAddress,
                        recipient: recipient
                    }
                }
            ]);

            if (result.successfulCalls === 0) {
                throw new Error('Asset transfer failed.');
            }

            console.log('✅ Asset transferred:', result);
            return result;
        } catch (error) {
            console.error('Error transferring asset:', error);
            throw error;
        }
    }

    // =========================================================================
    //  ASSET HISTORY
    // =========================================================================

    /**
     * Get ownership and modification history of an asset
     */
    async getAssetHistory(address) {
        try {
            const result = await this.request('assets/history/asset', { address });
            return result.result || [];
        } catch (error) {
            console.error('Error getting asset history:', error);
            return [];
        }
    }

    // =========================================================================
    //  HELPERS
    // =========================================================================

    /**
     * Parse a raw blockchain asset object into a clean NFT data structure
     */
    parseAssetToNFT(asset) {
        return {
            // System fields
            address: asset.address,
            owner: asset.owner,
            created: asset.created,
            modified: asset.modified,
            type: asset.type,
            name: asset.name || '',

            // NFT metadata
            nftName: asset['nft-name'] || asset.name || 'Untitled',
            description: asset.description || '',
            image: asset.image || '',
            category: asset.category || 'other',
            collection: asset.collection || '',
            creator: asset.creator || '',
            externalUrl: asset.external_url || '',

            // Status
            distordiaType: asset['distordia-type'] || '',
            status: asset.status || 'active',

            // Tokenization info (populated separately)
            tokenized: false,
            tokenAddress: null,
            tokenTicker: null,
            tokenSupply: null,

            // Market info (populated separately)
            listed: false,
            askPrice: null,
            asks: [],
            bids: []
        };
    }

    /**
     * Format a UNIX timestamp to a human-readable string
     */
    formatDate(timestamp) {
        const date = new Date(timestamp * 1000);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Create a URL-safe slug from a string
     */
    slugify(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 32);
    }

    /**
     * Truncate an address for display
     */
    truncateAddress(address, chars = 8) {
        if (!address) return '';
        if (address.length <= chars * 2 + 3) return address;
        return `${address.substring(0, chars)}...${address.substring(address.length - chars)}`;
    }

    /**
     * Ensure Q-Wallet is available
     */
    requireWallet() {
        if (typeof window.qWallet === 'undefined') {
            throw new Error('Q-Wallet extension not found. Please install Q-Wallet.');
        }
    }

    /**
     * Client-side filter for NFT list
     */
    filterNFTs(nfts, filters) {
        let filtered = [...nfts];

        if (filters.search) {
            const s = filters.search.toLowerCase();
            filtered = filtered.filter(n =>
                n.nftName.toLowerCase().includes(s) ||
                n.description.toLowerCase().includes(s) ||
                n.collection.toLowerCase().includes(s) ||
                n.creator.toLowerCase().includes(s) ||
                (n.address && n.address.toLowerCase().includes(s))
            );
        }

        if (filters.category) {
            filtered = filtered.filter(n => n.category === filters.category);
        }

        if (filters.status === 'listed') {
            filtered = filtered.filter(n => n.listed);
        } else if (filters.status === 'unlisted') {
            filtered = filtered.filter(n => !n.listed && !n.tokenized);
        } else if (filters.status === 'tokenized') {
            filtered = filtered.filter(n => n.tokenized);
        }

        // Sorting
        if (filters.sort === 'newest') {
            filtered.sort((a, b) => (b.created || 0) - (a.created || 0));
        } else if (filters.sort === 'oldest') {
            filtered.sort((a, b) => (a.created || 0) - (b.created || 0));
        } else if (filters.sort === 'price-low') {
            filtered.sort((a, b) => (a.askPrice || Infinity) - (b.askPrice || Infinity));
        } else if (filters.sort === 'price-high') {
            filtered.sort((a, b) => (b.askPrice || 0) - (a.askPrice || 0));
        }

        return filtered;
    }
}

// Initialize API
const nexusAPI = new NexusAPI();
