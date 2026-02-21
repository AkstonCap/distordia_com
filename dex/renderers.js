// Rendering functions for DEX UI

// Render Market Pairs
function renderMarketPairs(pairs) {
    const pairsList = document.getElementById('pairs-list');
    if (!pairsList) return;

    pairsList.innerHTML = pairs.map(pair => `
        <div class="pair-item" data-pair="${pair.pair}" onclick="selectPairByName('${pair.pair}')">
            <div class="pair-name">${pair.pair}</div>
            <div class="pair-price">${formatPrice(pair.price)}</div>
            <div class="pair-change ${pair.change24h >= 0 ? 'positive' : 'negative'}">
                ${pair.change24h >= 0 ? '+' : ''}${pair.change24h.toFixed(2)}%
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
            <div class="orderbook-row clickable" 
                 style="--depth: ${(order.total / maxTotal * 100)}%"
                 data-txids="${(order.txids || []).join(',')}">
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
            <div class="orderbook-row clickable" 
                 style="--depth: ${(order.total / maxTotal * 100)}%"
                 data-txids="${(order.txids || []).join(',')}">
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

// Render portfolio balances
function renderPortfolio(accounts) {
    const grid = document.getElementById('portfolio-grid');
    if (!grid) return;

    if (!accounts || accounts.length === 0) {
        grid.innerHTML = '<div class="portfolio-empty">No accounts found</div>';
        return;
    }

    grid.innerHTML = accounts.map(acc => {
        const token = acc.ticker || acc.token_name || 'NXS';
        const balance = parseFloat(acc.balance || 0);
        const name = acc.name || 'unnamed';
        return `
            <div class="portfolio-card">
                <div class="portfolio-token-name">${token}</div>
                <div class="portfolio-balance">${balance.toFixed(4)}</div>
                <div class="portfolio-account">${name}</div>
            </div>
        `;
    }).join('');
}

// Render user's open orders
function renderMyOrders(orders) {
    const tbody = document.getElementById('my-orders-list');
    if (!tbody) return;

    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">No open orders</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(order => {
        const market = order.market || 'Unknown';
        const side = order.side || 'bid';
        const price = calculatePriceFromOrder(order, market);
        const contractAmount = parseFloat(order.contract?.amount || 0);
        const contractTicker = order.contract?.ticker || '';
        const amount = contractTicker === 'NXS' ? contractAmount / 1e6 : contractAmount;
        const total = price * amount;
        const timestamp = order.timestamp ? new Date(order.timestamp * 1000).toLocaleString() : '-';
        const txid = order.txid || '';

        return `
            <tr>
                <td>${market}</td>
                <td><span class="order-type-badge ${side}">${side.toUpperCase()}</span></td>
                <td>${formatPrice(price)}</td>
                <td>${amount.toFixed(4)}</td>
                <td>${total.toFixed(4)}</td>
                <td>${timestamp}</td>
                <td>
                    <button class="cancel-order-btn" onclick="handleCancelOrder('${txid}')" ${txid ? '' : 'disabled'}>
                        Cancel
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Render user's trade history
function renderMyHistory(orders) {
    const tbody = document.getElementById('my-history-list');
    if (!tbody) return;

    if (!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">No trade history</td></tr>';
        return;
    }

    tbody.innerHTML = orders.slice(0, 20).map(order => {
        const market = order.market || 'Unknown';
        const side = order.side || 'bid';
        const price = calculatePriceFromOrder(order, market);
        const contractAmount = parseFloat(order.contract?.amount || 0);
        const contractTicker = order.contract?.ticker || '';
        const amount = contractTicker === 'NXS' ? contractAmount / 1e6 : contractAmount;
        const total = price * amount;
        const timestamp = order.timestamp ? new Date(order.timestamp * 1000).toLocaleString() : '-';

        return `
            <tr>
                <td>${timestamp}</td>
                <td>${market}</td>
                <td><span class="order-type-badge ${side}">${side.toUpperCase()}</span></td>
                <td>${formatPrice(price)}</td>
                <td>${amount.toFixed(4)}</td>
                <td>${total.toFixed(4)}</td>
                <td><span class="status-badge executed">Executed</span></td>
            </tr>
        `;
    }).join('');
}

// Note: loadChart function is now in chart.js module

// Update Network Stats display
function updateNetworkStats(data) {
    // Block Height - footer status
    const blockHeightEl = document.getElementById('status-block-height');
    if (blockHeightEl && data.blocks) {
        blockHeightEl.textContent = data.blocks.toLocaleString();
    }

    // DEX header stats
    const statBlockHeight = document.getElementById('stat-block-height');
    if (statBlockHeight && data.blocks) {
        statBlockHeight.textContent = data.blocks.toLocaleString();
    }

    const statNetwork = document.getElementById('stat-network-status');
    if (statNetwork) {
        statNetwork.textContent = 'Online';
        statNetwork.style.color = '#10B981';
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
// Update API Status
function updateAPIStatus(status, message = '') {
    const statusDot = document.getElementById('api-status-dot');
    const statusText = document.getElementById('api-status-text');
    const lastUpdate = document.getElementById('last-update');
    const statNetwork = document.getElementById('stat-network-status');

    if (statusDot) {
        statusDot.className = 'status-dot';
        if (status === 'connected') {
            statusDot.classList.add('connected');
            statusText.textContent = message || 'Connected to Nexus.io';
            if (statNetwork) {
                statNetwork.textContent = 'Online';
                statNetwork.style.color = '#10B981';
            }
        } else if (status === 'error') {
            statusDot.classList.add('error');
            statusText.textContent = 'Connection Error';
            if (statNetwork) {
                statNetwork.textContent = 'Offline';
                statNetwork.style.color = '#EF4444';
            }
        } else {
            statusText.textContent = 'Connecting...';
            if (statNetwork) {
                statNetwork.textContent = 'Connecting...';
                statNetwork.style.color = '';
            }
        }
    }

    if (lastUpdate) {
        lastUpdate.textContent = new Date().toLocaleTimeString();
    }
}
