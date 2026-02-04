// Swap Service JavaScript

// Configuration (from swapService docs)
const EXCHANGE_RATE = 1.0; // 1:1 ratio
const FLAT_FEE_USDC = 0.1; // 0.1 USDC flat fee for USDC->USDD
const DYNAMIC_FEE_BPS = 10; // 0.1% (10 basis points)
const MIN_SWAP_AMOUNT = 0.100101; // Minimum swap amount both directions
const NETWORK_FEE_SOL = 0.001; // Estimated Solana network fee

// Service addresses (from docs)
const USDC_VAULT_ADDRESS = 'Bg1MUQDMjAuXSAFr8izhGCUUhsrta1EjHcTvvgFnJEzZ';
const USDD_TREASURY_ACCOUNT = '<TREASURY_ACCOUNT>'; // Replace with actual treasury

// State
let walletConnected = false;
let solanaWallet = null;
let solanaProvider = null; // 'phantom' or 'solflare'
let nexusWallet = null;
let fromAmount = 0;
let toAmount = 0;
let swapDirectionUSDCtoUSDD = true; // true = USDC->USDD, false = USDD->USDC

// Solana constants
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';

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

// Detect available Solana wallets
function detectSolanaWallets() {
    const wallets = [];
    
    console.log('Detecting Solana wallets...');
    console.log('window.solana:', window.solana);
    console.log('window.solflare:', window.solflare);
    console.log('window.phantom:', window.phantom);
    
    // Check for Phantom (can be at window.solana or window.phantom.solana)
    const phantomProvider = window.phantom?.solana || (window.solana?.isPhantom ? window.solana : null);
    if (phantomProvider?.isPhantom) {
        console.log('✓ Phantom detected');
        wallets.push({
            name: 'Phantom',
            id: 'phantom',
            provider: phantomProvider,
            icon: 'https://phantom.app/img/logo.png'
        });
    }
    
    // Check for Solflare - can be at multiple locations
    // Solflare extension: window.solflare
    // Solflare may also register at window.solana if it's the default
    const solflareProvider = window.solflare || 
                             (window.solana?.isSolflare ? window.solana : null);
    if (solflareProvider?.isSolflare) {
        console.log('✓ Solflare detected');
        wallets.push({
            name: 'Solflare',
            id: 'solflare', 
            provider: solflareProvider,
            icon: 'https://solflare.com/favicon.ico',
            hasMemoUI: true // Solflare has native memo support in UI
        });
    }
    
    // Also check the Wallet Standard API (newer standard)
    // Some wallets register via navigator.wallets or window.addEventListener
    if (wallets.length === 0) {
        // Fallback: check if window.solana exists but isn't specifically identified
        if (window.solana && !window.solana.isPhantom && !window.solana.isSolflare) {
            console.log('? Unknown Solana wallet detected at window.solana');
            wallets.push({
                name: 'Solana Wallet',
                id: 'generic',
                provider: window.solana,
                icon: ''
            });
        }
    }
    
    console.log('Detected wallets:', wallets.map(w => w.name));
    return wallets;
}

// Show wallet selection modal
async function showWalletSelector() {
    // Small delay to ensure wallet extensions have injected
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const wallets = detectSolanaWallets();
    
    if (wallets.length === 0) {
        // Check if running on file:// protocol
        const isFileProtocol = window.location.protocol === 'file:';
        
        let message = 'No Solana wallet detected!\n\n';
        
        if (isFileProtocol) {
            message += '⚠️ You are viewing this page via file:// protocol.\n';
            message += 'Wallet extensions do NOT work on local files.\n\n';
            message += 'Please serve the page via HTTP:\n';
            message += '  python -m http.server 8000\n';
            message += '  Then visit: http://localhost:8000/swap/\n\n';
        } else {
            message += 'Please ensure your wallet extension is:\n';
            message += '1. Installed and enabled for this site\n';
            message += '2. Unlocked (logged in)\n';
            message += '3. Try refreshing the page\n\n';
            message += 'Install one of:\n';
            message += '• Phantom: https://phantom.app\n';
            message += '• Solflare: https://solflare.com\n';
        }
        
        console.log('Protocol:', window.location.protocol);
        console.log('Is file://:', isFileProtocol);
        
        alert(message);
        return;
    }
    
    // Create modal if it doesn't exist
    let modal = document.getElementById('walletSelectorModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'walletSelectorModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Select Solana Wallet</h2>
                    <span class="modal-close" onclick="closeWalletSelector()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="wallet-options" id="wallet-options"></div>
                    <p class="wallet-hint">💡 <strong>Solflare</strong> has built-in memo support in its UI</p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Populate wallet options
    const optionsContainer = document.getElementById('wallet-options');
    optionsContainer.innerHTML = wallets.map(wallet => `
        <button class="wallet-option" onclick="connectSolanaWallet('${wallet.id}')">
            <img src="${wallet.icon}" alt="${wallet.name}" onerror="this.style.display='none'">
            <span>${wallet.name}</span>
            ${wallet.hasMemoUI ? '<span class="memo-badge">Memo UI ✓</span>' : ''}
        </button>
    `).join('');
    
    modal.classList.add('show');
}

function closeWalletSelector() {
    const modal = document.getElementById('walletSelectorModal');
    if (modal) modal.classList.remove('show');
}

// Connect to specific Solana wallet
async function connectSolanaWallet(walletId) {
    const wallets = detectSolanaWallets();
    const wallet = wallets.find(w => w.id === walletId);
    
    if (!wallet) {
        alert(`${walletId} wallet not found`);
        return;
    }
    
    try {
        console.log(`Connecting to ${wallet.name}...`);
        
        const response = await wallet.provider.connect();
        solanaWallet = response.publicKey.toString();
        solanaProvider = walletId;
        
        console.log(`${wallet.name} connected:`, solanaWallet);
        closeWalletSelector();
        
        // Now connect Nexus wallet
        await connectNexusWallet();
        
    } catch (error) {
        console.error(`${wallet.name} connection failed:`, error);
        alert(`Failed to connect ${wallet.name}. Please try again.`);
    }
}

// Connect Nexus wallet (Q-Wallet or manual)
async function connectNexusWallet() {
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
                nexusWallet = prompt('Enter your Nexus USDD account address:');
            }
        } else {
            nexusWallet = prompt('Enter your Nexus USDD account address:\n\n(Install Q-Wallet extension for automatic connection)');
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
}

// Connect Wallets (swap interface button) - now shows wallet selector
async function connectWallets() {
    showWalletSelector();
}

// Update Wallet UI
function updateWalletUI() {
    if (walletConnected) {
        // Hide connect button, show swap button
        connectWalletBtn.style.display = 'none';
        swapBtn.style.display = 'block';
        walletInfo.style.display = 'block';
        
        // Display wallet addresses with provider name
        const providerName = solanaProvider === 'solflare' ? 'Solflare' : 'Phantom';
        const solanaLabel = document.querySelector('.wallet-info .wallet-address:first-child .wallet-label');
        if (solanaLabel) {
            solanaLabel.textContent = `${providerName}:`;
        }
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
        updateSwapDetails(0, 0, 0, swapDirectionUSDCtoUSDD);
        return;
    }
    
    // Calculate fees based on direction (from swapService docs)
    let flatFee, dynamicFee, afterFee;
    
    if (swapDirectionUSDCtoUSDD) {
        // USDC -> USDD: 0.1 USDC flat + 0.1% dynamic
        flatFee = FLAT_FEE_USDC;
        dynamicFee = fromAmount * (DYNAMIC_FEE_BPS / 10000);
        afterFee = fromAmount - flatFee - dynamicFee;
    } else {
        // USDD -> USDC: same fee structure
        flatFee = FLAT_FEE_USDC;
        dynamicFee = fromAmount * (DYNAMIC_FEE_BPS / 10000);
        afterFee = fromAmount - flatFee - dynamicFee;
    }
    
    toAmount = Math.max(0, afterFee * EXCHANGE_RATE);
    
    // Update UI
    toAmountInput.value = toAmount > 0 ? toAmount.toFixed(6) : '';
    updateSwapDetails(flatFee, dynamicFee, toAmount, swapDirectionUSDCtoUSDD);
}

// Update Swap Details
function updateSwapDetails(flatFee, dynamicFee, receiveAmount, isUSDCtoUSDD) {
    const fromToken = isUSDCtoUSDD ? 'USDC' : 'USDD';
    const toToken = isUSDCtoUSDD ? 'USDD' : 'USDC';
    
    document.getElementById('exchange-rate').textContent = `1 ${fromToken} = ${EXCHANGE_RATE} ${toToken}`;
    document.getElementById('bridge-fee').textContent = `${flatFee.toFixed(2)} ${fromToken} + ${(DYNAMIC_FEE_BPS/100).toFixed(1)}%`;
    document.getElementById('network-fee').textContent = isUSDCtoUSDD ? `~${NETWORK_FEE_SOL} SOL` : 'Included';
    document.getElementById('receive-amount').textContent = `${receiveAmount.toFixed(6)} ${toToken}`;
    
    // Show minimum amount warning
    const minWarning = document.getElementById('min-amount-warning');
    if (minWarning) {
        if (fromAmount > 0 && fromAmount < MIN_SWAP_AMOUNT) {
            minWarning.textContent = `⚠️ Minimum: ${MIN_SWAP_AMOUNT} ${fromToken}`;
            minWarning.style.display = 'block';
        } else {
            minWarning.style.display = 'none';
        }
    }
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

// Swap Direction - toggle between USDC->USDD and USDD->USDC
function swapDirection() {
    swapDirectionUSDCtoUSDD = !swapDirectionUSDCtoUSDD;
    
    // Update token displays
    const fromTokenSelect = document.querySelector('.swap-input-group:first-of-type .token-select');
    const toTokenSelect = document.querySelector('.swap-input-group:last-of-type .token-select');
    
    if (swapDirectionUSDCtoUSDD) {
        // USDC -> USDD
        fromTokenSelect.innerHTML = `
            <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png" alt="USDC" class="token-icon">
            <span class="token-name">USDC</span>
            <span class="chain-badge solana">Solana</span>`;
        toTokenSelect.innerHTML = `
            <img src="../images/USDD_no-text.png" alt="USDD" class="token-icon">
            <span class="token-name">USDD</span>
            <span class="chain-badge nexus">Nexus</span>`;
    } else {
        // USDD -> USDC
        fromTokenSelect.innerHTML = `
            <img src="../images/USDD_no-text.png" alt="USDD" class="token-icon">
            <span class="token-name">USDD</span>
            <span class="chain-badge nexus">Nexus</span>`;
        toTokenSelect.innerHTML = `
            <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png" alt="USDC" class="token-icon">
            <span class="token-name">USDC</span>
            <span class="chain-badge solana">Solana</span>`;
    }
    
    // Update instructions panel
    updateInstructionsPanel();
    
    // Reset amounts
    fromAmountInput.value = '';
    toAmountInput.value = '';
    fromAmount = 0;
    toAmount = 0;
    updateSwapButton();
}

// Update Swap Button
function updateSwapButton() {
    if (!walletConnected) {
        return;
    }
    
    const fromToken = swapDirectionUSDCtoUSDD ? 'USDC' : 'USDD';
    
    if (fromAmount <= 0) {
        swapBtn.disabled = true;
        swapBtn.textContent = 'Enter an amount';
    } else if (fromAmount < MIN_SWAP_AMOUNT) {
        swapBtn.disabled = true;
        swapBtn.textContent = `Min: ${MIN_SWAP_AMOUNT} ${fromToken}`;
    } else {
        swapBtn.disabled = false;
        swapBtn.textContent = `Swap ${fromAmount.toFixed(2)} ${fromToken}`;
    }
}

// Execute Swap
async function executeSwap() {
    if (!walletConnected || fromAmount <= 0 || fromAmount < MIN_SWAP_AMOUNT) {
        return;
    }
    
    const fromToken = swapDirectionUSDCtoUSDD ? 'USDC' : 'USDD';
    const toToken = swapDirectionUSDCtoUSDD ? 'USDD' : 'USDC';
    
    try {
        console.log('Executing swap...', { direction: swapDirectionUSDCtoUSDD ? 'USDC->USDD' : 'USDD->USDC' });
        swapBtn.disabled = true;
        swapBtn.textContent = 'Processing...';
        
        if (swapDirectionUSDCtoUSDD) {
            // USDC -> USDD Flow (per swapService docs):
            // 1. Send USDC to vault with memo: nexus:<nexus_address>
            // 2. Service detects deposit, validates memo
            // 3. Service sends USDD to specified Nexus account
            await executeUSDCtoUSDD();
        } else {
            // USDD -> USDC Flow (per swapService docs):
            // 1. Send USDD to treasury
            // 2. Create/update asset with txid_toService + receival_account
            // 3. Service finds mapping, sends USDC
            await executeUSDDtoUSDC();
        }
        
        // Show success message
        alert(`Swap initiated!\n\nYou will receive ${toAmount.toFixed(6)} ${toToken} within 2-5 minutes.\n\n${swapDirectionUSDCtoUSDD ? 'The service is processing your USDC deposit.' : 'Remember to update your bridge asset with the transaction ID.'}`);
        
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

// USDC -> USDD swap execution (Solana to Nexus)
async function executeUSDCtoUSDD() {
    // Per swapService docs:
    // Send USDC to vault with memo: nexus:<USDD_receiving_account>
    
    console.log('USDC->USDD: Preparing transaction...');
    console.log(`- Send ${fromAmount} USDC to: ${USDC_VAULT_ADDRESS}`);
    console.log(`- Memo: nexus:${nexusWallet}`);
    
    // In production: Use @solana/web3.js to create transaction
    // with SPL token transfer + memo program
    
    // Simulate for now
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    addTransactionToHistory({
        from: 'USDC',
        to: 'USDD',
        amount: fromAmount,
        received: toAmount,
        timestamp: Date.now(),
        status: 'pending',
        memo: `nexus:${nexusWallet}`
    });
    
    console.log('USDC->USDD: Transaction submitted');
}

// USDD -> USDC swap execution (Nexus to Solana)
async function executeUSDDtoUSDC() {
    // Per swapService docs:
    // 1. Send USDD to treasury
    // 2. Create/update asset with txid_toService + receival_account
    
    console.log('USDD->USDC: Preparing transaction...');
    console.log(`- Send ${fromAmount} USDD to treasury`);
    console.log(`- Receival account: ${solanaWallet}`);
    
    // Show instructions for asset creation
    const instructions = `
To complete the USDD→USDC swap:

1. Send USDD to treasury using CLI:
   nexus finance/debit/token from=USDD to=${USDD_TREASURY_ACCOUNT} amount=${fromAmount} pin=<PIN>

2. Copy the txid from the response

3. Update your bridge asset:
   nexus assets/update/asset name=distordiaBridge format=basic txid_toService=<TXID> pin=<PIN>

(Or create one first if you haven't: see docs for asset creation)`;
    
    console.log(instructions);
    
    // Simulate
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    addTransactionToHistory({
        from: 'USDD',
        to: 'USDC',
        amount: fromAmount,
        received: toAmount,
        timestamp: Date.now(),
        status: 'pending',
        receivalAccount: solanaWallet
    });
    
    console.log('USDD->USDC: Instructions provided');
}

// Update instructions panel based on swap direction
function updateInstructionsPanel() {
    const infoSteps = document.querySelector('.info-steps');
    if (!infoSteps) return;
    
    if (swapDirectionUSDCtoUSDD) {
        infoSteps.innerHTML = `
            <div class="info-step">
                <div class="step-number">1</div>
                <div class="step-content">
                    <h4>Connect Wallets</h4>
                    <p>Connect Phantom (Solana) and provide your Nexus address</p>
                </div>
            </div>
            <div class="info-step">
                <div class="step-number">2</div>
                <div class="step-content">
                    <h4>Enter Amount</h4>
                    <p>Min: ${MIN_SWAP_AMOUNT} USDC</p>
                </div>
            </div>
            <div class="info-step">
                <div class="step-number">3</div>
                <div class="step-content">
                    <h4>Confirm Swap</h4>
                    <p>USDC sent to vault with memo: nexus:&lt;your_address&gt;</p>
                </div>
            </div>
            <div class="info-step">
                <div class="step-number">4</div>
                <div class="step-content">
                    <h4>Receive USDD</h4>
                    <p>Service sends USDD to your Nexus account</p>
                </div>
            </div>`;
    } else {
        infoSteps.innerHTML = `
            <div class="info-step">
                <div class="step-number">1</div>
                <div class="step-content">
                    <h4>Setup Bridge Asset</h4>
                    <p>Create asset with receival_account (one-time)</p>
                </div>
            </div>
            <div class="info-step">
                <div class="step-number">2</div>
                <div class="step-content">
                    <h4>Send USDD to Treasury</h4>
                    <p>Min: ${MIN_SWAP_AMOUNT} USDD. Save the txid!</p>
                </div>
            </div>
            <div class="info-step">
                <div class="step-number">3</div>
                <div class="step-content">
                    <h4>Update Asset</h4>
                    <p>Set txid_toService to your debit txid</p>
                </div>
            </div>
            <div class="info-step">
                <div class="step-number">4</div>
                <div class="step-content">
                    <h4>Receive USDC</h4>
                    <p>Service sends USDC to your Solana ATA</p>
                </div>
            </div>`;
    }
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
