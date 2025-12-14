// Utility functions for DEX

// Format price with appropriate decimal places
function formatPrice(price) {
    if (price === 0 || !price) return '0.00';
    
    if (price < 0.000001) {
        return price.toExponential(4);
    } else if (price < 0.01) {
        return price.toFixed(8);
    } else if (price < 1) {
        return price.toFixed(6);
    } else if (price < 100) {
        return price.toFixed(4);
    } else {
        return price.toFixed(2);
    }
}

// Format large numbers with abbreviations
function formatNumber(num) {
    if (num === 0 || !num) return '0';
    
    if (num >= 1000000000) {
        return (num / 1000000000).toFixed(2) + 'B';
    } else if (num >= 1000000) {
        return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(2) + 'K';
    }
    return num.toFixed(2);
}

// Format hash rate
function formatHashRate(hashrate) {
    if (!hashrate) return '0 H/s';
    
    if (hashrate >= 1000000000000) {
        return (hashrate / 1000000000000).toFixed(2) + ' TH/s';
    } else if (hashrate >= 1000000000) {
        return (hashrate / 1000000000).toFixed(2) + ' GH/s';
    } else if (hashrate >= 1000000) {
        return (hashrate / 1000000).toFixed(2) + ' MH/s';
    } else if (hashrate >= 1000) {
        return (hashrate / 1000).toFixed(2) + ' KH/s';
    }
    return hashrate.toFixed(2) + ' H/s';
}

// Format time with date
function formatTime(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}/${month} ${hours}:${minutes}:${seconds}`;
}

// Calculate price from Nexus order data
function calculatePriceFromOrder(order, marketPair) {
    const [base, quote] = marketPair.split('/');
    
    // Get contract (what's being sold) and order (what's being bought)
    const contractAmount = parseFloat(order.contract?.amount || 0);
    const contractTicker = order.contract?.ticker || '';
    const orderAmount = parseFloat(order.order?.amount || 0);
    const orderTicker = order.order?.ticker || '';
    
    if (contractAmount === 0 || orderAmount === 0) {
        return 0;
    }
    
    // Adjust for NXS divisible units (1 NXS = 1e6 units)
    const adjustedContractAmount = contractTicker === 'NXS' ? contractAmount / 1e6 : contractAmount;
    const adjustedOrderAmount = orderTicker === 'NXS' ? orderAmount / 1e6 : orderAmount;
    
    // Price is how much quote currency per base currency
    // If contract is base and order is quote: price = orderAmount / contractAmount
    // If contract is quote and order is base: price = contractAmount / orderAmount
    
    if (contractTicker === base && orderTicker === quote) {
        const price = adjustedOrderAmount / adjustedContractAmount;
        return price;
    } else if (contractTicker === quote && orderTicker === base) {
        const price = adjustedContractAmount / adjustedOrderAmount;
        return price;
    }
    
    console.log(`  No matching ticker combination - returning 0`);
    return 0;
}

// Determine trade type from order
function determineTradeType(order) {
    // In Nexus blockchain:
    // - Executed ASK = someone bought (filled a sell order) = BUY
    // - Executed BID = someone sold (filled a buy order) = SELL
    if (order.executedType === 'ask') {
        return 'buy';  // lowercase for CSS class
    } else if (order.executedType === 'bid') {
        return 'sell'; // lowercase for CSS class
    }
    // Fallback
    return 'buy';
}
