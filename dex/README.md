# Distordia DEX

A decentralized exchange (DEX) marketplace interface for the Nexus.io blockchain.

## Overview

The Distordia DEX provides a modern, real-time trading interface that fetches market data directly from the Nexus.io blockchain via API endpoints. No data is stored on the website - all information is retrieved on-demand from the blockchain.

## Features

### 📊 Market Data
- **Real-time Price Updates**: Live market prices updated every 10 seconds
- **24h Volume & Statistics**: Comprehensive market statistics
- **Block Height & Network Hash**: Live blockchain network information
- **Multiple Trading Pairs**: Support for NXS/BTC, NXS/USD, NXS/ETH, and more

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

The DEX connects to the Nexus.io blockchain API endpoints:

```javascript
// Primary API endpoints
const NEXUS_API_BASE = 'https://api.nexus.io/v2';
const NEXUS_EXPLORER_API = 'https://nxsorbitalscan.com/api';
```

### Endpoints Used

- **Network Info**: `/ledger/get/info` - Block height, network statistics
- **Mining Info**: `/ledger/get/mininginfo` - Hash rate and mining data
- **Market Data**: Custom endpoints for trading pairs, order books, and trade history

### Demo Mode

The DEX includes demo/fallback data for development and when the API is unavailable:
- Simulated trading pairs
- Generated order books
- Sample trade history

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
3. Filter by base currency (All, NXS, BTC, Favorites)
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

To use real Nexus.io API data, ensure the endpoints in `dex.js` are correctly configured:

```javascript
const NEXUS_API_BASE = 'https://api.nexus.io/v2';
```

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
// In dex.js, add to demoPairs array:
{ 
    pair: 'NXS/USDT', 
    price: 0.456, 
    change24h: 2.5, 
    volume24h: 123456, 
    base: 'NXS', 
    quote: 'USDT' 
}
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

1. **Display Only**: This interface displays market data but does not execute trades
2. **No Wallet Integration**: No private keys or wallet connections
3. **Read-Only API**: Only fetches data, does not submit transactions
4. **Demo Data**: Uses fallback demo data when API is unavailable

## Future Enhancements

Potential features for future development:

- [ ] TradingView chart integration
- [ ] WebSocket real-time updates
- [ ] Advanced chart indicators
- [ ] Price alerts and notifications
- [ ] Trade execution interface (with wallet integration)
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
