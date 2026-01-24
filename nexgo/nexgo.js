/**
 * NexGo - Decentralized Taxi Service
 * 
 * Allows taxis to broadcast their position and status on-chain,
 * and passengers to find nearby available taxis.
 */

// Configuration
const NEXUS_API_BASE = 'https://api.distordia.com';
const UPDATE_INTERVAL = 30000; // 30 seconds for driver broadcasts
const REFRESH_INTERVAL = 10000; // 10 seconds for passenger view refresh
const DISTORDIA_NAMESPACE = 'distordia';

// State
let map = null;
let userMarker = null;
let taxiMarkers = [];
let userPosition = null;
let currentMode = 'passenger';
let isBroadcasting = false;
let broadcastInterval = null;
let walletConnected = false;
let walletAddress = null;
let driverStatus = 'available';

// Demo data for development (Ålesund, Norway)
const demoTaxis = [
    { id: 'taxi-001', vehicleId: 'ABC-1234', type: 'sedan', status: 'available', lat: 62.4722, lng: 6.1495, driver: 'Ålesund Taxi 1' },
    { id: 'taxi-002', vehicleId: 'XYZ-5678', type: 'suv', status: 'available', lat: 62.4680, lng: 6.1550, driver: 'Ålesund Taxi 2' },
    { id: 'taxi-003', vehicleId: 'DEF-9012', type: 'van', status: 'occupied', lat: 62.4750, lng: 6.1400, driver: 'Ålesund Taxi 3' },
    { id: 'taxi-004', vehicleId: 'GHI-3456', type: 'luxury', status: 'available', lat: 62.4700, lng: 6.1600, driver: 'Ålesund Taxi 4' },
    { id: 'taxi-005', vehicleId: 'JKL-7890', type: 'sedan', status: 'occupied', lat: 62.4650, lng: 6.1450, driver: 'Ålesund Taxi 5' },
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('NexGo initialized');
    initMap();
    setupEventListeners();
    checkExistingConnection();
    getUserLocation();
    loadTaxiData();
    updateStats();
    
    // Auto-refresh for passenger mode
    setInterval(() => {
        if (currentMode === 'passenger') {
            loadTaxiData();
        }
    }, REFRESH_INTERVAL);
});

// Initialize Map
function initMap() {
    // Default to Oslo, Norway
    map = L.map('map').setView([59.9139, 10.7522], 13);
    
    // Dark theme map tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
    }).addTo(map);
}

// Setup Event Listeners
function setupEventListeners() {
    // Mode toggle
    document.getElementById('passengerModeBtn').addEventListener('click', () => switchMode('passenger'));
    document.getElementById('driverModeBtn').addEventListener('click', () => switchMode('driver'));
    
    // Map controls
    document.getElementById('locateMeBtn').addEventListener('click', getUserLocation);
    document.getElementById('refreshBtn').addEventListener('click', loadTaxiData);
    
    // Driver controls
    document.getElementById('statusAvailable').addEventListener('click', () => setDriverStatus('available'));
    document.getElementById('statusOccupied').addEventListener('click', () => setDriverStatus('occupied'));
    document.getElementById('startBroadcastBtn').addEventListener('click', startBroadcasting);
    document.getElementById('stopBroadcastBtn').addEventListener('click', stopBroadcasting);
    
    // Wallet
    document.getElementById('connectWalletBtn').addEventListener('click', connectWallet);
    document.getElementById('disconnectBtn')?.addEventListener('click', disconnectWallet);
    
    // Info modal
    document.getElementById('infoBtn').addEventListener('click', openInfoModal);
}

// Switch Mode
function switchMode(mode) {
    currentMode = mode;
    
    // Update buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    // Update panels
    document.getElementById('passengerPanel').style.display = mode === 'passenger' ? 'block' : 'none';
    document.getElementById('driverPanel').style.display = mode === 'driver' ? 'block' : 'none';
    
    // Update map title
    document.getElementById('mapTitle').textContent = mode === 'passenger' ? 'Nearby Taxis' : 'Your Location';
    
    // If switching to driver mode, check wallet connection
    if (mode === 'driver' && !walletConnected) {
        showToast('Connect your wallet to broadcast your position', 'info');
    }
}

// Get User Location
function getUserLocation() {
    if (!navigator.geolocation) {
        showToast('Geolocation not supported by your browser', 'error');
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            userPosition = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            
            // Update map view
            map.setView([userPosition.lat, userPosition.lng], 14);
            
            // Add or update user marker
            if (userMarker) {
                userMarker.setLatLng([userPosition.lat, userPosition.lng]);
            } else {
                const userIcon = L.divIcon({
                    className: 'taxi-marker',
                    html: '<div class="marker-icon user">📍</div>',
                    iconSize: [36, 36],
                    iconAnchor: [18, 36]  // Bottom-center anchor for pin emoji
                });
                userMarker = L.marker([userPosition.lat, userPosition.lng], { icon: userIcon }).addTo(map);
                userMarker.bindPopup('Your Location');
            }
            
            // Update driver location display
            if (currentMode === 'driver') {
                document.getElementById('currentLocation').textContent = 
                    `${userPosition.lat.toFixed(6)}, ${userPosition.lng.toFixed(6)}`;
                document.getElementById('lastUpdate').textContent = 
                    `Last updated: ${new Date().toLocaleTimeString()}`;
            }
            
            showToast('Location updated', 'success');
        },
        (error) => {
            console.error('Geolocation error:', error);
            showToast('Unable to get your location', 'error');
        },
        { enableHighAccuracy: true }
    );
}

// Load Taxi Data
async function loadTaxiData() {
    const taxiList = document.getElementById('taxiList');
    
    try {
        // Try to fetch from blockchain
        const taxis = await fetchTaxisFromChain();
        
        // Clear existing markers
        taxiMarkers.forEach(marker => map.removeLayer(marker));
        taxiMarkers = [];
        
        // Add markers and list items
        if (taxis.length === 0) {
            taxiList.innerHTML = `
                <div class="empty-state">
                    <div class="icon">🚕</div>
                    <p>No taxis available in your area</p>
                </div>
            `;
        } else {
            taxiList.innerHTML = taxis.map(taxi => createTaxiCard(taxi)).join('');
            
            taxis.forEach(taxi => {
                addTaxiMarker(taxi);
            });
        }
        
    } catch (error) {
        console.error('Error loading taxi data:', error);
        // Use demo data
        loadDemoData();
    }
}

// Fetch Taxis from Blockchain
async function fetchTaxisFromChain() {
    try {
        const response = await fetch(`${NEXUS_API_BASE}/register/list/assets:asset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                where: `results.distordia-type=nexgo-taxi AND results.status!=offline`,
                limit: 100
            })
        });
        
        const data = await response.json();
        
        if (data.result && Array.isArray(data.result)) {
            return data.result.map(asset => ({
                id: asset.address,
                vehicleId: asset['vehicle-id'] || 'Unknown',
                type: asset['vehicle-type'] || 'sedan',
                status: asset.status || 'available',
                lat: parseFloat(asset.latitude) || 0,
                lng: parseFloat(asset.longitude) || 0,
                driver: asset.driver || 'Unknown Driver',
                lastUpdate: asset.modified
            }));
        }
        
        return [];
    } catch (error) {
        console.log('Blockchain fetch failed, using demo data');
        throw error;
    }
}

// Load Demo Data
function loadDemoData() {
    const taxiList = document.getElementById('taxiList');
    
    // Add some randomness to demo positions based on user location
    const taxis = demoTaxis.map(taxi => {
        if (userPosition) {
            return {
                ...taxi,
                lat: userPosition.lat + (Math.random() - 0.5) * 0.02,
                lng: userPosition.lng + (Math.random() - 0.5) * 0.02
            };
        }
        return taxi;
    });
    
    // Clear existing markers
    taxiMarkers.forEach(marker => map.removeLayer(marker));
    taxiMarkers = [];
    
    // Render list
    taxiList.innerHTML = taxis.map(taxi => createTaxiCard(taxi)).join('');
    
    // Add markers
    taxis.forEach(taxi => addTaxiMarker(taxi));
}

// Create Taxi Card HTML
function createTaxiCard(taxi) {
    const distance = userPosition ? calculateDistance(userPosition, taxi) : null;
    const distanceText = distance ? `${distance.toFixed(1)} km` : '--';
    const timeText = distance ? `~${Math.ceil(distance * 3)} min` : '--';
    
    const vehicleIcons = {
        sedan: '🚗',
        suv: '🚙',
        van: '🚐',
        luxury: '🏎️'
    };
    
    return `
        <div class="taxi-card" onclick="focusTaxi('${taxi.id}', ${taxi.lat}, ${taxi.lng})">
            <div class="taxi-icon">${vehicleIcons[taxi.type] || '🚕'}</div>
            <div class="taxi-info">
                <h4>${taxi.vehicleId}</h4>
                <p>${taxi.type.charAt(0).toUpperCase() + taxi.type.slice(1)}</p>
            </div>
            <div class="taxi-distance">
                <div class="distance">${distanceText}</div>
                <div class="time">${timeText}</div>
            </div>
            <span class="taxi-status ${taxi.status}">${taxi.status}</span>
        </div>
    `;
}

// Add Taxi Marker to Map
function addTaxiMarker(taxi) {
    const icon = L.divIcon({
        className: 'taxi-marker',
        html: `<div class="marker-icon ${taxi.status}">🚕</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
    });
    
    const marker = L.marker([taxi.lat, taxi.lng], { icon: icon }).addTo(map);
    marker.bindPopup(`
        <strong>${taxi.vehicleId}</strong><br>
        Status: ${taxi.status}<br>
        Type: ${taxi.type}
    `);
    
    taxiMarkers.push(marker);
}

// Focus on a taxi
function focusTaxi(id, lat, lng) {
    map.setView([lat, lng], 16);
}

// Calculate Distance
function calculateDistance(pos1, pos2) {
    const R = 6371; // Earth's radius in km
    const dLat = (pos2.lat - pos1.lat) * Math.PI / 180;
    const dLng = (pos2.lng - pos1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(pos1.lat * Math.PI / 180) * Math.cos(pos2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Set Driver Status
function setDriverStatus(status) {
    driverStatus = status;
    
    document.querySelectorAll('.status-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === status);
    });
    
    // If broadcasting, update immediately
    if (isBroadcasting) {
        broadcastPosition();
    }
}

// Start Broadcasting
async function startBroadcasting() {
    if (!walletConnected) {
        showToast('Please connect your wallet first', 'error');
        return;
    }
    
    const vehicleId = document.getElementById('vehicleId').value;
    if (!vehicleId) {
        showToast('Please enter your vehicle ID', 'error');
        return;
    }
    
    if (!userPosition) {
        showToast('Waiting for GPS location...', 'info');
        getUserLocation();
        return;
    }
    
    isBroadcasting = true;
    
    // Update UI
    document.getElementById('startBroadcastBtn').style.display = 'none';
    document.getElementById('stopBroadcastBtn').style.display = 'block';
    document.getElementById('currentStatus').textContent = 'Broadcasting';
    document.getElementById('currentStatus').classList.add('broadcasting');
    
    // Broadcast immediately
    await broadcastPosition();
    
    // Set up interval
    broadcastInterval = setInterval(broadcastPosition, UPDATE_INTERVAL);
    
    showToast('Started broadcasting your position', 'success');
}

// Stop Broadcasting
async function stopBroadcasting() {
    isBroadcasting = false;
    
    if (broadcastInterval) {
        clearInterval(broadcastInterval);
        broadcastInterval = null;
    }
    
    // Update UI
    document.getElementById('startBroadcastBtn').style.display = 'block';
    document.getElementById('stopBroadcastBtn').style.display = 'none';
    document.getElementById('currentStatus').textContent = 'Not Broadcasting';
    document.getElementById('currentStatus').classList.remove('broadcasting');
    
    // Set status to offline on chain
    try {
        await updateTaxiAsset('offline');
    } catch (error) {
        console.error('Failed to update offline status:', error);
    }
    
    showToast('Stopped broadcasting', 'info');
}

// Broadcast Position
async function broadcastPosition() {
    if (!userPosition || !isBroadcasting) return;
    
    try {
        await updateTaxiAsset(driverStatus);
        
        document.getElementById('lastUpdate').textContent = 
            `Last broadcast: ${new Date().toLocaleTimeString()}`;
            
    } catch (error) {
        console.error('Broadcast failed:', error);
        showToast('Failed to broadcast position', 'error');
    }
}

// Update Taxi Asset on Blockchain
async function updateTaxiAsset(status) {
    const vehicleId = document.getElementById('vehicleId').value;
    const vehicleType = document.getElementById('vehicleType').value;
    
    const assetData = {
        'distordia-type': 'nexgo-taxi',
        'vehicle-id': vehicleId,
        'vehicle-type': vehicleType,
        'status': status,
        'latitude': userPosition.lat.toString(),
        'longitude': userPosition.lng.toString(),
        'driver': walletAddress,
        'timestamp': new Date().toISOString()
    };
    
    // Use Q-Wallet to update/create asset
    if (typeof window.qWallet !== 'undefined') {
        try {
            await window.qWallet.updateAsset({
                name: `nexgo-taxi-${vehicleId}`,
                data: assetData
            });
        } catch (error) {
            // If asset doesn't exist, create it
            await window.qWallet.createAsset({
                name: `nexgo-taxi-${vehicleId}`,
                data: assetData
            });
        }
    }
}

// Update Stats
function updateStats() {
    // Demo stats
    document.getElementById('totalTaxis').textContent = '127';
    document.getElementById('availableTaxis').textContent = '84';
    document.getElementById('totalCities').textContent = '12';
    document.getElementById('onChainUpdates').textContent = '45.2K';
}

// Wallet Connection
async function connectWallet() {
    if (typeof window.qWallet === 'undefined') {
        showToast('Q-Wallet extension not found. Please install Q-Wallet.', 'error');
        return;
    }
    
    try {
        const accounts = await window.qWallet.connect();
        if (accounts && accounts.length > 0) {
            walletAddress = accounts[0];
            walletConnected = true;
            updateWalletUI();
            showToast('Wallet connected', 'success');
        }
    } catch (error) {
        console.error('Wallet connection failed:', error);
        showToast('Failed to connect wallet', 'error');
    }
}

async function disconnectWallet() {
    try {
        if (typeof window.qWallet !== 'undefined' && window.qWallet.disconnect) {
            await window.qWallet.disconnect();
        }
    } catch (error) {
        console.error('Error disconnecting:', error);
    }
    
    // Stop broadcasting if active
    if (isBroadcasting) {
        stopBroadcasting();
    }
    
    walletAddress = null;
    walletConnected = false;
    updateWalletUI();
    showToast('Wallet disconnected', 'info');
}

function updateWalletUI() {
    const connectBtn = document.getElementById('connectWalletBtn');
    const walletInfo = document.getElementById('walletInfo');
    const addressEl = document.getElementById('walletAddress');
    
    if (walletConnected && walletAddress) {
        if (connectBtn) connectBtn.style.display = 'none';
        if (walletInfo) walletInfo.style.display = 'flex';
        if (addressEl) addressEl.textContent = `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`;
    } else {
        if (connectBtn) connectBtn.style.display = 'block';
        if (walletInfo) walletInfo.style.display = 'none';
    }
}

async function checkExistingConnection() {
    if (typeof window.qWallet !== 'undefined') {
        try {
            const accounts = await window.qWallet.getAccounts();
            if (accounts && accounts.length > 0) {
                walletAddress = accounts[0];
                walletConnected = true;
                updateWalletUI();
            }
        } catch (error) {
            console.log('No existing wallet connection');
        }
    }
}

// Modal Functions
function openInfoModal() {
    document.getElementById('infoModal').classList.add('show');
}

function closeInfoModal() {
    document.getElementById('infoModal').classList.remove('show');
}

// Toast Notifications
function showToast(message, type = 'info') {
    // Remove existing toasts
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#22c55e' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        font-weight: 500;
        z-index: 10001;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add toast animations to head
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
