/**
 * Nexus Blockchain API Module for Content Verification
 */

class ContentVerificationAPI {
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
     * Search for content by URL
     * Looks for assets with attributes: {"distordia": "content", "url": <url>}
     */
    async verifyContentByURL(url) {
        try {
            // List all assets (in production, this would need filtering)
            const result = await this.request('register/list/assets:asset', {
                limit: 1000
            });

            const assets = result.result || [];

            // Filter for content assets matching the URL
            const matchingAsset = assets.find(asset => {
                return asset.distordia === 'content' && asset.url === url;
            });

            return matchingAsset || null;
        } catch (error) {
            console.error('Error verifying content:', error);
            throw error;
        }
    }

    /**
     * Get detailed asset information
     */
    async getAssetDetails(address) {
        try {
            const result = await this.request('assets/get/asset', {
                address: address
            });

            return result.result || result;
        } catch (error) {
            console.error('Error getting asset details:', error);
            throw error;
        }
    }

    /**
     * Get transaction history for an asset
     */
    async getAssetHistory(address) {
        try {
            const result = await this.request('assets/history/asset', {
                address: address
            });

            return result.result || [];
        } catch (error) {
            console.error('Error getting asset history:', error);
            return [];
        }
    }

    /**
     * Format timestamp to readable date
     */
    formatDate(timestamp) {
        const date = new Date(timestamp * 1000);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Shorten address for display
     */
    shortenAddress(address) {
        if (!address || address.length < 16) return address;
        return `${address.substring(0, 12)}...${address.substring(address.length - 8)}`;
    }
}

// Initialize API
const contentAPI = new ContentVerificationAPI();
