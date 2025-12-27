/**
 * Products Main Module
 * Handles UI interactions and coordinates between auth and API modules
 */

class ProductCatalogue {
    constructor() {
        this.products = [];
        this.currentFilters = {
            category: '',
            owner: '',
            search: ''
        };
        this.currentProduct = null;
        
        this.initEventListeners();
        this.loadProducts();
    }

    initEventListeners() {
        // Wallet connection change
        window.addEventListener('walletConnectionChange', (e) => {
            this.onWalletConnectionChange(e.detail);
        });

        // Add product button
        const addProductBtn = document.getElementById('addProductBtn');
        if (addProductBtn) {
            addProductBtn.addEventListener('click', () => this.openProductModal());
        }

        // Product form submission
        const productForm = document.getElementById('productForm');
        if (productForm) {
            productForm.addEventListener('submit', (e) => this.handleProductSubmit(e));
        }

        // Search
        const searchBtn = document.getElementById('searchBtn');
        const searchInput = document.getElementById('searchInput');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.handleSearch());
        }
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleSearch();
            });
        }

        // Filters
        const categoryFilter = document.getElementById('categoryFilter');
        const ownerFilter = document.getElementById('ownerFilter');
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');

        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.applyFilters());
        }
        if (ownerFilter) {
            ownerFilter.addEventListener('change', () => this.applyFilters());
        }
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearFilters());
        }

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeModals());
        });

        document.querySelectorAll('.modal-cancel').forEach(btn => {
            btn.addEventListener('click', () => this.closeModals());
        });

        // Click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModals();
            });
        });

        // Character counter for description
        const descInput = document.getElementById('productDescription');
        if (descInput) {
            descInput.addEventListener('input', (e) => {
                const charCount = document.querySelector('.char-count');
                if (charCount) {
                    charCount.textContent = `${e.target.value.length}/500`;
                }
            });
        }
    }

    async loadProducts() {
        this.showLoading();

        try {
            // Load all products from blockchain
            const assets = await nexusAPI.listAllProducts();
            
            console.log('Assets loaded:', assets); // Debug log
            
            if (!assets || assets.length === 0) {
                console.log('No assets returned from API');
                this.products = [];
                this.showEmpty();
                return;
            }
            
            // Parse assets to products (already filtered by distordia-type in API)
            this.products = assets.map(asset => nexusAPI.parseAssetToProduct(asset));

            console.log('Products parsed:', this.products.length); // Debug log
            this.displayProducts(this.products);
        } catch (error) {
            console.error('Error loading products:', error);
            this.showEmpty();
        }
    }

    displayProducts(products) {
        const grid = document.getElementById('productsGrid');
        const emptyState = document.getElementById('emptyState');

        if (!grid) return;

        if (products.length === 0) {
            grid.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        grid.innerHTML = products.map(product => this.createProductCard(product)).join('');

        // Add click listeners to product cards
        grid.querySelectorAll('.product-card').forEach((card, index) => {
            card.addEventListener('click', () => this.showProductDetail(products[index]));
        });
    }

    createProductCard(product) {
        const isOwner = walletAuth && walletAuth.isConnected() && 
                        product.owner === walletAuth.getAccount();
        
        const badge = isOwner ? 
            '<span class="product-badge owner">My Product</span>' :
            '<span class="product-badge">' + (product.category || 'Product') + '</span>';

        const description = product.description ? 
            `<p class="product-description">${this.escapeHtml(product.description)}</p>` : '';

        return `
            <div class="product-card" data-address="${product.address}">
                <div class="product-header">
                    <div>
                        <h3 class="product-title">${this.escapeHtml(product.name)}</h3>
                        <div class="product-sku">${this.escapeHtml(product.sku)}</div>
                    </div>
                    ${badge}
                </div>
                ${description}
                <div class="product-details">
                    ${product.manufacturer ? `
                        <div class="product-detail-row">
                            <span class="product-detail-label">Manufacturer:</span>
                            <span class="product-detail-value">${this.escapeHtml(product.manufacturer)}</span>
                        </div>
                    ` : ''}
                    ${product.origin ? `
                        <div class="product-detail-row">
                            <span class="product-detail-label">Origin:</span>
                            <span class="product-detail-value">${this.escapeHtml(product.origin)}</span>
                        </div>
                    ` : ''}
                    ${product.barcode ? `
                        <div class="product-detail-row">
                            <span class="product-detail-label">Barcode:</span>
                            <span class="product-detail-value">${this.escapeHtml(product.barcode)}</span>
                        </div>
                    ` : ''}
                </div>
                <div class="product-footer">
                    <span class="product-timestamp">
                        ${nexusAPI.formatDate(product.created)}
                    </span>
                </div>
            </div>
        `;
    }

    showProductDetail(product) {
        this.currentProduct = product;
        const modal = document.getElementById('productDetailModal');
        const content = document.getElementById('productDetailContent');
        
        if (!modal || !content) return;

        const isOwner = walletAuth && walletAuth.isConnected() && 
                        product.owner === walletAuth.getAccount();

        // Show/hide management buttons
        const editBtn = document.getElementById('editProductBtn');
        const transferBtn = document.getElementById('transferProductBtn');
        if (editBtn) editBtn.style.display = isOwner ? 'inline-block' : 'none';
        if (transferBtn) transferBtn.style.display = isOwner ? 'inline-block' : 'none';

        content.innerHTML = `
            <div class="detail-grid">
                <div class="detail-section detail-full">
                    <h3>Product Information</h3>
                    <div class="detail-row">
                        <span class="detail-label">Name:</span>
                        <span class="detail-value">${this.escapeHtml(product.name)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">SKU:</span>
                        <span class="detail-value">${this.escapeHtml(product.sku)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Category:</span>
                        <span class="detail-value">${this.escapeHtml(product.category)}</span>
                    </div>
                    ${product.description ? `
                        <div class="detail-row">
                            <span class="detail-label">Description:</span>
                            <span class="detail-value">${this.escapeHtml(product.description)}</span>
                        </div>
                    ` : ''}
                </div>

                <div class="detail-section">
                    <h3>Product Details</h3>
                    ${product.manufacturer ? `
                        <div class="detail-row">
                            <span class="detail-label">Manufacturer:</span>
                            <span class="detail-value">${this.escapeHtml(product.manufacturer)}</span>
                        </div>
                    ` : ''}
                    ${product.origin ? `
                        <div class="detail-row">
                            <span class="detail-label">Origin:</span>
                            <span class="detail-value">${this.escapeHtml(product.origin)}</span>
                        </div>
                    ` : ''}
                    ${product.barcode ? `
                        <div class="detail-row">
                            <span class="detail-label">Barcode:</span>
                            <span class="detail-value">${this.escapeHtml(product.barcode)}</span>
                        </div>
                    ` : ''}
                    ${product.weight ? `
                        <div class="detail-row">
                            <span class="detail-label">Weight:</span>
                            <span class="detail-value">${product.weight} kg</span>
                        </div>
                    ` : ''}
                </div>

                <div class="detail-section">
                    <h3>Blockchain Info</h3>
                    <div class="detail-row">
                        <span class="detail-label">Created:</span>
                        <span class="detail-value">${nexusAPI.formatDate(product.created)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Modified:</span>
                        <span class="detail-value">${nexusAPI.formatDate(product.modified)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Address:</span>
                        <span class="detail-value blockchain-address">${product.address}</span>
                    </div>
                </div>
            </div>
        `;

        modal.classList.add('active');
    }

    openProductModal(product = null) {
        if (!walletAuth || !walletAuth.isConnected()) {
            walletAuth.showError('Please connect your wallet first');
            return;
        }

        const modal = document.getElementById('productModal');
        const form = document.getElementById('productForm');
        const title = document.getElementById('modalTitle');

        if (!modal || !form) return;

        // Reset form
        form.reset();
        if (title) title.textContent = product ? 'Edit Product' : 'Register New Product';

        // If editing, populate form
        if (product) {
            document.getElementById('productName').value = product.name || '';
            document.getElementById('productSKU').value = product.sku || '';
            document.getElementById('productCategory').value = product.category || '';
            document.getElementById('productDescription').value = product.description || '';
            document.getElementById('productManufacturer').value = product.manufacturer || '';
            document.getElementById('productOrigin').value = product.origin || '';
            document.getElementById('productBarcode').value = product.barcode || '';
            document.getElementById('productWeight').value = product.weight || '';
        }

        modal.classList.add('active');
    }

    async handleProductSubmit(e) {
        e.preventDefault();

        if (!walletAuth || !walletAuth.isConnected()) {
            walletAuth.showError('Please connect your wallet');
            return;
        }

        const submitBtn = document.getElementById('submitProductBtn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoading = submitBtn.querySelector('.btn-loading');

        // Show loading state
        submitBtn.disabled = true;
        if (btnText) btnText.style.display = 'none';
        if (btnLoading) btnLoading.style.display = 'inline-flex';

        try {
            // Collect form data
            const productData = {
                name: document.getElementById('productName').value,
                sku: document.getElementById('productSKU').value,
                category: document.getElementById('productCategory').value,
                description: document.getElementById('productDescription').value,
                manufacturer: document.getElementById('productManufacturer').value,
                origin: document.getElementById('productOrigin').value,
                barcode: document.getElementById('productBarcode').value,
                weight: parseFloat(document.getElementById('productWeight').value) || 0
            };

            // Parse additional attributes if provided
            const attrsInput = document.getElementById('productAttributes').value;
            if (attrsInput) {
                try {
                    productData.attributes = JSON.parse(attrsInput);
                } catch (err) {
                    throw new Error('Invalid JSON in additional attributes');
                }
            }

            // Request PIN from user via Q-Wallet
            // Note: Q-Wallet will handle PIN prompt automatically when transaction is sent
            const result = await window.nexus.sendTransaction({
                type: 'asset.create',
                data: productData
            });

            if (result && result.txid) {
                walletAuth.showSuccess('Product registered successfully on blockchain!');
                this.closeModals();
                // Reload products after a short delay
                setTimeout(() => this.loadProducts(), 2000);
            }
        } catch (error) {
            console.error('Error submitting product:', error);
            walletAuth.showError(error.message || 'Failed to register product');
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            if (btnText) btnText.style.display = 'inline';
            if (btnLoading) btnLoading.style.display = 'none';
        }
    }

    handleSearch() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            this.currentFilters.search = searchInput.value;
            this.applyFilters();
        }
    }

    applyFilters() {
        const categoryFilter = document.getElementById('categoryFilter');
        const ownerFilter = document.getElementById('ownerFilter');

        if (categoryFilter) this.currentFilters.category = categoryFilter.value;
        if (ownerFilter) this.currentFilters.owner = ownerFilter.value;

        const filtered = nexusAPI.filterProducts(this.products, this.currentFilters);
        this.displayProducts(filtered);
    }

    clearFilters() {
        this.currentFilters = { category: '', owner: '', search: '' };
        
        document.getElementById('categoryFilter').value = '';
        document.getElementById('ownerFilter').value = '';
        document.getElementById('searchInput').value = '';

        this.displayProducts(this.products);
    }

    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    showLoading() {
        const grid = document.getElementById('productsGrid');
        if (grid) {
            grid.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>Loading products from blockchain...</p>
                </div>
            `;
        }
    }

    showEmpty() {
        const grid = document.getElementById('productsGrid');
        const emptyState = document.getElementById('emptyState');
        
        if (grid) grid.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
    }

    onWalletConnectionChange(detail) {
        if (detail.connected) {
            // Reload products when wallet connects to show user's products
            this.loadProducts();
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize when DOM is ready
let productCatalogue;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        productCatalogue = new ProductCatalogue();
    });
} else {
    productCatalogue = new ProductCatalogue();
}
