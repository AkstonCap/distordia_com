// Fantasy Football - Nexus Blockchain Integration
// Connects on-chain NFT assets with real-world football player performance

// API Configuration
const NEXUS_API_BASE = 'https://api.distordia.com';
const FOOTBALL_API_BASE = 'https://api-football-v1.p.rapidapi.com/v3';

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
    initializeFantasyFootball();
    setupEventListeners();
    startLiveUpdates();
});

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
    try {
        // Fetch all player assets from the distordia namespace
        const players = await fetchPlayerAssets();
        
        if (players.length > 0) {
            console.log(`Loaded ${players.length} player assets from Nexus blockchain`);
            myAssets = players;
            renderMyAssets(players);
        } else {
            // Fallback to demo data if no players found
            console.log('No player assets found, using demo data');
            const demoAssets = generateDemoAssets();
            myAssets = demoAssets;
            renderMyAssets(demoAssets);
        }
        
    } catch (error) {
        console.error('Error loading assets:', error);
        
        // Fallback to demo data
        const demoAssets = generateDemoAssets();
        myAssets = demoAssets;
        renderMyAssets(demoAssets);
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

// Generate Demo Assets (NFTs representing football players)
function generateDemoAssets() {
    const positions = ['GK', 'DEF', 'MID', 'FWD'];
    const players = [
        { name: 'Kevin De Bruyne', team: 'Man City', position: 'MID', points: 95 },
        { name: 'Erling Haaland', team: 'Man City', position: 'FWD', points: 110 },
        { name: 'Mohamed Salah', team: 'Liverpool', position: 'FWD', points: 98 },
        { name: 'Virgil van Dijk', team: 'Liverpool', position: 'DEF', points: 85 },
        { name: 'Bukayo Saka', team: 'Arsenal', position: 'MID', points: 88 },
        { name: 'Harry Kane', team: 'Bayern', position: 'FWD', points: 105 },
        { name: 'Alisson Becker', team: 'Liverpool', position: 'GK', points: 82 },
        { name: 'Trent Alexander-Arnold', team: 'Liverpool', position: 'DEF', points: 79 },
        { name: 'Bruno Fernandes', team: 'Man Utd', position: 'MID', points: 86 },
        { name: 'Ederson', team: 'Man City', position: 'GK', points: 78 },
        { name: 'William Saliba', team: 'Arsenal', position: 'DEF', points: 75 },
        { name: 'Declan Rice', team: 'Arsenal', position: 'MID', points: 81 },
    ];

    return players.map((player, index) => ({
        id: `asset-${index}`,
        tokenId: `NXS-NFT-${1000 + index}`,
        playerName: player.name,
        team: player.team,
        position: player.position,
        points: player.points,
        weekPoints: Math.floor(Math.random() * 15),
        value: Math.floor(Math.random() * 50) + 10,
        inTeam: false,
        rarity: ['Common', 'Rare', 'Epic', 'Legendary'][Math.floor(Math.random() * 4)]
    }));
}

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

// Load Live Matches
async function loadLiveMatches() {
    try {
        // Demo live matches
        const demoMatches = [
            { 
                id: 1, 
                homeTeam: 'Man City', 
                awayTeam: 'Liverpool', 
                homeScore: 2, 
                awayScore: 1, 
                status: 'live', 
                minute: 67 
            },
            { 
                id: 2, 
                homeTeam: 'Arsenal', 
                awayTeam: 'Chelsea', 
                homeScore: 1, 
                awayScore: 1, 
                status: 'live', 
                minute: 52 
            },
            { 
                id: 3, 
                homeTeam: 'Man Utd', 
                awayTeam: 'Tottenham', 
                homeScore: 0, 
                awayScore: 0, 
                status: 'scheduled', 
                time: '15:00' 
            },
        ];
        
        liveMatches = demoMatches;
        renderLiveMatches(demoMatches);
    } catch (error) {
        console.error('Error loading matches:', error);
    }
}

// Render Live Matches
function renderLiveMatches(matches) {
    const matchesGrid = document.getElementById('live-matches-grid');
    if (!matchesGrid) return;

    matchesGrid.innerHTML = matches.map(match => `
        <div class="match-card">
            <div class="match-status ${match.status}">${match.status === 'live' ? `⚽ LIVE - ${match.minute}'` : `📅 ${match.time}`}</div>
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

// Load Leaderboard
async function loadLeaderboard(period = 'week') {
    try {
        // Demo leaderboard
        const demoLeaderboard = generateDemoLeaderboard(period);
        leaderboard = demoLeaderboard;
        renderLeaderboard(demoLeaderboard);
    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

// Generate demo leaderboard
function generateDemoLeaderboard(period) {
    const names = ['CryptoKing', 'FootballFan88', 'NexusTrader', 'GoalMaster', 'BlockchainBoss', 'NFTCollector', 'PlayerOne', 'TeamCaptain', 'ScoreLegend', 'ChampionX'];
    
    return names.map((name, index) => ({
        rank: index + 1,
        username: name,
        points: 150 - (index * 10),
        players: 11,
        value: (50 - index * 3) + ' NXS'
    }));
}

// Render Leaderboard
function renderLeaderboard(entries) {
    const leaderboardList = document.getElementById('leaderboard-list');
    if (!leaderboardList) return;

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

    const topAssets = myAssets.slice(0, 5).sort((a, b) => b.weekPoints - a.weekPoints);
    
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
                <div class="asset-points">${asset.weekPoints}</div>
            </div>
        </div>
    `).join('');
}

// Load Marketplace
async function loadMarketplace() {
    try {
        const demoPlayers = generateMarketplacePlayers();
        allPlayers = demoPlayers;
        renderMarketplace(demoPlayers);
    } catch (error) {
        console.error('Error loading marketplace:', error);
    }
}

// Generate marketplace players
function generateMarketplacePlayers() {
    const players = [
        { name: 'Kylian Mbappé', team: 'Real Madrid', position: 'FWD', points: 112, price: 45 },
        { name: 'Jude Bellingham', team: 'Real Madrid', position: 'MID', points: 92, price: 38 },
        { name: 'Lautaro Martínez', team: 'Inter', position: 'FWD', points: 88, price: 35 },
        { name: 'Rodri', team: 'Man City', position: 'MID', points: 87, price: 34 },
        { name: 'Rúben Dias', team: 'Man City', position: 'DEF', points: 79, price: 28 },
        { name: 'Thibaut Courtois', team: 'Real Madrid', position: 'GK', points: 84, price: 30 },
    ];

    return players.map((player, index) => ({
        id: `market-${index}`,
        ...player,
        goals: Math.floor(Math.random() * 20),
        assists: Math.floor(Math.random() * 15),
        league: ['Premier League', 'La Liga', 'Serie A', 'Bundesliga'][Math.floor(Math.random() * 4)]
    }));
}

// Render Marketplace
function renderMarketplace(players) {
    const marketplaceGrid = document.getElementById('marketplace-grid');
    if (!marketplaceGrid) return;

    marketplaceGrid.innerHTML = players.map(player => `
        <div class="marketplace-card">
            <div class="marketplace-card-header">
                <div class="marketplace-card-avatar">${getPlayerInitials(player.name)}</div>
            </div>
            <div class="marketplace-card-body">
                <div class="marketplace-player-name">${player.name}</div>
                <div class="marketplace-player-team">${player.team} • ${player.position}</div>
                <div class="marketplace-stats">
                    <div class="marketplace-stat">
                        <div class="marketplace-stat-label">Points</div>
                        <div class="marketplace-stat-value">${player.points}</div>
                    </div>
                    <div class="marketplace-stat">
                        <div class="marketplace-stat-label">Goals</div>
                        <div class="marketplace-stat-value">${player.goals}</div>
                    </div>
                    <div class="marketplace-stat">
                        <div class="marketplace-stat-label">Assists</div>
                        <div class="marketplace-stat-value">${player.assists}</div>
                    </div>
                </div>
                <div class="marketplace-price">
                    <span class="price-label">Price:</span>
                    <span class="price-value">${player.price} NXS</span>
                </div>
                <div class="marketplace-card-footer">
                    <button class="btn-buy" onclick="buyAsset('${player.id}')">Buy NFT</button>
                    <button class="btn-details" onclick="viewAssetDetails('${player.id}')">ℹ️</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Buy asset
function buyAsset(playerId) {
    alert('Purchase functionality requires Nexus wallet connection.\n\nTo buy this player:\n1. Connect your Nexus wallet\n2. Confirm transaction\n3. Player NFT will be transferred to your account');
    // In production: Connect to Nexus wallet and execute market order
    // See buyPlayerFromMarket() function below for implementation
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
async function buyPlayerFromMarket(orderId, pin, session) {
    try {
        console.log('Executing market order:', orderId);
        
        const response = await fetch(NEXUS_ENDPOINTS.executeOrder, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pin: pin,
                session: session,
                txid: orderId
            })
        });
        
        if (!response.ok) {
            throw new Error(`Execute order failed: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Order executed:', data);
        
        return {
            success: true,
            txid: data.result?.txid || data.txid,
            message: 'Player purchased successfully!'
        };
        
    } catch (error) {
        console.error('Error buying player:', error);
        return {
            success: false,
            message: error.message
        };
    }
}

// List player for sale on market
async function listPlayerForSale(localName, price, pin, session) {
    try {
        console.log('Listing player for sale:', localName, 'at', price, 'NXS');
        
        // Price in satoshis (1 NXS = 1,000,000 satoshis)
        const priceInSatoshis = Math.floor(price * 1000000);
        
        const response = await fetch(NEXUS_ENDPOINTS.createOrder, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pin: pin,
                session: session,
                name_from: ASSET_NAMESPACE,
                name_to: localName,  // e.g., "player.epl.mancity.haaland"
                price: priceInSatoshis,
                amount: 1,
                market: 'PLAYER/NXS'
            })
        });
        
        if (!response.ok) {
            throw new Error(`Create order failed: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Order created:', data);
        
        return {
            success: true,
            orderId: data.result?.txid || data.txid,
            message: 'Player listed for sale successfully!'
        };
        
    } catch (error) {
        console.error('Error listing player:', error);
        return {
            success: false,
            message: error.message
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

// Update Stats
async function updateStats() {
    document.getElementById('active-players').textContent = '1,247';
    document.getElementById('total-assets').textContent = '15,432';
    document.getElementById('live-matches').textContent = liveMatches.filter(m => m.status === 'live').length;
    document.getElementById('prize-pool').textContent = '5,000 NXS';
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

// Console message
console.log('%c⚽ Distordia Fantasy Football', 'color: #FF6B35; font-size: 24px; font-weight: bold;');
console.log('%cNexus Blockchain Integration Active', 'color: #FF8C42; font-size: 14px;');
