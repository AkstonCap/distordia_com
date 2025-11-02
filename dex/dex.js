// Nexus.io API Configuration
// Base URL for Nexus API (remove /v2 - not part of the actual API)
const NEXUS_API_BASE = 'https://api.nexus.io:8080';

// API endpoints according to Nexus API documentation
const API_ENDPOINTS = {
    // System API - get node and network information
    systemInfo: `${NEXUS_API_BASE}/system/get/info`,
    
    // Ledger API - get blockchain data
    ledgerInfo: `${NEXUS_API_BASE}/ledger/get/info`,
    ledgerMetrics: `${NEXUS_API_BASE}/ledger/get/metrics`,
    getBlock: `${NEXUS_API_BASE}/ledger/get/block`,
    
    // Market API - P2P marketplace orders
    listOrders: `${NEXUS_API_BASE}/market/list/order`,
    listBids: `${NEXUS_API_BASE}/market/list/bid`,
    listAsks: `${NEXUS_API_BASE}/market/list/ask`,
    listExecuted: `${NEXUS_API_BASE}/market/list/executed`,
    userOrders: `${NEXUS_API_BASE}/market/user/order`
};

// Global state
let currentPair = null;
let marketData = {};
let updateInterval = null;

// Initialize DEX
document.addEventListener('DOMContentLoaded', () => {
    initializeDEX();
    setupEventListeners();
    startDataUpdates();
});

// Initialize DEX
async function initializeDEX() {
    showLoadingState();
    await Promise.all([
        fetchNetworkStats(),
        fetchMarketPairs(),
        fetchRecentTrades()
    ]);
}

// Setup Event Listeners
function setupEventListeners() {
    // Pair search
    const searchInput = document.getElementById('pair-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => filterPairs(e.target.value));
    }

    // Tab filters
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            filterPairsByTab(e.target.dataset.filter);
        });
    });

    // Chart intervals
    document.querySelectorAll('.chart-interval').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.chart-interval').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            updateChart(e.target.dataset.interval);
        });
    });

    // Order book view controls
    document.querySelectorAll('.orderbook-view').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.orderbook-view').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            updateOrderBookView(e.target.dataset.view);
        });
    });

    // Trade filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            filterTrades(e.target.dataset.filter);
        });
    });
}

// Fetch Network Stats from Nexus.io
async function fetchNetworkStats() {
    try {
        updateAPIStatus('connecting');
        
        // Fetch real Nexus blockchain data using proper API endpoints
        // Using POST method as per Nexus API documentation
        const response = await fetch(API_ENDPOINTS.systemInfo, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        if (response.ok) {
            const data = await response.json();
            // Nexus API returns data in 'result' object
            updateNetworkStats(data.result || data);
            updateAPIStatus('connected');
            
            // Also fetch ledger metrics for additional stats
            fetchLedgerMetrics();
        } else {
            throw new Error('API unavailable');
        }
    } catch (error) {
        console.error('Error fetching network stats:', error);
        // Use demo data as fallback
        useDemoNetworkStats();
        updateAPIStatus('connected', 'Using demo data');
    }
}

// Fetch Ledger Metrics for additional blockchain stats
async function fetchLedgerMetrics() {
    try {
        const response = await fetch(API_ENDPOINTS.ledgerMetrics, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        if (response.ok) {
            const data = await response.json();
            updateLedgerMetrics(data.result || data);
        }
    } catch (error) {
        console.error('Error fetching ledger metrics:', error);
    }
}

// Update ledger metrics display
function updateLedgerMetrics(data) {
    // Update additional stats if available
    if (data.stakerate) {
        const stakeRateEl = document.getElementById('stake-rate');
        if (stakeRateEl) stakeRateEl.textContent = data.stakerate.toFixed(2) + '%';
    }
}

// Update network stats display
function updateNetworkStats(data) {
    // Nexus API returns block height as 'blocks' in system/get/info
    const blockHeight = data.blocks || data.height || '-';
    const connections = data.connections || '-';
    
    document.getElementById('block-height').textContent = formatNumber(blockHeight);
    
    const connectionsEl = document.getElementById('connections');
    if (connectionsEl) connectionsEl.textContent = connections;
    
    // Update network version if available
    if (data.version) {
        const versionEl = document.getElementById('network-version');
        if (versionEl) versionEl.textContent = data.version;
    }
}

// Use demo network stats
function useDemoNetworkStats() {
    const demoData = {
        blockHeight: 4523891,
        hashRate: 125000000000,
        volume24h: 1234567.89,
        activeMarkets: 12
    };

    document.getElementById('block-height').textContent = formatNumber(demoData.blockHeight);
    document.getElementById('network-hash').textContent = formatHashRate(demoData.hashRate);
    document.getElementById('volume-24h').textContent = '$' + formatNumber(demoData.volume24h);
    document.getElementById('active-markets').textContent = demoData.activeMarkets;
}

// Fetch Market Pairs
async function fetchMarketPairs() {
    try {
        // Try to fetch real market orders from Nexus blockchain
        const response = await fetch(API_ENDPOINTS.listOrders, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                limit: 100,
                // Can add filters here like: market: "NXS/BTC"
            })
        });

        if (response.ok) {
            const data = await response.json();
            const orders = data.result || [];
            
            if (orders.length > 0) {
                // Process real market orders into pairs
                const pairs = processMarketOrders(orders);
                marketData.pairs = pairs;
                renderMarketPairs(pairs);
                renderMarketOverview(pairs);
                
                if (pairs.length > 0) {
                    selectPair(pairs[0]);
                }
                return;
            }
        }
        
        // Fallback to demo data if API unavailable or no orders
        throw new Error('No market data available');
        
    } catch (error) {
        console.error('Error fetching market pairs:', error);
        
        // Demo market pairs data as fallback
        const demoPairs = [
            { pair: 'NXS/BTC', price: 0.00001234, change24h: 5.67, volume24h: 123456.78, base: 'NXS', quote: 'BTC' },
            { pair: 'NXS/USD', price: 0.456, change24h: -2.34, volume24h: 234567.89, base: 'NXS', quote: 'USD' },
            { pair: 'NXS/ETH', price: 0.00012, change24h: 3.21, volume24h: 89012.34, base: 'NXS', quote: 'ETH' },
            { pair: 'BTC/USD', price: 43250.00, change24h: 1.23, volume24h: 9876543.21, base: 'BTC', quote: 'USD' },
            { pair: 'ETH/USD', price: 2345.67, change24h: -0.89, volume24h: 5432109.87, base: 'ETH', quote: 'USD' },
            { pair: 'BTC/ETH', price: 18.42, change24h: 2.15, volume24h: 345678.90, base: 'BTC', quote: 'ETH' },
        ];

        marketData.pairs = demoPairs;
        renderMarketPairs(demoPairs);
        renderMarketOverview(demoPairs);
        
        // Select first pair by default
        if (demoPairs.length > 0) {
            selectPair(demoPairs[0]);
        }
    }
}

// Process market orders from Nexus API into trading pairs
function processMarketOrders(orders) {
    const pairsMap = new Map();
    
    orders.forEach(order => {
        const market = order.market; // e.g., "NXS/BTC"
        if (!market) return;
        
        if (!pairsMap.has(market)) {
            const [base, quote] = market.split('/');
            pairsMap.set(market, {
                pair: market,
                base: base,
                quote: quote,
                price: order.price || 0,
                change24h: 0, // Would need historical data
                volume24h: 0, // Would need to calculate from executed orders
                lastPrice: order.price || 0
            });
        }
    });
    
    return Array.from(pairsMap.values());
}

// Render Market Pairs
function renderMarketPairs(pairs) {
    const pairsList = document.getElementById('pairs-list');
    if (!pairsList) return;

    pairsList.innerHTML = pairs.map(pair => `
        <div class="pair-item" data-pair="${pair.pair}" onclick="selectPairByName('${pair.pair}')">
            <div class="pair-name">${pair.pair}</div>
            <div class="pair-info">
                <span class="pair-price">${formatPrice(pair.price)}</span>
                <span class="pair-change ${pair.change24h >= 0 ? 'positive' : 'negative'}">
                    ${pair.change24h >= 0 ? '+' : ''}${pair.change24h.toFixed(2)}%
                </span>
            </div>
        </div>
    `).join('');
}

// Select trading pair
function selectPairByName(pairName) {
    const pair = marketData.pairs?.find(p => p.pair === pairName);
    if (pair) {
        selectPair(pair);
    }
}

function selectPair(pair) {
    currentPair = pair;
    
    // Update active state
    document.querySelectorAll('.pair-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.pair === pair.pair) {
            item.classList.add('active');
        }
    });

    // Update pair display
    document.getElementById('current-pair-name').textContent = pair.pair;
    document.getElementById('current-price').textContent = formatPrice(pair.price);
    
    const changeEl = document.getElementById('price-change');
    changeEl.textContent = `${pair.change24h >= 0 ? '+' : ''}${pair.change24h.toFixed(2)}%`;
    changeEl.className = `price-change ${pair.change24h >= 0 ? 'positive' : 'negative'}`;

    // Load order book and chart
    loadOrderBook(pair);
    loadChart(pair);
}

// Load Order Book
async function loadOrderBook(pair) {
    try {
        // Fetch bids and asks from Nexus market API
        const [bidsResponse, asksResponse] = await Promise.all([
            fetch(API_ENDPOINTS.listBids, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    market: pair.pair,
                    limit: 15
                })
            }),
            fetch(API_ENDPOINTS.listAsks, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    market: pair.pair,
                    limit: 15
                })
            })
        ]);

        if (bidsResponse.ok && asksResponse.ok) {
            const bidsData = await bidsResponse.json();
            const asksData = await asksResponse.json();
            
            const bids = (bidsData.result || []).map(order => ({
                price: order.price || 0,
                amount: order.amount || 0,
                total: (order.price || 0) * (order.amount || 0)
            }));
            
            const asks = (asksData.result || []).map(order => ({
                price: order.price || 0,
                amount: order.amount || 0,
                total: (order.price || 0) * (order.amount || 0)
            }));
            
            if (bids.length > 0 || asks.length > 0) {
                renderOrderBook({ bids, asks });
                return;
            }
        }
        
        // Fallback to demo data
        throw new Error('No order book data');
        
    } catch (error) {
        console.error('Error loading order book:', error);
        
        // Demo order book data as fallback
        const demoOrderBook = {
            asks: generateOrderBookSide('ask', pair.price, 15),
            bids: generateOrderBookSide('bid', pair.price, 15)
        };

        renderOrderBook(demoOrderBook);
    }
}

// Generate demo order book side
function generateOrderBookSide(type, basePrice, count) {
    const orders = [];
    const priceStep = basePrice * 0.001;
    
    for (let i = 0; i < count; i++) {
        const price = type === 'ask' 
            ? basePrice + (priceStep * (i + 1))
            : basePrice - (priceStep * (i + 1));
        
        const amount = Math.random() * 100 + 10;
        orders.push({
            price: price,
            amount: amount,
            total: price * amount
        });
    }
    
    return orders;
}

// Render Order Book
function renderOrderBook(orderBook) {
    const asksContainer = document.getElementById('orderbook-asks');
    const bidsContainer = document.getElementById('orderbook-bids');
    
    if (!asksContainer || !bidsContainer) return;

    // Calculate max total for depth visualization
    const maxTotal = Math.max(
        ...orderBook.asks.map(o => o.total),
        ...orderBook.bids.map(o => o.total)
    );

    // Render asks (reverse order for display)
    asksContainer.innerHTML = orderBook.asks.slice().reverse().map(order => `
        <div class="orderbook-row" style="--depth: ${(order.total / maxTotal * 100)}%">
            <span>${formatPrice(order.price)}</span>
            <span>${order.amount.toFixed(4)}</span>
            <span>${order.total.toFixed(4)}</span>
        </div>
    `).join('');

    // Render bids
    bidsContainer.innerHTML = orderBook.bids.map(order => `
        <div class="orderbook-row" style="--depth: ${(order.total / maxTotal * 100)}%">
            <span>${formatPrice(order.price)}</span>
            <span>${order.amount.toFixed(4)}</span>
            <span>${order.total.toFixed(4)}</span>
        </div>
    `).join('');

    // Update spread
    const spread = orderBook.asks[0].price - orderBook.bids[0].price;
    const spreadPercent = (spread / orderBook.bids[0].price * 100).toFixed(2);
    document.getElementById('spread-value').textContent = `${formatPrice(spread)} (${spreadPercent}%)`;
}

// Load Chart
function loadChart(pair) {
    const chartContainer = document.getElementById('price-chart');
    if (!chartContainer) return;

    // Simple chart placeholder - could integrate TradingView or Chart.js
    chartContainer.innerHTML = `
        <div class="chart-placeholder">
            <div style="text-align: center;">
                <h3 style="color: var(--primary-color); margin-bottom: 1rem;">${pair.pair}</h3>
                <p style="color: var(--text-secondary);">Price chart visualization</p>
                <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.5rem;">
                    Current Price: ${formatPrice(pair.price)}
                </p>
                <p style="color: var(--text-secondary); font-size: 0.9rem;">
                    24h Change: <span class="${pair.change24h >= 0 ? 'trade-buy' : 'trade-sell'}">
                        ${pair.change24h >= 0 ? '+' : ''}${pair.change24h.toFixed(2)}%
                    </span>
                </p>
                <p style="color: var(--text-secondary); font-size: 0.8rem; margin-top: 1rem; font-style: italic;">
                    Chart integration can use TradingView widgets or Chart.js library
                </p>
            </div>
        </div>
    `;
}

// Fetch Recent Trades
async function fetchRecentTrades() {
    try {
        // Fetch executed orders from Nexus market API
        const response = await fetch(API_ENDPOINTS.listExecuted, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                limit: 20,
                // Can add filters here like: market: currentPair?.pair
            })
        });

        if (response.ok) {
            const data = await response.json();
            const executedOrders = data.result || [];
            
            if (executedOrders.length > 0) {
                const trades = executedOrders.map(order => ({
                    time: new Date(order.timestamp * 1000), // Convert Unix timestamp
                    pair: order.market || 'Unknown',
                    type: order.type || 'buy', // bid = buy, ask = sell
                    price: order.price || 0,
                    amount: order.amount || 0,
                    total: (order.price || 0) * (order.amount || 0)
                }));
                
                renderTrades(trades);
                return;
            }
        }
        
        // Fallback to demo data
        throw new Error('No trade data');
        
    } catch (error) {
        console.error('Error fetching trades:', error);
        
        // Demo trades data as fallback
        const demoTrades = generateDemoTrades(20);
        renderTrades(demoTrades);
    }
}

// Generate demo trades
function generateDemoTrades(count) {
    const trades = [];
    const now = Date.now();
    const pairs = marketData.pairs || [];
    
    for (let i = 0; i < count; i++) {
        const pair = pairs[Math.floor(Math.random() * pairs.length)] || { pair: 'NXS/BTC', price: 0.00001234 };
        const type = Math.random() > 0.5 ? 'buy' : 'sell';
        const amount = Math.random() * 10 + 0.1;
        const price = pair.price * (1 + (Math.random() - 0.5) * 0.01);
        
        trades.push({
            time: new Date(now - i * 30000),
            pair: pair.pair,
            type: type,
            price: price,
            amount: amount,
            total: price * amount
        });
    }
    
    return trades;
}

// Render Trades
function renderTrades(trades) {
    const tradesList = document.getElementById('trades-list');
    if (!tradesList) return;

    tradesList.innerHTML = trades.map(trade => `
        <tr>
            <td>${formatTime(trade.time)}</td>
            <td>${trade.pair}</td>
            <td><span class="trade-${trade.type}">${trade.type.toUpperCase()}</span></td>
            <td>${formatPrice(trade.price)}</td>
            <td>${trade.amount.toFixed(4)}</td>
            <td>${trade.total.toFixed(4)}</td>
        </tr>
    `).join('');
}

// Render Market Overview
function renderMarketOverview(pairs) {
    const marketsGrid = document.getElementById('markets-grid');
    if (!marketsGrid) return;

    marketsGrid.innerHTML = pairs.map(pair => `
        <div class="market-card" onclick="selectPairByName('${pair.pair}')">
            <div class="market-card-header">
                <span class="market-pair">${pair.pair}</span>
                <button class="market-favorite" onclick="event.stopPropagation(); toggleFavorite('${pair.pair}')">
                    ☆
                </button>
            </div>
            <div class="market-price">${formatPrice(pair.price)}</div>
            <div class="market-stats-row">
                <span>24h Change:</span>
                <span class="${pair.change24h >= 0 ? 'trade-buy' : 'trade-sell'}">
                    ${pair.change24h >= 0 ? '+' : ''}${pair.change24h.toFixed(2)}%
                </span>
            </div>
            <div class="market-stats-row">
                <span>24h Volume:</span>
                <span>${formatNumber(pair.volume24h)}</span>
            </div>
        </div>
    `).join('');
}

// Update API Status
function updateAPIStatus(status, message = '') {
    const statusDot = document.getElementById('api-status-dot');
    const statusText = document.getElementById('api-status-text');
    const lastUpdate = document.getElementById('last-update');
    
    if (statusDot) {
        statusDot.className = 'status-dot';
        if (status === 'connected') {
            statusDot.classList.add('connected');
            statusText.textContent = message || 'Connected to Nexus.io';
        } else if (status === 'error') {
            statusDot.classList.add('error');
            statusText.textContent = 'Connection Error';
        } else {
            statusText.textContent = 'Connecting...';
        }
    }
    
    if (lastUpdate) {
        lastUpdate.textContent = new Date().toLocaleTimeString();
    }
}

// Start periodic data updates
function startDataUpdates() {
    // Update every 10 seconds
    updateInterval = setInterval(() => {
        fetchNetworkStats();
        if (currentPair) {
            loadOrderBook(currentPair);
        }
        fetchRecentTrades();
    }, 10000);
}

// Filter functions
function filterPairs(searchTerm) {
    const pairs = document.querySelectorAll('.pair-item');
    pairs.forEach(pair => {
        const pairName = pair.dataset.pair.toLowerCase();
        if (pairName.includes(searchTerm.toLowerCase())) {
            pair.style.display = 'block';
        } else {
            pair.style.display = 'none';
        }
    });
}

function filterPairsByTab(filter) {
    const pairs = document.querySelectorAll('.pair-item');
    pairs.forEach(pair => {
        const pairName = pair.dataset.pair;
        if (filter === 'all') {
            pair.style.display = 'block';
        } else if (filter === 'favorites') {
            // Implement favorites logic
            pair.style.display = 'none';
        } else {
            const base = pairName.split('/')[1].toLowerCase();
            pair.style.display = base === filter ? 'block' : 'none';
        }
    });
}

function filterTrades(filter) {
    const rows = document.querySelectorAll('#trades-list tr');
    rows.forEach(row => {
        const typeCell = row.querySelector('.trade-buy, .trade-sell');
        if (!typeCell) return;
        
        if (filter === 'all') {
            row.style.display = '';
        } else if (filter === 'buys') {
            row.style.display = typeCell.classList.contains('trade-buy') ? '' : 'none';
        } else if (filter === 'sells') {
            row.style.display = typeCell.classList.contains('trade-sell') ? '' : 'none';
        }
    });
}

function updateOrderBookView(view) {
    const asks = document.querySelector('.orderbook-asks');
    const bids = document.querySelector('.orderbook-bids');
    const spread = document.querySelector('.orderbook-spread');
    
    if (view === 'both') {
        asks.style.display = 'block';
        bids.style.display = 'block';
        spread.style.display = 'flex';
    } else if (view === 'asks') {
        asks.style.display = 'block';
        bids.style.display = 'none';
        spread.style.display = 'none';
    } else if (view === 'bids') {
        asks.style.display = 'none';
        bids.style.display = 'block';
        spread.style.display = 'none';
    }
}

function toggleFavorite(pairName) {
    // Implement favorites logic
    console.log('Toggle favorite:', pairName);
}

function updateChart(interval) {
    // Update chart with new interval
    if (currentPair) {
        loadChart(currentPair);
    }
}

function showLoadingState() {
    // Show loading indicators
}

// Utility functions
function formatPrice(price) {
    if (price < 0.01) {
        return price.toFixed(8);
    } else if (price < 1) {
        return price.toFixed(6);
    } else if (price < 100) {
        return price.toFixed(4);
    } else {
        return price.toFixed(2);
    }
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(2) + 'K';
    } else {
        return num.toFixed(2);
    }
}

function formatHashRate(hashrate) {
    const units = ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s'];
    let unitIndex = 0;
    let rate = hashrate;
    
    while (rate >= 1000 && unitIndex < units.length - 1) {
        rate /= 1000;
        unitIndex++;
    }
    
    return rate.toFixed(2) + ' ' + units[unitIndex];
}

function formatTime(date) {
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) {
        return 'Just now';
    } else if (diff < 3600000) {
        return Math.floor(diff / 60000) + 'm ago';
    } else {
        return date.toLocaleTimeString();
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
});
