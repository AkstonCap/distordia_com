// API functions for fetching data from Nexus blockchain

// Helper function to aggregate orders by price level
function aggregateOrdersByPrice(orders) {
    const priceMap = new Map();
    
    orders.forEach(order => {
        const priceKey = order.price.toFixed(8); // Use 8 decimals for price precision
        
        if (priceMap.has(priceKey)) {
            const existing = priceMap.get(priceKey);
            existing.amount += order.amount;
            existing.total += order.total;
            // Collect multiple txids for aggregated orders
            if (order.txid && !existing.txids.includes(order.txid)) {
                existing.txids.push(order.txid);
            }
        } else {
            priceMap.set(priceKey, {
                price: order.price,
                amount: order.amount,
                total: order.total,
                txids: order.txid ? [order.txid] : []
            });
        }
    });
    
    return Array.from(priceMap.values());
}

// Fetch network statistics
async function fetchNetworkStats() {
    try {
        console.log('🔍 Fetching network stats...');
        // Fetch real Nexus blockchain data using proper API endpoints
        // Using POST method as per Nexus API documentation
        const response = await fetch(API_ENDPOINTS.systemInfo, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        console.log('📡 Network stats response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Network stats received:', data);
            // Nexus API returns data in 'result' object
            updateNetworkStats(data.result || data);
            updateAPIStatus('connected');
        } else {
            console.error('❌ Network stats request failed:', response.status);
            throw new Error('API unavailable');
        }
    } catch (error) {
        console.error('Error fetching network stats:', error);
        updateAPIStatus('error', 'Failed to connect to Nexus API');
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
                
                // Calculate timestamp for 24 hours ago (use current time if no recent orders)
                const now = Math.floor(Date.now() / 1000);
                const timestamp24hAgo = currentTimestamp > 0 ? currentTimestamp - (24 * 60 * 60) : now - (24 * 60 * 60);
                
                // Fetch all executed orders (we'll filter in JavaScript since where clause may not work)
                const ordersResponse = await fetch(API_ENDPOINTS.listExecuted, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        market: marketPair,
                        limit: 1000,
                        sort: 'timestamp',
                        order: 'desc'
                    })
                });

                let change24h = 0;
                let allOrders24h = [];
                
                if (ordersResponse.ok) {
                    const data = await ordersResponse.json();
                    
                    // The result contains bids and asks arrays
                    const orderBids = data.result?.bids || [];
                    const orderAsks = data.result?.asks || [];
                    let allOrders = [...orderBids, ...orderAsks];
                    
                    // Sort all orders by timestamp descending
                    allOrders.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                    
                    console.log(`Market ${marketPair}: Fetched ${allOrders.length} total executed orders`);
                    
                    // Filter to only orders in the last 24 hours for volume
                    allOrders24h = allOrders.filter(order => (order.timestamp || 0) >= timestamp24hAgo);
                    
                    console.log(`Market ${marketPair}: ${allOrders24h.length} executed orders in last 24h`);
                    
                    // Find the oldest order within 24h window for price comparison
                    // (closest to 24h ago, but still within the window)
                    const oldestOrder24h = allOrders24h.length > 0 ? allOrders24h[allOrders24h.length - 1] : null;
                    
                    if (lastPrice > 0 && oldestOrder24h) {
                        const price24hAgo = calculatePriceFromOrder(oldestOrder24h, marketPair);
                        console.log(`Market ${marketPair}: Price 24h ago = ${price24hAgo} (timestamp: ${new Date(oldestOrder24h.timestamp * 1000).toLocaleString()})`);
                        
                        if (price24hAgo > 0) {
                            change24h = ((lastPrice - price24hAgo) / price24hAgo) * 100;
                            console.log(`Market ${marketPair}: Current price = ${lastPrice}, 24h change = ${change24h.toFixed(2)}%`);
                        } else {
                            console.log(`Market ${marketPair}: Could not calculate price 24h ago`);
                        }
                    } else {
                        console.log(`Market ${marketPair}: Insufficient data for 24h change calculation`);
                    }
                    
                    // Calculate market statistics from executed orders in last 24h
                    return processMarketPairData(marketPair, allOrders24h, lastPrice, change24h);
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

// Load order book for a specific pair
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
            
            const [base, quote] = pair.pair.split('/');
            
            const bids = bidsResult.map(order => {
                // Calculate price from contract and order amounts
                const price = calculatePriceFromOrder(order, pair.pair);
                
                // For bids: order is what they're offering (base currency amount we want)
                const baseAmount = parseFloat(order.order?.amount || 0);
                const baseTicker = order.order?.ticker || '';
                
                // Adjust for NXS divisible units if needed
                const adjustedAmount = baseTicker === 'NXS' ? baseAmount / 1e6 : baseAmount;
                
                return {
                    price: price,
                    amount: adjustedAmount,
                    total: price * adjustedAmount,
                    timestamp: order.timestamp || 0,
                    address: order.owner || order.address || '',
                    txid: order.txid || ''
                };
            }).filter(o => o.price > 0 && o.amount > 0);
            
            const asks = asksResult.map(order => {
                // Calculate price from contract and order amounts
                const price = calculatePriceFromOrder(order, pair.pair);
                
                // For asks: contract is what they're offering (base currency amount we want)
                const baseAmount = parseFloat(order.contract?.amount || 0);
                const baseTicker = order.contract?.ticker || '';
                
                // Adjust for NXS divisible units if needed
                const adjustedAmount = baseTicker === 'NXS' ? baseAmount / 1e6 : baseAmount;
                
                return {
                    price: price,
                    amount: adjustedAmount,
                    total: price * adjustedAmount,
                    timestamp: order.timestamp || 0,
                    address: order.owner || order.address || '',
                    txid: order.txid || ''
                };
            }).filter(o => o.price > 0 && o.amount > 0);
            
            console.log(`Processed ${bids.length} valid bids, ${asks.length} valid asks`);
            
            // Sort bids (highest first) and asks (lowest first)
            bids.sort((a, b) => b.price - a.price);
            asks.sort((a, b) => a.price - b.price);
            
            // Aggregate orders by price level
            const aggregatedBids = aggregateOrdersByPrice(bids);
            const aggregatedAsks = aggregateOrdersByPrice(asks);
            
            console.log(`Aggregated to ${aggregatedBids.length} bid levels, ${aggregatedAsks.length} ask levels`);
            
            renderOrderBook({ bids: aggregatedBids, asks: aggregatedAsks }, pair.pair);
            updateSpread(aggregatedBids, aggregatedAsks);
        } else {
            console.warn('Failed to fetch order book');
            renderOrderBook({ bids: [], asks: [] });
        }
        
    } catch (error) {
        console.error('Error loading order book:', error);
        renderOrderBook({ bids: [], asks: [] });
    }
}

// Fetch recent trades
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
            
            // Mark each order with its type for proper classification
            const markedBids = bids.map(order => ({ ...order, executedType: 'bid' }));
            const markedAsks = asks.map(order => ({ ...order, executedType: 'ask' }));
            const executedOrders = [...markedBids, ...markedAsks];
            
            console.log(`Loaded ${executedOrders.length} executed trades (${bids.length} bids, ${asks.length} asks)`);
            
            if (executedOrders.length > 0) {
                // Sort by timestamp descending
                executedOrders.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                
                const trades = executedOrders.map(order => {
                    // Calculate price from contract and order amounts
                    const price = calculatePriceFromOrder(order, order.market || marketPair);
                    const contractAmount = parseFloat(order.contract?.amount || 0);
                    const orderAmount = parseFloat(order.order?.amount || 0);
                    
                    // Determine which amount to display (the asset being traded)
                    const contractTicker = order.contract?.ticker || '';
                    const amount = contractTicker === 'NXS' ? contractAmount / 1e6 : contractAmount;
                    
                    return {
                        time: new Date((order.timestamp || 0) * 1000), // Convert Unix timestamp
                        pair: order.market || marketPair || 'Unknown',
                        type: determineTradeType(order),
                        price: price,
                        amount: amount,
                        total: price * amount
                    };
                }).filter(t => t.price > 0 && t.amount > 0);
                
                console.log(`Processed ${trades.length} valid trades`);
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
