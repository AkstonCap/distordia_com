// Nexus API Interface for Distordia Social

const nexusAPI = {
    baseURL: 'https://api.distordia.com',
    
    // Query the blockchain
    async query(queryString, params = {}) {
        try {
            const endpoint = `${this.baseURL}/${queryString}`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(params)
            });
            
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error.message || 'API error');
            }
            
            return data.result || [];
        } catch (error) {
            console.error('Query error:', error);
            throw error;
        }
    },
    
    // Create a new asset (post)
    async createAsset(assetData) {
        try {
            // Check if Q-Wallet is available
            if (typeof window.qWallet === 'undefined') {
                throw new Error('Q-Wallet not detected');
            }
            
            // Get session from wallet
            const session = sessionStorage.getItem('nexus_session');
            const genesis = sessionStorage.getItem('nexus_genesis');
            
            if (!session || !genesis) {
                throw new Error('Not authenticated. Please connect your wallet.');
            }
            
            // Create asset via Nexus API
            const endpoint = `${this.baseURL}/assets/create/asset`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    session: session,
                    data: assetData
                })
            });
            
            if (!response.ok) {
                throw new Error(`Failed to create asset: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.error) {
                throw new Error(result.error.message || 'Failed to create asset');
            }
            
            return {
                success: true,
                txid: result.result?.txid,
                address: result.result?.address
            };
        } catch (error) {
            console.error('Create asset error:', error);
            throw error;
        }
    },
    
    // Get asset details
    async getAsset(address) {
        try {
            const endpoint = `${this.baseURL}/assets/get/asset/${address}`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to get asset: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error.message || 'API error');
            }
            
            return data.result;
        } catch (error) {
            console.error('Get asset error:', error);
            throw error;
        }
    },
    
    // List assets by filter
    async listAssets(where, limit = 100, offset = 0) {
        try {
            const query = `register/list/assets:asset WHERE ${where}`;
            return await this.query(query);
        } catch (error) {
            console.error('List assets error:', error);
            throw error;
        }
    }
};
