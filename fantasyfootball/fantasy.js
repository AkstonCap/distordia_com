// Fantasy Football - Nexus Blockchain Integration
// Connects on-chain NFT assets with real-world football player performance
// Includes: Pack Shop, Weekly Leagues, Marketplace

// ============================================
// STATE MACHINE DEFINITIONS
// ============================================

const PackPurchaseState = {
    IDLE: 'idle',
    SELECT_PACK: 'select_pack',
    CHECK_WALLET: 'check_wallet',
    CONFIRM_PRICE: 'confirm_price',
    SIGN_TX: 'sign_tx',
    SUBMIT_TX: 'submit_tx',
    AWAIT_ORACLE: 'await_oracle',
    REVEAL: 'reveal',
    COMPLETE: 'complete',
    FAILED: 'failed'
};

const LeagueState = {
    UPCOMING: 'upcoming',
    OPEN: 'open',
    LOCKED: 'locked',
    LIVE: 'live',
    FINALIZED: 'finalized',
    COMPLETED: 'completed'
};

const MarketplaceState = {
    BROWSE: 'browse',
    VIEW_LISTING: 'view_listing',
    EXECUTE_ORDER: 'execute_order',
    SUCCESS: 'success',
    FAILED: 'failed'
};

// Current state trackers
let packPurchaseState = PackPurchaseState.IDLE;
let currentPackType = null;

// API Configuration
const NEXUS_API_BASE = 'https://api.distordia.com';
const FOOTBALL_API_BASE = 'https://api-football-v1.p.rapidapi.com/v3';

// Distordia Treasury Address (receives pack sales and fees)
const DISTORDIA_TREASURY = 'distordia';

// Pack Pricing (in NXS)
const PACK_PRICES = {
    bronze: 5,
    silver: 15,
    gold: 50,
    limited: 100
};

// Pack Contents Probabilities
const PACK_CONTENTS = {
    bronze: { cards: 4, common: 0.80, rare: 0.20, epic: 0, legendary: 0 },
    silver: { cards: 5, common: 0.40, rare: 0.40, epic: 0.15, legendary: 0.05 },
    gold: { cards: 4, common: 0, rare: 0.25, epic: 0.50, legendary: 0.25 },
    limited: { cards: 3, common: 0, rare: 0, epic: 0.60, legendary: 0.40 }
};

// League Entry Fee & Split
const LEAGUE_ENTRY_FEE = 10; // NXS
const PRIZE_POOL_SHARE = 0.85; // 85% to prize pool
const PLATFORM_FEE_SHARE = 0.15; // 15% to Distordia

// Marketplace Fee
const MARKETPLACE_FEE = 0.05; // 5%

// Asset naming standard
const ASSET_NAMESPACE = 'distordia';
const ASSET_PREFIX = 'player';  // Local name format: player.{league}.{team}.{playerid}
const ASSET_STANDARD = 'distordia.player.v1';

// Nexus API Endpoints
const NEXUS_ENDPOINTS = {
    // Register API - for listing all player assets (public access)
    listNames: `${NEXUS_API_BASE}/register/list/names`,
    listAssets: `${NEXUS_API_BASE}/register/list/assets`,
    
    // Assets API - for asset details
    getAsset: `${NEXUS_API_BASE}/assets/get/asset`,
    
    // Market API - for trading players
    createOrder: `${NEXUS_API_BASE}/market/create/order`,
    executeOrder: `${NEXUS_API_BASE}/market/execute/order`,
    listOrders: `${NEXUS_API_BASE}/market/list/order`,
    listExecuted: `${NEXUS_API_BASE}/market/list/executed`,
    
    // Profiles API
    getProfile: `${NEXUS_API_BASE}/profiles/get/master`,
    
    // System API
    systemInfo: `${NEXUS_API_BASE}/system/get/info`
};

// Global State
let myAssets = [];
let myTeam = {
    GK: null,
    DEF: [null, null, null, null],
    MID: [null, null, null, null],
    FWD: [null, null]
};
let allPlayers = [];
let liveMatches = [];
let leaderboard = [];

// Wallet State
let walletConnected = false;
let userAddress = null;
let userSession = null;
let userPin = null;

// Scoring Rules
const SCORING_RULES = {
    goal: { FWD: 8, MID: 10, DEF: 12, GK: 12 },
    assist: 6,
    cleanSheet: { GK: 8, DEF: 8, MID: 4, FWD: 0 },
    save: 2,
    penaltySave: 10,
    yellowCard: -2,
    redCard: -6,
    ownGoal: -4,
    penaltyMiss: -4,
    minutesPlayed: { 60: 4, 30: 2 },
    manOfMatch: 6
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initializeWallet();
    initializeFantasyFootball();
    setupEventListeners();
    startLiveUpdates();
});

// ====================
// WALLET CONNECTION
// ====================

// Initialize wallet connection
async function initializeWallet() {
    // 1. Check if Q-Wallet is installed
    if (typeof window.qWallet === 'undefined') {
        console.warn('Q-Wallet not detected');
        showWalletInstallPrompt();
        return;
    }

    console.log('Q-Wallet detected!');

    // 2. Check if already connected
    try {
        const accounts = await window.qWallet.getAccounts();
        if (accounts.length > 0) {
            console.log('Already connected to wallet:', accounts[0]);
            userAddress = accounts[0];
            walletConnected = true;
            updateWalletUI();
            return;
        }
    } catch (error) {
        console.log('Not connected to wallet yet');
    }

    // 3. Setup connect button event listener
    const connectBtn = document.getElementById('connectWalletBtn');
    if (connectBtn) {
        connectBtn.addEventListener('click', async () => {
            console.log('Connect button clicked');
            console.log('window.qWallet exists:', typeof window.qWallet !== 'undefined');
            try {
                console.log('Calling window.qWallet.connect()...');
                const accounts = await window.qWallet.connect();
                console.log('connect() returned:', accounts);
                if (accounts && accounts.length > 0) {
                    userAddress = accounts[0];
                    walletConnected = true;
                    console.log('Connected to wallet:', userAddress);
                    updateWalletUI();
                    await loadMyAssets();
                } else {
                    console.warn('No accounts returned');
                    alert('No accounts found. Please make sure Q-Wallet is unlocked.');
                }
            } catch (error) {
                console.error('Failed to connect wallet. Error type:', typeof error);
                console.error('Error:', error);
                console.error('Error message:', error.message);
                console.error('Error stack:', error.stack);
                
                if (error.message && error.message.includes('denied')) {
                    alert('Connection denied. Please approve the connection in your Q-Wallet.');
                } else if (error.message && error.message.includes('not connected')) {
                    alert('Please open Q-Wallet extension and log in first.\n\n1. Click the Q-Wallet icon in your browser toolbar\n2. Enter your password to unlock the wallet\n3. Then try connecting again');
                } else {
                    alert('Failed to connect to wallet.\n\nError: ' + error.message + '\n\nPlease make sure Q-Wallet is installed and unlocked.');
                }
            }
        });
    }

    // Setup disconnect button
    const disconnectBtn = document.getElementById('disconnectBtn');
    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', disconnectWallet);
    }
}

// Disconnect wallet
function disconnectWallet() {
    userAddress = null;
    userSession = null;
    userPin = null;
    walletConnected = false;
    
    updateWalletUI();
    console.log('Wallet disconnected');
}

// Update wallet UI
function updateWalletUI() {
    const connectBtn = document.getElementById('connectWalletBtn');
    const walletInfo = document.getElementById('walletInfo');
    const walletAddressEl = document.getElementById('walletAddress');

    if (walletConnected && userAddress) {
        // Show wallet info, hide connect button
        if (connectBtn) connectBtn.style.display = 'none';
        if (walletInfo) walletInfo.style.display = 'flex';
        
        // Display shortened address
        if (walletAddressEl) {
            const shortAddress = userAddress.length > 16 
                ? userAddress.substring(0, 8) + '...' + userAddress.substring(userAddress.length - 6)
                : userAddress;
            walletAddressEl.textContent = shortAddress;
            walletAddressEl.title = userAddress; // Show full address on hover
        }
    } else {
        // Show connect button, hide wallet info
        if (connectBtn) connectBtn.style.display = 'block';
        if (walletInfo) walletInfo.style.display = 'none';
    }
}

// Show wallet install prompt
function showWalletInstallPrompt() {
    const connectBtn = document.getElementById('connectWalletBtn');
    if (connectBtn) {
        connectBtn.textContent = 'Install Q-Wallet';
        connectBtn.addEventListener('click', () => {
            window.open('https://github.com/AkstonCap/q-wallet', '_blank');
        });
    }
}

// Get wallet balance
async function getWalletBalance() {
    if (!walletConnected) {
        console.warn('Wallet not connected');
        return null;
    }

    try {
        const balance = await window.qWallet.getBalance('default');
        console.log('Wallet balance:', balance, 'NXS');
        return balance;
    } catch (error) {
        console.error('Failed to get balance:', error);
        return null;
    }
}

// Initialize Fantasy Football
async function initializeFantasyFootball() {
    showLoadingStates();
    await Promise.all([
        loadMyAssets(),
        loadLiveMatches(),
        loadLeaderboard(),
        loadMarketplace(),
        updateStats()
    ]);
}

// Setup Event Listeners
function setupEventListeners() {
    // Asset search
    const assetSearch = document.getElementById('asset-search');
    if (assetSearch) {
        assetSearch.addEventListener('input', (e) => filterAssets(e.target.value));
    }

    // Position filter
    const positionFilter = document.getElementById('position-filter');
    if (positionFilter) {
        positionFilter.addEventListener('change', (e) => filterAssetsByPosition(e.target.value));
    }

    // Leaderboard tabs
    document.querySelectorAll('.leaderboard-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.leaderboard-tabs .tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            loadLeaderboard(e.target.dataset.period);
        });
    });

    // Marketplace filters
    const marketplaceFilters = ['league-filter', 'marketplace-position-filter', 'sort-filter'];
    marketplaceFilters.forEach(filterId => {
        const filterEl = document.getElementById(filterId);
        if (filterEl) {
            filterEl.addEventListener('change', () => applyMarketplaceFilters());
        }
    });
}

// Load My Assets from Nexus Blockchain
async function loadMyAssets() {
    const assetsList = document.getElementById('my-assets-list');
    if (assetsList) {
        assetsList.innerHTML = '<div class="loading-spinner">Loading assets from blockchain...</div>';
    }
    
    try {
        // Fetch all player assets from the distordia namespace
        const players = await fetchPlayerAssets();
        
        console.log(`Loaded ${players.length} player assets from Nexus blockchain`);
        myAssets = players;
        renderMyAssets(players);
        
    } catch (error) {
        console.error('Error loading assets from blockchain:', error);
        myAssets = [];
        renderMyAssets([]);
        showError('my-assets-list', 'Failed to load assets from blockchain. Please try again.');
    }
}

// Fetch player assets from Nexus register API (public access)
async function fetchPlayerAssets() {
    try {
        console.log('Fetching player assets from Nexus blockchain...');
        
        // Fetch all names in the distordia namespace starting with 'player.'
        const response = await fetch(NEXUS_ENDPOINTS.listNames, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                where: `object.namespace = '${ASSET_NAMESPACE}' AND object.name LIKE '${ASSET_PREFIX}.%'`,
                limit: 1000
            })
        });
        
        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Register API response:', data);
        
        if (!data.result || !Array.isArray(data.result)) {
            console.log('No results in response');
            return [];
        }
        
        // Parse and transform namespaced assets to player objects
        const players = data.result
            .filter(name => name.namespace === ASSET_NAMESPACE && name.name.startsWith(`${ASSET_PREFIX}.`))
            .map(name => parsePlayerAsset(name))
            .filter(player => player !== null);
        
        console.log(`Parsed ${players.length} valid player assets`);
        return players;
        
    } catch (error) {
        console.error('Error fetching player assets:', error);
        return [];
    }
}

// Parse player asset from blockchain name data
function parsePlayerAsset(nameData) {
    try {
        // Parse metadata from asset data field
        let metadata = {};
        if (nameData.data) {
            try {
                metadata = typeof nameData.data === 'string' ? JSON.parse(nameData.data) : nameData.data;
            } catch (e) {
                console.warn('Failed to parse asset metadata:', nameData.name);
            }
        }
        
        // Extract player info from local name: player.{league}.{team}.{playerid}
        const nameParts = nameData.name.split('.');
        if (nameParts.length < 4 || nameParts[0] !== ASSET_PREFIX) {
            console.warn('Invalid asset name format:', nameData.name);
            return null;
        }
        
        const [prefix, league, team, playerId] = nameParts;
        
        // Validate standard
        if (metadata.standard !== ASSET_STANDARD) {
            console.warn('Asset does not match standard:', nameData.name);
        }
        
        // Full namespaced name: distordia:player.{league}.{team}.{playerid}
        const fullName = `${nameData.namespace}:${nameData.name}`;
        
        return {
            id: nameData.address || fullName,
            tokenId: nameData.address || fullName,
            assetName: fullName,  // Full namespaced name
            localName: nameData.name,  // Local name only
            playerName: metadata.player?.name || playerId.replace(/_/g, ' '),
            realWorldId: metadata.player?.realWorldId,
            team: metadata.team?.name || team,
            teamId: team,
            league: league,
            leagueName: metadata.team?.leagueName || league.toUpperCase(),
            position: metadata.position || 'MID',
            nationality: metadata.player?.nationality,
            attributes: metadata.attributes || {},
            rarity: metadata.rarity || 'common',
            season: metadata.season || '2024-2025',
            points: metadata.stats?.totalPoints || 0,
            weekPoints: metadata.stats?.weekPoints || 0,
            goals: metadata.stats?.goals || 0,
            assists: metadata.stats?.assists || 0,
            cleanSheets: metadata.stats?.cleanSheets || 0,
            appearances: metadata.stats?.appearances || 0,
            value: calculatePlayerValue(metadata),
            inTeam: false,
            metadata: metadata
        };
        
    } catch (error) {
        console.error('Error parsing player asset:', error);
        return null;
    }
}

// Calculate player value based on stats and rarity
function calculatePlayerValue(metadata) {
    let baseValue = 10;
    
    // Rarity multiplier
    const rarityMultipliers = {
        'common': 1,
        'rare': 2,
        'epic': 5,
        'legendary': 10
    };
    
    baseValue *= rarityMultipliers[metadata.rarity] || 1;
    
    // Overall rating bonus
    if (metadata.attributes?.overall) {
        baseValue += metadata.attributes.overall / 10;
    }
    
    // Performance bonus
    if (metadata.stats?.totalPoints) {
        baseValue += metadata.stats.totalPoints / 10;
    }
    
    return Math.round(baseValue);
}

// No demo assets - all data comes from blockchain

// Render My Assets
function renderMyAssets(assets) {
    const assetsList = document.getElementById('my-assets-list');
    if (!assetsList) return;

    if (assets.length === 0) {
        assetsList.innerHTML = `
            <div class="empty-state">
                <p>You don't own any player assets yet.</p>
                <button class="btn btn-primary" onclick="scrollToMarketplace()">Browse Marketplace</button>
            </div>
        `;
        return;
    }

    assetsList.innerHTML = assets.map(asset => `
        <div class="asset-card ${asset.inTeam ? 'in-team' : ''}" onclick="selectAsset('${asset.id}')">
            <div class="asset-avatar">${getPlayerInitials(asset.playerName)}</div>
            <div class="asset-info">
                <div class="asset-name">${asset.playerName}</div>
                <div class="asset-details">
                    <span>${asset.team}</span>
                    <span>•</span>
                    <span>${asset.tokenId}</span>
                </div>
            </div>
            <div class="asset-stats">
                <div class="asset-points">${asset.points}</div>
                <div class="asset-position">${asset.position}</div>
            </div>
        </div>
    `).join('');
}

// Select Asset for Team
function selectAsset(assetId) {
    const asset = myAssets.find(a => a.id === assetId);
    if (!asset || asset.inTeam) return;

    // Add to team based on position
    if (addToTeam(asset)) {
        asset.inTeam = true;
        renderMyAssets(myAssets);
        renderTeamFormation();
        updateTeamScore();
    }
}

// Add asset to team
function addToTeam(asset) {
    const position = asset.position;
    
    if (position === 'GK') {
        if (!myTeam.GK) {
            myTeam.GK = asset;
            return true;
        }
    } else if (position === 'DEF') {
        const emptySlot = myTeam.DEF.findIndex(slot => slot === null);
        if (emptySlot !== -1) {
            myTeam.DEF[emptySlot] = asset;
            return true;
        }
    } else if (position === 'MID') {
        const emptySlot = myTeam.MID.findIndex(slot => slot === null);
        if (emptySlot !== -1) {
            myTeam.MID[emptySlot] = asset;
            return true;
        }
    } else if (position === 'FWD') {
        const emptySlot = myTeam.FWD.findIndex(slot => slot === null);
        if (emptySlot !== -1) {
            myTeam.FWD[emptySlot] = asset;
            return true;
        }
    }
    
    alert(`Team full at ${position} position`);
    return false;
}

// Render Team Formation
function renderTeamFormation() {
    const positions = ['GK', 'DEF', 'MID', 'FWD'];
    
    positions.forEach(pos => {
        if (pos === 'GK') {
            const slot = document.querySelector(`.position-slot[data-position="GK"]`);
            if (slot && myTeam.GK) {
                slot.innerHTML = createPlayerCardMini(myTeam.GK);
            }
        } else {
            const slots = document.querySelectorAll(`.position-slot[data-position="${pos}"]`);
            slots.forEach((slot, index) => {
                const player = myTeam[pos][index];
                if (player) {
                    slot.innerHTML = createPlayerCardMini(player);
                }
            });
        }
    });
}

// Create mini player card for formation
function createPlayerCardMini(player) {
    return `
        <div class="player-card-mini" onclick="removeFromTeam('${player.id}')">
            <div class="player-name">${player.playerName.split(' ').pop()}</div>
            <div class="player-points">${player.weekPoints}</div>
        </div>
    `;
}

// Remove from team
function removeFromTeam(assetId) {
    const asset = myAssets.find(a => a.id === assetId);
    if (!asset) return;

    const position = asset.position;
    
    if (position === 'GK' && myTeam.GK?.id === assetId) {
        myTeam.GK = null;
    } else if (position === 'DEF') {
        const index = myTeam.DEF.findIndex(p => p?.id === assetId);
        if (index !== -1) myTeam.DEF[index] = null;
    } else if (position === 'MID') {
        const index = myTeam.MID.findIndex(p => p?.id === assetId);
        if (index !== -1) myTeam.MID[index] = null;
    } else if (position === 'FWD') {
        const index = myTeam.FWD.findIndex(p => p?.id === assetId);
        if (index !== -1) myTeam.FWD[index] = null;
    }

    asset.inTeam = false;
    
    // Re-render everything
    const slot = document.querySelector(`.position-slot .player-card-mini`);
    renderMyAssets(myAssets);
    location.reload(); // Simple way to reset formation
}

// Auto-fill team
function autoFillTeam() {
    clearTeam();
    
    // Sort assets by points
    const sorted = [...myAssets].sort((a, b) => b.points - a.points);
    
    sorted.forEach(asset => {
        if (!asset.inTeam) {
            addToTeam(asset);
        }
    });
    
    renderMyAssets(myAssets);
    renderTeamFormation();
    updateTeamScore();
}

// Clear team
function clearTeam() {
    myTeam = {
        GK: null,
        DEF: [null, null, null, null],
        MID: [null, null, null, null],
        FWD: [null, null]
    };
    
    myAssets.forEach(asset => asset.inTeam = false);
    renderMyAssets(myAssets);
    location.reload();
}

// Update team score
function updateTeamScore() {
    let totalPoints = 0;
    
    if (myTeam.GK) totalPoints += myTeam.GK.weekPoints;
    myTeam.DEF.forEach(p => { if (p) totalPoints += p.weekPoints; });
    myTeam.MID.forEach(p => { if (p) totalPoints += p.weekPoints; });
    myTeam.FWD.forEach(p => { if (p) totalPoints += p.weekPoints; });
    
    document.getElementById('team-total-points').textContent = totalPoints;
}

// Load Live Matches from on-chain match assets
async function loadLiveMatches() {
    const matchesGrid = document.getElementById('live-matches-grid');
    if (matchesGrid) {
        matchesGrid.innerHTML = '<div class="loading-spinner">Loading matches from blockchain...</div>';
    }
    
    try {
        // Fetch match assets from blockchain
        const response = await fetch(NEXUS_ENDPOINTS.listAssets, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                where: `object.namespace = '${ASSET_NAMESPACE}' AND object.name LIKE 'match.%'`,
                limit: 50
            })
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.result && Array.isArray(data.result)) {
            liveMatches = data.result.map(parseMatchAsset).filter(m => m !== null);
        } else {
            liveMatches = [];
        }
        
        renderLiveMatches(liveMatches);
        
    } catch (error) {
        console.error('Error loading matches from blockchain:', error);
        liveMatches = [];
        renderLiveMatches([]);
    }
}

// Parse match asset from blockchain
function parseMatchAsset(asset) {
    try {
        const metadata = typeof asset.data === 'string' ? JSON.parse(asset.data) : (asset.data || {});
        return {
            id: asset.address,
            homeTeam: metadata.homeTeam || 'TBD',
            awayTeam: metadata.awayTeam || 'TBD',
            homeScore: metadata.homeScore || 0,
            awayScore: metadata.awayScore || 0,
            status: metadata.status || 'scheduled',
            minute: metadata.minute,
            time: metadata.kickoff
        };
    } catch (e) {
        console.warn('Failed to parse match asset:', asset);
        return null;
    }
}

// Render Live Matches
function renderLiveMatches(matches) {
    const matchesGrid = document.getElementById('live-matches-grid');
    if (!matchesGrid) return;

    if (matches.length === 0) {
        matchesGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <p>No match data found on blockchain.</p>
                <p>Match assets are created by the stats oracle.</p>
            </div>
        `;
        return;
    }

    matchesGrid.innerHTML = matches.map(match => `
        <div class="match-card">
            <div class="match-status ${match.status}">${match.status === 'live' ? `⚽ LIVE - ${match.minute}'` : `📅 ${match.time || 'TBD'}`}</div>
            <div class="match-teams">
                <div class="team">
                    <div class="team-logo">${match.homeTeam.substring(0, 3).toUpperCase()}</div>
                    <div class="team-name">${match.homeTeam}</div>
                </div>
                <div class="match-score">${match.homeScore} - ${match.awayScore}</div>
                <div class="team">
                    <div class="team-logo">${match.awayTeam.substring(0, 3).toUpperCase()}</div>
                    <div class="team-name">${match.awayTeam}</div>
                </div>
            </div>
            <div class="match-time">${match.status === 'live' ? 'In Progress' : 'Upcoming'}</div>
        </div>
    `).join('');
}

// Load Leaderboard from on-chain league entries
async function loadLeaderboard(period = 'week') {
    const leaderboardList = document.getElementById('leaderboard-list');
    if (leaderboardList) {
        leaderboardList.innerHTML = '<div class="loading-spinner">Loading leaderboard from blockchain...</div>';
    }
    
    try {
        // Fetch league entry assets from blockchain
        const response = await fetch(NEXUS_ENDPOINTS.listAssets, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                where: `object.namespace = '${ASSET_NAMESPACE}' AND object.name LIKE 'entry.league.%'`,
                limit: 100,
                order: 'desc'
            })
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.result && Array.isArray(data.result)) {
            leaderboard = data.result
                .map(parseLeaderboardEntry)
                .filter(e => e !== null)
                .sort((a, b) => b.points - a.points)
                .map((entry, index) => ({ ...entry, rank: index + 1 }));
        } else {
            leaderboard = [];
        }
        
        renderLeaderboard(leaderboard);
        
    } catch (error) {
        console.error('Error loading leaderboard from blockchain:', error);
        leaderboard = [];
        renderLeaderboard([]);
    }
}

// Parse leaderboard entry from blockchain asset
function parseLeaderboardEntry(asset) {
    try {
        const metadata = typeof asset.data === 'string' ? JSON.parse(asset.data) : (asset.data || {});
        return {
            username: asset.owner || 'Anonymous',
            points: metadata.totalPoints || 0,
            players: 11,
            value: (metadata.teamValue || 0) + ' NXS'
        };
    } catch (e) {
        console.warn('Failed to parse leaderboard entry:', asset);
        return null;
    }
}

// Render Leaderboard
function renderLeaderboard(entries) {
    const leaderboardList = document.getElementById('leaderboard-list');
    if (!leaderboardList) return;

    if (entries.length === 0) {
        leaderboardList.innerHTML = `
            <div class="empty-state">
                <p>No league entries found on blockchain.</p>
                <p>Be the first to enter a league!</p>
            </div>
        `;
        return;
    }

    leaderboardList.innerHTML = entries.map(entry => `
        <div class="leaderboard-entry ${entry.rank <= 3 ? 'top-3' : ''}">
            <div class="rank ${entry.rank === 1 ? 'first' : entry.rank === 2 ? 'second' : entry.rank === 3 ? 'third' : ''}">${entry.rank}</div>
            <div class="player-info">
                <div class="player-name">${entry.username}</div>
                <div class="player-stats">${entry.players} players • ${entry.value}</div>
            </div>
            <div class="leaderboard-points">${entry.points}</div>
        </div>
    `).join('');
    
    // Also render top assets
    renderTopAssets();
}

// Render Top Assets
function renderTopAssets() {
    const topAssetsList = document.getElementById('top-assets-list');
    if (!topAssetsList) return;

    if (myAssets.length === 0) {
        topAssetsList.innerHTML = `
            <div class="empty-state">
                <p>No assets to display.</p>
            </div>
        `;
        return;
    }

    const topAssets = myAssets.slice(0, 5).sort((a, b) => (b.weekPoints || 0) - (a.weekPoints || 0));
    
    topAssetsList.innerHTML = topAssets.map((asset, index) => `
        <div class="top-asset-item">
            <div class="top-asset-rank">${index + 1}</div>
            <div class="asset-info">
                <div class="asset-name">${asset.playerName}</div>
                <div class="asset-details">
                    <span>${asset.team}</span>
                    <span>•</span>
                    <span>${asset.position}</span>
                </div>
            </div>
            <div class="asset-stats">
                <div class="asset-points">${asset.weekPoints || 0}</div>
            </div>
        </div>
    `).join('');
}

// Load Marketplace from on-chain market orders
async function loadMarketplace() {
    const marketplaceGrid = document.getElementById('marketplace-grid');
    if (marketplaceGrid) {
        marketplaceGrid.innerHTML = '<div class="loading-spinner">Loading marketplace from blockchain...</div>';
    }
    
    try {
        // Fetch market orders for player assets
        const marketOrders = await fetchPlayerMarketOrders();
        
        // For each order, fetch the player asset details
        const playersWithOrders = [];
        
        for (const order of marketOrders) {
            try {
                const playerResponse = await fetch(NEXUS_ENDPOINTS.getAsset, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ address: order.assetAddress })
                });
                
                if (playerResponse.ok) {
                    const playerData = await playerResponse.json();
                    if (playerData.result) {
                        const player = parsePlayerAsset(playerData.result);
                        if (player) {
                            playersWithOrders.push({
                                ...player,
                                orderId: order.orderId,
                                price: order.price,
                                seller: order.seller
                            });
                        }
                    }
                }
            } catch (e) {
                console.warn('Failed to fetch player for order:', order, e);
            }
        }
        
        allPlayers = playersWithOrders;
        renderMarketplace(playersWithOrders);
        
    } catch (error) {
        console.error('Error loading marketplace from blockchain:', error);
        allPlayers = [];
        renderMarketplace([]);
    }
}

// Render Marketplace
function renderMarketplace(players) {
    const marketplaceGrid = document.getElementById('marketplace-grid');
    if (!marketplaceGrid) return;

    if (players.length === 0) {
        marketplaceGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <p>No player cards listed on the marketplace.</p>
                <p>Check back later or list your own cards for sale!</p>
            </div>
        `;
        return;
    }

    marketplaceGrid.innerHTML = players.map(player => `
        <div class="marketplace-card">
            <div class="marketplace-card-header">
                <div class="marketplace-card-avatar">${getPlayerInitials(player.playerName || player.name)}</div>
            </div>
            <div class="marketplace-card-body">
                <div class="marketplace-player-name">${player.playerName || player.name}</div>
                <div class="marketplace-player-team">${player.team} • ${player.position}</div>
                <div class="marketplace-stats">
                    <div class="marketplace-stat">
                        <div class="marketplace-stat-label">Points</div>
                        <div class="marketplace-stat-value">${player.points || 0}</div>
                    </div>
                    <div class="marketplace-stat">
                        <div class="marketplace-stat-label">Goals</div>
                        <div class="marketplace-stat-value">${player.goals || 0}</div>
                    </div>
                    <div class="marketplace-stat">
                        <div class="marketplace-stat-label">Assists</div>
                        <div class="marketplace-stat-value">${player.assists || 0}</div>
                    </div>
                </div>
                <div class="marketplace-price">
                    <span class="price-label">Price:</span>
                    <span class="price-value">${player.price} NXS</span>
                </div>
                <div class="marketplace-card-footer">
                    <button class="btn-buy" onclick="buyAsset('${player.id}', '${player.orderId}')">Buy NFT</button>
                    <button class="btn-details" onclick="viewAssetDetails('${player.id}')">ℹ️</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Buy asset from marketplace
async function buyAsset(playerId, orderId) {
    if (!walletConnected) {
        alert('Please connect your Q-Wallet to buy players');
        return;
    }
    
    const player = allPlayers.find(p => p.id === playerId);
    if (!player) {
        alert('Player not found');
        return;
    }
    
    const confirmed = confirm(
        `Buy ${player.playerName || player.name} for ${player.price} NXS?\n\n` +
        `Marketplace fee (5%): ${(player.price * MARKETPLACE_FEE).toFixed(2)} NXS\n` +
        `Total: ${player.price} NXS`
    );
    
    if (!confirmed) return;
    
    try {
        // Execute market order via Q-Wallet
        const result = await buyPlayerFromMarket(orderId || player.orderId);
        
        if (result.success) {
            alert(`Successfully purchased ${player.playerName || player.name}!\n\nTransaction: ${result.txid}`);
            // Reload marketplace and user assets
            await Promise.all([loadMarketplace(), loadMyAssets()]);
        } else {
            alert(`Purchase failed: ${result.message}`);
        }
    } catch (error) {
        console.error('Error buying asset:', error);
        alert('Failed to complete purchase. Please try again.');
    }
}

// View asset details
function viewAssetDetails(playerId) {
    const player = allPlayers.find(p => p.id === playerId);
    if (player) {
        const details = `
Player: ${player.name}
Team: ${player.team}
Position: ${player.position}
League: ${player.league}
Price: ${player.price} NXS

Season Stats:
- Points: ${player.points}
- Goals: ${player.goals}
- Assists: ${player.assists}

Asset: ${player.assetName || 'N/A'}
        `.trim();
        alert(details);
    }
}

// ====================
// MARKET API INTEGRATION
// ====================

// Fetch market orders for player NFTs
async function fetchPlayerMarketOrders() {
    try {
        console.log('Fetching player market orders...');
        
        const response = await fetch(NEXUS_ENDPOINTS.listOrders, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                where: `object.market = 'PLAYER/NXS'`,
                limit: 100
            })
        });
        
        if (!response.ok) {
            throw new Error(`Market API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Market orders response:', data);
        
        if (!data.result || !Array.isArray(data.result)) {
            return [];
        }
        
        // Transform market orders to player listings
        return data.result.map(order => ({
            orderId: order.txid,
            assetAddress: order.address,  // Asset address
            price: order.price / 1000000, // Convert from satoshis to NXS
            amount: order.amount,
            seller: order.owner,
            timestamp: order.timestamp,
            market: order.market
        }));
        
    } catch (error) {
        console.error('Error fetching market orders:', error);
        return [];
    }
}

// Buy player from market (execute order)
async function buyPlayerFromMarket(orderId) {
    if (!walletConnected) {
        alert('Please connect your Q-Wallet first');
        return { success: false, message: 'Wallet not connected' };
    }

    try {
        console.log('Executing market order via Q-Wallet:', orderId);
        
        // Request transaction through Q-Wallet
        // The wallet will show a popup asking user to confirm and enter PIN
        const result = await window.qWallet.sendTransaction({
            api: 'market/execute/order',
            params: {
                txid: orderId
            }
        });
        
        console.log('Order executed:', result);
        
        return {
            success: true,
            txid: result.txid,
            message: 'Player purchased successfully!'
        };
        
    } catch (error) {
        console.error('Error buying player:', error);
        
        if (error.message && error.message.includes('denied')) {
            return {
                success: false,
                message: 'Transaction cancelled by user'
            };
        }
        
        return {
            success: false,
            message: error.message || 'Purchase failed'
        };
    }
}

// List player for sale on market
async function listPlayerForSale(localName, price) {
    if (!walletConnected) {
        alert('Please connect your Q-Wallet first');
        return { success: false, message: 'Wallet not connected' };
    }

    try {
        console.log('Listing player for sale via Q-Wallet:', localName, 'at', price, 'NXS');
        
        // Price in satoshis (1 NXS = 1,000,000 satoshis)
        const priceInSatoshis = Math.floor(price * 1000000);
        
        // Request transaction through Q-Wallet
        const result = await window.qWallet.sendTransaction({
            api: 'market/create/order',
            params: {
                name_from: ASSET_NAMESPACE,
                name_to: localName,
                price: priceInSatoshis,
                amount: 1,
                market: 'PLAYER/NXS'
            }
        });
        
        console.log('Order created:', result);
        
        return {
            success: true,
            orderId: result.txid,
            message: 'Player listed for sale successfully!'
        };
        
    } catch (error) {
        console.error('Error listing player:', error);
        
        if (error.message && error.message.includes('denied')) {
            return {
                success: false,
                message: 'Transaction cancelled by user'
            };
        }
        
        return {
            success: false,
            message: error.message || 'Failed to list player'
        };
    }
}

// Fetch executed trades history
async function fetchTradeHistory() {
    try {
        console.log('Fetching trade history...');
        
        const response = await fetch(NEXUS_ENDPOINTS.listExecuted, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                where: `object.market LIKE 'PLAYER/NXS'`,
                limit: 100,
                order: 'desc'
            })
        });
        
        if (!response.ok) {
            throw new Error(`Trade history API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Trade history:', data);
        
        if (!data.result || !Array.isArray(data.result)) {
            return [];
        }
        
        return data.result.map(trade => ({
            txid: trade.txid,
            assetName: trade.asset,
            price: trade.price / 1000000,
            buyer: trade.buyer,
            seller: trade.seller,
            timestamp: trade.timestamp
        }));
        
    } catch (error) {
        console.error('Error fetching trade history:', error);
        return [];
    }
}

// Update Stats from blockchain
async function updateStats() {
    try {
        // Count player assets on-chain
        const playerResponse = await fetch(NEXUS_ENDPOINTS.listNames, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                where: `object.namespace = '${ASSET_NAMESPACE}' AND object.name LIKE '${ASSET_PREFIX}.%'`,
                limit: 1
            })
        });
        
        // Count league entries for prize pool calculation
        const leagueResponse = await fetch(NEXUS_ENDPOINTS.listAssets, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                where: `object.namespace = '${ASSET_NAMESPACE}' AND object.name LIKE 'entry.league.%'`,
                limit: 1
            })
        });
        
        // Get total counts from headers or result length
        const playerData = await playerResponse.json();
        const leagueData = await leagueResponse.json();
        
        const totalAssets = playerData.result?.length || 0;
        const totalEntries = leagueData.result?.length || 0;
        const prizePool = totalEntries * LEAGUE_ENTRY_FEE * PRIZE_POOL_SHARE;
        
        document.getElementById('active-players').textContent = leaderboard.length || '-';
        document.getElementById('total-assets').textContent = totalAssets || '-';
        document.getElementById('live-matches').textContent = liveMatches.filter(m => m.status === 'live').length || '0';
        document.getElementById('prize-pool').textContent = prizePool > 0 ? `${prizePool.toLocaleString()} NXS` : '-';
        
    } catch (error) {
        console.error('Error updating stats from blockchain:', error);
        document.getElementById('active-players').textContent = '-';
        document.getElementById('total-assets').textContent = '-';
        document.getElementById('live-matches').textContent = '-';
        document.getElementById('prize-pool').textContent = '-';
    }
}

// Filter Functions
function filterAssets(searchTerm) {
    const filtered = myAssets.filter(asset => 
        asset.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.team.toLowerCase().includes(searchTerm.toLowerCase())
    );
    renderMyAssets(filtered);
}

function filterAssetsByPosition(position) {
    if (position === 'all') {
        renderMyAssets(myAssets);
    } else {
        const filtered = myAssets.filter(asset => asset.position === position);
        renderMyAssets(filtered);
    }
}

function applyMarketplaceFilters() {
    let filtered = [...allPlayers];
    
    const league = document.getElementById('league-filter')?.value;
    const position = document.getElementById('marketplace-position-filter')?.value;
    const sort = document.getElementById('sort-filter')?.value;
    
    if (league && league !== 'all') {
        filtered = filtered.filter(p => p.league === league);
    }
    
    if (position && position !== 'all') {
        filtered = filtered.filter(p => p.position === position);
    }
    
    if (sort === 'points') {
        filtered.sort((a, b) => b.points - a.points);
    } else if (sort === 'price-low') {
        filtered.sort((a, b) => a.price - b.price);
    } else if (sort === 'price-high') {
        filtered.sort((a, b) => b.price - a.price);
    }
    
    renderMarketplace(filtered);
}

// Refresh assets
function refreshAssets() {
    loadMyAssets();
}

// Scroll to marketplace
function scrollToMarketplace() {
    document.querySelector('.marketplace-section')?.scrollIntoView({ behavior: 'smooth' });
}

// Utility Functions
function getPlayerInitials(name) {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

function showLoadingStates() {
    // Loading states are already in HTML
}

function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `<div class="error-message">${message}</div>`;
    }
}

// Start live updates (every 30 seconds)
function startLiveUpdates() {
    setInterval(() => {
        loadLiveMatches();
        updateStats();
    }, 30000);
}

// ============================================
// PACK SHOP - STATE MACHINE IMPLEMENTATION
// ============================================

// Buy pack - Entry point
async function buyPack(packType) {
    console.log(`[PACK] State: ${packPurchaseState} -> SELECT_PACK`);
    packPurchaseState = PackPurchaseState.SELECT_PACK;
    currentPackType = packType;
    
    // Check wallet connection
    packPurchaseState = PackPurchaseState.CHECK_WALLET;
    console.log(`[PACK] State: CHECK_WALLET`);
    
    if (!walletConnected) {
        alert('Please connect your Q-Wallet first to buy packs.');
        packPurchaseState = PackPurchaseState.IDLE;
        return;
    }
    
    // Confirm price
    packPurchaseState = PackPurchaseState.CONFIRM_PRICE;
    console.log(`[PACK] State: CONFIRM_PRICE`);
    
    const price = PACK_PRICES[packType];
    const packNames = {
        bronze: 'Bronze Pack',
        silver: 'Silver Pack',
        gold: 'Gold Pack',
        limited: 'Limited Edition Pack'
    };
    
    const confirmed = confirm(
        `Buy ${packNames[packType]} for ${price} NXS?\n\n` +
        `You will receive ${PACK_CONTENTS[packType].cards} player cards.\n\n` +
        `Probabilities:\n` +
        `• Common: ${PACK_CONTENTS[packType].common * 100}%\n` +
        `• Rare: ${PACK_CONTENTS[packType].rare * 100}%\n` +
        `• Epic: ${PACK_CONTENTS[packType].epic * 100}%\n` +
        `• Legendary: ${PACK_CONTENTS[packType].legendary * 100}%`
    );
    
    if (!confirmed) {
        console.log(`[PACK] User cancelled`);
        packPurchaseState = PackPurchaseState.IDLE;
        return;
    }
    
    // Sign and submit transaction
    packPurchaseState = PackPurchaseState.SIGN_TX;
    console.log(`[PACK] State: SIGN_TX`);
    
    try {
        // Request transaction through Q-Wallet
        // This sends NXS to Distordia treasury with pack type in memo
        const result = await window.qWallet.sendTransaction({
            api: 'finance/debit/account',
            params: {
                name_from: 'default',
                name_to: DISTORDIA_TREASURY,
                amount: price,
                reference: `pack:${packType}:${Date.now()}`
            }
        });
        
        packPurchaseState = PackPurchaseState.SUBMIT_TX;
        console.log(`[PACK] State: SUBMIT_TX, txid: ${result.txid}`);
        
        // Show waiting state
        showPackOpeningModal(packType, 'waiting');
        
        // Wait for Distordia daemon to mint cards on blockchain
        packPurchaseState = PackPurchaseState.AWAIT_ORACLE;
        console.log(`[PACK] State: AWAIT_ORACLE - Waiting for blockchain confirmation...`);
        
        // Wait for cards to appear on blockchain (minted by Distordia daemon)
        const cards = await awaitPackCardsFromBlockchain(result.txid, packType);
        
        packPurchaseState = PackPurchaseState.REVEAL;
        console.log(`[PACK] State: REVEAL`);
        
        // Show reveal animation
        showPackReveal(cards);
        
        packPurchaseState = PackPurchaseState.COMPLETE;
        console.log(`[PACK] State: COMPLETE`);
        
        // Reload user's assets from blockchain
        await loadMyAssets();
        
    } catch (error) {
        console.error('[PACK] Transaction failed:', error);
        packPurchaseState = PackPurchaseState.FAILED;
        
        if (error.message?.includes('denied')) {
            alert('Transaction cancelled.');
        } else {
            alert('Failed to purchase pack: ' + (error.message || 'Unknown error'));
        }
        
        closePackModal();
        packPurchaseState = PackPurchaseState.IDLE;
    }
}

// Pack cards are minted on-chain by Distordia daemon after payment
// This function is called by the daemon, not the frontend
// Frontend only displays cards after they are transferred on-chain
async function awaitPackCardsFromBlockchain(txid, packType) {
    const contents = PACK_CONTENTS[packType];
    const maxAttempts = 30; // Wait up to 30 seconds
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            // Query for newly minted cards linked to this transaction
            const response = await fetch(NEXUS_ENDPOINTS.listAssets, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    where: `object.namespace = '${ASSET_NAMESPACE}' AND object.name LIKE 'pack.${txid.substring(0, 8)}.%'`,
                    limit: contents.cards
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.result && data.result.length >= contents.cards) {
                    return data.result.map(parsePlayerAsset).filter(c => c !== null);
                }
            }
        } catch (e) {
            console.warn('Waiting for pack cards...', e);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('Pack cards not found on blockchain. Please contact support.');
}

// Show pack opening modal
function showPackOpeningModal(packType, state) {
    // Create modal if doesn't exist
    let modal = document.getElementById('packModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'packModal';
        modal.className = 'pack-modal';
        modal.innerHTML = `
            <div class="pack-modal-content">
                <div class="pack-opening-animation" id="packAnimation">🎁</div>
                <h2 id="packModalTitle">Opening Pack...</h2>
                <p id="packModalText">Please wait while your cards are being minted...</p>
                <div class="revealed-cards" id="revealedCards"></div>
                <button class="btn btn-primary" id="closePackBtn" style="display: none;" onclick="closePackModal()">
                    Collect Cards
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Reset state
    document.getElementById('revealedCards').innerHTML = '';
    document.getElementById('closePackBtn').style.display = 'none';
    document.getElementById('packAnimation').textContent = '🎁';
    document.getElementById('packModalTitle').textContent = 'Opening Pack...';
    document.getElementById('packModalText').textContent = 'Please wait while your cards are being minted...';
    
    modal.classList.add('show');
}

// Show pack reveal animation
function showPackReveal(cards) {
    document.getElementById('packAnimation').textContent = '✨';
    document.getElementById('packModalTitle').textContent = 'Cards Revealed!';
    document.getElementById('packModalText').textContent = `You received ${cards.length} cards:`;
    
    const container = document.getElementById('revealedCards');
    container.innerHTML = '';
    
    cards.forEach((card, index) => {
        setTimeout(() => {
            const cardEl = document.createElement('div');
            cardEl.className = `revealed-card ${card.rarity}`;
            cardEl.innerHTML = `
                <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">
                    ${card.position === 'GK' ? '🧤' : card.position === 'DEF' ? '🛡️' : card.position === 'MID' ? '⚡' : '⚽'}
                </div>
                <div style="font-size: 0.75rem; font-weight: bold; color: var(--text-primary);">
                    ${card.playerName}
                </div>
                <div style="font-size: 0.65rem; color: var(--text-secondary);">
                    ${card.team}
                </div>
                <div style="font-size: 0.7rem; color: ${getRarityColor(card.rarity)}; text-transform: uppercase; margin-top: 0.3rem;">
                    ${card.rarity}
                </div>
            `;
            container.appendChild(cardEl);
            
            // Show close button after last card
            if (index === cards.length - 1) {
                setTimeout(() => {
                    document.getElementById('closePackBtn').style.display = 'block';
                }, 500);
            }
        }, index * 400);
    });
}

// Get rarity color
function getRarityColor(rarity) {
    const colors = {
        common: '#aaa',
        rare: '#3498db',
        epic: '#9b59b6',
        legendary: '#ffd700'
    };
    return colors[rarity] || '#aaa';
}

// Close pack modal
function closePackModal() {
    const modal = document.getElementById('packModal');
    if (modal) modal.classList.remove('show');
    packPurchaseState = PackPurchaseState.IDLE;
}

// ============================================
// WEEKLY LEAGUES - STATE MACHINE IMPLEMENTATION
// ============================================

let currentLeagueEntry = null;

// Enter league
async function enterLeague(leagueId) {
    console.log(`[LEAGUE] Entering league: ${leagueId}`);
    
    // Check wallet
    if (!walletConnected) {
        alert('Please connect your Q-Wallet to enter leagues.');
        return;
    }
    
    // Check if user has enough players
    if (myAssets.length < 11) {
        alert(`You need at least 11 player cards to enter a league.\n\nYou have: ${myAssets.length} cards\n\nVisit the Pack Shop to get more cards!`);
        return;
    }
    
    // Show team selection modal
    showLeagueEntryModal(leagueId);
}

// Show league entry modal
function showLeagueEntryModal(leagueId) {
    let modal = document.getElementById('leagueModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'leagueModal';
        modal.className = 'league-modal';
        document.body.appendChild(modal);
    }
    
    // Filter assets by position
    const gks = myAssets.filter(a => a.position === 'GK');
    const defs = myAssets.filter(a => a.position === 'DEF');
    const mids = myAssets.filter(a => a.position === 'MID');
    const fwds = myAssets.filter(a => a.position === 'FWD');
    
    modal.innerHTML = `
        <div class="league-modal-content">
            <h2>🏆 Enter League: ${leagueId}</h2>
            <p>Entry Fee: <strong>${LEAGUE_ENTRY_FEE} NXS</strong></p>
            <p>Prize Pool receives 85% • Platform receives 15%</p>
            
            <hr style="border-color: var(--border-color); margin: 1.5rem 0;">
            
            <h3>Select Your Team (4-4-2 Formation)</h3>
            
            <div class="team-selection">
                <div class="position-group">
                    <label>Goalkeeper (1):</label>
                    <select id="gk-select" class="team-select">
                        ${gks.map(p => `<option value="${p.id}">${p.playerName} (${p.points} pts)</option>`).join('')}
                    </select>
                </div>
                
                <div class="position-group">
                    <label>Defenders (4):</label>
                    ${[1,2,3,4].map(i => `
                        <select id="def-select-${i}" class="team-select">
                            ${defs.map(p => `<option value="${p.id}">${p.playerName} (${p.points} pts)</option>`).join('')}
                        </select>
                    `).join('')}
                </div>
                
                <div class="position-group">
                    <label>Midfielders (4):</label>
                    ${[1,2,3,4].map(i => `
                        <select id="mid-select-${i}" class="team-select">
                            ${mids.map(p => `<option value="${p.id}">${p.playerName} (${p.points} pts)</option>`).join('')}
                        </select>
                    `).join('')}
                </div>
                
                <div class="position-group">
                    <label>Forwards (2):</label>
                    ${[1,2].map(i => `
                        <select id="fwd-select-${i}" class="team-select">
                            ${fwds.map(p => `<option value="${p.id}">${p.playerName} (${p.points} pts)</option>`).join('')}
                        </select>
                    `).join('')}
                </div>
            </div>
            
            <div class="captain-section" style="margin-top: 1.5rem;">
                <h4>Select Captain (2x Points):</h4>
                <select id="captain-select" class="team-select" style="width: 100%;">
                    ${myAssets.map(p => `<option value="${p.id}">${p.playerName} - ${p.position}</option>`).join('')}
                </select>
            </div>
            
            <div class="modal-actions" style="margin-top: 2rem; display: flex; gap: 1rem; justify-content: center;">
                <button class="btn btn-secondary" onclick="closeLeagueModal()">Cancel</button>
                <button class="btn btn-primary" onclick="confirmLeagueEntry('${leagueId}')">
                    Pay ${LEAGUE_ENTRY_FEE} NXS & Enter
                </button>
            </div>
        </div>
    `;
    
    modal.classList.add('show');
}

// Confirm league entry
async function confirmLeagueEntry(leagueId) {
    console.log(`[LEAGUE] Confirming entry for: ${leagueId}`);
    
    // Gather selected team
    const team = {
        GK: document.getElementById('gk-select')?.value,
        DEF: [1,2,3,4].map(i => document.getElementById(`def-select-${i}`)?.value),
        MID: [1,2,3,4].map(i => document.getElementById(`mid-select-${i}`)?.value),
        FWD: [1,2].map(i => document.getElementById(`fwd-select-${i}`)?.value),
        captain: document.getElementById('captain-select')?.value
    };
    
    console.log('[LEAGUE] Team:', team);
    
    try {
        // Submit entry fee via Q-Wallet
        const result = await window.qWallet.sendTransaction({
            api: 'finance/debit/account',
            params: {
                name_from: 'default',
                name_to: DISTORDIA_TREASURY,
                amount: LEAGUE_ENTRY_FEE,
                reference: `league:${leagueId}:${JSON.stringify(team)}`
            }
        });
        
        console.log('[LEAGUE] Entry submitted:', result);
        
        closeLeagueModal();
        
        alert(`Successfully entered ${leagueId}!\n\nYour team has been registered.\nGood luck! 🏆`);
        
        // Update UI
        const entriesEl = document.getElementById('league-entries');
        if (entriesEl) {
            entriesEl.textContent = parseInt(entriesEl.textContent) + 1;
        }
        
        const poolEl = document.getElementById('league-prize-pool');
        if (poolEl) {
            const currentPool = parseFloat(poolEl.textContent.replace(/[^0-9.]/g, ''));
            poolEl.textContent = `${(currentPool + LEAGUE_ENTRY_FEE * PRIZE_POOL_SHARE).toLocaleString()} NXS`;
        }
        
    } catch (error) {
        console.error('[LEAGUE] Entry failed:', error);
        
        if (error.message?.includes('denied')) {
            alert('Entry cancelled.');
        } else {
            alert('Failed to enter league: ' + (error.message || 'Unknown error'));
        }
    }
}

// Close league modal
function closeLeagueModal() {
    const modal = document.getElementById('leagueModal');
    if (modal) modal.classList.remove('show');
}

// View league results
function viewLeagueResults(leagueId) {
    alert(`Viewing results for ${leagueId}\n\n(In production: this would show full standings, points breakdown, and prize distribution)`);
}

// ============================================
// MARKETPLACE WITH FEES
// ============================================

// List player for sale with fee calculation
async function listPlayerForSaleWithFee(localName, price) {
    const fee = price * MARKETPLACE_FEE;
    const sellerReceives = price - fee;
    
    const confirmed = confirm(
        `List player for sale?\n\n` +
        `Price: ${price} NXS\n` +
        `Marketplace Fee (5%): ${fee.toFixed(2)} NXS\n` +
        `You receive: ${sellerReceives.toFixed(2)} NXS`
    );
    
    if (!confirmed) return;
    
    return listPlayerForSale(localName, price);
}

// Console message
console.log('%c⚽ Distordia Fantasy Football', 'color: #FF6B35; font-size: 24px; font-weight: bold;');
console.log('%cNexus Blockchain Integration Active', 'color: #FF8C42; font-size: 14px;');
console.log('%cState Machines: Pack Purchase | League Entry | Marketplace', 'color: #888; font-size: 12px;');
