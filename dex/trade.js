// Trade functionality for DEX

// Trade state
let tradeState = {
    type: 'buy', // 'buy' or 'sell'
    selectedOrder: null,
    availableOrders: []
};

// Initialize trade functionality
function initializeTrade() {
    const tradeBtn = document.getElementById('trade-btn');
    const tradeModal = document.getElementById('trade-modal');
    const closeTrade = document.getElementById('close-trade-modal');
    const cancelTrade = document.getElementById('cancel-trade');
    const tradeForm = document.getElementById('trade-form');
    const tradeTypeBtns = document.querySelectorAll('.trade-type-btn');
    const useMarketPriceBtn = document.getElementById('use-market-price');
    const amountInput = document.getElementById('trade-amount');
    const priceInput = document.getElementById('trade-price');
    
    // Show/hide trade button based on wallet connection
    updateTradeButtonVisibility();
    
    // Open trade modal
    if (tradeBtn) {
        tradeBtn.addEventListener('click', () => {
            openTradeModal();
        });
    }
    
    // Close trade modal
    if (closeTrade) {
        closeTrade.addEventListener('click', () => {
            closeTradeModal();
        });
    }
    
    if (cancelTrade) {
        cancelTrade.addEventListener('click', () => {
            closeTradeModal();
        });
    }
    
    // Trade type selection
    tradeTypeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tradeTypeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            tradeState.type = btn.dataset.type;
            updateTradeType(tradeState.type);
            updatePriceLabel(tradeState.type);
            loadAvailableOrders();
        });
    });
    
    // Use market price button
    if (useMarketPriceBtn) {
        useMarketPriceBtn.addEventListener('click', () => {
            if (currentPair) {
                let bestPrice;
                
                // For buy orders: use lowest ask (best available sell price)
                // For sell orders: use highest bid (best available buy price)
                if (tradeState.type === 'buy') {
                    bestPrice = getLowestAsk();
                } else {
                    bestPrice = getHighestBid();
                }
                
                // Fall back to last price if no orders available
                if (!bestPrice) {
                    bestPrice = currentPair.price;
                }
                
                priceInput.value = bestPrice;
                calculateTotal();
            }
        });
    }
    
    // Calculate total when amount or price changes
    if (amountInput) {
        amountInput.addEventListener('input', () => {
            findMatchingOrders();
        });
    }
    if (priceInput) {
        priceInput.addEventListener('input', () => {
            findMatchingOrders();
        });
    }
    
    // Handle form submission - find orders
    if (tradeForm) {
        tradeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await findAndDisplayOrders();
        });
    }
    
    // Back to form button
    const backToFormBtn = document.getElementById('back-to-form');
    if (backToFormBtn) {
        backToFormBtn.addEventListener('click', () => {
            showTradeForm();
        });
    }
    
    // Execute trade from review
    const executeTradeBtn = document.getElementById('execute-trade');
    if (executeTradeBtn) {
        executeTradeBtn.addEventListener('click', async () => {
            await executeTrade();
        });
    }
}

// Get lowest ask price from current order book
function getLowestAsk() {
    const asksContainer = document.getElementById('orderbook-asks');
    if (!asksContainer) return null;
    
    const rows = asksContainer.querySelectorAll('.orderbook-row');
    if (rows.length === 0) return null;
    
    // Last row is the lowest ask (closest to spread) after scrolling
    const lastRow = rows[rows.length - 1];
    const priceText = lastRow.querySelector('span:first-child')?.textContent;
    return priceText ? parseFloat(priceText.replace(/,/g, '')) : null;
}

// Get highest bid price from current order book
function getHighestBid() {
    const bidsContainer = document.getElementById('orderbook-bids');
    if (!bidsContainer) return null;
    
    const rows = bidsContainer.querySelectorAll('.orderbook-row');
    if (rows.length === 0) return null;
    
    // First row is the highest bid (closest to spread)
    const firstRow = rows[0];
    const priceText = firstRow.querySelector('span:first-child')?.textContent;
    return priceText ? parseFloat(priceText.replace(/,/g, '')) : null;
}

// Update trade button visibility based on wallet connection
function updateTradeButtonVisibility() {
    const tradeBtn = document.getElementById('trade-btn');
    if (!tradeBtn) {
        console.warn('[Trade] Trade button not found in DOM');
        return;
    }
    
    // Check if q-wallet is connected OR if native session is logged in
    const isWalletConnected = (typeof window.nexus !== 'undefined' && walletConnected) || (typeof isLoggedIn === 'function' && isLoggedIn());
    
    // Also check if a pair is selected
    const hasPairSelected = currentPair !== null;
    
    console.log('[Trade] Button visibility check:', {
        hasPairSelected,
        isWalletConnected,
        currentPair: currentPair?.pair
    });
    
    // Always show button if pair is selected
    if (hasPairSelected) {
        tradeBtn.style.display = 'flex';
        
        // Update button text based on connection status
        const tradeBtnText = tradeBtn.querySelector('.trade-btn-text') || tradeBtn;
        if (isWalletConnected) {
            tradeBtnText.innerHTML = '<span class="trade-icon">💱</span> Trade';
        } else {
            tradeBtnText.innerHTML = '<span class="trade-icon">🔒</span> Connect wallet to trade';
        }
    } else {
        tradeBtn.style.display = 'none';
    }
}

// Open trade modal
function openTradeModal() {
    if (!currentPair) {
        showNotification('Please select a trading pair first', 'warning');
        return;
    }
    
    // Check if wallet is connected
    const isWalletConnected = (typeof window.nexus !== 'undefined' && walletConnected) || (typeof isLoggedIn === 'function' && isLoggedIn());
    
    if (!isWalletConnected) {
        // Prompt user to connect wallet
        showNotification('Please connect your wallet or login to trade', 'warning');
        
        // Try to trigger wallet connection
        const connectBtn = document.getElementById('connectWalletBtn');
        if (connectBtn) {
            connectBtn.click();
        }
        return;
    }
    
    const modal = document.getElementById('trade-modal');
    const pairName = document.getElementById('trade-pair-name');
    const currentPrice = document.getElementById('trade-current-price');
    const amountCurrency = document.getElementById('trade-amount-currency');
    const quoteCurrency = document.getElementById('trade-quote-currency');
    const totalCurrency = document.getElementById('trade-total-currency');
    const priceInput = document.getElementById('trade-price');
    
    // Set pair information
    if (pairName) pairName.textContent = currentPair.pair;
    if (currentPrice) currentPrice.textContent = formatPrice(currentPair.price);
    
    // Set amount currency to quote (payment token for buy orders by default)
    if (amountCurrency) amountCurrency.textContent = currentPair.quote;
    if (quoteCurrency) quoteCurrency.textContent = currentPair.quote;
    if (totalCurrency) totalCurrency.textContent = currentPair.quote;
    
    // Set default price to current market price
    if (priceInput) priceInput.value = currentPair.price;
    
    // Reset form
    document.getElementById('trade-amount').value = '';
    document.getElementById('trade-total-value').textContent = '0';
    hideTradeError();
    
    // Reset trade type to buy
    tradeState.type = 'buy';
    document.querySelectorAll('.trade-type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === 'buy');
    });
    updateTradeType('buy');
    updatePriceLabel('buy');
    
    // Load available orders
    loadAvailableOrders();
    
    // Show modal
    if (modal) modal.style.display = 'flex';
}

// Close trade modal
function closeTradeModal() {
    const modal = document.getElementById('trade-modal');
    if (modal) modal.style.display = 'none';
    tradeState.selectedOrder = null;
}

// Update trade type display
function updateTradeType(type) {
    const executeBtn = document.getElementById('execute-trade-type');
    if (executeBtn) {
        executeBtn.textContent = type === 'buy' ? 'Buy' : 'Sell';
    }
    
    // Update amount currency label (payment token)
    const amountCurrency = document.getElementById('trade-amount-currency');
    const amountHelp = document.getElementById('trade-amount-help');
    
    if (amountCurrency && currentPair) {
        // For buy: you spend quote currency
        // For sell: you spend base currency
        amountCurrency.textContent = type === 'buy' ? currentPair.quote : currentPair.base;
    }
    
    if (amountHelp) {
        amountHelp.textContent = type === 'buy' 
            ? 'Maximum amount you want to spend'
            : 'Maximum amount you want to spend (sell)';
    }
}

// Update price label based on trade type
function updatePriceLabel(type) {
    const priceLabel = document.getElementById('trade-price-label');
    const priceHelp = document.getElementById('trade-price-help');
    
    if (priceLabel) {
        priceLabel.textContent = type === 'buy' ? 'Max Price' : 'Min Price';
    }
    
    if (priceHelp) {
        priceHelp.textContent = type === 'buy' 
            ? 'Maximum price you\'re willing to pay per unit'
            : 'Minimum price you\'re willing to accept per unit';
    }
}

// Find and display matching orders based on constraints
function findMatchingOrders() {
    const maxAmount = parseFloat(document.getElementById('trade-amount').value) || 0;
    const priceLimit = parseFloat(document.getElementById('trade-price').value) || 0;
    const totalCurrency = document.getElementById('trade-total-currency');
    
    // If no inputs yet, show 0
    if (maxAmount <= 0 || priceLimit <= 0) {
        document.getElementById('trade-total-value').textContent = '0';
        if (totalCurrency && currentPair) {
            totalCurrency.textContent = tradeState.type === 'buy' ? currentPair.base : currentPair.quote;
        }
        return;
    }
    
    // If no orders loaded yet, show estimated calculation
    if (!tradeState.availableOrders.length) {
        let estimatedReceived = 0;
        let receiveCurrency = '';
        
        if (tradeState.type === 'buy') {
            // Buying: estimate receiving base currency (amount / price)
            estimatedReceived = maxAmount / priceLimit;
            receiveCurrency = currentPair.base;
        } else {
            // Selling: estimate receiving quote currency (amount * price)
            estimatedReceived = maxAmount * priceLimit;
            receiveCurrency = currentPair.quote;
        }
        
        if (totalCurrency) {
            totalCurrency.textContent = receiveCurrency;
        }
        document.getElementById('trade-total-value').textContent = estimatedReceived.toFixed(6);
        return;
    }
    
    // Filter and sort orders based on trade type and price constraint
    let matchingOrders = tradeState.availableOrders.filter(order => {
        const orderPrice = calculatePriceFromOrder(order, currentPair.pair);
        
        if (tradeState.type === 'buy') {
            // For buying: we want sell orders (asks) at or below our max price
            return orderPrice <= priceLimit;
        } else {
            // For selling: we want buy orders (bids) at or above our min price
            return orderPrice >= priceLimit;
        }
    });
    
    // Sort orders by best price first
    matchingOrders.sort((a, b) => {
        const priceA = calculatePriceFromOrder(a, currentPair.pair);
        const priceB = calculatePriceFromOrder(b, currentPair.pair);
        
        if (tradeState.type === 'buy') {
            // For buying: prefer lowest price first
            return priceA - priceB;
        } else {
            // For selling: prefer highest price first
            return priceB - priceA;
        }
    });
    
    // Accumulate orders until we reach maxAmount
    // When buying: maxAmount is in quote currency (what you spend)
    // When selling: maxAmount is in base currency (what you sell)
    let accumulatedSpending = 0;  // For buy: quote currency spent
    let accumulatedReceiving = 0;  // For buy: base currency received
    const selectedOrders = [];
    
    for (const order of matchingOrders) {
        const orderPrice = calculatePriceFromOrder(order, currentPair.pair);
        
        console.log('[Match] Processing order:', {
            type: tradeState.type,
            contract: { amount: order.contract?.amount, ticker: order.contract?.ticker },
            order: { amount: order.order?.amount, ticker: order.order?.ticker }
        });
        
        // Extract amount from order structure
        // For bids: order.order is what they're offering (base currency)
        // For asks: order.contract is what they're selling (base currency)
        let orderAmount = 0;
        let amountTicker = '';
        
        if (tradeState.type === 'buy') {
            // Buying: we want asks, so contract is the base currency being sold
            orderAmount = parseFloat(order.contract?.amount || 0);
            amountTicker = order.contract?.ticker || '';
        } else {
            // Selling: we want bids, so order is the base currency they want
            orderAmount = parseFloat(order.order?.amount || 0);
            amountTicker = order.order?.ticker || '';
        }
        
        // Adjust for NXS divisible units if needed
        // Note: DIST and other tokens are already in human-readable form
        if (amountTicker === 'NXS') {
            orderAmount = orderAmount / 1e6;
        }
        
        if (orderAmount <= 0) {
            console.warn('[Match] Skipping order with zero amount');
            continue;
        }
        
        // Calculate how much we can take from this order
        let amountToTake;
        
        if (tradeState.type === 'buy') {
            // Buying: limit by spending amount (quote currency)
            const orderCost = orderAmount * orderPrice;  // How much quote currency this order costs
            const remainingBudget = maxAmount - accumulatedSpending;
            
            if (remainingBudget <= 0) break;
            
            if (orderCost <= remainingBudget) {
                // Take the whole order
                amountToTake = orderAmount;
            } else {
                // Take partial order based on remaining budget
                amountToTake = remainingBudget / orderPrice;
            }
            
            accumulatedSpending += amountToTake * orderPrice;
            accumulatedReceiving += amountToTake;
        } else {
            // Selling: limit by selling amount (base currency)
            const remainingToSell = maxAmount - accumulatedReceiving;
            
            if (remainingToSell <= 0) break;
            
            amountToTake = Math.min(orderAmount, remainingToSell);
            
            accumulatedReceiving += amountToTake * orderPrice;  // Quote received
            accumulatedSpending += amountToTake;  // Base spent
        }
        
        selectedOrders.push({
            ...order,
            price: orderPrice,
            amount: orderAmount,
            amountTaken: amountToTake
        });
    }
    
    // Store selected orders
    tradeState.selectedOrders = selectedOrders;
    
    // Update display - show estimated received
    let estimatedReceived = 0;
    let receiveCurrency = '';
    
    if (tradeState.type === 'buy') {
        // Buying: receiving base currency
        estimatedReceived = accumulatedReceiving;
        receiveCurrency = currentPair.base;
    } else {
        // Selling: receiving quote currency
        estimatedReceived = accumulatedReceiving;
        receiveCurrency = currentPair.quote;
    }
    
    if (totalCurrency) {
        totalCurrency.textContent = receiveCurrency;
    }
    
    document.getElementById('trade-total-value').textContent = estimatedReceived.toFixed(6);
    
    // Update orders list to highlight selected orders
    // For buy: show how much quote currency was spent vs requested
    // For sell: show how much base currency was sold vs requested
    const filledAmount = tradeState.type === 'buy' ? accumulatedSpending : accumulatedSpending;
    displayMatchingOrders(selectedOrders, filledAmount, maxAmount);
}

// Display matching orders with highlighting
function displayMatchingOrders(selectedOrders, filledAmount, requestedAmount) {
    const ordersList = document.getElementById('available-orders-list');
    if (!ordersList) return;
    
    if (selectedOrders.length === 0) {
        ordersList.innerHTML = '<div class="loading-orders">No orders match your criteria</div>';
        return;
    }
    
    ordersList.innerHTML = '';
    
    // Add summary header
    const summary = document.createElement('div');
    summary.className = 'matched-orders-summary';
    summary.innerHTML = `
        <div class="summary-line">
            <span>Matched Orders:</span>
            <strong>${selectedOrders.length}</strong>
        </div>
        <div class="summary-line">
            <span>Amount Filled:</span>
            <strong>${filledAmount.toFixed(6)} / ${requestedAmount.toFixed(6)} ${currentPair.base}</strong>
        </div>
    `;
    ordersList.appendChild(summary);
    
    // Display each selected order
    selectedOrders.forEach(order => {
        const orderItem = document.createElement('div');
        orderItem.className = 'order-item selected';
        
        orderItem.innerHTML = `
            <div class="order-item-info">
                <span class="order-price">${formatPrice(order.price)}</span>
                <span class="order-amount">${order.amountTaken.toFixed(6)} ${currentPair.base}</span>
            </div>
            <div class="order-total">${(order.price * order.amountTaken).toFixed(6)} ${currentPair.quote}</div>
        `;
        
        ordersList.appendChild(orderItem);
    });
}

// Calculate total value (legacy function, now replaced by findMatchingOrders)
function calculateTotal() {
    findMatchingOrders();
}

// Load available orders from the order book
async function loadAvailableOrders() {
    if (!currentPair) return;
    
    const ordersList = document.getElementById('available-orders-list');
    if (!ordersList) return;
    
    ordersList.innerHTML = '<div class="loading-orders">Loading orders...</div>';
    
    try {
        // Determine which orders to fetch based on trade type
        // If buying, we need to fetch asks (sell orders)
        // If selling, we need to fetch bids (buy orders)
        const endpoint = tradeState.type === 'buy' ? API_ENDPOINTS.listAsks : API_ENDPOINTS.listBids;
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                market: currentPair.pair,
                limit: 20,
                sort: 'price',
                order: tradeState.type === 'buy' ? 'asc' : 'desc'
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('[Trade] API response:', data);
            const orders = data.result || [];
            
            console.log('[Trade] Loaded orders:', {
                count: orders.length,
                orders: orders.slice(0, 3) // Show first 3 for debugging
            });
            
            tradeState.availableOrders = orders;
            
            if (orders.length === 0) {
                ordersList.innerHTML = '<div class="loading-orders">No orders available</div>';
                return;
            }
            
            // Trigger matching with current inputs
            findMatchingOrders();
        } else {
            ordersList.innerHTML = '<div class="loading-orders">Failed to load orders</div>';
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        ordersList.innerHTML = '<div class="loading-orders">Error loading orders</div>';
    }
}

// Create order item element
function createOrderItem(order) {
    const div = document.createElement('div');
    div.className = 'order-item';
    
    // Calculate price from order data
    const price = calculatePriceFromOrder(order, currentPair.pair);
    const amount = parseFloat(order.amount || 0);
    
    div.innerHTML = `
        <div class="order-item-info">
            <span class="order-price">${formatPrice(price)}</span>
            <span class="order-amount">${amount.toFixed(6)} ${currentPair.base}</span>
        </div>
        <div class="order-total">${(price * amount).toFixed(6)}</div>
    `;
    
    // Click to select order
    div.addEventListener('click', () => {
        // Deselect all orders
        document.querySelectorAll('.order-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Select this order
        div.classList.add('selected');
        tradeState.selectedOrder = order;
        
        // Fill in the form with order details
        document.getElementById('trade-price').value = price;
        document.getElementById('trade-amount').value = amount;
        calculateTotal();
    });
    
    return div;
}

// Find and display matching orders
async function findAndDisplayOrders() {
    console.log('[Trade] findAndDisplayOrders called');
    
    if (!currentPair) {
        showTradeError('No trading pair selected');
        return;
    }
    
    const amount = parseFloat(document.getElementById('trade-amount').value);
    const price = parseFloat(document.getElementById('trade-price').value);
    
    console.log('[Trade] Form values:', { amount, price, type: tradeState.type, pair: currentPair.pair });
    
    if (!amount || amount <= 0) {
        showTradeError('Please enter a valid amount');
        return;
    }
    
    if (!price || price <= 0) {
        showTradeError('Please enter a valid price');
        return;
    }
    
    // Show loading state
    const findBtn = document.getElementById('find-orders-btn');
    if (findBtn) {
        findBtn.disabled = true;
        findBtn.textContent = 'Finding orders...';
    }
    
    hideTradeError();
    
    // First, load available orders from the blockchain
    try {
        // Determine which orders to fetch based on trade type
        const endpoint = tradeState.type === 'buy' ? API_ENDPOINTS.listAsks : API_ENDPOINTS.listBids;
        
        console.log('[Trade] Fetching orders:', {
            type: tradeState.type,
            endpoint,
            pair: currentPair.pair
        });
        
        console.log(`[Trade] Fetching ${tradeState.type === 'buy' ? 'asks' : 'bids'} for ${currentPair.pair}`);
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                market: currentPair.pair,
                limit: 50,
                sort: 'price',
                order: tradeState.type === 'buy' ? 'asc' : 'desc'
            })
        });
        
        console.log('[Trade] Response status:', response.status, 'OK:', response.ok);
        
        if (response.ok) {
            const data = await response.json();
            console.log('[Trade] API response data:', data);
            console.log('[Trade] data.result:', data.result);
            
            // Extract orders from nested structure
            const orderType = tradeState.type === 'buy' ? 'asks' : 'bids';
            const orders = data.result?.[orderType] || [];
            
            console.log(`[Trade] Loaded ${orders.length} orders`);
            
            tradeState.availableOrders = orders;
            
            // Find matching orders
            findMatchingOrders();
            
            console.log('[Trade] After matching:', {
                selectedOrdersCount: tradeState.selectedOrders?.length || 0
            });
            
            // Reset button
            if (findBtn) {
                findBtn.disabled = false;
                findBtn.textContent = 'Find Available Orders';
            }
            
            // Check if we found any orders
            if (!tradeState.selectedOrders || tradeState.selectedOrders.length === 0) {
                showTradeError(`No matching orders found. Please adjust your price or amount. (${orders.length} orders available)`);
                return;
            }
            
            // Display the orders in review section
            displayOrdersForReview();
        } else {
            throw new Error('Failed to fetch orders');
        }
    } catch (error) {
        console.error('[Trade] Error loading orders:', error);
        showTradeError('Failed to load orders from blockchain. Please try again.');
        
        // Reset button
        if (findBtn) {
            findBtn.disabled = false;
            findBtn.textContent = 'Find Available Orders';
        }
    }
}

// Display orders in review section
function displayOrdersForReview() {
    console.log('[Review] displayOrdersForReview called');
    
    const ordersList = document.getElementById('selected-orders-list');
    const reviewSection = document.getElementById('order-review-section');
    const tradeForm = document.getElementById('trade-form');
    
    console.log('[Review] Elements found:', {
        ordersList: !!ordersList,
        reviewSection: !!reviewSection,
        tradeForm: !!tradeForm,
        selectedOrders: tradeState.selectedOrders?.length
    });
    
    if (!ordersList || !reviewSection || !tradeState.selectedOrders) {
        console.error('[Review] Missing required elements or orders');
        return;
    }
    
    // Hide form, show review
    if (tradeForm) tradeForm.style.display = 'none';
    reviewSection.style.display = 'block';
    
    console.log('[Review] Review section displayed');
    
    // Calculate totals
    let totalSpending = 0;
    let totalReceived = 0;
    
    // Add enabled flag to all orders (default true)
    tradeState.selectedOrders.forEach(order => {
        if (order.enabled === undefined) {
            order.enabled = true;
        }
    });
    
    // Render orders
    ordersList.innerHTML = tradeState.selectedOrders.map((order, index) => {
        const orderAmount = parseFloat(order.amountTaken || 0);
        const orderPrice = order.price || calculatePriceFromOrder(order, currentPair.pair);
        
        console.log(`[Review] Order ${index + 1}:`, {
            orderAmount,
            orderPrice,
            amountTaken: order.amountTaken,
            enabled: order.enabled
        });
        
        let spending, received;
        if (tradeState.type === 'buy') {
            // Buying: spending in quote, receiving in base
            spending = orderAmount * orderPrice;
            received = orderAmount;
            if (order.enabled) {
                totalSpending += spending;
                totalReceived += received;
            }
        } else {
            // Selling: spending in base, receiving in quote
            spending = orderAmount;
            received = orderAmount * orderPrice;
            if (order.enabled) {
                totalSpending += spending;
                totalReceived += received;
            }
        }
        
        return `
            <div class="review-order-item ${order.enabled ? '' : 'disabled'}" data-order-index="${index}">
                <div class="review-order-header">
                    <div class="order-header-left">
                        <input type="checkbox" class="order-checkbox" data-order-index="${index}" ${order.enabled ? 'checked' : ''}>
                        <span class="order-number">Order ${index + 1}</span>
                    </div>
                    <span class="order-price">${formatPrice(orderPrice)} ${currentPair.quote}</span>
                </div>
                <div class="review-order-details">
                    <span>Spending: ${spending.toFixed(6)} ${tradeState.type === 'buy' ? currentPair.quote : currentPair.base}</span>
                    <span>Receiving: ${received.toFixed(6)} ${tradeState.type === 'buy' ? currentPair.base : currentPair.quote}</span>
                </div>
            </div>
        `;
    }).join('');
    
    // Attach checkbox event listeners
    document.querySelectorAll('.order-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.orderIndex);
            tradeState.selectedOrders[index].enabled = e.target.checked;
            
            // Re-render to update totals
            displayOrdersForReview();
        });
    });
    
    console.log('[Review] Orders HTML generated, length:', ordersList.innerHTML.length);
    console.log('[Review] Totals:', { totalSpending, totalReceived });
    
    // Update summary
    const avgPrice = totalReceived > 0 ? totalSpending / totalReceived : 0;
    const spendingCurrency = tradeState.type === 'buy' ? currentPair.quote : currentPair.base;
    const receivedCurrency = tradeState.type === 'buy' ? currentPair.base : currentPair.quote;
    
    document.getElementById('review-total-spending').textContent = `${totalSpending.toFixed(6)} ${spendingCurrency}`;
    document.getElementById('review-avg-price').textContent = `${formatPrice(avgPrice)} ${currentPair.quote}`;
    document.getElementById('review-total-received').textContent = `${totalReceived.toFixed(6)} ${receivedCurrency}`;
    
    // Update execute button text
    const executeType = document.getElementById('execute-trade-type');
    if (executeType) {
        executeType.textContent = tradeState.type === 'buy' ? 'Buy' : 'Sell';
    }
}

// Show trade form (back from review)
function showTradeForm() {
    const reviewSection = document.getElementById('order-review-section');
    const tradeForm = document.getElementById('trade-form');
    
    if (reviewSection) reviewSection.style.display = 'none';
    if (tradeForm) tradeForm.style.display = 'block';
}

// Execute trade
async function executeTrade() {
    // Filter only enabled orders
    const enabledOrders = tradeState.selectedOrders?.filter(order => order.enabled) || [];
    
    if (enabledOrders.length === 0) {
        showTradeError('No orders selected. Please check at least one order to execute.');
        return;
    }
    
    if (!currentPair) {
        showTradeError('No trading pair selected');
        return;
    }
    
    const amount = parseFloat(document.getElementById('trade-amount').value);
    const price = parseFloat(document.getElementById('trade-price').value);
    
    if (!amount || amount <= 0) {
        showTradeError('Please enter a valid amount');
        return;
    }
    
    if (!price || price <= 0) {
        showTradeError('Please enter a valid price');
        return;
    }
    
    // Disable submit button
    const executeBtn = document.getElementById('execute-trade');
    if (executeBtn) {
        executeBtn.disabled = true;
        executeBtn.textContent = 'Executing...';
    }
    
    try {
        hideTradeError();
        
        // Check if using q-wallet or native session
        if (typeof window.nexus !== 'undefined' && walletConnected) {
            // Use q-wallet batch calls to execute all orders at once
            await executeTradesWithQWallet(enabledOrders);
            
            showNotification(`Successfully executed ${enabledOrders.length} order(s)!`, 'success');
            closeTradeModal();
            
            // Refresh order book and trades
            if (currentPair) {
                loadOrderBook(currentPair);
                fetchRecentTrades(currentPair.pair);
            }
        } else if (typeof isLoggedIn === 'function' && isLoggedIn()) {
            // Use native Nexus session - execute one by one
            let successCount = 0;
            let failCount = 0;
            
            for (const order of enabledOrders) {
                try {
                    await executeTradeWithSession(order, order.amountTaken, order.price);
                    successCount++;
                } catch (error) {
                    console.error(`Failed to execute order at ${order.price}:`, error);
                    failCount++;
                }
            }
            
            // Collect DIST token fee after successful trades
            if (successCount > 0) {
                try {
                    await collectTradeFee();
                    console.log('Trade fee collected successfully');
                } catch (feeError) {
                    console.warn('Failed to collect trade fee:', feeError);
                    showNotification(`${successCount} order(s) executed, but fee collection failed: ${feeError.message}`, 'warning');
                }
            }
            
            // Show results
            if (successCount > 0 && failCount === 0) {
                showNotification(`Successfully executed ${successCount} order(s)!`, 'success');
                closeTradeModal();
            } else if (successCount > 0 && failCount > 0) {
                showNotification(`Executed ${successCount} order(s), ${failCount} failed`, 'warning');
            } else {
                throw new Error('All orders failed to execute');
            }
            
            // Refresh order book and trades
            if (currentPair) {
                loadOrderBook(currentPair);
                fetchRecentTrades(currentPair.pair);
            }
        } else {
            showTradeError('Please connect your wallet or login first');
            return;
        }
        
    } catch (error) {
        console.error('Trade execution error:', error);
        showTradeError(error.message || 'Failed to execute trade');
    } finally {
        // Re-enable submit button
        if (executeBtn) {
            executeBtn.disabled = false;
            executeBtn.textContent = `Execute ${tradeState.type === 'buy' ? 'Buy' : 'Sell'}`;
        }
    }
}

// Execute trades using Q-Wallet batch calls
async function executeTradesWithQWallet(orders) {
    if (!orders || orders.length === 0) {
        throw new Error('No orders to execute');
    }
    
    // Build batch calls array - market orders + fee payment
    const calls = [];
    
    // Add market execute calls for each order
    for (const order of orders) {
        if (!order.txid) {
            throw new Error('Order transaction ID not found');
        }
        
        calls.push({
            endpoint: 'market/execute/order',
            params: {
                txid: order.txid,
                from: 'default',
                to: 'default'
            }
        });
    }
    
    // Add DIST fee payment (1 DIST token)
    // Note: executeBatchCalls already charges DIST fee, but we may need additional fee
    // Check with the team if this is needed
    
    console.log('[Trade] Executing batch calls:', calls);
    
    // Execute all calls in one batch
    const result = await window.nexus.executeBatchCalls(calls);
    
    console.log('[Trade] Batch execution result:', result);
    
    if (result.successfulCalls < calls.length) {
        throw new Error(`Only ${result.successfulCalls}/${result.totalCalls} orders executed successfully`);
    }
    
    return result;
}

// Execute trade using native Nexus session
async function executeTradeWithSession(order, amount, price) {
    const session = getSession();
    if (!session) {
        throw new Error('No active session');
    }
    
    const orderTxid = order.txid;
    if (!orderTxid) {
        throw new Error('Order transaction ID not found');
    }
    
    // Get PIN once for both trade and fee
    const pin = prompt('Enter your PIN to execute the trade (including 1 DIST fee):');
    if (!pin) {
        throw new Error('PIN required to execute trade');
    }
    
    // Temporarily cache PIN for fee collection
    sessionStorage.setItem('temp_pin', pin);
    
    // Call market/execute endpoint
    const endpoint = `${NEXUS_API_BASE}/market/execute/order`;
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            session: session.session,
            pin: pin,
            txid: orderTxid,
            from: 'default',
            to: 'default'
        })
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Failed to execute trade');
    }
    
    const result = await response.json();
    console.log('Trade executed via session:', result);
    
    // Update activity timestamp
    updateActivity();
    
    return result;
}

// Show trade error
function showTradeError(message) {
    const errorDiv = document.getElementById('trade-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

// Hide trade error
function hideTradeError() {
    const errorDiv = document.getElementById('trade-error');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

// Listen for wallet connection events (if q-wallet provides them)
if (typeof window.nexus !== 'undefined') {
    // Check connection on page load
    window.addEventListener('load', () => {
        setTimeout(updateTradeButtonVisibility, 500);
    });
}

// Update trade button when pair changes
// This will be called from state.js when selectPair is called
function onPairSelected() {
    updateTradeButtonVisibility();
}

// Collect DIST token trading fee
async function collectTradeFee() {
    // Check if using q-wallet or native session
    if (typeof window.nexus !== 'undefined' && walletConnected) {
        return await collectTradeFeeWithQWallet();
    } else if (typeof isLoggedIn === 'function' && isLoggedIn()) {
        return await collectTradeFeeWithSession();
    } else {
        throw new Error('No active wallet or session');
    }
}

// Collect trade fee using Q-Wallet
async function collectTradeFeeWithQWallet() {
    try {
        // Use Q-Wallet to send DIST tokens
        const result = await window.nexus.sendTransaction({
            from: 'default',
            to: TRADE_FEE.recipient,
            amount: TRADE_FEE.amount,
            token: TRADE_FEE.token,
            reference: `Trade fee for ${currentPair ? currentPair.pair : 'trade'}`
        });
        
        console.log('Trade fee collected via Q-Wallet:', result);
        return result;
    } catch (error) {
        console.error('Q-Wallet fee collection error:', error);
        throw new Error(`Fee collection failed: ${error.message}`);
    }
}

// Collect trade fee using native Nexus session
async function collectTradeFeeWithSession() {
    const session = getSession();
    if (!session) {
        throw new Error('No active session for fee collection');
    }
    
    try {
        // Debit DIST tokens from user's account to DIST account
        const response = await fetch(API_ENDPOINTS.debitToken, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session: session.session,
                pin: sessionStorage.getItem('temp_pin'), // Use cached PIN from trade execution
                from: `default:${TRADE_FEE.token}`, // User's DIST token account
                to: TRADE_FEE.recipient, // DIST fee recipient account
                amount: TRADE_FEE.amount,
                reference: Date.now() // Use timestamp as reference
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || 'Fee debit failed');
        }
        
        const result = await response.json();
        console.log('Trade fee collected via session:', result);
        
        // Update activity timestamp
        if (typeof updateActivity === 'function') {
            updateActivity();
        }
        
        return result;
    } catch (error) {
        console.error('Session fee collection error:', error);
        throw new Error(`Fee collection failed: ${error.message}`);
    } finally {
        // Clear cached PIN
        sessionStorage.removeItem('temp_pin');
    }
}
