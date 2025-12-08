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
            loadAvailableOrders();
        });
    });
    
    // Use market price button
    if (useMarketPriceBtn) {
        useMarketPriceBtn.addEventListener('click', () => {
            if (currentPair) {
                priceInput.value = currentPair.price;
                calculateTotal();
            }
        });
    }
    
    // Calculate total when amount or price changes
    if (amountInput) {
        amountInput.addEventListener('input', calculateTotal);
    }
    if (priceInput) {
        priceInput.addEventListener('input', calculateTotal);
    }
    
    // Handle form submission
    if (tradeForm) {
        tradeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await executeTrade();
        });
    }
}

// Update trade button visibility based on wallet connection
function updateTradeButtonVisibility() {
    const tradeBtn = document.getElementById('trade-btn');
    if (!tradeBtn) return;
    
    // Check if q-wallet is connected OR if native session is logged in
    const isWalletConnected = (typeof window.nexus !== 'undefined' && walletConnected) || (typeof isLoggedIn === 'function' && isLoggedIn());
    
    // Also check if a pair is selected
    const hasPairSelected = currentPair !== null;
    
    if (isWalletConnected && hasPairSelected) {
        tradeBtn.style.display = 'flex';
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
    
    const modal = document.getElementById('trade-modal');
    const pairName = document.getElementById('trade-pair-name');
    const currentPrice = document.getElementById('trade-current-price');
    const baseCurrency = document.getElementById('trade-base-currency');
    const quoteCurrency = document.getElementById('trade-quote-currency');
    const totalCurrency = document.getElementById('trade-total-currency');
    const priceInput = document.getElementById('trade-price');
    
    // Set pair information
    if (pairName) pairName.textContent = currentPair.pair;
    if (currentPrice) currentPrice.textContent = formatPrice(currentPair.price);
    if (baseCurrency) baseCurrency.textContent = currentPair.base;
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
}

// Calculate total value
function calculateTotal() {
    const amount = parseFloat(document.getElementById('trade-amount').value) || 0;
    const price = parseFloat(document.getElementById('trade-price').value) || 0;
    const total = amount * price;
    
    document.getElementById('trade-total-value').textContent = total.toFixed(8);
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
            const orders = data.result || [];
            
            tradeState.availableOrders = orders;
            
            if (orders.length === 0) {
                ordersList.innerHTML = '<div class="loading-orders">No orders available</div>';
                return;
            }
            
            // Display orders
            ordersList.innerHTML = '';
            orders.forEach(order => {
                const orderItem = createOrderItem(order);
                ordersList.appendChild(orderItem);
            });
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

// Execute trade
async function executeTrade() {
    if (!tradeState.selectedOrder) {
        showTradeError('Please select an order from the available orders list');
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
        if (typeof window.nexus !== 'undefined' && window.nexus.isConnected) {
            // Use q-wallet to execute trade
            await executeTradeWithQWallet(tradeState.selectedOrder, amount, price);
        } else if (isLoggedIn()) {
            // Use native Nexus session
            await executeTradeWithSession(tradeState.selectedOrder, amount, price);
        } else {
            showTradeError('Please connect your wallet or login first');
            return;
        }
        
        // Collect DIST token fee after successful trade
        try {
            await collectTradeFee();
            console.log('Trade fee collected successfully');
        } catch (feeError) {
            console.warn('Failed to collect trade fee:', feeError);
            // Don't fail the entire trade if fee collection fails
            showNotification(`Trade executed, but fee collection failed: ${feeError.message}`, 'warning');
        }
        
        // Success
        showNotification(`${tradeState.type === 'buy' ? 'Buy' : 'Sell'} order executed successfully!`, 'success');
        closeTradeModal();
        
        // Refresh order book and trades
        if (currentPair) {
            loadOrderBook(currentPair);
            fetchRecentTrades(currentPair.pair);
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

// Execute trade using q-wallet
async function executeTradeWithQWallet(order, amount, price) {
    // Use q-wallet API to execute the order
    // The order needs the txid of the order to execute
    const orderTxid = order.txid;
    
    if (!orderTxid) {
        throw new Error('Order transaction ID not found');
    }
    
    // Call market/execute endpoint through q-wallet
    const result = await window.nexus.executeMarketOrder({
        txid: orderTxid,
        from: 'default', // default account
        to: 'default',   // default account
        amount: amount
    });
    
    console.log('Trade executed via q-wallet:', result);
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
