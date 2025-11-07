// Nexus.io API Configuration
// Base URL for Nexus API (remove /v2 - not part of the actual API)
const NEXUS_API_BASE = 'http://api.nexus.io:8080';

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
    listExecutedFiltered: `${NEXUS_API_BASE}/market/list/executed/timestamp,contract.amount,contract.ticker,order.amount,order.ticker`,
    userOrders: `${NEXUS_API_BASE}/market/user/order`
};

console.log('Distordia DEX initialized with Nexus API endpoints:', API_ENDPOINTS);

// Global state
let currentPair = null;
let marketData = {};
let updateInterval = null;

// Default market pairs to track
const DEFAULT_MARKET_PAIRS = [
    'USDD/NXS',
    'DIST/NXS', 
    'GARAGE/NXS',
    'HUSTLE/NXS',
    'NXS/USDD',
    'DIST/USDD',
    'GARAGE/USDD',
    'HUSTLE/USDD'
];

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
        fetchMarketPairs()
        // fetchRecentTrades will be called when a pair is selected
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
        updateAPIStatus('error', 'Failed to connect to Nexus API');
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
    
    // Update top block height (show full number without abbreviation)
    const blockHeightEl = document.getElementById('block-height');
    if (blockHeightEl) {
        if (blockHeight !== '-') {
            blockHeightEl.textContent = blockHeight.toLocaleString('en-US');
        } else {
            blockHeightEl.textContent = '-';
        }
    }
    
    // Update status bar block height (show full number without abbreviation)
    const statusBlockHeightEl = document.getElementById('status-block-height');
    if (statusBlockHeightEl) {
        if (blockHeight !== '-') {
            statusBlockHeightEl.textContent = blockHeight.toLocaleString('en-US');
        } else {
            statusBlockHeightEl.textContent = '-';
        }
    }
    
    const connectionsEl = document.getElementById('connections');
    if (connectionsEl) connectionsEl.textContent = connections;
    
    // Update network version if available
    if (data.version) {
        const versionEl = document.getElementById('network-version');
        if (versionEl) versionEl.textContent = data.version;
    }
}

// Fetch Market Pairs
async function fetchMarketPairs() {
    try {
        console.log('Fetching market data from Nexus blockchain...');
        
        // Fetch market data for each default pair
        const pairPromises = DEFAULT_MARKET_PAIRS.map(async (marketPair) => {
            try {
                // Fetch last executed order for this market pair to get the current price
                const executedResponse = await fetch(API_ENDPOINTS.listExecuted, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        market: marketPair,
                        limit: 1,
                        sort: 'timestamp',
                        order: 'desc'
                    })
                });

                let lastPrice = 0;
                let currentTimestamp = 0;
                if (executedResponse.ok) {
                    const executedData = await executedResponse.json();
                    console.log(`Executed data for ${marketPair}:`, executedData);
                    
                    const bids = executedData.result?.bids || [];
                    const asks = executedData.result?.asks || [];
                    console.log(`  Bids:`, bids);
                    console.log(`  Asks:`, asks);
                    
                    const executedOrders = [...bids, ...asks];
                    
                    // Sort by timestamp descending to get the most recent executed order
                    executedOrders.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                    
                    if (executedOrders.length > 0) {
                        const lastOrder = executedOrders[0];
                        lastPrice = calculatePriceFromOrder(lastOrder, marketPair);
                        currentTimestamp = lastOrder.timestamp || 0;
                        console.log(`Market ${marketPair}: Last price = ${lastPrice} (timestamp: ${lastOrder.timestamp})`);
                    } else {
                        console.log(`Market ${marketPair}: No executed orders found`);
                    }
                } else {
                    console.log(`Failed to fetch executed orders for ${marketPair}: ${executedResponse.status}`);
                }
                
                // Fetch executed order from 24 hours ago for 24h change calculation
                let price24hAgo = 0;
                if (currentTimestamp > 0) {
                    const timestamp24hAgo = currentTimestamp - (24 * 60 * 60); // 24 hours in seconds
                    
                    const historical24hResponse = await fetch(API_ENDPOINTS.listExecuted, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            market: marketPair,
                            limit: 1,
                            where: `timestamp<=${timestamp24hAgo}`,
                            sort: 'timestamp',
                            order: 'desc'
                        })
                    });
                    
                    if (historical24hResponse.ok) {
                        const historical24hData = await historical24hResponse.json();
                        const historicalBids = historical24hData.result?.bids || [];
                        const historicalAsks = historical24hData.result?.asks || [];
                        const historical24hOrders = [...historicalBids, ...historicalAsks];
                        
                        historical24hOrders.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                        
                        if (historical24hOrders.length > 0) {
                            const order24hAgo = historical24hOrders[0];
                            price24hAgo = calculatePriceFromOrder(order24hAgo, marketPair);
                            console.log(`Market ${marketPair}: Price 24h ago = ${price24hAgo} (timestamp: ${order24hAgo.timestamp})`);
                        }
                    }
                }
                
                // Calculate 24h change percentage
                let change24h = 0;
                if (lastPrice > 0 && price24hAgo > 0) {
                    change24h = ((lastPrice - price24hAgo) / price24hAgo) * 100;
                    console.log(`Market ${marketPair}: 24h change = ${change24h.toFixed(2)}%`);
                }
                
                // Fetch all orders for volume calculation
                const ordersResponse = await fetch(API_ENDPOINTS.listOrders, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        market: marketPair,
                        limit: 50
                    })
                });

                if (ordersResponse.ok) {
                    const data = await ordersResponse.json();
                    console.log(`Order data for ${marketPair}:`, data);
                    
                    // The result contains bids and asks arrays
                    const orderBids = data.result?.bids || [];
                    const orderAsks = data.result?.asks || [];
                    const allOrders = [...orderBids, ...orderAsks];
                    
                    console.log(`Market ${marketPair}: ${allOrders.length} orders found (${orderBids.length} bids, ${orderAsks.length} asks)`);
                    
                    // Calculate market statistics from orders
                    return processMarketPairData(marketPair, allOrders, lastPrice, change24h);
                } else {
                    console.warn(`Failed to fetch ${marketPair}: ${ordersResponse.status}`);
                    return processMarketPairData(marketPair, [], lastPrice, change24h); // Return with last price
                }
            } catch (err) {
                console.error(`Error fetching ${marketPair}:`, err);
                return processMarketPairData(marketPair, [], 0, 0); // Return empty pair data
            }
        });

        // Wait for all market data
        const pairResults = await Promise.all(pairPromises);
        
        console.log(`Loaded ${pairResults.length} market pairs`);
        marketData.pairs = pairResults;
        renderMarketPairs(pairResults);
        renderMarketOverview(pairResults);
        
        if (pairResults.length > 0) {
            selectPair(pairResults[0]);
        }
        
    } catch (error) {
        console.error('Error fetching market pairs:', error);
        // Display error message to user
        const pairsList = document.getElementById('pairs-list');
        if (pairsList) {
            pairsList.innerHTML = '<div class="error-message">Failed to load market data from Nexus blockchain</div>';
        }
    }
}

// Calculate price from executed order
function calculatePriceFromOrder(order, marketPair) {
    console.log(`Calculating price for ${marketPair}:`, order);
    
    const [base, quote] = marketPair.split('/');
    
    // Get contract (what's being sold) and order (what's being bought)
    const contractAmount = parseFloat(order.contract?.amount || 0);
    const contractTicker = order.contract?.ticker || '';
    const orderAmount = parseFloat(order.order?.amount || 0);
    const orderTicker = order.order?.ticker || '';
    
    console.log(`  Contract: ${contractAmount} ${contractTicker}`);
    console.log(`  Order: ${orderAmount} ${orderTicker}`);
    
    if (contractAmount === 0 || orderAmount === 0) {
        console.log(`  Missing amounts - returning 0`);
        return 0;
    }
    
    // Adjust for NXS divisible units (1 NXS = 1e6 units)
    const adjustedContractAmount = contractTicker === 'NXS' ? contractAmount / 1e6 : contractAmount;
    const adjustedOrderAmount = orderTicker === 'NXS' ? orderAmount / 1e6 : orderAmount;
    
    console.log(`  Adjusted Contract: ${adjustedContractAmount} ${contractTicker}`);
    console.log(`  Adjusted Order: ${adjustedOrderAmount} ${orderTicker}`);
    
    // Price is how much quote currency per base currency
    // If contract is base and order is quote: price = orderAmount / contractAmount
    // If contract is quote and order is base: price = contractAmount / orderAmount
    
    if (contractTicker === base && orderTicker === quote) {
        const price = adjustedOrderAmount / adjustedContractAmount;
        console.log(`  Price calculation (contract=base): ${adjustedOrderAmount} / ${adjustedContractAmount} = ${price}`);
        return price;
    } else if (contractTicker === quote && orderTicker === base) {
        const price = adjustedContractAmount / adjustedOrderAmount;
        console.log(`  Price calculation (contract=quote): ${adjustedContractAmount} / ${adjustedOrderAmount} = ${price}`);
        return price;
    }
    
    console.log(`  No matching ticker combination - returning 0`);
    return 0;
}

// Process market pair data from Nexus orders
function processMarketPairData(marketPair, orders, lastPrice = 0, change24h = 0) {
    if (!orders || orders.length === 0) {
        // Return pair with no data but include lastPrice if we have it
        const [base, quote] = marketPair.split('/');
        return {
            pair: marketPair,
            base: base,
            quote: quote,
            price: lastPrice,
            change24h: change24h,
            volume24h: 0,
            lastPrice: lastPrice,
            orders: []
        };
    }
    
    const [base, quote] = marketPair.split('/');
    
    // Calculate statistics from orders
    let totalVolume = 0;
    let orderLastPrice = 0;
    let highPrice = 0;
    let lowPrice = Infinity;
    
    orders.forEach(order => {
        const price = parseFloat(order.price || 0);
        const amount = parseFloat(order.amount || 0);
        
        if (price > 0) {
            orderLastPrice = price; // Use most recent order price as fallback
            highPrice = Math.max(highPrice, price);
            lowPrice = Math.min(lowPrice, price);
            totalVolume += amount;
        }
    });
    
    // Use executed price if available, otherwise fall back to order price
    const finalLastPrice = lastPrice || orderLastPrice;
    
    // Use the calculated 24h change from historical data
    // If not provided, it will be 0
    
    return {
        pair: marketPair,
        base: base,
        quote: quote,
        price: finalLastPrice,
        change24h: change24h,
        volume24h: totalVolume,
        lastPrice: finalLastPrice,
        highPrice: highPrice,
        lowPrice: lowPrice === Infinity ? 0 : lowPrice,
        orders: orders
    };
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
    
    console.log(`Selected pair: ${pair.pair}`);
    
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

    // Load order book, chart, and trades for this pair
    loadOrderBook(pair);
    loadChart(pair);
    fetchRecentTrades(pair.pair);
}

// Load Order Book
async function loadOrderBook(pair) {
    try {
        console.log(`Loading order book for ${pair.pair}...`);
        
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
            
            console.log('Bids data:', bidsData);
            console.log('Asks data:', asksData);
            
            const bidsResult = bidsData.result?.bids || bidsData.result || [];
            const asksResult = asksData.result?.asks || asksData.result || [];
            
            console.log(`Loaded ${bidsResult.length} bids, ${asksResult.length} asks`);
            
            const bids = bidsResult.map(order => ({
                price: parseFloat(order.price || 0),
                amount: parseFloat(order.amount || 0),
                total: parseFloat(order.price || 0) * parseFloat(order.amount || 0),
                timestamp: order.timestamp || 0,
                address: order.address || ''
            })).filter(o => o.price > 0 && o.amount > 0);
            
            const asks = asksResult.map(order => ({
                price: parseFloat(order.price || 0),
                amount: parseFloat(order.amount || 0),
                total: parseFloat(order.price || 0) * parseFloat(order.amount || 0),
                timestamp: order.timestamp || 0,
                address: order.address || ''
            })).filter(o => o.price > 0 && o.amount > 0);
            
            // Sort bids (highest first) and asks (lowest first)
            bids.sort((a, b) => b.price - a.price);
            asks.sort((a, b) => a.price - b.price);
            
            renderOrderBook({ bids, asks });
            updateSpread(bids, asks);
        } else {
            console.warn('Failed to fetch order book');
            renderOrderBook({ bids: [], asks: [] });
        }
        
    } catch (error) {
        console.error('Error loading order book:', error);
        renderOrderBook({ bids: [], asks: [] });
    }
}

// Update spread display
function updateSpread(bids, asks) {
    if (bids.length > 0 && asks.length > 0) {
        const spread = asks[0].price - bids[0].price;
        const spreadPercent = (spread / bids[0].price * 100).toFixed(2);
        const spreadEl = document.getElementById('spread-value');
        if (spreadEl) {
            spreadEl.textContent = `${formatPrice(spread)} (${spreadPercent}%)`;
        }
    } else {
        const spreadEl = document.getElementById('spread-value');
        if (spreadEl) {
            spreadEl.textContent = '-';
        }
    }
}

// Render Order Book
function renderOrderBook(orderBook) {
    const asksContainer = document.getElementById('orderbook-asks');
    const bidsContainer = document.getElementById('orderbook-bids');
    
    if (!asksContainer || !bidsContainer) return;

    // Calculate max total for depth visualization
    const allTotals = [
        ...orderBook.asks.map(o => o.total),
        ...orderBook.bids.map(o => o.total)
    ].filter(t => t > 0);
    
    const maxTotal = allTotals.length > 0 ? Math.max(...allTotals) : 1;

    // Render asks (reverse order for display - lowest price at bottom)
    asksContainer.innerHTML = orderBook.asks.length > 0 
        ? orderBook.asks.slice().reverse().map(order => `
            <div class="orderbook-row" style="--depth: ${(order.total / maxTotal * 100)}%">
                <span>${formatPrice(order.price)}</span>
                <span>${order.amount.toFixed(4)}</span>
                <span>${order.total.toFixed(4)}</span>
            </div>
        `).join('')
        : '<div class="empty-orderbook">No sell orders</div>';

    // Render bids (highest price at top)
    bidsContainer.innerHTML = orderBook.bids.length > 0
        ? orderBook.bids.map(order => `
            <div class="orderbook-row" style="--depth: ${(order.total / maxTotal * 100)}%">
                <span>${formatPrice(order.price)}</span>
                <span>${order.amount.toFixed(4)}</span>
                <span>${order.total.toFixed(4)}</span>
            </div>
        `).join('')
        : '<div class="empty-orderbook">No buy orders</div>';
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
async function fetchRecentTrades(marketPair = null) {
    try {
        console.log(`Fetching recent trades${marketPair ? ` for ${marketPair}` : ''}...`);
        
        // Fetch executed orders from Nexus market API
        const requestBody = {
            limit: 20
        };
        
        // If a specific market pair is provided, filter by it
        if (marketPair) {
            requestBody.market = marketPair;
        }
        
        const response = await fetch(API_ENDPOINTS.listExecuted, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Recent trades data:', data);
            
            const bids = data.result?.bids || [];
            const asks = data.result?.asks || [];
            const executedOrders = [...bids, ...asks];
            
            console.log(`Loaded ${executedOrders.length} executed trades (${bids.length} bids, ${asks.length} asks)`);
            
            if (executedOrders.length > 0) {
                // Sort by timestamp descending
                executedOrders.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                
                const trades = executedOrders.map(order => ({
                    time: new Date((order.timestamp || 0) * 1000), // Convert Unix timestamp
                    pair: order.market || 'Unknown',
                    type: determineTradeType(order),
                    price: parseFloat(order.price || 0),
                    amount: parseFloat(order.amount || 0),
                    total: parseFloat(order.price || 0) * parseFloat(order.amount || 0)
                })).filter(t => t.price > 0 && t.amount > 0);
                
                renderTrades(trades);
            } else {
                renderTrades([]);
            }
        } else {
            console.warn('Failed to fetch trades');
            renderTrades([]);
        }
        
    } catch (error) {
        console.error('Error fetching trades:', error);
        renderTrades([]);
    }
}

// Determine trade type from order (bid = buy, ask = sell)
function determineTradeType(order) {
    // If the order has a type field, use it
    if (order.type) {
        return order.type === 'bid' ? 'buy' : 'sell';
    }
    // Default to buy
    return 'buy';
}

// Render Trades
function renderTrades(trades) {
    const tradesList = document.getElementById('trades-list');
    if (!tradesList) return;

    if (trades.length === 0) {
        tradesList.innerHTML = '<tr><td colspan="6" class="empty-message">No recent trades</td></tr>';
        return;
    }

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

    marketsGrid.innerHTML = `
        <table class="market-overview-table">
            <thead>
                <tr>
                    <th>Market Pair</th>
                    <th>Last Price</th>
                    <th>24h Change</th>
                    <th>24h Volume</th>
                    <th>Favorite</th>
                </tr>
            </thead>
            <tbody>
                ${pairs.map(pair => `
                    <tr class="market-row" onclick="selectPairByName('${pair.pair}')">
                        <td class="market-pair">${pair.pair}</td>
                        <td class="market-price">${formatPrice(pair.price)}</td>
                        <td class="${pair.change24h >= 0 ? 'trade-buy' : 'trade-sell'}">
                            ${pair.change24h >= 0 ? '+' : ''}${pair.change24h.toFixed(2)}%
                        </td>
                        <td>${formatNumber(pair.volume24h)}</td>
                        <td>
                            <button class="market-favorite" onclick="event.stopPropagation(); toggleFavorite('${pair.pair}')">
                                ☆
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
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
    // Update every 50 seconds
    updateInterval = setInterval(() => {
        fetchNetworkStats();
        if (currentPair) {
            loadOrderBook(currentPair);
            fetchRecentTrades(currentPair.pair);
        }
    }, 50000);
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
            // Filter checks the quote currency (second part after /)
            const quote = pairName.split('/')[1].toLowerCase();
            pair.style.display = quote === filter ? 'block' : 'none';
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
