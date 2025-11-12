// Material Registry - Blockchain Integration
// This is a prototype implementation - adapt to your specific blockchain/NFT platform

// State Management
const state = {
    connected: false,
    walletAddress: null,
    materials: [],
    filteredMaterials: [],
    currentView: 'grid'
};

// Mock data for demonstration (replace with actual blockchain queries)
const mockMaterials = [
    {
        id: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        name: 'Steel Plate A36',
        sku: 'STL-A36-1000',
        category: 'raw-materials',
        description: 'Hot-rolled structural steel plate, ASTM A36 standard. Suitable for general structural purposes.',
        unit: 'kg',
        manufacturer: 'ArcelorMittal',
        specs: 'Yield Strength: 250 MPa, Tensile Strength: 400-550 MPa, ASTM A36 certified',
        imageUrl: 'https://via.placeholder.com/300x200?text=Steel+Plate',
        registeredBy: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        registeredDate: '2025-01-15T10:30:00Z',
        assetAddress: '0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t'
    },
    {
        id: '0x8c3e9f2a1b4d7c5e6f8a9b0c1d2e3f4g5h6i7j8',
        name: 'M8 Hex Bolt Grade 8.8',
        sku: 'BLT-M8-G88',
        category: 'components',
        description: 'Metric hex head bolt M8x30mm, Grade 8.8, zinc plated. High-strength fastener for mechanical assemblies.',
        unit: 'pcs',
        manufacturer: 'Bossard',
        specs: 'ISO 4017, Grade 8.8, Zinc plated, Thread length: 30mm',
        imageUrl: 'https://via.placeholder.com/300x200?text=Hex+Bolt',
        registeredBy: '0x9d4f0e1b2c5a8d7e6f9a0b1c2d3e4f5g6h7i8j9',
        registeredDate: '2025-02-03T14:20:00Z',
        assetAddress: '0x2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u'
    },
    {
        id: '0x3f5a7b9c1d3e5f7g9h1i3j5k7l9m1n3o5p7q9r1',
        name: 'Hydraulic Oil ISO VG 46',
        sku: 'HYD-46-208L',
        category: 'consumables',
        description: 'Premium hydraulic oil, viscosity grade 46. Suitable for industrial hydraulic systems operating under moderate conditions.',
        unit: 'L',
        manufacturer: 'Shell',
        specs: 'ISO VG 46, DIN 51524 Part 2, excellent anti-wear properties',
        imageUrl: 'https://via.placeholder.com/300x200?text=Hydraulic+Oil',
        registeredBy: '0x4e6f8a0b2c4d6e8f0a1b3c5d7e9f1a2b4c6d8e0',
        registeredDate: '2025-02-10T09:15:00Z',
        assetAddress: '0x3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v'
    },
    {
        id: '0x5g7b9d1f3h5j7l9n1p3r5t7v9x1z3b5d7f9h1j3',
        name: 'Electric Motor 3-Phase 7.5kW',
        sku: 'MTR-3P-75KW',
        category: 'components',
        description: 'Three-phase asynchronous electric motor, 7.5kW, 400V, 1450 RPM. IP55 protection, IE3 efficiency class.',
        unit: 'pcs',
        manufacturer: 'Siemens',
        specs: 'Power: 7.5kW, Voltage: 400V, Speed: 1450 RPM, IE3 efficiency, IP55',
        imageUrl: 'https://via.placeholder.com/300x200?text=Electric+Motor',
        registeredBy: '0x6f8a0b2c4d6e8f0a1b3c5d7e9f1a2b4c6d8e0f2',
        registeredDate: '2025-02-18T11:45:00Z',
        assetAddress: '0x4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w'
    },
    {
        id: '0x7h9c1e3g5i7k9m1o3q5s7u9w1y3a5c7e9g1i3k5',
        name: 'Industrial Control Panel',
        sku: 'PNL-IND-400A',
        category: 'finished-goods',
        description: 'Pre-assembled industrial control panel with PLC, VFD, and safety components. Ready for installation.',
        unit: 'pcs',
        manufacturer: 'Custom Assembly',
        specs: 'Main breaker: 400A, PLC: Siemens S7-1200, VFD: 3x7.5kW, IP54 enclosure',
        imageUrl: 'https://via.placeholder.com/300x200?text=Control+Panel',
        registeredBy: '0x8g0b2d4f6h8j0l2n4p6r8t0v2x4z6b8d0f2h4j6',
        registeredDate: '2025-03-01T13:30:00Z',
        assetAddress: '0x5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x'
    },
    {
        id: '0x9i1d3f5h7j9l1n3p5r7t9v1x3z5b7d9f1h3j5l7',
        name: 'Engineering Consultation Service',
        sku: 'SRV-ENG-HR',
        category: 'services',
        description: 'Professional engineering consultation services. Mechanical, electrical, and automation design expertise.',
        unit: 'hr',
        manufacturer: 'Distordia Engineering',
        specs: 'Senior engineers with 10+ years experience, CAD/CAM support, certification assistance',
        imageUrl: 'https://via.placeholder.com/300x200?text=Engineering+Service',
        registeredBy: '0x0h2d4f6h8j0l2n4p6r8t0v2x4z6b8d0f2h4j6l8',
        registeredDate: '2025-03-05T08:00:00Z',
        assetAddress: '0x6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y'
    }
];

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadMaterials();
    updateStats();
});

// Event Listeners
function initializeEventListeners() {
    // Wallet connection
    document.getElementById('connectWallet').addEventListener('click', connectWallet);

    // Search
    document.getElementById('searchBtn').addEventListener('click', performSearch);
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });

    // Filters
    document.getElementById('categoryFilter').addEventListener('change', applyFilters);
    document.getElementById('sortBy').addEventListener('change', applyFilters);

    // Registration modal
    document.getElementById('registerBtn').addEventListener('click', openRegistrationModal);
    document.getElementById('registerFirstBtn')?.addEventListener('click', openRegistrationModal);
    document.getElementById('closeModal').addEventListener('click', closeRegistrationModal);
    document.getElementById('cancelBtn').addEventListener('click', closeRegistrationModal);
    document.getElementById('registrationForm').addEventListener('submit', handleRegistration);

    // Detail modal
    document.getElementById('closeDetailModal').addEventListener('click', closeDetailModal);

    // View toggle
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleView(btn.dataset.view));
    });

    // Close modals on outside click
    document.getElementById('registrationModal').addEventListener('click', (e) => {
        if (e.target.id === 'registrationModal') closeRegistrationModal();
    });
    document.getElementById('detailModal').addEventListener('click', (e) => {
        if (e.target.id === 'detailModal') closeDetailModal();
    });
}

// Wallet Connection
async function connectWallet() {
    const btn = document.getElementById('connectWallet');
    
    // This is a mock implementation - integrate with your actual wallet provider
    // Example: MetaMask, WalletConnect, or Nexus-specific wallet
    
    try {
        // Mock wallet connection
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        state.connected = true;
        state.walletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
        
        btn.classList.add('connected');
        btn.innerHTML = `<span class="wallet-icon">✓</span> ${formatAddress(state.walletAddress)}`;
        
        showNotification('Wallet connected successfully!', 'success');
    } catch (error) {
        console.error('Wallet connection failed:', error);
        showNotification('Failed to connect wallet', 'error');
    }
}

// Load Materials
function loadMaterials() {
    // In production, this would query the blockchain for NFT assets
    // For now, we'll use mock data
    
    setTimeout(() => {
        state.materials = [...mockMaterials];
        state.filteredMaterials = [...mockMaterials];
        renderMaterials();
        document.querySelector('.loading-state').style.display = 'none';
    }, 1500);
}

// Render Materials
function renderMaterials() {
    const grid = document.getElementById('materialsGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (state.filteredMaterials.length === 0) {
        grid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    grid.style.display = 'grid';
    emptyState.style.display = 'none';
    
    // Clear loading state
    grid.innerHTML = '';
    
    state.filteredMaterials.forEach(material => {
        const card = createMaterialCard(material);
        grid.appendChild(card);
    });
}

// Create Material Card
function createMaterialCard(material) {
    const card = document.createElement('div');
    card.className = 'material-card';
    card.onclick = () => openDetailModal(material);
    
    const categoryLabels = {
        'raw-materials': 'Raw Materials',
        'components': 'Components',
        'finished-goods': 'Finished Goods',
        'consumables': 'Consumables',
        'services': 'Services'
    };
    
    card.innerHTML = `
        <div class="material-header">
            <div>
                <div class="material-title">${escapeHtml(material.name)}</div>
                <div class="material-sku">${escapeHtml(material.sku)}</div>
            </div>
            <div class="material-category">${categoryLabels[material.category]}</div>
        </div>
        <div class="material-description">${escapeHtml(material.description)}</div>
        <div class="material-meta">
            <div class="meta-item">
                <div class="meta-label">Unit</div>
                <div class="meta-value">${escapeHtml(material.unit)}</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">Manufacturer</div>
                <div class="meta-value">${escapeHtml(material.manufacturer)}</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">Registered</div>
                <div class="meta-value">${formatDate(material.registeredDate)}</div>
            </div>
        </div>
        <div class="material-address">
            <span class="address-text">${formatAddress(material.assetAddress)}</span>
            <button class="copy-btn" onclick="event.stopPropagation(); copyAddress('${material.assetAddress}')">📋</button>
        </div>
    `;
    
    return card;
}

// Search and Filter
function performSearch() {
    applyFilters();
}

function applyFilters() {
    const category = document.getElementById('categoryFilter').value;
    const sortBy = document.getElementById('sortBy').value;
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    
    // Start from the full materials list
    let filtered = [...state.materials];
    
    // Apply search filter first
    if (query) {
        filtered = filtered.filter(material =>
            material.name.toLowerCase().includes(query) ||
            material.sku.toLowerCase().includes(query) ||
            material.description.toLowerCase().includes(query) ||
            material.manufacturer.toLowerCase().includes(query)
        );
    }
    
    // Apply category filter
    if (category) {
        filtered = filtered.filter(m => m.category === category);
    }
    
    // Apply sorting
    switch (sortBy) {
        case 'name-asc':
            filtered.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'name-desc':
            filtered.sort((a, b) => b.name.localeCompare(a.name));
            break;
        case 'oldest':
            filtered.sort((a, b) => new Date(a.registeredDate) - new Date(b.registeredDate));
            break;
        case 'recent':
        default:
            filtered.sort((a, b) => new Date(b.registeredDate) - new Date(a.registeredDate));
            break;
    }
    
    state.filteredMaterials = filtered;
    renderMaterials();
}

// View Toggle
function toggleView(view) {
    state.currentView = view;
    
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    const grid = document.getElementById('materialsGrid');
    if (view === 'list') {
        grid.classList.add('list-view');
    } else {
        grid.classList.remove('list-view');
    }
}

// Registration Modal
function openRegistrationModal() {
    if (!state.connected) {
        showNotification('Please connect your wallet first', 'warning');
        return;
    }
    
    document.getElementById('registrationModal').classList.add('active');
    document.getElementById('registrationForm').reset();
}

function closeRegistrationModal() {
    document.getElementById('registrationModal').classList.remove('active');
}

async function handleRegistration(e) {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('materialName').value,
        sku: document.getElementById('materialSKU').value,
        category: document.getElementById('materialCategory').value,
        description: document.getElementById('materialDescription').value,
        unit: document.getElementById('materialUnit').value,
        manufacturer: document.getElementById('materialManufacturer').value,
        specs: document.getElementById('materialSpecs').value,
        imageUrl: document.getElementById('materialImage').value
    };
    
    // Show loading state
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="icon">⏳</span> Registering...';
    submitBtn.disabled = true;
    
    try {
        // In production, this would create an NFT on the blockchain
        // Mock implementation:
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const newMaterial = {
            ...formData,
            id: `0x${Math.random().toString(16).substr(2, 40)}`,
            registeredBy: state.walletAddress,
            registeredDate: new Date().toISOString(),
            assetAddress: `0x${Math.random().toString(16).substr(2, 40)}`
        };
        
        state.materials.unshift(newMaterial);
        state.filteredMaterials = [...state.materials];
        
        renderMaterials();
        updateStats();
        closeRegistrationModal();
        showNotification('Material registered successfully on-chain!', 'success');
        
    } catch (error) {
        console.error('Registration failed:', error);
        showNotification('Failed to register material', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Detail Modal
function openDetailModal(material) {
    const modal = document.getElementById('detailModal');
    const content = document.getElementById('detailContent');
    
    const categoryLabels = {
        'raw-materials': 'Raw Materials',
        'components': 'Components',
        'finished-goods': 'Finished Goods',
        'consumables': 'Consumables',
        'services': 'Services'
    };
    
    content.innerHTML = `
        <div class="detail-grid">
            <div class="detail-section">
                <h3>Basic Information</h3>
                <div class="detail-row">
                    <span class="detail-label">Material Name</span>
                    <span class="detail-value">${escapeHtml(material.name)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">SKU / Article Number</span>
                    <span class="detail-value">${escapeHtml(material.sku)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Category</span>
                    <span class="detail-value">${categoryLabels[material.category]}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Unit of Measure</span>
                    <span class="detail-value">${escapeHtml(material.unit)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Manufacturer</span>
                    <span class="detail-value">${escapeHtml(material.manufacturer)}</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>Description</h3>
                <p style="color: var(--text-secondary); line-height: 1.6;">${escapeHtml(material.description)}</p>
            </div>
            
            ${material.specs ? `
            <div class="detail-section">
                <h3>Technical Specifications</h3>
                <p style="color: var(--text-secondary); line-height: 1.6;">${escapeHtml(material.specs)}</p>
            </div>
            ` : ''}
            
            <div class="detail-section">
                <h3>Blockchain Information</h3>
                <div class="detail-row">
                    <span class="detail-label">Asset Address</span>
                    <span class="detail-value" style="font-family: monospace; color: var(--primary-color);">
                        ${material.assetAddress}
                        <button class="copy-btn" onclick="copyAddress('${material.assetAddress}')">📋</button>
                    </span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Registered By</span>
                    <span class="detail-value" style="font-family: monospace;">${formatAddress(material.registeredBy)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Registration Date</span>
                    <span class="detail-value">${new Date(material.registeredDate).toLocaleString()}</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>ERP Integration</h3>
                <p style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 1rem;">
                    Use this asset address as a universal reference in your ERP, MRP, or procurement systems.
                    This ensures consistent material identification across organizations.
                </p>
                <div style="background: var(--background-dark); padding: 1rem; border-radius: 8px; border: 1px solid var(--primary-color);">
                    <code style="color: var(--primary-color); font-size: 0.9rem;">
                        asset_reference: ${material.assetAddress}
                    </code>
                </div>
            </div>
        </div>
    `;
    
    modal.classList.add('active');
}

function closeDetailModal() {
    document.getElementById('detailModal').classList.remove('active');
}

// Update Statistics
function updateStats() {
    document.getElementById('totalMaterials').textContent = state.materials.length;
    
    const categories = new Set(state.materials.map(m => m.category));
    document.getElementById('totalCategories').textContent = categories.size;
    
    const businesses = new Set(state.materials.map(m => m.registeredBy));
    document.getElementById('totalBusinesses').textContent = businesses.size;
}

// Utility Functions
function formatAddress(address) {
    if (!address) return 'N/A';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function copyAddress(address) {
    navigator.clipboard.writeText(address).then(() => {
        showNotification('Address copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Failed to copy:', err);
        showNotification('Failed to copy address', 'error');
    });
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function showNotification(message, type = 'info') {
    // Simple notification implementation
    // In production, you might want to use a toast library
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#6366f1'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4);
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
