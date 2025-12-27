/**
 * Nexus Blockchain API Module
 * Handles all interactions with the Nexus blockchain API
 */

class NexusAPI {
    constructor(baseURL = 'https://api.distordia.com') {
        this.baseURL = baseURL;
        this.session = null;
        this.username = null;
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
     * Create a new product asset on the blockchain
     */
    async createProduct(productData, pin, session) {
        // Prepare the asset data in JSON format
        const assetData = {
            name: productData.name,
            sku: productData.sku,
            category: productData.category,
            subcategory: productData.subcategory || '',
            description: productData.description || '',
            manufacturer: productData.manufacturer || '',
            origin: productData.origin || '',
            barcode: productData.barcode || '',
            weight: productData.weight || 0,
            ...productData.attributes
        };

        const params = {
            pin: pin,
            session: session,
            format: 'JSON',
            json: JSON.stringify(assetData),
            name: `product-${productData.sku}` // Name the asset for easy lookup
        };

        try {
            const result = await this.request('assets/create/asset', params);
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
     * List products owned by a specific user
     */
    async listUserProducts(session, pin) {
        const params = {
            session: session,
            pin: pin
        };

        try {
            const result = await this.request('assets/list/asset', params);
            return result.result || [];
        } catch (error) {
            console.error('Error listing user products:', error);
            return [];
        }
    }

    /**
     * Update an existing product
     */
    async updateProduct(address, updates, pin, session) {
        const params = {
            pin: pin,
            session: session,
            address: address,
            format: 'JSON',
            json: JSON.stringify(updates)
        };

        try {
            const result = await this.request('assets/update/asset', params);
            return result;
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    }

    /**
     * Transfer product ownership to another user
     */
    async transferProduct(address, recipient, pin, session) {
        const params = {
            pin: pin,
            session: session,
            address: address,
            username: recipient // or address of recipient
        };

        try {
            const result = await this.request('assets/transfer/asset', params);
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

        // Filter by category
        if (filters.category && filters.category !== '') {
            filtered = filtered.filter(p => 
                p.category && p.category.toLowerCase() === filters.category.toLowerCase()
            );
        }

        // Filter by search term
        if (filters.search && filters.search !== '') {
            const searchLower = filters.search.toLowerCase();
            filtered = filtered.filter(p => 
                (p.name && p.name.toLowerCase().includes(searchLower)) ||
                (p.sku && p.sku.toLowerCase().includes(searchLower)) ||
                (p.description && p.description.toLowerCase().includes(searchLower))
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
        // Extract standard fields and custom fields
        const product = {
            address: asset.address,
            owner: asset.owner,
            created: asset.created,
            modified: asset.modified,
            name: asset.name || '',
            sku: asset.sku || asset['art-nr'] || '', // Support both sku and art-nr
            category: asset.category || '',
            subcategory: asset.subcategory || '',
            description: asset.description || '',
            manufacturer: asset.manufacturer || '',
            origin: asset.origin || '',
            barcode: asset.barcode || '',
            weight: asset.weight || 0,
            url: asset.url || ''
        };

        // Add any additional custom fields
        Object.keys(asset).forEach(key => {
            if (!['address', 'owner', 'created', 'modified', 'version', 'type', 'form', 'distordia-type', 'distordia-status'].includes(key)) {
                if (!product[key]) {
                    product[key] = asset[key];
                }
            }
        });

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
