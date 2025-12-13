// Rendering functions for DEX UI

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

// Render Order Book
function renderOrderBook(orderBook, pair = null) {
    const asksContainer = document.getElementById('orderbook-asks');
    const bidsContainer = document.getElementById('orderbook-bids');
    const headerContainer = document.querySelector('.orderbook-header');
    
    if (!asksContainer || !bidsContainer) return;

    // Update column headers with currency info
    if (headerContainer && pair) {
        const [base, quote] = pair.split('/');
        headerContainer.innerHTML = `
            <span>Price (${quote})</span>
            <span>Amount (${base})</span>
            <span>Total (${quote})</span>
        `;
    }

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
    
    // Scroll asks to bottom to show lowest prices (closest to spread)
    if (orderBook.asks.length > 0) {
        setTimeout(() => {
            asksContainer.scrollTop = asksContainer.scrollHeight;
        }, 0);
    }

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

// Render Trades
function renderTrades(trades) {
    const tradesList = document.getElementById('trades-list');
    if (!tradesList) return;

    if (trades.length === 0) {
        tradesList.innerHTML = '<tr><td colspan="6" class="empty-message">No recent trades</td></tr>';
        return;
    }

    // Only show the last 10 trades
    const recentTrades = trades.slice(0, 10);

    tradesList.innerHTML = recentTrades.map(trade => `
        <tr>
            <td>${formatTime(trade.time)}</td>
            <td>${trade.pair}</td>
            <td><span class="trade-${trade.type.toLowerCase()}">${trade.type.toUpperCase()}</span></td>
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

// Note: loadChart function is now in chart.js module

// Update Network Stats display
function updateNetworkStats(data) {
    // Block Height
    const blockHeightEl = document.getElementById('status-block-height');
    if (blockHeightEl && data.blocks) {
        blockHeightEl.textContent = data.blocks.toLocaleString();
    }

    // Network Hash Rate
    const hashRateEl = document.getElementById('hash-rate');
    if (hashRateEl && data.primePS) {
        hashRateEl.textContent = formatHashRate(parseFloat(data.primePS));
    }

    // Connection Count
    const connectionsEl = document.getElementById('connections');
    if (connectionsEl && data.connections) {
        connectionsEl.textContent = data.connections;
    }
}

// Update Ledger Metrics display
function updateLedgerMetrics(data) {
    // Additional stats from ledger metrics could be displayed here
    // e.g., stake rate, reserve rate, etc.
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
