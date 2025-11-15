// Event handlers and user interaction functions for DEX

// Setup Event Listeners
function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('pair-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterPairs(e.target.value);
        });
    }

    // Tab filters
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterPairsByTab(btn.dataset.filter);
        });
    });

    // Trade filters
    const tradeFilters = document.querySelectorAll('[data-trade-filter]');
    tradeFilters.forEach(filter => {
        filter.addEventListener('click', () => {
            tradeFilters.forEach(f => f.classList.remove('active'));
            filter.classList.add('active');
            filterTrades(filter.dataset.tradeFilter);
        });
    });

    // Order book view toggle
    const viewButtons = document.querySelectorAll('[data-orderbook-view]');
    viewButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            viewButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateOrderBookView(btn.dataset.orderbookView);
        });
    });

    // Chart interval selector
    const intervalButtons = document.querySelectorAll('[data-interval]');
    console.log(`Found ${intervalButtons.length} chart interval buttons`);
    intervalButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            console.log('Chart interval button clicked:', btn.dataset.interval);
            intervalButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateChart(btn.dataset.interval);
        });
    });
}

// Filter pairs by search term
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

// Filter pairs by tab (all, favorites, nxs, usdd, etc.)
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

// Filter trades by type
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

// Update order book view (both, asks only, bids only)
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

// Toggle favorite status for a pair
function toggleFavorite(pairName) {
    // Implement favorites logic (could use localStorage)
    console.log('Toggle favorite:', pairName);
    // TODO: Save to localStorage and update UI
}

// Update chart interval
function updateChart(interval) {
    console.log('updateChart called with interval:', interval);
    // Use the chart module's updateChartInterval function
    if (typeof updateChartInterval === 'function') {
        console.log('Calling updateChartInterval');
        updateChartInterval(interval);
    } else {
        console.error('updateChartInterval function not found');
    }
}
