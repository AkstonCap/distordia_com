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
    
    // Initialize inline trading panel
    initializeInlineTradingPanel();
    
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
    
    // Check if Q-Wallet is connected
    const walletConnectedCheck = typeof walletConnected !== 'undefined' ? walletConnected : false;
    const isWalletConnected = typeof window.qWallet !== 'undefined' && walletConnectedCheck;
    
    // Also check if a pair is selected
    const hasPairSelected = currentPair !== null;
    
    console.log('[Trade] Button visibility check:', {
        hasPairSelected,
        isWalletConnected,
        walletConnectedCheck,
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
    
    // Check if Q-Wallet is connected
    const walletConnectedCheck = typeof walletConnected !== 'undefined' ? walletConnected : false;
    const isWalletConnected = typeof window.qWallet !== 'undefined' && walletConnectedCheck;
    
    if (!isWalletConnected) {
        // Prompt user to connect wallet
        showNotification('Please connect your Q-Wallet to trade', 'warning');
        
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
    
    // Update fee display based on number of orders
    updateFeeDisplay(selectedOrders.length);
    
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
async function displayOrdersForReview() {
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
    
    // Hide form and trade type selector, show review
    if (tradeForm) tradeForm.style.display = 'none';
    const tradeTypeSelector = document.querySelector('.trade-type-selector');
    if (tradeTypeSelector) tradeTypeSelector.style.display = 'none';
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
    
    // Load and populate account dropdowns
    await loadAccountDropdowns();
}

// Fetch user accounts and populate dropdowns
async function loadAccountDropdowns() {
    const paymentSelect = document.getElementById('payment-account');
    const receivalSelect = document.getElementById('receival-account');
    const fromTokenSpan = document.getElementById('from-token');
    const toTokenSpan = document.getElementById('to-token');
    
    if (!paymentSelect || !receivalSelect || !currentPair) {
        console.error('[Trade] Account dropdowns not found');
        return;
    }
    
    // Update token labels based on trade type
    const fromToken = tradeState.type === 'buy' ? currentPair.quote : currentPair.base;
    const toToken = tradeState.type === 'buy' ? currentPair.base : currentPair.quote;
    
    if (fromTokenSpan) fromTokenSpan.textContent = fromToken;
    if (toTokenSpan) toTokenSpan.textContent = toToken;
    
    try {
        let accounts = [];
        
        // Check if using q-wallet
        const walletConnectedCheck = typeof walletConnected !== 'undefined' ? walletConnected : false;
        if (typeof window.qWallet !== 'undefined' && walletConnectedCheck) {
            // Use q-wallet to get accounts
            accounts = await fetchAccountsFromQWallet();
        } else {
            throw new Error('Q-Wallet not connected');
        }
        
        console.log('[Trade] Loaded accounts:', accounts);
        
        // Populate payment account dropdown (from)
        populateAccountDropdown(paymentSelect, accounts, fromToken);
        
        // Populate receival account dropdown (to)
        populateAccountDropdown(receivalSelect, accounts, toToken);
        
    } catch (error) {
        console.error('[Trade] Failed to load accounts:', error);
        paymentSelect.innerHTML = '<option value="">No accounts available</option>';
        receivalSelect.innerHTML = '<option value="">No accounts available</option>';
    }
}

// Fetch accounts from Q-Wallet
async function fetchAccountsFromQWallet() {
    try {
        // Use window.qWallet.listAccounts() to get all accounts including token accounts
        const accounts = await window.qWallet.listAccounts();
        
        console.log('[Trade] Q-Wallet accounts:', accounts);
        
        if (!accounts || accounts.length === 0) {
            // Return default account as fallback
            return [{
                name: 'default',
                token: 'NXS',
                balance: 0,
                address: 'default'
            }];
        }
        
        // Transform to simplified format
        return accounts.map(acc => ({
            name: acc.name || 'unnamed',
            token: acc.ticker || 'NXS',
            balance: acc.balance || 0,
            address: acc.address || acc.name
        }));
    } catch (error) {
        console.error('[Trade] Q-Wallet account fetch error:', error);
        throw error;
    }
}

// Populate a dropdown with account options
function populateAccountDropdown(selectElement, accounts, filterToken) {
    // Clear existing options
    selectElement.innerHTML = '';
    
    // Filter accounts by token type
    const filteredAccounts = accounts.filter(acc => 
        acc.token === filterToken || 
        (filterToken === 'NXS' && !acc.token) ||
        acc.token === '0' // NXS accounts have token = 0
    );
    
    // If no filtered accounts, show all and add warning
    if (filteredAccounts.length === 0) {
        console.warn(`[Trade] No ${filterToken} accounts found, showing all accounts`);
        filteredAccounts.push(...accounts);
    }
    
    // Add default option if exists
    const defaultAccount = filteredAccounts.find(acc => acc.name === 'default');
    if (defaultAccount) {
        const option = document.createElement('option');
        option.value = defaultAccount.name;
        option.textContent = `default (Balance: ${defaultAccount.balance.toFixed(2)} ${defaultAccount.token})`;
        selectElement.appendChild(option);
    }
    
    // Add other accounts
    filteredAccounts.forEach(account => {
        if (account.name === 'default') return; // Already added
        
        const option = document.createElement('option');
        option.value = account.name;
        option.textContent = `${account.name} (Balance: ${account.balance.toFixed(2)} ${account.token})`;
        selectElement.appendChild(option);
    });
    
    // If no accounts at all, add a placeholder
    if (selectElement.options.length === 0) {
        const option = document.createElement('option');
        option.value = 'default';
        option.textContent = 'default (account)';
        selectElement.appendChild(option);
    }
}

// Show trade form (back from review)
function showTradeForm() {
    const reviewSection = document.getElementById('order-review-section');
    const tradeForm = document.getElementById('trade-form');
    const tradeTypeSelector = document.querySelector('.trade-type-selector');
    
    if (reviewSection) reviewSection.style.display = 'none';
    if (tradeForm) tradeForm.style.display = 'block';
    if (tradeTypeSelector) tradeTypeSelector.style.display = 'flex';
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
        
        // Check if Q-Wallet is connected
        const walletConnectedCheck = typeof walletConnected !== 'undefined' ? walletConnected : false;
        if (typeof window.qWallet !== 'undefined' && walletConnectedCheck) {
            // Use Q-Wallet batch calls to execute all orders at once
            await executeTradesWithQWallet(enabledOrders);
            
            showNotification(`Successfully executed ${enabledOrders.length} order(s)!`, 'success');
            closeTradeModal();
            
            // Refresh order book and trades
            if (currentPair) {
                loadOrderBook(currentPair);
                fetchRecentTrades(currentPair.pair);
            }
        } else {
            showTradeError('Please connect your Q-Wallet first');
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
    
    // Get selected accounts from dropdowns
    const paymentAccount = document.getElementById('payment-account')?.value || 'default';
    const receivalAccount = document.getElementById('receival-account')?.value || 'default';
    
    if (!paymentAccount || !receivalAccount) {
        throw new Error('Please select both payment and receival accounts');
    }
    
    console.log('[Trade] Using accounts:', { from: paymentAccount, to: receivalAccount });
    
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
                from: paymentAccount,
                to: receivalAccount
            }
        });
    }
    
    // Calculate estimated fee for user info
    const estimatedFee = calculateBatchFee(calls.length);
    console.log(`[Trade] Executing ${calls.length} orders, estimated fee: ${estimatedFee} NXS`);
    
    console.log('[Trade] Executing batch calls:', calls);
    
    // Execute all calls in one batch
    const result = await window.qWallet.executeBatchCalls(calls);
    
    console.log('[Trade] Batch execution result:', result);
    
    if (result.successfulCalls < calls.length) {
        throw new Error(`Only ${result.successfulCalls}/${result.totalCalls} orders executed successfully`);
    }
    
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
if (typeof window.qWallet !== 'undefined') {
    // Check connection on page load
    window.addEventListener('load', () => {
        setTimeout(updateTradeButtonVisibility, 500);
    });
}

// Update trade button when pair changes
// This will be called from state.js when selectPair is called
function onPairSelected() {
    updateTradeButtonVisibility();
    
    // Update inline trading panel for new pair
    if (typeof updateInlinePanelForPair === 'function') {
        updateInlinePanelForPair();
    }
}

// Calculate and display estimated network fee for batch operations
function updateFeeDisplay(orderCount) {
    const feeEstimate = calculateBatchFee(orderCount);
    const fillFeeEl = document.getElementById('fill-fee-estimate');
    const tradeFeeEl = document.getElementById('trade-fee-display');
    
    let feeText;
    if (orderCount <= 1) {
        feeText = 'Free for 1 order';
    } else {
        feeText = `~${feeEstimate.toFixed(2)} NXS (${orderCount} orders)`;
    }
    
    if (fillFeeEl) fillFeeEl.textContent = feeText;
    if (tradeFeeEl) tradeFeeEl.textContent = feeText;
}


// ====================================
// INLINE TRADING PANEL
// ====================================

// Inline trading panel state
let inlineTrade = {
    mode: 'fill', // 'fill' or 'create'
    createSide: 'bid', // 'bid' or 'ask'
    selectedOrders: [], // Array of selected order objects
    price: 0,
    amount: 0
};

// Initialize inline trading panel
function initializeInlineTradingPanel() {
    console.log('[InlineTrade] Initializing inline trading panel');
    
    // Mode tabs (Fill Orders / Create Order)
    const orderTypeTabs = document.querySelectorAll('.order-type-tab');
    orderTypeTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            orderTypeTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            inlineTrade.mode = tab.dataset.type;
            updateTradeModeDisplay();
        });
    });
    
    // Create Order: Bid/Ask toggle
    const tradeSideBtns = document.querySelectorAll('.trade-side-btn');
    tradeSideBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tradeSideBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            inlineTrade.createSide = btn.dataset.side;
            updateCreateOrderPanel();
        });
    });
    
    // Quick price buttons
    const bestBidBtn = document.getElementById('best-bid-btn');
    const bestAskBtn = document.getElementById('best-ask-btn');
    
    if (bestBidBtn) {
        bestBidBtn.addEventListener('click', () => {
            const bid = getHighestBid();
            if (bid) {
                document.getElementById('inline-price').value = bid;
                calculateInlineTotal();
            }
        });
    }
    
    if (bestAskBtn) {
        bestAskBtn.addEventListener('click', () => {
            const ask = getLowestAsk();
            if (ask) {
                document.getElementById('inline-price').value = ask;
                calculateInlineTotal();
            }
        });
    }
    
    // Quick amount buttons
    const quickAmountBtns = document.querySelectorAll('.quick-amount-btn');
    quickAmountBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            quickAmountBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const percent = parseInt(btn.dataset.percent);
            await setAmountByPercent(percent);
        });
    });
    
    // Price and amount input handlers
    const priceInput = document.getElementById('inline-price');
    const amountInput = document.getElementById('inline-amount');
    
    if (priceInput) {
        priceInput.addEventListener('input', calculateInlineTotal);
    }
    
    if (amountInput) {
        amountInput.addEventListener('input', calculateInlineTotal);
    }
    
    // Clear selection button
    const clearSelectionBtn = document.getElementById('clear-selection-btn');
    if (clearSelectionBtn) {
        clearSelectionBtn.addEventListener('click', clearSelectedOrders);
    }
    
    // Fill orders button
    const fillOrdersBtn = document.getElementById('fill-orders-btn');
    if (fillOrdersBtn) {
        fillOrdersBtn.addEventListener('click', executeSelectedOrders);
    }
    
    // Create order button
    const createOrderBtn = document.getElementById('create-order-btn');
    if (createOrderBtn) {
        createOrderBtn.addEventListener('click', createNewOrder);
    }
    
    // Overlay connect button
    const overlayConnectBtn = document.getElementById('overlay-connect-btn');
    if (overlayConnectBtn) {
        overlayConnectBtn.addEventListener('click', () => {
            if (typeof connectWallet === 'function') {
                connectWallet();
            }
        });
    }
    
    // Update panel visibility
    updateTradingPanelOverlay();
    
    // Make order book rows clickable for order selection
    setupOrderBookClickHandlers();
}

// Update trading panel overlay based on wallet connection
function updateTradingPanelOverlay() {
    const overlay = document.getElementById('trading-panel-overlay');
    if (!overlay) return;
    
    const walletConnectedCheck = typeof walletConnected !== 'undefined' ? walletConnected : false;
    const isWalletConnected = typeof window.qWallet !== 'undefined' && walletConnectedCheck;
    
    if (isWalletConnected) {
        overlay.classList.add('hidden');
        // Load balance when connected
        loadUserBalance();
    } else {
        overlay.classList.remove('hidden');
    }
}

// Switch between Fill and Create modes
function updateTradeModeDisplay() {
    const fillMode = document.getElementById('fill-mode');
    const createMode = document.getElementById('create-mode');
    
    if (inlineTrade.mode === 'fill') {
        if (fillMode) fillMode.style.display = 'block';
        if (createMode) createMode.style.display = 'none';
    } else {
        if (fillMode) fillMode.style.display = 'none';
        if (createMode) createMode.style.display = 'block';
        loadUserBalance();
    }
}

// Update create order panel for bid/ask change
function updateCreateOrderPanel() {
    const createOrderBtn = document.getElementById('create-order-btn');
    const btnText = createOrderBtn?.querySelector('.btn-text');
    const orderTypeDisplay = document.getElementById('order-type-display');
    
    if (createOrderBtn) {
        createOrderBtn.classList.remove('buy', 'sell');
        createOrderBtn.classList.add(inlineTrade.createSide === 'bid' ? 'buy' : 'sell');
    }
    
    if (btnText) {
        btnText.textContent = inlineTrade.createSide === 'bid' ? 'Place Bid Order' : 'Place Ask Order';
    }
    
    if (orderTypeDisplay) {
        orderTypeDisplay.textContent = inlineTrade.createSide === 'bid' ? 'Limit Bid' : 'Limit Ask';
    }
    
    loadUserBalance();
    calculateInlineTotal();
}

// Update inline panel when pair changes
function updateInlinePanelForPair() {
    if (!currentPair) return;
    
    const [baseToken, quoteToken] = currentPair.pair.split('/');
    
    // Update suffixes
    const priceSuffix = document.getElementById('price-suffix');
    const amountSuffix = document.getElementById('amount-suffix');
    const totalSuffix = document.getElementById('total-suffix');
    
    // Update fill mode tokens
    const fillAmountToken = document.getElementById('fill-amount-token');
    const fillCostToken = document.getElementById('fill-cost-token');
    
    if (priceSuffix) priceSuffix.textContent = quoteToken;
    if (amountSuffix) amountSuffix.textContent = baseToken;
    if (totalSuffix) totalSuffix.textContent = quoteToken;
    if (fillAmountToken) fillAmountToken.textContent = baseToken;
    if (fillCostToken) fillCostToken.textContent = quoteToken;
    
    // Set initial price from best order
    const priceInput = document.getElementById('inline-price');
    if (priceInput) {
        if (inlineTrade.createSide === 'bid') {
            const bid = getHighestBid();
            if (bid) priceInput.value = bid;
        } else {
            const ask = getLowestAsk();
            if (ask) priceInput.value = ask;
        }
    }
    
    // Clear selected orders when pair changes
    clearSelectedOrders();
    
    // Load balance
    loadUserBalance();
    calculateInlineTotal();
}

// Load user balance for current pair (for Create Order mode)
async function loadUserBalance() {
    const balanceValue = document.getElementById('available-balance');
    const balanceToken = document.getElementById('balance-token');
    
    if (!balanceValue || !balanceToken) return;
    
    // Check wallet connection
    const walletConnectedCheck = typeof walletConnected !== 'undefined' ? walletConnected : false;
    if (!walletConnectedCheck || !currentPair) {
        balanceValue.textContent = '-';
        balanceToken.textContent = '-';
        return;
    }
    
    const [baseToken, quoteToken] = currentPair.pair.split('/');
    // For bids, we spend quote currency; for asks, we spend base currency
    const relevantToken = inlineTrade.createSide === 'bid' ? quoteToken : baseToken;
    
    try {
        // Try to get balance from Q-Wallet
        if (typeof window.qWallet !== 'undefined') {
            const accounts = await window.qWallet.listAccounts();
            if (accounts) {
                // Find the relevant token account
                const tokenAccount = accounts.find(acc => 
                    acc.ticker === relevantToken || 
                    acc.token_name === relevantToken ||
                    (relevantToken === 'NXS' && acc.token === '0')
                );
                
                if (tokenAccount) {
                    const balance = parseFloat(tokenAccount.balance || 0);
                    balanceValue.textContent = balance.toFixed(4);
                    balanceToken.textContent = relevantToken;
                    return;
                }
            }
        }
        
        balanceValue.textContent = '0.0000';
        balanceToken.textContent = relevantToken;
    } catch (error) {
        console.error('[InlineTrade] Error loading balance:', error);
        balanceValue.textContent = '-';
        balanceToken.textContent = relevantToken;
    }
}

// Set amount by percentage of balance (for Create Order mode)
async function setAmountByPercent(percent) {
    const balanceText = document.getElementById('available-balance')?.textContent;
    const balance = parseFloat(balanceText) || 0;
    
    if (balance <= 0) return;
    
    const amountInput = document.getElementById('inline-amount');
    const priceInput = document.getElementById('inline-price');
    
    if (!amountInput) return;
    
    if (inlineTrade.createSide === 'bid') {
        // For bid: balance is in quote currency, need to calculate base amount
        const price = parseFloat(priceInput?.value) || 0;
        if (price > 0) {
            const maxSpend = balance * (percent / 100);
            const amount = maxSpend / price;
            amountInput.value = amount.toFixed(6);
        }
    } else {
        // For ask: balance is in base currency
        const amount = balance * (percent / 100);
        amountInput.value = amount.toFixed(6);
    }
    
    calculateInlineTotal();
}

// Calculate and display total (for Create Order mode)
function calculateInlineTotal() {
    const priceInput = document.getElementById('inline-price');
    const amountInput = document.getElementById('inline-amount');
    const totalDisplay = document.getElementById('inline-total');
    
    const price = parseFloat(priceInput?.value) || 0;
    const amount = parseFloat(amountInput?.value) || 0;
    
    const total = price * amount;
    
    if (totalDisplay) {
        totalDisplay.textContent = total.toFixed(4);
    }
    
    inlineTrade.price = price;
    inlineTrade.amount = amount;
}

// Setup order book click handlers to SELECT orders (not just fill price)
function setupOrderBookClickHandlers() {
    const asksContainer = document.getElementById('orderbook-asks');
    const bidsContainer = document.getElementById('orderbook-bids');
    
    const handleRowClick = (e, orderType) => {
        const row = e.target.closest('.orderbook-row');
        if (!row) return;
        
        // Extract order data from the row
        const spans = row.querySelectorAll('span');
        if (spans.length < 3) return;
        
        const price = parseFloat(spans[0].textContent.replace(/,/g, ''));
        const amount = parseFloat(spans[1].textContent.replace(/,/g, ''));
        const total = parseFloat(spans[2].textContent.replace(/,/g, ''));
        
        // Get txids from data attribute
        const txidsStr = row.getAttribute('data-txids') || '';
        const txids = txidsStr ? txidsStr.split(',').filter(t => t.length > 0) : [];
        
        if (isNaN(price) || isNaN(amount)) return;
        
        // Check if in Fill mode
        if (inlineTrade.mode === 'fill') {
            // Toggle selection
            const orderId = `${orderType}-${price}-${amount}`;
            const existingIndex = inlineTrade.selectedOrders.findIndex(o => o.id === orderId);
            
            if (existingIndex >= 0) {
                // Deselect
                inlineTrade.selectedOrders.splice(existingIndex, 1);
                row.classList.remove('selected');
            } else {
                // Select
                inlineTrade.selectedOrders.push({
                    id: orderId,
                    type: orderType,
                    price: price,
                    amount: amount,
                    total: total,
                    txids: txids,
                    row: row
                });
                row.classList.add('selected');
            }
            
            updateSelectedOrdersDisplay();
        } else {
            // In Create mode, just fill the price input
            const priceInput = document.getElementById('inline-price');
            if (priceInput) {
                priceInput.value = price;
                calculateInlineTotal();
            }
        }
    };
    
    if (asksContainer) {
        asksContainer.addEventListener('click', (e) => handleRowClick(e, 'ask'));
    }
    
    if (bidsContainer) {
        bidsContainer.addEventListener('click', (e) => handleRowClick(e, 'bid'));
    }
}

// Clear all selected orders
function clearSelectedOrders() {
    // Remove visual selection
    inlineTrade.selectedOrders.forEach(order => {
        if (order.row) {
            order.row.classList.remove('selected');
        }
    });
    
    // Also check for any remaining selected rows
    document.querySelectorAll('.orderbook-row.selected').forEach(row => {
        row.classList.remove('selected');
    });
    
    inlineTrade.selectedOrders = [];
    updateSelectedOrdersDisplay();
}

// Update the selected orders display
function updateSelectedOrdersDisplay() {
    const listContainer = document.getElementById('selected-orders-list');
    const summary = document.getElementById('fill-summary');
    const accountSelection = document.getElementById('account-selection');
    const fillBtn = document.getElementById('fill-orders-btn');
    const btnText = fillBtn?.querySelector('.btn-text');
    
    if (!listContainer) return;
    
    if (inlineTrade.selectedOrders.length === 0) {
        listContainer.innerHTML = '<div class="no-orders-selected">No orders selected</div>';
        if (summary) summary.style.display = 'none';
        if (accountSelection) accountSelection.style.display = 'none';
        if (fillBtn) fillBtn.disabled = true;
        if (btnText) btnText.textContent = 'Select Orders to Fill';
        return;
    }
    
    // Build selected orders list
    const [baseToken, quoteToken] = currentPair?.pair.split('/') || ['-', '-'];
    
    listContainer.innerHTML = inlineTrade.selectedOrders.map(order => `
        <div class="selected-order-item" data-order-id="${order.id}">
            <div class="selected-order-info">
                <span class="selected-order-type ${order.type}">${order.type === 'ask' ? 'Buy' : 'Sell'}</span>
                <span class="selected-order-details">
                    <strong>${order.amount.toFixed(4)}</strong> ${baseToken} @ <strong>${order.price.toFixed(8)}</strong> ${quoteToken}
                </span>
            </div>
            <button class="remove-order-btn" onclick="removeSelectedOrder('${order.id}')" title="Remove">×</button>
        </div>
    `).join('');
    
    // Calculate totals
    let totalAmount = 0;
    let totalCost = 0;
    
    inlineTrade.selectedOrders.forEach(order => {
        totalAmount += order.amount;
        totalCost += order.total;
    });
    
    const avgPrice = totalAmount > 0 ? totalCost / totalAmount : 0;
    
    // Update summary
    document.getElementById('fill-order-count').textContent = inlineTrade.selectedOrders.length;
    document.getElementById('fill-total-amount').textContent = totalAmount.toFixed(4);
    document.getElementById('fill-total-cost').textContent = totalCost.toFixed(4);
    document.getElementById('fill-avg-price').textContent = avgPrice.toFixed(8) + ' ' + quoteToken;
    
    // Update fee display based on order count
    const feeEstimateEl = document.getElementById('fill-fee-estimate');
    if (feeEstimateEl) {
        const orderCount = inlineTrade.selectedOrders.length;
        if (orderCount <= 1) {
            feeEstimateEl.textContent = 'Free for 1 order';
        } else {
            const estimatedFee = calculateBatchFee(orderCount);
            feeEstimateEl.textContent = `~${estimatedFee.toFixed(2)} NXS (${orderCount} orders)`;
        }
    }
    
    if (summary) summary.style.display = 'block';
    
    // Show account selection
    if (accountSelection) {
        accountSelection.style.display = 'block';
        loadUserAccounts();
    }
    
    // Update button
    if (fillBtn) fillBtn.disabled = false;
    
    // Determine if we're buying or selling based on selected orders
    const hasBids = inlineTrade.selectedOrders.some(o => o.type === 'bid');
    const hasAsks = inlineTrade.selectedOrders.some(o => o.type === 'ask');
    
    if (fillBtn) {
        fillBtn.classList.remove('buy', 'sell');
        if (hasAsks && !hasBids) {
            fillBtn.classList.add('buy');
            if (btnText) btnText.textContent = `Buy ${totalAmount.toFixed(4)} ${baseToken}`;
        } else if (hasBids && !hasAsks) {
            fillBtn.classList.add('sell');
            if (btnText) btnText.textContent = `Sell ${totalAmount.toFixed(4)} ${baseToken}`;
        } else {
            fillBtn.classList.add('buy');
            if (btnText) btnText.textContent = `Fill ${inlineTrade.selectedOrders.length} Orders`;
        }
    }
}

// Remove a single selected order
function removeSelectedOrder(orderId) {
    const index = inlineTrade.selectedOrders.findIndex(o => o.id === orderId);
    if (index >= 0) {
        const order = inlineTrade.selectedOrders[index];
        if (order.row) {
            order.row.classList.remove('selected');
        }
        inlineTrade.selectedOrders.splice(index, 1);
        updateSelectedOrdersDisplay();
    }
}

// Execute selected orders
async function executeSelectedOrders() {
    if (inlineTrade.selectedOrders.length === 0) {
        showInlineError('No orders selected');
        return;
    }
    
    // Check if Q-Wallet is available
    if (typeof window.qWallet === 'undefined') {
        showInlineError('Q-Wallet extension not found. Please install Q-Wallet.');
        return;
    }
    
    // Get selected accounts
    const fromAccount = document.getElementById('from-account')?.value;
    const toAccount = document.getElementById('to-account')?.value;
    
    if (!fromAccount || !toAccount) {
        showInlineError('Please select both payment and receiving accounts');
        return;
    }
    
    const fillBtn = document.getElementById('fill-orders-btn');
    const btnText = fillBtn?.querySelector('.btn-text');
    const originalText = btnText?.textContent;
    
    if (fillBtn) {
        fillBtn.disabled = true;
        if (btnText) btnText.textContent = 'Processing...';
    }
    
    hideInlineError();
    
    try {
        // Build batch API calls for executing all selected orders
        // Each selected order may contain multiple txids if aggregated at same price
        const calls = [];
        
        inlineTrade.selectedOrders.forEach(order => {
            if (order.txids && order.txids.length > 0) {
                // For each txid in the order (usually 1, but may be multiple if aggregated)
                order.txids.forEach(txid => {
                    calls.push({
                        endpoint: 'market/execute/order',
                        params: {
                            txid: txid,
                            from: fromAccount,
                            to: toAccount
                        }
                    });
                });
            }
        });
        
        if (calls.length === 0) {
            throw new Error('No valid order IDs found. Orders may not have transaction data.');
        }
        
        console.log('[InlineTrade] Executing orders via Q-Wallet batch call:', calls);
        
        // Execute all orders in one batch via Q-Wallet
        const result = await window.qWallet.executeBatchCalls(calls);
        
        console.log('[InlineTrade] Execution result:', result);
        
        if (result.successfulCalls > 0) {
            showNotification(`Successfully executed ${result.successfulCalls} of ${result.totalCalls} orders`, 'success');
            
            // Clear selections and refresh order book
            clearSelectedOrders();
            setTimeout(() => {
                if (currentPair) {
                    loadOrderBook(currentPair.market);
                }
            }, 2000);
        } else {
            throw new Error('No orders were executed successfully');
        }
        
    } catch (error) {
        console.error('[InlineTrade] Error executing orders:', error);
        showInlineError(error.message || 'Failed to execute orders');
    } finally {
        if (fillBtn) {
            fillBtn.disabled = false;
            if (btnText) btnText.textContent = originalText;
        }
    }
}

// Load user accounts from Nexus blockchain
async function loadUserAccounts() {
    const fromSelect = document.getElementById('from-account');
    const toSelect = document.getElementById('to-account');
    
    if (!fromSelect || !toSelect) return;
    
    // Check if Q-Wallet is connected
    if (typeof window.qWallet === 'undefined' || !window.qWallet.isConnected) {
        console.log('[Accounts] Q-Wallet not connected, using default accounts only');
        return;
    }
    
    try {
        // Fetch user accounts via Q-Wallet
        const accounts = await window.qWallet.listAccounts();
        console.log('[Accounts] Loaded accounts:', accounts);
        
        // Clear existing options except default
        fromSelect.innerHTML = '<option value="">Select payment account...</option><option value="default">default</option>';
        toSelect.innerHTML = '<option value="">Select receiving account...</option><option value="default">default</option>';
        
        // Add account options
        if (Array.isArray(accounts)) {
            accounts.forEach(account => {
                const name = account.name || account.address || 'Unnamed Account';
                const value = account.name || account.address;
                const balance = account.balance ? ` (${account.balance.toFixed(4)} ${account.ticker || ''})` : '';
                
                const option = new Option(`${name}${balance}`, value);
                fromSelect.add(option.cloneNode(true));
                toSelect.add(option);
            });
        }
    } catch (error) {
        console.error('[Accounts] Error loading accounts:', error);
        // Keep default options if loading fails
    }
}

// Create a new order (bid or ask)
async function createNewOrder() {
    if (!currentPair) {
        showInlineError('Please select a trading pair');
        return;
    }
    
    // Check wallet connection
    if (!window.qWallet || typeof window.qWallet.executeBatchCalls !== 'function') {
        showInlineError('Please connect your Q-Wallet first');
        return;
    }
    
    const price = parseFloat(document.getElementById('inline-price')?.value) || 0;
    const amount = parseFloat(document.getElementById('inline-amount')?.value) || 0;
    
    if (price <= 0) {
        showInlineError('Please enter a valid price');
        return;
    }
    
    if (amount <= 0) {
        showInlineError('Please enter a valid amount');
        return;
    }
    
    const createBtn = document.getElementById('create-order-btn');
    const btnText = createBtn?.querySelector('.btn-text');
    const originalText = btnText?.textContent;
    
    if (createBtn) {
        createBtn.disabled = true;
        if (btnText) btnText.textContent = 'Creating...';
    }
    
    hideInlineError();
    
    try {
        // Get selected accounts from dropdowns
        const paymentAccount = document.getElementById('payment-account')?.value || 'default';
        const receivalAccount = document.getElementById('receival-account')?.value || 'default';
        
        if (!paymentAccount || !receivalAccount) {
            throw new Error('Please select both payment and receival accounts');
        }
        
        const [baseToken, quoteToken] = currentPair.pair.split('/');
        const orderType = inlineTrade.createSide === 'bid' ? 'Bid' : 'Ask';
        const endpoint = inlineTrade.createSide === 'bid' ? 'market/create/bid' : 'market/create/ask';
        
        console.log(`[InlineTrade] Creating ${orderType} order:`, {
            market: currentPair.pair,
            price,
            amount,
            from: paymentAccount,
            to: receivalAccount
        });
        
        // Execute order creation via Q-Wallet
        const result = await window.qWallet.executeBatchCalls([{
            endpoint: endpoint,
            params: {
                market: currentPair.pair,
                price: price,
                amount: amount,
                from: paymentAccount,
                to: receivalAccount
            }
        }]);
        
        console.log('[InlineTrade] Order creation result:', result);
        
        if (result.successfulCalls === 1) {
            showInlineError(`${orderType} order created successfully!`);
            // Clear the form
            document.getElementById('inline-price').value = '';
            document.getElementById('inline-amount').value = '';
            updateInlineTotal();
            
            // Refresh order book after short delay
            setTimeout(() => {
                if (currentPair) {
                    fetchOrderBook(currentPair.pair);
                }
            }, 2000);
        } else {
            throw new Error(`Failed to create ${orderType.toLowerCase()} order`);
        }
        
    } catch (error) {
        console.error('[InlineTrade] Error creating order:', error);
        showInlineError(error.message || 'Failed to create order');
    } finally {
        if (createBtn) {
            createBtn.disabled = false;
            if (btnText) btnText.textContent = originalText;
        }
    }
}

// Show inline error
function showInlineError(message) {
    const errorDisplay = document.getElementById('inline-trade-error');
    if (errorDisplay) {
        errorDisplay.textContent = message;
        errorDisplay.style.display = 'block';
    }
}

// Hide inline error
function hideInlineError() {
    const errorDisplay = document.getElementById('inline-trade-error');
    if (errorDisplay) {
        errorDisplay.style.display = 'none';
    }
}