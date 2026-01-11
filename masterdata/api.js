/**
 * Nexus Blockchain API Module
 * Handles all interactions with the Nexus blockchain API
 */

class NexusAPI {
    constructor(baseURL = 'https://api.distordia.com') {
        this.baseURL = baseURL;
    }

    /**
     * Make API request to Nexus blockchain
     */
    async request(endpoint, params = {}, method = 'POST') {
        const url = `${this.baseURL}/${endpoint}`;
        
        try {
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                }
            };

            if (method === 'POST' && Object.keys(params).length > 0) {
                options.body = JSON.stringify(params);
            }

            const response = await fetch(url, options);
            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(data.error?.message || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    }

    /**
     * Create a new product asset on the blockchain via Q-Wallet
     * Uses executeBatchCalls to prompt user for PIN approval
     * Creates a basic format asset (not JSON)
     */
    async createProduct(productData) {
        // Prepare the asset data in basic format using the new schema
        const assetParams = {
            format: 'basic',
            name: `product-${productData['art-nr']}`,

            // Public address field
            'asset-address': '', // Let the system generate the address (not displayed/private in register/list/assets:asset call), update this field later accordingly
            
            // Distordia standard fields
            'distordia-type': 'product',
            'status': 'valid',
            
            // Identification
            'art-nr': productData['art-nr'],
            
            // Classification
            'category': productData.category,
            
            // Description
            'description': productData.description,
            'manufacturer': productData.manufacturer,
            
            // Physical Properties
            'UOM': productData.UOM
        };

        // Add optional fields only if they have values
        if (productData.GTIN) assetParams.GTIN = productData.GTIN;
        if (productData.brand) assetParams.brand = productData.brand;
        if (productData.subcategory) assetParams.subcategory = productData.subcategory;
        if (productData.GPC) assetParams.GPC = productData.GPC;
        if (productData.HSCode) assetParams.HSCode = productData.HSCode;
        if (productData.origin) assetParams.origin = productData.origin;
        if (productData.weight) assetParams.weight = productData.weight;
        if (productData.hazardous) assetParams.hazardous = productData.hazardous;
        if (productData.perishable) assetParams.perishable = productData.perishable;
        if (productData.shelflife) assetParams.shelflife = productData.shelflife;
        if (productData.url) assetParams.url = productData.url;
        if (productData.replaces) assetParams.replaces = productData.replaces;

        // Check if Q-Wallet is available
        if (typeof window.nexus === 'undefined') {
            throw new Error('Q-Wallet extension not found. Please install Q-Wallet.');
        }

        try {
            // Use Q-Wallet's executeBatchCalls to create the asset
            // This prompts the user for PIN approval
            const result = await window.nexus.executeBatchCalls([
                {
                    endpoint: 'assets/create/asset',
                    params: assetParams
                }
            ]);

            if (result.successfulCalls === 0) {
                throw new Error('Asset creation failed. Please try again.');
            }

            return result;
        } catch (error) {
            console.error('Error creating product:', error);
            throw error;
        }
    }

    /**
     * Get a specific product by address or name
     */
    async getProduct(identifier, isAddress = true) {
        const params = {};
        
        if (isAddress) {
            params.address = identifier;
        } else {
            params.name = identifier;
        }

        try {
            const result = await this.request('register/get/assets:asset', params);
            return result.result || result;
        } catch (error) {
            console.error('Error getting product:', error);
            throw error;
        }
    }

    /**
     * List all products (assets) on the blockchain
     * Note: This will return all assets, we'll need to filter for products
     */
    async listAllProducts() {
        const params = {
            where: "results.distordia-type=product AND results.distordia-status=valid"
        };

        try {
            const result = await this.request('register/list/assets:asset', params);
            return result.result || [];
        } catch (error) {
            console.error('Error listing products:', error);
            return [];
        }
    }

    /**
     * List products owned by the connected wallet user
     * Uses Q-Wallet to authenticate
     */
    async listUserProducts() {
        // Check if Q-Wallet is available
        if (typeof window.nexus === 'undefined') {
            throw new Error('Q-Wallet extension not found. Please install Q-Wallet.');
        }

        try {
            // Use Q-Wallet's executeBatchCalls to list assets
            const result = await window.nexus.executeBatchCalls([
                {
                    endpoint: 'assets/list/asset',
                    params: {}
                }
            ]);

            if (result.successfulCalls === 0) {
                console.warn('No assets found or failed to list assets');
                return [];
            }

            return result.results?.[0]?.result || [];
        } catch (error) {
            console.error('Error listing user products:', error);
            return [];
        }
    }

    /**
     * Update an existing product via Q-Wallet
     * Uses executeBatchCalls to prompt user for PIN approval
     * Updates using basic format (not JSON)
     */
    async updateProduct(address, updates) {
        // Prepare the update parameters in basic format
        const updateParams = {
            format: 'basic',
            address: address,
            ...updates  // Spread all update fields directly
        };

        // Check if Q-Wallet is available
        if (typeof window.nexus === 'undefined') {
            throw new Error('Q-Wallet extension not found. Please install Q-Wallet.');
        }

        try {
            // Use Q-Wallet's executeBatchCalls to update the asset
            const result = await window.nexus.executeBatchCalls([
                {
                    endpoint: 'assets/update/asset',
                    params: updateParams
                }
            ]);

            if (result.successfulCalls === 0) {
                throw new Error('Asset update failed. Please try again.');
            }

            return result;
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    }

    /**
     * Transfer product ownership to another user via Q-Wallet
     * Uses executeBatchCalls to prompt user for PIN approval
     */
    async transferProduct(address, recipient) {
        // Check if Q-Wallet is available
        if (typeof window.nexus === 'undefined') {
            throw new Error('Q-Wallet extension not found. Please install Q-Wallet.');
        }

        try {
            // Use Q-Wallet's executeBatchCalls to transfer the asset
            const result = await window.nexus.executeBatchCalls([
                {
                    endpoint: 'assets/transfer/asset',
                    params: {
                        address: address,
                        username: recipient  // or genesis/namespace of recipient
                    }
                }
            ]);

            if (result.successfulCalls === 0) {
                throw new Error('Asset transfer failed. Please try again.');
            }

            return result;
        } catch (error) {
            console.error('Error transferring product:', error);
            throw error;
        }
    }

    /**
     * Get transaction history for a product
     */
    async getProductHistory(address) {
        const params = {
            address: address
        };

        try {
            const result = await this.request('assets/history/asset', params);
            return result.result || [];
        } catch (error) {
            console.error('Error getting product history:', error);
            return [];
        }
    }

    /**
     * Search products by category or other filters
     * Note: This is a client-side filter since blockchain doesn't support complex queries
     */
    filterProducts(products, filters) {
        let filtered = [...products];

        // Filter by category (partial match)
        if (filters.category && filters.category !== '') {
            const categoryLower = filters.category.toLowerCase();
            filtered = filtered.filter(p => 
                (p.category && p.category.toLowerCase().includes(categoryLower)) ||
                (p.subcategory && p.subcategory.toLowerCase().includes(categoryLower))
            );
        }

        // Filter by search term
        if (filters.search && filters.search !== '') {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(p => 
                (p.description && p.description.toLowerCase().includes(searchLower)) ||
                (p['art-nr'] && p['art-nr'].toLowerCase().includes(searchLower)) ||
                (p.sku && p.sku.toLowerCase().includes(searchLower)) ||
                (p.manufacturer && p.manufacturer.toLowerCase().includes(searchLower)) ||
                (p.brand && p.brand.toLowerCase().includes(searchLower)) ||
                (p.GTIN && p.GTIN.includes(searchLower)) ||
                (p.category && p.category.toLowerCase().includes(searchLower))
            );
        }

        // Filter by owner
        if (filters.owner && filters.owner === 'mine' && walletAuth && walletAuth.account) {
            filtered = filtered.filter(p => p.owner === walletAuth.account);
        }

        return filtered;
    }

    /**
     * Parse asset data to product format
     */
    parseAssetToProduct(asset) {
        // Extract all fields from the new schema
        const product = {
            // System fields (auto-generated by Nexus)
            address: asset.address,
            owner: asset.owner,
            created: asset.created,
            modified: asset.modified,
            version: asset.version,
            
            // Distordia standard fields
            'distordia-type': asset['distordia-type'] || 'product',
            'distordia-status': asset['distordia-status'] || 'valid',
            
            // Identification
            'art-nr': asset['art-nr'] || asset.sku || '',
            'GTIN': asset.GTIN || asset.barcode || '',
            'brand': asset.brand || '',
            
            // Classification
            category: asset.category || '',
            subcategory: asset.subcategory || '',
            GPC: asset.GPC || '',
            HSCode: asset.HSCode || '',
            
            // Description
            description: asset.description || '',
            manufacturer: asset.manufacturer || '',
            origin: asset.origin || '',
            
            // Physical Properties
            UOM: asset.UOM || asset.unit || '',
            weight: asset.weight || 0,
            hazardous: asset.hazardous || false,
            perishable: asset.perishable || false,
            shelflife: asset.shelflife || 0,
            
            // References
            url: asset.url || '',
            replaces: asset.replaces || '',
            
            // Legacy field support
            name: asset.name || '',
            sku: asset.sku || asset['art-nr'] || ''
        };

        return product;
    }

    /**
     * Format timestamp to readable date
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
}

// Initialize API
const nexusAPI = new NexusAPI();
