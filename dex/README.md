# Distordia DEX

A decentralized exchange (DEX) marketplace interface for the Nexus.io blockchain.

## Overview

The Distordia DEX provides a modern, real-time trading interface that fetches market data directly from the Nexus.io blockchain via API endpoints. No data is stored on the website - all information is retrieved on-demand from the blockchain.

## Features

### 📊 Market Data
- **Real-time Price Updates**: Live market prices updated every 10 seconds
- **24h Volume & Statistics**: Comprehensive market statistics
- **Block Height & Network Hash**: Live blockchain network information
- **Multiple Trading Pairs**: Support for token pairs on Nexus blockchain (USDD/NXS, DIST/NXS, GARAGE/NXS, HUSTLE/NXS)

### 📈 Trading Interface
- **Order Book Display**: Real-time bid/ask orders with depth visualization
- **Price Charts**: Interactive price charts with multiple time intervals (1H, 4H, 1D, 1W)
- **Recent Trades**: Live feed of recent market trades
- **Market Pair Search**: Quick search and filter for trading pairs

### 🎨 User Interface
- **Responsive Design**: Optimized for desktop, tablet, and mobile
- **Dark Theme**: Modern dark UI with orange accent colors matching Distordia branding
- **Real-time Updates**: Automatic data refresh every 10 seconds
- **Interactive Charts**: Multiple visualization options

## API Integration

### Nexus.io Blockchain API

The DEX connects to the Nexus.io blockchain API using the official endpoints as documented in the [Nexus API Documentation](https://nexus.io/docs).

```javascript
// Nexus API base URL
const NEXUS_API_BASE = 'https://api.nexus.io:8080';
```

### Endpoints Used

According to the official Nexus API documentation, the following endpoints are used:

#### System API
- **`system/get/info`** - Returns node information including:
  - `blocks` - Current block height
  - `connections` - Number of peer connections
  - `version` - Daemon software version
  - `timestamp` - Current unified time

#### Ledger API  
- **`ledger/get/info`** - Returns blockchain ledger information
- **`ledger/get/metrics`** - Returns blockchain metrics including stake rate

#### Market API (P2P Marketplace)
- **`market/list/order`** - Lists all market orders for trading pairs
  - Supports filters: `market`, `limit`
  - Returns: `market`, `price`, `amount`, `timestamp`
  
- **`market/list/bid`** - Lists all buy orders for a specific market
  - Parameters: `market` (e.g., "USDD/NXS"), `limit`
  
- **`market/list/ask`** - Lists all sell orders for a specific market
  - Parameters: `market` (e.g., "DIST/NXS"), `limit`
  
- **`market/list/executed`** - Lists executed (completed) trades
  - Returns trade history with price, amount, timestamp

### API Request Format

All Nexus API requests use **POST** method with JSON body:

```javascript
const response = await fetch('https://api.nexus.io:8080/system/get/info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
});
```

### API Response Format

Nexus API returns data in a `result` object:

```json
{
    "result": {
        "blocks": 4555100,
        "connections": 41,
        "version": "5.1.0-rc2 Tritium++ CLI [LLD][x64]",
        ...
    }
}
```

### Error Handling

The DEX displays appropriate error messages when:
- Nexus API is unavailable
- No market data exists for a trading pair
- Order book is empty
- No recent trades available

All errors are logged to the browser console for debugging.

## File Structure

```
dex/
├── index.html          # Main DEX interface
├── dex.css            # DEX-specific styling
├── dex.js             # Market data fetching and real-time updates
└── README.md          # This file
```

## Usage

### Accessing the DEX

Navigate to `/dex/` from the main Distordia website, or directly access:
- Local: `http://localhost:8000/dex/`
- Production: `https://distordia.com/dex/`

### Trading Pair Selection

1. Browse available pairs in the left panel
2. Use search to filter pairs
3. Filter by quote currency (All, NXS, Favorites)
4. Click any pair to view detailed trading information

### Order Book

- **Green rows**: Buy orders (bids)
- **Red rows**: Sell orders (asks)
- **Depth bars**: Visual representation of order size
- **View options**: Toggle between bids, asks, or both

### Chart Intervals

Select different time intervals to view price history:
- 1H (1 hour)
- 4H (4 hours)
- 1D (1 day)
- 1W (1 week)

## Configuration

### API Endpoints

To use real Nexus.io API data, the endpoints in `dex.js` are configured according to the official Nexus API documentation:

```javascript
const NEXUS_API_BASE = 'https://api.nexus.io:8080';

const API_ENDPOINTS = {
    systemInfo: `${NEXUS_API_BASE}/system/get/info`,
    ledgerInfo: `${NEXUS_API_BASE}/ledger/get/info`,
    ledgerMetrics: `${NEXUS_API_BASE}/ledger/get/metrics`,
    listOrders: `${NEXUS_API_BASE}/market/list/order`,
    listBids: `${NEXUS_API_BASE}/market/list/bid`,
    listAsks: `${NEXUS_API_BASE}/market/list/ask`,
    listExecuted: `${NEXUS_API_BASE}/market/list/executed`
};
```

**Note**: The Nexus API does not use `/v2` in the URL path. All endpoints are accessed directly from the base URL.

### Update Frequency

Adjust the data refresh rate in `dex.js`:

```javascript
// Update every 10 seconds (10000ms)
updateInterval = setInterval(() => {
    fetchNetworkStats();
    // ... other updates
}, 10000);
```

### Color Customization

The DEX inherits the main Distordia color scheme from `../styles.css`:
- Primary: `#FF6B35` (Orange)
- Secondary: `#FF8C42`
- Accent: `#FFA577`

Override DEX-specific colors in `dex.css` if needed.

## Development

### Local Testing

1. Start a local server:
   ```bash
   python -m http.server 8000
   ```

2. Navigate to:
   ```
   http://localhost:8000/dex/
   ```

### Adding New Features

**New Trading Pair:**
```javascript
// In dex.js, add to DEFAULT_MARKET_PAIRS array:
const DEFAULT_MARKET_PAIRS = [
    'USDD/NXS',
    'DIST/NXS', 
    'GARAGE/NXS',
    'HUSTLE/NXS',
    'YOUR_TOKEN/NXS'  // Add new pair here
];
```

**Custom API Endpoint:**
```javascript
// In dex.js:
async function fetchCustomData() {
    const response = await fetch(`${NEXUS_API_BASE}/your/endpoint`);
    const data = await response.json();
    return data;
}
```

## Technical Details

### No Backend Required

The DEX is a pure frontend application:
- All data fetched via API calls
- No database or backend server needed
- Stateless design - no user data stored

### Browser Compatibility

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

### Performance

- Efficient data polling (10s intervals)
- Minimal DOM updates
- Optimized for low bandwidth
- Responsive across all device sizes

## Security Considerations

⚠️ **Important Notes:**

1. **Q-Wallet Required**: Trading requires Q-Wallet browser extension for authentication
2. **No Private Keys Stored**: All signing is done via Q-Wallet - no keys are stored in the app
3. **Live Blockchain Data**: All data is fetched directly from Nexus blockchain API
4. **Network Fees**: Fees are charged in NXS - 1 order free, ~0.01 NXS per additional order

## Authentication

The DEX uses **Q-Wallet only** for authentication:
- No username/password login
- No session management
- Connect via Q-Wallet browser extension
- Q-Wallet handles PIN entry for transaction signing

## Future Enhancements

Potential features for future development:

- [x] Trade execution interface (with wallet integration)
- [ ] TradingView chart integration
- [ ] WebSocket real-time updates
- [ ] Advanced chart indicators
- [ ] Price alerts and notifications
- [ ] Historical data analysis
- [ ] Multi-language support
- [ ] Dark/Light theme toggle

## Support

For issues or questions:
- GitHub: [distordia](https://github.com/distordia)
- Email: contact@distordia.com

## License

Part of the Distordia Crypto Lab project. See main repository for license details.

---

Built with ❤️ by Distordia Crypto Lab
