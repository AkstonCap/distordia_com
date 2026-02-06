/**
 * NFT Marketplace - Main Application Module
 * Handles UI rendering, event coordination, and user interactions
 */

class NFTMarketplace {
    constructor() {
        this.nfts = [];
        this.userNfts = [];
        this.showingUserOnly = false;
        this.currentFilters = {
            search: '',
            category: '',
            status: '',
            sort: 'newest'
        };

        this.initEventListeners();
        this.loadNFTs();
    }

    // =========================================================================
    //  EVENT LISTENERS
    // =========================================================================

    initEventListeners() {
        // Wallet connection changes
        window.addEventListener('walletConnectionChange', (e) => {
            this.onWalletConnectionChange(e.detail);
        });

        // Mint button
        const mintBtn = document.getElementById('mintNftBtn');
        if (mintBtn) mintBtn.addEventListener('click', () => this.openMintModal());

        // My NFTs toggle
        const myNftsBtn = document.getElementById('myNftsBtn');
        if (myNftsBtn) myNftsBtn.addEventListener('click', () => this.toggleMyNFTs());

        // Info button
        const infoBtn = document.getElementById('infoBtn');
        if (infoBtn) infoBtn.addEventListener('click', () => this.openModal('infoModal'));

        // Search
        const searchBtn = document.getElementById('searchBtn');
        const searchInput = document.getElementById('searchInput');
        if (searchBtn) searchBtn.addEventListener('click', () => this.handleSearch());
        if (searchInput) searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });

        // Filters
        const categoryFilter = document.getElementById('categoryFilter');
        const statusFilter = document.getElementById('statusFilter');
        const sortFilter = document.getElementById('sortFilter');
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');

        if (categoryFilter) categoryFilter.addEventListener('change', () => this.applyFilters());
        if (statusFilter) statusFilter.addEventListener('change', () => this.applyFilters());
        if (sortFilter) sortFilter.addEventListener('change', () => this.applyFilters());
        if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', () => this.clearFilters());

        // Mint form
        const mintForm = document.getElementById('mintForm');
        if (mintForm) mintForm.addEventListener('submit', (e) => this.handleMint(e));

        // Image URL preview
        const imageUrlInput = document.getElementById('nftImageUrl');
        if (imageUrlInput) {
            imageUrlInput.addEventListener('change', () => this.previewImage());
            imageUrlInput.addEventListener('blur', () => this.previewImage());
        }

        // Description character counter
        const descInput = document.getElementById('nftDescription');
        if (descInput) {
            descInput.addEventListener('input', () => {
                const counter = document.getElementById('descCharCount');
                if (counter) counter.textContent = descInput.value.length;
            });
        }

        // Tokenize form
        const tokenizeForm = document.getElementById('tokenizeForm');
        if (tokenizeForm) tokenizeForm.addEventListener('submit', (e) => this.handleTokenize(e));

        // List form
        const listForm = document.getElementById('listForm');
        if (listForm) listForm.addEventListener('submit', (e) => this.handleList(e));

        // Buy form
        const buyForm = document.getElementById('buyForm');
        if (buyForm) buyForm.addEventListener('submit', (e) => this.handleBuy(e));

        // Modal close buttons
        document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
            btn.addEventListener('click', () => this.closeModals());
        });

        // Click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModals();
            });
        });
    }

    // =========================================================================
    //  WALLET CONNECTION HANDLING
    // =========================================================================

    onWalletConnectionChange(detail) {
        const mintBtn = document.getElementById('mintNftBtn');
        const myNftsBtn = document.getElementById('myNftsBtn');

        if (detail.connected) {
            if (mintBtn) {
                mintBtn.disabled = false;
                mintBtn.title = 'Create a new NFT';
            }
            if (myNftsBtn) {
                myNftsBtn.disabled = false;
                myNftsBtn.title = 'View your NFTs';
            }
        } else {
            if (mintBtn) {
                mintBtn.disabled = true;
                mintBtn.title = 'Connect wallet to mint';
            }
            if (myNftsBtn) {
                myNftsBtn.disabled = true;
                myNftsBtn.title = 'Connect wallet to view';
            }

            // If showing user NFTs, switch back to all
            if (this.showingUserOnly) {
                this.showingUserOnly = false;
                this.displayNFTs(this.getFilteredNFTs());
            }
        }
    }

    // =========================================================================
    //  DATA LOADING
    // =========================================================================

    async loadNFTs() {
        this.showLoading(true);

        try {
            const assets = await nexusAPI.listAllNFTs();
            console.log('✅ NFTs loaded from blockchain:', assets.length);

            if (!assets || assets.length === 0) {
                this.nfts = [];
                this.showEmpty();
                return;
            }

            // Parse all assets to NFT objects
            this.nfts = assets.map(a => nexusAPI.parseAssetToNFT(a));
            this.displayNFTs(this.getFilteredNFTs());
        } catch (error) {
            console.error('Error loading NFTs:', error);
            this.nfts = [];
            this.showEmpty();
        }
    }

    async loadUserNFTs() {
        if (!walletAuth.connected) return;

        try {
            const assets = await nexusAPI.listUserNFTs();
            this.userNfts = assets.map(a => nexusAPI.parseAssetToNFT(a));
            console.log('✅ User NFTs loaded:', this.userNfts.length);
        } catch (error) {
            console.error('Error loading user NFTs:', error);
            this.userNfts = [];
        }
    }

    // =========================================================================
    //  DISPLAY / RENDERING
    // =========================================================================

    displayNFTs(nfts) {
        const grid = document.getElementById('nftGrid');
        const emptyState = document.getElementById('emptyState');
        const loadingState = document.getElementById('loadingState');

        if (loadingState) loadingState.style.display = 'none';

        if (!grid) return;

        if (nfts.length === 0) {
            grid.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        grid.innerHTML = nfts.map(nft => this.renderNFTCard(nft)).join('');

        // Attach click handlers to cards
        grid.querySelectorAll('.nft-card').forEach(card => {
            card.addEventListener('click', () => {
                const address = card.dataset.address;
                const nft = nfts.find(n => n.address === address);
                if (nft) this.openDetailModal(nft);
            });
        });
    }

    renderNFTCard(nft) {
        const statusBadge = nft.listed
            ? '<span class="nft-badge nft-badge-status badge-listed">Listed</span>'
            : nft.tokenized
                ? '<span class="nft-badge nft-badge-status badge-tokenized">Tokenized</span>'
                : '<span class="nft-badge nft-badge-status badge-raw">Asset</span>';

        const categoryLabel = nft.category ? nft.category.charAt(0).toUpperCase() + nft.category.slice(1) : '';

        const priceDisplay = nft.listed && nft.askPrice
            ? `<div class="nft-card-price">
                 <span class="price-label">Price</span>
                 ${nft.askPrice} NXS
               </div>`
            : `<div class="nft-card-price" style="opacity: 0.4;">
                 <span class="price-label">Price</span>
                 —
               </div>`;

        const creatorDisplay = nft.creator
            ? `<div class="nft-card-creator">
                 <span class="creator-label">Creator</span>
                 ${this.escapeHtml(nft.creator)}
               </div>`
            : `<div class="nft-card-creator">
                 <span class="creator-label">Owner</span>
                 ${nexusAPI.truncateAddress(nft.owner)}
               </div>`;

        return `
            <div class="nft-card" data-address="${nft.address}">
                <div class="nft-card-image">
                    ${nft.image
                        ? `<img src="${this.escapeHtml(nft.image)}" alt="${this.escapeHtml(nft.nftName)}" 
                               onerror="this.parentElement.innerHTML='<div class=\\'image-error\\'>🖼️</div>'"
                               loading="lazy">`
                        : '<div class="image-error">🖼️</div>'
                    }
                    ${statusBadge}
                    ${categoryLabel ? `<span class="nft-badge nft-badge-category">${categoryLabel}</span>` : ''}
                </div>
                <div class="nft-card-body">
                    <div class="nft-card-name">${this.escapeHtml(nft.nftName)}</div>
                    ${nft.collection ? `<div class="nft-card-collection">${this.escapeHtml(nft.collection)}</div>` : ''}
                    <div class="nft-card-description">${this.escapeHtml(nft.description)}</div>
                    <div class="nft-card-footer">
                        ${priceDisplay}
                        ${creatorDisplay}
                    </div>
                </div>
            </div>
        `;
    }

    showLoading(show) {
        const loadingState = document.getElementById('loadingState');
        const nftGrid = document.getElementById('nftGrid');
        const emptyState = document.getElementById('emptyState');

        if (loadingState) loadingState.style.display = show ? 'flex' : 'none';
        if (nftGrid && show) nftGrid.innerHTML = '';
        if (emptyState) emptyState.style.display = 'none';
    }

    showEmpty() {
        const loadingState = document.getElementById('loadingState');
        const emptyState = document.getElementById('emptyState');
        const nftGrid = document.getElementById('nftGrid');

        if (loadingState) loadingState.style.display = 'none';
        if (nftGrid) nftGrid.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
    }

    // =========================================================================
    //  FILTERS
    // =========================================================================

    handleSearch() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            this.currentFilters.search = searchInput.value.trim();
        }
        this.displayNFTs(this.getFilteredNFTs());
    }

    applyFilters() {
        const categoryFilter = document.getElementById('categoryFilter');
        const statusFilter = document.getElementById('statusFilter');
        const sortFilter = document.getElementById('sortFilter');

        if (categoryFilter) this.currentFilters.category = categoryFilter.value;
        if (statusFilter) this.currentFilters.status = statusFilter.value;
        if (sortFilter) this.currentFilters.sort = sortFilter.value;

        this.displayNFTs(this.getFilteredNFTs());
    }

    clearFilters() {
        this.currentFilters = { search: '', category: '', status: '', sort: 'newest' };

        const searchInput = document.getElementById('searchInput');
        const categoryFilter = document.getElementById('categoryFilter');
        const statusFilter = document.getElementById('statusFilter');
        const sortFilter = document.getElementById('sortFilter');

        if (searchInput) searchInput.value = '';
        if (categoryFilter) categoryFilter.value = '';
        if (statusFilter) statusFilter.value = '';
        if (sortFilter) sortFilter.value = 'newest';

        this.displayNFTs(this.getFilteredNFTs());
    }

    getFilteredNFTs() {
        const source = this.showingUserOnly ? this.userNfts : this.nfts;
        return nexusAPI.filterNFTs(source, this.currentFilters);
    }

    async toggleMyNFTs() {
        const myNftsBtn = document.getElementById('myNftsBtn');

        if (this.showingUserOnly) {
            // Switch back to all
            this.showingUserOnly = false;
            if (myNftsBtn) myNftsBtn.textContent = '📦 My NFTs';
            this.displayNFTs(this.getFilteredNFTs());
        } else {
            // Switch to user's NFTs
            this.showingUserOnly = true;
            if (myNftsBtn) myNftsBtn.textContent = '🌐 All NFTs';
            this.showLoading(true);
            await this.loadUserNFTs();
            this.displayNFTs(this.getFilteredNFTs());
        }
    }

    // =========================================================================
    //  MINTING
    // =========================================================================

    openMintModal() {
        if (!walletAuth.connected) {
            this.notify('Please connect your wallet first.', 'error');
            return;
        }

        const form = document.getElementById('mintForm');
        if (form) form.reset();

        const preview = document.getElementById('imagePreview');
        if (preview) preview.style.display = 'none';

        const counter = document.getElementById('descCharCount');
        if (counter) counter.textContent = '0';

        this.openModal('mintModal');
    }

    previewImage() {
        const urlInput = document.getElementById('nftImageUrl');
        const preview = document.getElementById('imagePreview');
        const previewImg = document.getElementById('previewImg');

        if (!urlInput || !preview || !previewImg) return;

        const url = urlInput.value.trim();
        if (url && this.isValidUrl(url)) {
            previewImg.src = url;
            previewImg.onerror = () => {
                preview.style.display = 'none';
            };
            previewImg.onload = () => {
                preview.style.display = 'block';
            };
        } else {
            preview.style.display = 'none';
        }
    }

    async handleMint(e) {
        e.preventDefault();

        if (!walletAuth.connected) {
            this.notify('Please connect your wallet first.', 'error');
            return;
        }

        const nftData = {
            name: document.getElementById('nftName').value.trim(),
            description: document.getElementById('nftDescription').value.trim(),
            image: document.getElementById('nftImageUrl').value.trim(),
            category: document.getElementById('nftCategory').value,
            collection: document.getElementById('nftCollection').value.trim(),
            creator: document.getElementById('nftCreator').value.trim(),
            external_url: document.getElementById('nftExternalUrl').value.trim()
        };

        // Validate image URL
        if (!this.isValidUrl(nftData.image)) {
            this.notify('Please enter a valid image URL.', 'error');
            return;
        }

        // Disable submit button
        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Minting...';
        }

        try {
            await nexusAPI.mintNFT(nftData);
            this.notify('🎉 NFT minted successfully! It may take a moment to appear.', 'success');
            this.closeModals();

            // Reload after a delay to let the blockchain process
            setTimeout(() => this.loadNFTs(), 3000);
        } catch (error) {
            this.notify('Minting failed: ' + error.message, 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '🚀 Mint NFT';
            }
        }
    }

    // =========================================================================
    //  DETAIL VIEW
    // =========================================================================

    openDetailModal(nft) {
        const content = document.getElementById('detailContent');
        if (!content) return;

        const isOwner = walletAuth.connected && walletAuth.account && nft.owner === walletAuth.account;

        content.innerHTML = `
            <div class="nft-detail">
                <div class="nft-detail-image">
                    ${nft.image
                        ? `<img src="${this.escapeHtml(nft.image)}" alt="${this.escapeHtml(nft.nftName)}"
                               onerror="this.parentElement.innerHTML='<div class=\\'image-error\\' style=\\'font-size:5rem;display:flex;align-items:center;justify-content:center;height:100%\\'>🖼️</div>'">`
                        : '<div class="image-error" style="font-size:5rem;display:flex;align-items:center;justify-content:center;height:300px;">🖼️</div>'
                    }
                </div>
                <div class="nft-detail-info">
                    <div class="nft-detail-name">${this.escapeHtml(nft.nftName)}</div>
                    ${nft.collection ? `<div class="nft-detail-collection">📁 ${this.escapeHtml(nft.collection)}</div>` : ''}
                    <div class="nft-detail-description">${this.escapeHtml(nft.description)}</div>

                    <div class="nft-detail-meta">
                        <div class="meta-item">
                            <div class="meta-label">Category</div>
                            <div class="meta-value">${this.escapeHtml(nft.category || 'N/A')}</div>
                        </div>
                        <div class="meta-item">
                            <div class="meta-label">Creator</div>
                            <div class="meta-value">${this.escapeHtml(nft.creator || nexusAPI.truncateAddress(nft.owner))}</div>
                        </div>
                        <div class="meta-item">
                            <div class="meta-label">Created</div>
                            <div class="meta-value">${nft.created ? nexusAPI.formatDate(nft.created) : 'N/A'}</div>
                        </div>
                        <div class="meta-item">
                            <div class="meta-label">Status</div>
                            <div class="meta-value">${nft.listed ? '📢 Listed' : nft.tokenized ? '🪙 Tokenized' : '📦 Asset'}</div>
                        </div>
                        <div class="meta-item">
                            <div class="meta-label">Asset Address</div>
                            <div class="meta-value" style="font-size:0.75rem;">${nft.address || 'N/A'}</div>
                        </div>
                        <div class="meta-item">
                            <div class="meta-label">Owner</div>
                            <div class="meta-value" style="font-size:0.75rem;">${nexusAPI.truncateAddress(nft.owner)}</div>
                        </div>
                    </div>

                    ${nft.externalUrl ? `
                        <div style="margin-top: 0.5rem;">
                            <a href="${this.escapeHtml(nft.externalUrl)}" target="_blank" rel="noopener" 
                               style="color: var(--primary-color); font-size: 0.85rem;">
                                🔗 External Link
                            </a>
                        </div>
                    ` : ''}

                    ${nft.image ? `
                        <div style="margin-top: 0.5rem;">
                            <a href="${this.escapeHtml(nft.image)}" target="_blank" rel="noopener" 
                               style="color: var(--text-secondary); font-size: 0.8rem;">
                                🖼️ View Full Image
                            </a>
                        </div>
                    ` : ''}

                    <div class="nft-detail-actions">
                        ${isOwner && !nft.tokenized ? `
                            <button class="btn-primary btn-small" onclick="marketplace.openTokenizeModal('${nft.address}')">
                                🪙 Tokenize
                            </button>
                        ` : ''}
                        ${isOwner && nft.tokenized && !nft.listed ? `
                            <button class="btn-primary btn-small" onclick="marketplace.openListModal('${nft.tokenAddress || ''}', '${nft.tokenTicker || ''}')">
                                📢 List for Sale
                            </button>
                        ` : ''}
                        ${!isOwner && nft.listed && nft.asks && nft.asks.length > 0 ? `
                            <button class="btn-primary btn-small" onclick="marketplace.openBuyModal('${nft.asks[0].txid}', ${nft.askPrice}, '${nft.tokenTicker || ''}')">
                                🛒 Buy for ${nft.askPrice} NXS
                            </button>
                        ` : ''}
                        ${isOwner && !nft.tokenized ? `
                            <button class="btn-secondary btn-small" onclick="marketplace.promptTransfer('${nft.address}')">
                                📤 Transfer
                            </button>
                        ` : ''}
                    </div>

                    ${nft.listed && nft.asks && nft.asks.length > 0 ? `
                        <div class="market-orders-section">
                            <h4>📊 Active Ask Orders</h4>
                            <div class="order-list">
                                ${nft.asks.map(ask => `
                                    <div class="order-item">
                                        <span class="order-price">${ask.price} NXS</span>
                                        <span class="order-amount">${ask.contract?.amount || '?'} tokens</span>
                                        ${!isOwner && walletAuth.connected ? `
                                            <button class="btn-primary btn-small" onclick="marketplace.openBuyModal('${ask.txid}', ${ask.price}, '${nft.tokenTicker || ''}')">Buy</button>
                                        ` : ''}
                                        ${isOwner ? `
                                            <button class="btn-secondary btn-small btn-danger" onclick="marketplace.handleCancelOrder('${ask.txid}')">Cancel</button>
                                        ` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        this.openModal('detailModal');
    }

    // =========================================================================
    //  TOKENIZE
    // =========================================================================

    openTokenizeModal(assetAddress) {
        if (!walletAuth.connected) {
            this.notify('Please connect your wallet first.', 'error');
            return;
        }

        this.closeModals();

        const form = document.getElementById('tokenizeForm');
        if (form) form.reset();

        document.getElementById('tokenizeAssetAddress').value = assetAddress;
        document.getElementById('tokenSupply').value = '1';
        document.getElementById('tokenDecimals').value = '0';

        this.openModal('tokenizeModal');
    }

    async handleTokenize(e) {
        e.preventDefault();

        const assetAddress = document.getElementById('tokenizeAssetAddress').value;
        const tokenName = document.getElementById('tokenName').value.trim();
        const supply = parseInt(document.getElementById('tokenSupply').value);
        const decimals = parseInt(document.getElementById('tokenDecimals').value);

        if (!tokenName) {
            this.notify('Please enter a token name.', 'error');
            return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating token...';
        }

        try {
            await nexusAPI.tokenizeNFT(assetAddress, tokenName, supply, decimals);
            this.notify('🪙 NFT tokenized successfully! Token: ' + tokenName, 'success');
            this.closeModals();
            setTimeout(() => this.loadNFTs(), 3000);
        } catch (error) {
            this.notify('Tokenization failed: ' + error.message, 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '🪙 Create Token & Tokenize';
            }
        }
    }

    // =========================================================================
    //  LIST FOR SALE
    // =========================================================================

    openListModal(tokenAddress, tokenTicker) {
        if (!walletAuth.connected) {
            this.notify('Please connect your wallet first.', 'error');
            return;
        }

        this.closeModals();

        const form = document.getElementById('listForm');
        if (form) form.reset();

        document.getElementById('listTokenAddress').value = tokenAddress;
        document.getElementById('listTokenTicker').value = tokenTicker;
        document.getElementById('listToAccount').value = 'default';

        this.openModal('listModal');
    }

    async handleList(e) {
        e.preventDefault();

        const tokenTicker = document.getElementById('listTokenTicker').value;
        const price = parseFloat(document.getElementById('listPrice').value);
        const amount = parseInt(document.getElementById('listAmount').value);
        const fromAccount = document.getElementById('listFromAccount').value.trim();
        const toAccount = document.getElementById('listToAccount').value.trim() || 'default';

        if (!price || price <= 0) {
            this.notify('Please enter a valid price.', 'error');
            return;
        }

        if (!fromAccount) {
            this.notify('Please enter the token account name.', 'error');
            return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating order...';
        }

        try {
            await nexusAPI.createAskOrder(tokenTicker, price, amount, fromAccount, toAccount);
            this.notify('📢 Ask order created! Your NFT is now listed for sale.', 'success');
            this.closeModals();
            setTimeout(() => this.loadNFTs(), 3000);
        } catch (error) {
            this.notify('Listing failed: ' + error.message, 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '📢 Create Ask Order';
            }
        }
    }

    // =========================================================================
    //  BUYING
    // =========================================================================

    openBuyModal(txid, price, tokenTicker) {
        if (!walletAuth.connected) {
            this.notify('Please connect your wallet to buy.', 'error');
            return;
        }

        this.closeModals();

        const buyDetails = document.getElementById('buyDetails');
        if (buyDetails) {
            buyDetails.innerHTML = `
                <div class="buy-summary">
                    <div class="meta-item">
                        <div class="meta-label">Token</div>
                        <div class="meta-value">${this.escapeHtml(tokenTicker)}</div>
                    </div>
                    <div class="meta-item">
                        <div class="meta-label">Price</div>
                        <div class="meta-value" style="color: var(--primary-color); font-weight: 700;">${price} NXS</div>
                    </div>
                </div>
            `;
        }

        document.getElementById('buyTxid').value = txid;
        document.getElementById('buyFromAccount').value = 'default';
        document.getElementById('buyToAccount').value = '';

        this.openModal('buyModal');
    }

    async handleBuy(e) {
        e.preventDefault();

        const txid = document.getElementById('buyTxid').value;
        const fromAccount = document.getElementById('buyFromAccount').value.trim();
        const toAccount = document.getElementById('buyToAccount').value.trim();

        if (!fromAccount || !toAccount) {
            this.notify('Please fill in both account fields.', 'error');
            return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Processing...';
        }

        try {
            await nexusAPI.executeOrder(txid, fromAccount, toAccount);
            this.notify('🎉 Purchase successful! The NFT tokens are being transferred.', 'success');
            this.closeModals();
            setTimeout(() => this.loadNFTs(), 3000);
        } catch (error) {
            this.notify('Purchase failed: ' + error.message, 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '🛒 Execute Purchase';
            }
        }
    }

    // =========================================================================
    //  CANCEL ORDER
    // =========================================================================

    async handleCancelOrder(txid) {
        if (!walletAuth.connected) {
            this.notify('Please connect your wallet.', 'error');
            return;
        }

        if (!confirm('Are you sure you want to cancel this order?')) return;

        try {
            await nexusAPI.cancelOrder(txid);
            this.notify('Order cancelled successfully.', 'success');
            this.closeModals();
            setTimeout(() => this.loadNFTs(), 3000);
        } catch (error) {
            this.notify('Cancel failed: ' + error.message, 'error');
        }
    }

    // =========================================================================
    //  TRANSFER
    // =========================================================================

    async promptTransfer(assetAddress) {
        if (!walletAuth.connected) {
            this.notify('Please connect your wallet.', 'error');
            return;
        }

        const recipient = prompt('Enter the recipient username or genesis hash:');
        if (!recipient || !recipient.trim()) return;

        try {
            await nexusAPI.transferAsset(assetAddress, recipient.trim());
            this.notify('📤 Asset transfer initiated! The recipient must claim it.', 'success');
            this.closeModals();
            setTimeout(() => this.loadNFTs(), 3000);
        } catch (error) {
            this.notify('Transfer failed: ' + error.message, 'error');
        }
    }

    // =========================================================================
    //  MODAL HELPERS
    // =========================================================================

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    closeModals() {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        document.body.style.overflow = '';
    }

    // =========================================================================
    //  UTILITY
    // =========================================================================

    notify(message, type = 'info') {
        if (walletAuth && walletAuth.showNotification) {
            walletAuth.showNotification(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    isValidUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
            return false;
        }
    }
}

// Initialize marketplace when DOM is ready
let marketplace;
document.addEventListener('DOMContentLoaded', () => {
    marketplace = new NFTMarketplace();
});
