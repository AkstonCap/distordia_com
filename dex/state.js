// State management for DEX application

// Global state
let currentPair = null;
let marketData = {
    pairs: []
};
let updateInterval = null;

// Select trading pair by name
function selectPairByName(pairName) {
    const pair = marketData.pairs?.find(p => p.pair === pairName);
    if (pair) {
        selectPair(pair);
    }
}

// Select trading pair
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
