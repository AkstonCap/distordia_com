// API Configuration for Nexus DEX
// Base URL for Nexus API node
const NEXUS_API_BASE = 'https://api.distordia.com';

// API endpoints according to Nexus API documentation
const API_ENDPOINTS = {
    // System API - get node and network information
    systemInfo: `${NEXUS_API_BASE}/system/get/info`,
    
    // Ledger API - get blockchain data
    ledgerInfo: `${NEXUS_API_BASE}/ledger/get/info`,
    ledgerMetrics: `${NEXUS_API_BASE}/ledger/get/metrics`,
    getBlock: `${NEXUS_API_BASE}/ledger/get/block`,
    
    // Market API - P2P marketplace orders
    listOrders: `${NEXUS_API_BASE}/market/list/order`,
    listBids: `${NEXUS_API_BASE}/market/list/bid`,
    listAsks: `${NEXUS_API_BASE}/market/list/ask`,
    listExecuted: `${NEXUS_API_BASE}/market/list/executed`,
    listExecutedFiltered: `${NEXUS_API_BASE}/market/list/executed/timestamp,contract.amount,contract.ticker,order.amount,order.ticker`,
    userOrders: `${NEXUS_API_BASE}/market/user/order`,
    executeOrder: `${NEXUS_API_BASE}/market/execute/order`,
    
    // Finance API - token transfers
    debitToken: `${NEXUS_API_BASE}/finance/debit/token`,
    debitAccount: `${NEXUS_API_BASE}/finance/debit/account`
};

// Q-Wallet batch execution fee structure (in NXS)
// Fees are automatically handled by Q-Wallet executeBatchCalls
const BATCH_FEE_STRUCTURE = {
    freeLimit: 1,           // First call is free
    baseFee: 0.01,          // 0.01 NXS per tier (2-10, 11-20, etc.)
    tierSize: 10,           // Calls per tier
    congestionFee: 0.01     // ~0.01 NXS per call (Nexus network fee)
};

// Calculate estimated fee for batch calls
function calculateBatchFee(callCount) {
    if (callCount <= BATCH_FEE_STRUCTURE.freeLimit) {
        return 0;
    }
    // Service fee tiers: 2-10 = 0.01, 11-20 = 0.02, etc.
    const tier = Math.ceil((callCount - 1) / BATCH_FEE_STRUCTURE.tierSize);
    const serviceFee = tier * BATCH_FEE_STRUCTURE.baseFee;
    // Congestion fee applies to all calls when multiple calls made within 10 seconds
    const congestionFee = callCount * BATCH_FEE_STRUCTURE.congestionFee;
    return serviceFee + congestionFee;
}
