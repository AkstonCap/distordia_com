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
    
    // Sessions API - authentication
    sessionCreate: `${NEXUS_API_BASE}/sessions/create/local`,
    sessionTerminate: `${NEXUS_API_BASE}/sessions/terminate/local`
};
