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

        // Info/How it Works button
        const infoBtn = document.getElementById('infoBtn');
        if (infoBtn) {
            infoBtn.addEventListener('click', () => this.openInfoModal());
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
                // Update character count if needed (now using regular input)
            });
        }

        // Show/hide shelf life field based on perishable checkbox
        const perishableCheckbox = document.getElementById('productPerishable');
        const shelfLifeGroup = document.getElementById('shelfLifeGroup');
        if (perishableCheckbox && shelfLifeGroup) {
            perishableCheckbox.addEventListener('change', (e) => {
                shelfLifeGroup.style.display = e.target.checked ? 'block' : 'none';
            });
        }

        // Info tooltips in form
        document.querySelectorAll('.info-tooltip').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showAttributeInfo(btn.dataset.tooltip);
            });
        });
    }

    showAttributeInfo(section) {
        const info = {
            identification: `<h4>🏷️ Identification Attributes</h4>
                <p><strong>art-nr:</strong> Your internal article or part number. This becomes part of the asset name on the blockchain.</p>
                <p><strong>GTIN:</strong> Global Trade Item Number (8-14 digits). This is the barcode number (EAN, UPC, etc.) assigned by GS1. Enables scanning and global identification.</p>
                <p><strong>brand:</strong> The brand name if different from manufacturer. Useful when a manufacturer produces for multiple brands.</p>`,
            classification: `<h4>📂 Classification Attributes</h4>
                <p><strong>category/subcategory:</strong> Human-readable classification for browsing and filtering.</p>
                <p><strong>GPC:</strong> GS1 Global Product Classification - an 8-digit code that provides standardized product categorization across industries. <a href="https://www.gs1.org/standards/gpc" target="_blank">Learn more →</a></p>
                <p><strong>HSCode:</strong> Harmonized System code (6-10 digits) used internationally for customs and trade classification. Required for import/export.</p>`,
            description: `<h4>📝 Product Information</h4>
                <p><strong>description:</strong> A concise product description (max 100 characters). Should identify the product clearly.</p>
                <p><strong>manufacturer:</strong> The manufacturer name or their GLN (Global Location Number) for standardized identification.</p>
                <p><strong>origin:</strong> Country of origin using ISO 3166-1 alpha-2 codes (e.g., DE, US, CN). Important for trade compliance.</p>`,
            physical: `<h4>⚖️ Physical Property Attributes</h4>
                <p><strong>UOM:</strong> Unit of Measure using UN/CEFACT standard codes (EA=Each, KG=Kilogram, MTR=Meter, etc.). Enables accurate ordering and inventory.</p>
                <p><strong>weight:</strong> Net weight per unit in grams. Essential for logistics and shipping calculations.</p>
                <p><strong>hazardous:</strong> Indicates dangerous goods requiring special handling, storage, or transport.</p>
                <p><strong>perishable:</strong> Temperature-sensitive products requiring cold chain management.</p>
                <p><strong>shelflife:</strong> Number of days the product remains usable (for perishables).</p>`,
            references: `<h4>🔗 External References</h4>
                <p><strong>url:</strong> Link to extended product information (spec sheets, images, etc.) stored off-chain. Keeps the on-chain asset under 1KB.</p>
                <p><strong>replaces:</strong> If this product supersedes another, enter the blockchain address of the old product for traceability.</p>`
        };

        const content = info[section] || 'Information not available.';
        
        // Show in a small popup or alert
        const popup = document.createElement('div');
        popup.className = 'attribute-info-popup';
        popup.innerHTML = `
            <div class="popup-content">
                ${content}
                <button class="popup-close">Close</button>
            </div>
        `;
        document.body.appendChild(popup);
        
        popup.querySelector('.popup-close').addEventListener('click', () => {
            popup.remove();
        });
        popup.addEventListener('click', (e) => {
            if (e.target === popup) popup.remove();
        });
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

        // Build flags display
        const flags = [];
        if (product.hazardous) flags.push('<span class="flag hazardous">⚠️ Hazardous</span>');
        if (product.perishable) flags.push('<span class="flag perishable">❄️ Perishable</span>');
        const flagsHtml = flags.length > 0 ? `<div class="product-flags">${flags.join('')}</div>` : '';

        return `
            <div class="product-card" data-address="${product.address}">
                <div class="product-header">
                    <div>
                        <h3 class="product-title">${this.escapeHtml(product.description || product.name || 'Unnamed Product')}</h3>
                        <div class="product-sku">${this.escapeHtml(product['art-nr'] || product.sku || '')}</div>
                    </div>
                    ${badge}
                </div>
                ${flagsHtml}
                <div class="product-details">
                    ${product.category ? `
                        <div class="product-detail-row">
                            <span class="product-detail-label">Category:</span>
                            <span class="product-detail-value">${this.escapeHtml(product.category)}${product.subcategory ? ' / ' + this.escapeHtml(product.subcategory) : ''}</span>
                        </div>
                    ` : ''}
                    ${product.UOM ? `
                        <div class="product-detail-row">
                            <span class="product-detail-label">UOM:</span>
                            <span class="product-detail-value">${this.escapeHtml(product.UOM)}${product.weight ? ` (${product.weight}g)` : ''}</span>
                        </div>
                    ` : ''}
                    ${product.manufacturer ? `
                        <div class="product-detail-row">
                            <span class="product-detail-label">Manufacturer:</span>
                            <span class="product-detail-value">${this.escapeHtml(product.manufacturer)}${product.brand ? ' / ' + this.escapeHtml(product.brand) : ''}</span>
                        </div>
                    ` : ''}
                    ${product.origin ? `
                        <div class="product-detail-row">
                            <span class="product-detail-label">Origin:</span>
                            <span class="product-detail-value">${this.escapeHtml(product.origin)}</span>
                        </div>
                    ` : ''}
                    ${product.GTIN ? `
                        <div class="product-detail-row">
                            <span class="product-detail-label">GTIN:</span>
                            <span class="product-detail-value">${this.escapeHtml(product.GTIN)}</span>
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

        // Build flags display
        const flags = [];
        if (product.hazardous) flags.push('<span class="flag hazardous">⚠️ Hazardous</span>');
        if (product.perishable) flags.push('<span class="flag perishable">❄️ Perishable</span>');
        const flagsHtml = flags.length > 0 ? `<div class="detail-flags">${flags.join(' ')}</div>` : '';

        content.innerHTML = `
            <div class="detail-grid">
                <div class="detail-section detail-full">
                    <h3>🏷️ Identification</h3>
                    <div class="detail-row">
                        <span class="detail-label">Article Number:</span>
                        <span class="detail-value">${this.escapeHtml(product['art-nr'] || product.sku || 'N/A')}</span>
                    </div>
                    ${product.GTIN ? `
                        <div class="detail-row">
                            <span class="detail-label">GTIN:</span>
                            <span class="detail-value">${this.escapeHtml(product.GTIN)}</span>
                        </div>
                    ` : ''}
                    ${product.brand ? `
                        <div class="detail-row">
                            <span class="detail-label">Brand:</span>
                            <span class="detail-value">${this.escapeHtml(product.brand)}</span>
                        </div>
                    ` : ''}
                    <div class="detail-row">
                        <span class="detail-label">Description:</span>
                        <span class="detail-value">${this.escapeHtml(product.description || 'N/A')}</span>
                    </div>
                </div>

                <div class="detail-section">
                    <h3>📂 Classification</h3>
                    <div class="detail-row">
                        <span class="detail-label">Category:</span>
                        <span class="detail-value">${this.escapeHtml(product.category || 'N/A')}</span>
                    </div>
                    ${product.subcategory ? `
                        <div class="detail-row">
                            <span class="detail-label">Subcategory:</span>
                            <span class="detail-value">${this.escapeHtml(product.subcategory)}</span>
                        </div>
                    ` : ''}
                    ${product.GPC ? `
                        <div class="detail-row">
                            <span class="detail-label">GPC Code:</span>
                            <span class="detail-value">${this.escapeHtml(product.GPC)}</span>
                        </div>
                    ` : ''}
                    ${product.HSCode ? `
                        <div class="detail-row">
                            <span class="detail-label">HS Code:</span>
                            <span class="detail-value">${this.escapeHtml(product.HSCode)}</span>
                        </div>
                    ` : ''}
                </div>

                <div class="detail-section">
                    <h3>🏭 Manufacturer & Origin</h3>
                    <div class="detail-row">
                        <span class="detail-label">Manufacturer:</span>
                        <span class="detail-value">${this.escapeHtml(product.manufacturer || 'N/A')}</span>
                    </div>
                    ${product.origin ? `
                        <div class="detail-row">
                            <span class="detail-label">Country of Origin:</span>
                            <span class="detail-value">${this.escapeHtml(product.origin)}</span>
                        </div>
                    ` : ''}
                </div>

                <div class="detail-section">
                    <h3>⚖️ Physical Properties</h3>
                    <div class="detail-row">
                        <span class="detail-label">Unit of Measure:</span>
                        <span class="detail-value">${this.escapeHtml(product.UOM || 'N/A')}</span>
                    </div>
                    ${product.weight ? `
                        <div class="detail-row">
                            <span class="detail-label">Weight:</span>
                            <span class="detail-value">${product.weight} grams</span>
                        </div>
                    ` : ''}
                    ${flagsHtml}
                    ${product.shelflife ? `
                        <div class="detail-row">
                            <span class="detail-label">Shelf Life:</span>
                            <span class="detail-value">${product.shelflife} days</span>
                        </div>
                    ` : ''}
                </div>

                <div class="detail-section">
                    <h3>🔗 References</h3>
                    ${product.url ? `
                        <div class="detail-row">
                            <span class="detail-label">Product URL:</span>
                            <span class="detail-value"><a href="https://${this.escapeHtml(product.url)}" target="_blank">${this.escapeHtml(product.url)}</a></span>
                        </div>
                    ` : ''}
                    ${product.replaces ? `
                        <div class="detail-row">
                            <span class="detail-label">Replaces:</span>
                            <span class="detail-value blockchain-address">${this.escapeHtml(product.replaces)}</span>
                        </div>
                    ` : ''}
                </div>

                <div class="detail-section detail-full">
                    <h3>🔗 Blockchain Info</h3>
                    <div class="detail-row">
                        <span class="detail-label">Status:</span>
                        <span class="detail-value status-badge ${product['distordia-status'] || 'valid'}">${this.escapeHtml(product['distordia-status'] || 'valid')}</span>
                    </div>
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
                    <div class="detail-row">
                        <span class="detail-label">Owner:</span>
                        <span class="detail-value blockchain-address">${product.owner}</span>
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
            document.getElementById('productUnit').value = product.unit || '';
            document.getElementById('productWeight').value = product.weight || '';
            if (document.getElementById('productDimensions')) {
                document.getElementById('productDimensions').value = product.dimensions || '';
            }
        }

        modal.classList.add('active');
    }

    openInfoModal() {
        const modal = document.getElementById('infoModal');
        if (modal) {
            modal.classList.add('active');
        }
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
            // Collect form data matching the new schema
            const productData = {
                // Identification
                'art-nr': document.getElementById('productArtNr').value.trim(),
                'GTIN': document.getElementById('productGTIN').value.trim() || undefined,
                'brand': document.getElementById('productBrand').value.trim() || undefined,
                
                // Classification
                'category': document.getElementById('productCategory').value.trim(),
                'subcategory': document.getElementById('productSubcategory').value.trim() || undefined,
                'GPC': document.getElementById('productGPC').value.trim() || undefined,
                'HSCode': document.getElementById('productHSCode').value.trim() || undefined,
                
                // Description
                'description': document.getElementById('productDescription').value.trim(),
                'manufacturer': document.getElementById('productManufacturer').value.trim(),
                'origin': document.getElementById('productOrigin').value || undefined,
                
                // Physical Properties
                'UOM': document.getElementById('productUOM').value,
                'weight': parseInt(document.getElementById('productWeight').value) || undefined,
                'hazardous': document.getElementById('productHazardous').checked || undefined,
                'perishable': document.getElementById('productPerishable').checked || undefined,
                'shelflife': parseInt(document.getElementById('productShelfLife').value) || undefined,
                
                // References
                'url': document.getElementById('productURL').value.trim() || undefined,
                'replaces': document.getElementById('productReplaces').value.trim() || undefined,
                
                // Distordia standard fields
                'distordia-type': 'product',
                'distordia-status': 'valid'
            };

            // Remove undefined values to save space
            Object.keys(productData).forEach(key => {
                if (productData[key] === undefined || productData[key] === '') {
                    delete productData[key];
                }
            });
            
            // Convert booleans that are false to undefined (don't store)
            if (productData.hazardous === false) delete productData.hazardous;
            if (productData.perishable === false) delete productData.perishable;

            // Create product via Q-Wallet's executeBatchCalls
            // This prompts the user for PIN approval
            const result = await nexusAPI.createProduct(productData);

            if (result && result.successfulCalls > 0) {
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
        
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) categoryFilter.value = '';
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
