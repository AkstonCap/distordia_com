// Swap Service JavaScript

// Configuration
const EXCHANGE_RATE = 1.0; // 1:1 ratio
const BRIDGE_FEE_PERCENT = 0.5; // 0.5%
const NETWORK_FEE_SOL = 0.001; // Estimated Solana network fee

// State
let walletConnected = false;
let solanaWallet = null;
let nexusWallet = null;
let fromAmount = 0;
let toAmount = 0;

// DOM Elements (swap interface buttons)
const connectWalletBtn = document.getElementById('connect-wallet-btn');
const swapBtn = document.getElementById('swap-btn');
const fromAmountInput = document.getElementById('from-amount');
const toAmountInput = document.getElementById('to-amount');
const maxBtn = document.getElementById('max-btn');
const swapDirectionBtn = document.getElementById('swap-direction-btn');
const walletInfo = document.getElementById('wallet-info');

// Navbar wallet elements
const navConnectBtn = document.getElementById('connectWalletBtn');
const navWalletInfo = document.getElementById('walletInfo');
const navWalletAddress = document.getElementById('walletAddress');
const navDisconnectBtn = document.getElementById('disconnectBtn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('Distordia Swap initialized');
    setupEventListeners();
    checkExistingConnection();
});

// Check for existing Q-Wallet connection
async function checkExistingConnection() {
    if (typeof window.qWallet !== 'undefined') {
        try {
            const accounts = await window.qWallet.getAccounts();
            if (accounts && accounts.length > 0) {
                nexusWallet = accounts[0];
                updateNavWalletUI(accounts[0]);
            }
        } catch (error) {
            console.log('No existing Q-Wallet connection');
        }
    }
}

// Event Listeners
function setupEventListeners() {
    // Swap interface connect wallet button
    connectWalletBtn.addEventListener('click', connectWallets);
    
    // Navbar wallet buttons
    if (navConnectBtn) {
        navConnectBtn.addEventListener('click', connectQWallet);
    }
    if (navDisconnectBtn) {
        navDisconnectBtn.addEventListener('click', disconnectQWallet);
    }
    
    // Amount input
    fromAmountInput.addEventListener('input', handleAmountInput);
    
    // Max button
    maxBtn.addEventListener('click', setMaxAmount);
    
    // Swap direction button
    swapDirectionBtn.addEventListener('click', swapDirection);
    
    // Swap button
    swapBtn.addEventListener('click', executeSwap);
    
    // Info button
    const infoBtn = document.getElementById('infoBtn');
    if (infoBtn) {
        infoBtn.addEventListener('click', openInfoModal);
    }
}

// Connect Q-Wallet (navbar button)
async function connectQWallet() {
    if (typeof window.qWallet === 'undefined') {
        alert('Q-Wallet extension not found. Please install Q-Wallet to connect your Nexus wallet.');
        return;
    }

    try {
        const accounts = await window.qWallet.connect();
        if (accounts && accounts.length > 0) {
            nexusWallet = accounts[0];
            updateNavWalletUI(accounts[0]);
            console.log('Q-Wallet connected:', accounts[0]);
        }
    } catch (error) {
        console.error('Q-Wallet connection failed:', error);
        alert('Failed to connect Q-Wallet. Please try again.');
    }
}

// Disconnect Q-Wallet
async function disconnectQWallet() {
    try {
        if (typeof window.qWallet !== 'undefined' && window.qWallet.disconnect) {
            await window.qWallet.disconnect();
        }
    } catch (error) {
        console.error('Error disconnecting Q-Wallet:', error);
    }
    
    nexusWallet = null;
    
    // Update navbar UI
    if (navConnectBtn) navConnectBtn.style.display = 'block';
    if (navWalletInfo) navWalletInfo.style.display = 'none';
    
    // Update swap UI if connected
    if (walletConnected) {
        document.getElementById('nexus-address').textContent = '--';
    }
}

// Update navbar wallet UI
function updateNavWalletUI(address) {
    if (navConnectBtn) navConnectBtn.style.display = 'none';
    if (navWalletInfo) navWalletInfo.style.display = 'flex';
    if (navWalletAddress) navWalletAddress.textContent = `${address.slice(0, 8)}...${address.slice(-6)}`;
}

// Info Modal functions
function openInfoModal() {
    const modal = document.getElementById('infoModal');
    if (modal) {
        modal.classList.add('show');
    }
}

function closeInfoModal() {
    const modal = document.getElementById('infoModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Connect Wallets (swap interface button)
async function connectWallets() {
    try {
        console.log('Connecting wallets...');
        
        // Check for Phantom wallet (Solana)
        const { solana } = window;
        
        if (!solana || !solana.isPhantom) {
            alert('Please install Phantom wallet to use this service.\n\nVisit: https://phantom.app');
            return;
        }
        
        // Connect Solana wallet
        const solanaResponse = await solana.connect();
        solanaWallet = solanaResponse.publicKey.toString();
        console.log('Solana wallet connected:', solanaWallet);
        
        // For Nexus wallet, use Q-Wallet if available, otherwise prompt
        if (!nexusWallet) {
            if (typeof window.qWallet !== 'undefined') {
                try {
                    const accounts = await window.qWallet.connect();
                    if (accounts && accounts.length > 0) {
                        nexusWallet = accounts[0];
                        updateNavWalletUI(accounts[0]);
                    }
                } catch (error) {
                    console.log('Q-Wallet connection failed, falling back to manual entry');
                    nexusWallet = prompt('Enter your Nexus wallet address:');
                }
            } else {
                // Fallback to manual address entry
                nexusWallet = prompt('Enter your Nexus wallet address:\n\n(Install Q-Wallet extension for automatic connection)');
            }
        }
        
        if (!nexusWallet) {
            alert('Nexus wallet address is required');
            return;
        }
        
        // Update UI
        walletConnected = true;
        updateWalletUI();
        
        // Load balances
        await loadBalances();
        
    } catch (error) {
        console.error('Error connecting wallets:', error);
        alert('Failed to connect wallets. Please try again.');
    }
}

// Update Wallet UI
function updateWalletUI() {
    if (walletConnected) {
        // Hide connect button, show swap button
        connectWalletBtn.style.display = 'none';
        swapBtn.style.display = 'block';
        walletInfo.style.display = 'block';
        
        // Display wallet addresses
        document.getElementById('solana-address').textContent = truncateAddress(solanaWallet);
        document.getElementById('nexus-address').textContent = truncateAddress(nexusWallet);
        
        // Update swap button text
        updateSwapButton();
    }
}

// Truncate address for display
function truncateAddress(address) {
    if (!address) return '--';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Load Balances
async function loadBalances() {
    try {
        // In production, fetch real balances from Solana and Nexus
        // For now, using placeholder values
        const usdcBalance = 1000.00; // Placeholder
        const usddBalance = 500.00; // Placeholder
        
        document.getElementById('usdc-balance').textContent = `Balance: ${usdcBalance.toFixed(2)} USDC`;
        document.getElementById('usdd-balance').textContent = `Balance: ${usddBalance.toFixed(2)} USDD`;
        
        console.log('Balances loaded');
    } catch (error) {
        console.error('Error loading balances:', error);
    }
}

// Handle Amount Input
function handleAmountInput(event) {
    const value = event.target.value;
    
    // Validate input (only numbers and decimal point)
    const validValue = value.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = validValue.split('.');
    if (parts.length > 2) {
        event.target.value = parts[0] + '.' + parts[1];
        return;
    }
    
    event.target.value = validValue;
    fromAmount = parseFloat(validValue) || 0;
    
    // Calculate output amount
    calculateOutputAmount();
    
    // Update swap button
    updateSwapButton();
}

// Calculate Output Amount
function calculateOutputAmount() {
    if (fromAmount <= 0) {
        toAmount = 0;
        toAmountInput.value = '';
        updateSwapDetails(0, 0, 0);
        return;
    }
    
    // Calculate fees and output
    const bridgeFee = fromAmount * (BRIDGE_FEE_PERCENT / 100);
    const afterFee = fromAmount - bridgeFee;
    toAmount = afterFee * EXCHANGE_RATE;
    
    // Update UI
    toAmountInput.value = toAmount.toFixed(6);
    updateSwapDetails(bridgeFee, NETWORK_FEE_SOL, toAmount);
}

// Update Swap Details
function updateSwapDetails(bridgeFee, networkFee, receiveAmount) {
    document.getElementById('exchange-rate').textContent = `1 USDC = ${EXCHANGE_RATE} USDD`;
    document.getElementById('bridge-fee').textContent = `${bridgeFee.toFixed(4)} USDC (${BRIDGE_FEE_PERCENT}%)`;
    document.getElementById('network-fee').textContent = `~${networkFee} SOL`;
    document.getElementById('receive-amount').textContent = `${receiveAmount.toFixed(6)} USDD`;
}

// Set Max Amount
function setMaxAmount() {
    // In production, get real balance
    const maxBalance = 1000.00; // Placeholder
    fromAmountInput.value = maxBalance.toFixed(2);
    fromAmount = maxBalance;
    calculateOutputAmount();
    updateSwapButton();
}

// Swap Direction (Future feature for reverse swap)
function swapDirection() {
    alert('Reverse swap (USDD → USDC) coming soon!');
}

// Update Swap Button
function updateSwapButton() {
    if (!walletConnected) {
        return;
    }
    
    if (fromAmount <= 0) {
        swapBtn.disabled = true;
        swapBtn.textContent = 'Enter an amount';
    } else {
        swapBtn.disabled = false;
        swapBtn.textContent = `Swap ${fromAmount.toFixed(2)} USDC`;
    }
}

// Execute Swap
async function executeSwap() {
    if (!walletConnected || fromAmount <= 0) {
        return;
    }
    
    try {
        console.log('Executing swap...');
        swapBtn.disabled = true;
        swapBtn.textContent = 'Processing...';
        
        // In production, this would:
        // 1. Lock USDC on Solana
        // 2. Verify transaction
        // 3. Mint/release USDD on Nexus
        // 4. Update transaction history
        
        // Simulate transaction
        await simulateSwap();
        
        // Show success message
        alert(`Swap successful!\n\nYou will receive ${toAmount.toFixed(6)} USDD in your Nexus wallet within 2-5 minutes.`);
        
        // Reset form
        resetForm();
        
        // Reload balances
        await loadBalances();
        
    } catch (error) {
        console.error('Swap error:', error);
        alert('Swap failed. Please try again.');
        swapBtn.disabled = false;
        updateSwapButton();
    }
}

// Simulate Swap (for development)
async function simulateSwap() {
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log('Swap simulated successfully');
            
            // Add to transaction history
            addTransactionToHistory({
                from: 'USDC',
                to: 'USDD',
                amount: fromAmount,
                received: toAmount,
                timestamp: Date.now(),
                status: 'completed'
            });
            
            resolve();
        }, 2000);
    });
}

// Reset Form
function resetForm() {
    fromAmountInput.value = '';
    toAmountInput.value = '';
    fromAmount = 0;
    toAmount = 0;
    updateSwapDetails(0, 0, 0);
    updateSwapButton();
}

// Add Transaction to History
function addTransactionToHistory(transaction) {
    const transactionsList = document.getElementById('transactions-list');
    
    // Remove empty state if present
    const emptyState = transactionsList.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }
    
    // Create transaction element
    const txElement = document.createElement('div');
    txElement.className = 'transaction-item';
    txElement.innerHTML = `
        <div class="tx-details">
            <span class="tx-route">${transaction.from} → ${transaction.to}</span>
            <span class="tx-amount">${transaction.amount.toFixed(2)} ${transaction.from}</span>
            <span class="tx-received">Received: ${transaction.received.toFixed(6)} ${transaction.to}</span>
            <span class="tx-time">${new Date(transaction.timestamp).toLocaleString()}</span>
        </div>
        <div class="tx-status ${transaction.status}">${transaction.status}</div>
    `;
    
    // Add to top of list
    transactionsList.insertBefore(txElement, transactionsList.firstChild);
}

// Format Number
function formatNumber(num, decimals = 2) {
    return num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

console.log('Distordia Swap service loaded');
