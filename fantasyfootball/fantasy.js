// Fantasy Football - Nexus Blockchain Integration
// Connects on-chain NFT assets with real-world football player performance

// API Configuration
const NEXUS_API_BASE = 'https://api.nexus.io/v2';
const FOOTBALL_API_BASE = 'https://api-football-v1.p.rapidapi.com/v3';

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
        // In production, fetch real NFT assets from Nexus blockchain
        // For now, using demo data
        const demoAssets = generateDemoAssets();
        myAssets = demoAssets;
        renderMyAssets(demoAssets);
    } catch (error) {
        console.error('Error loading assets:', error);
        showError('my-assets-list', 'Failed to load your assets');
    }
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
    alert('Purchase functionality will integrate with Nexus wallet for on-chain transactions');
    // In production: Connect to Nexus wallet and execute NFT purchase transaction
}

// View asset details
function viewAssetDetails(playerId) {
    const player = allPlayers.find(p => p.id === playerId);
    if (player) {
        alert(`Player Details:\n${player.name}\nTeam: ${player.team}\nPosition: ${player.position}\nPoints: ${player.points}`);
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
