# Distordia dApp Development Guide

## Architecture Overview

This is a **multi-app static site** containing several blockchain-powered web applications (dApps) that interact with the **Nexus blockchain**. Each subdirectory (`/dex/`, `/fantasyfootball/`, `/social/`, etc.) is a self-contained SPA with its own HTML, CSS, and JavaScript files.

**Core principle**: All apps are vanilla JavaScript - no build tools, no frameworks, no transpilation. Open `index.html` files directly in a browser or serve via simple HTTP server.

## Nexus Blockchain Integration

All apps communicate with Nexus blockchain via REST API at `https://api.distordia.com` (direct Nexus node connection).

### API Request Pattern

**Always use POST** (even for reads):
```javascript
const response = await fetch('https://api.distordia.com/system/get/info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})  // Empty body for basic queries
});
const data = await response.json();
// Nexus returns data in data.result object
const info = data.result;
```

### Common API Endpoints

See `Nexus API docs/` for full documentation. Most used:
- **System**: `system/get/info` - node/network status
- **Market**: `market/list/order`, `market/list/bid`, `market/list/ask`, `market/list/executed` - DEX trading
- **Assets**: `assets/get/asset`, `assets/list/asset` - NFT data
- **Register**: `register/list/assets`, `register/list/names` - public blockchain queries

**Note**: All user authentication is done via Q-Wallet browser extension. No session-based login is used.

### API Configuration Convention

Each app has `api-config.js` or defines `NEXUS_API_BASE` and endpoint objects:
```javascript
const NEXUS_API_BASE = 'https://api.distordia.com';
const API_ENDPOINTS = {
    systemInfo: `${NEXUS_API_BASE}/system/get/info`,
    // ... more endpoints
};
```

## Q-Wallet Integration (Web3 Authentication)

Apps requiring user transactions use Q-Wallet browser extension (like MetaMask for Ethereum).

### Connection Pattern (see `q-wallet docs/DAPP-INTEGRATION.md`)

```javascript
// 1. Check if installed
if (typeof window.nexus === 'undefined') {
    showWalletInstallPrompt();
    return;
}

// 2. Connect (triggers user approval)
const accounts = await window.nexus.connect();
const userAddress = accounts[0];

// 3. Setup event listeners for disconnect/account changes
window.nexus.on('accountsChanged', handleAccountChange);
window.nexus.on('disconnect', handleDisconnect);
```

**Files**: Each wallet-enabled app has `auth.js` with connection logic. See [social/auth.js](social/auth.js) for minimal implementation, [dex/auth.js](dex/auth.js) for utility functions.

## Project Structure & Patterns

### Multi-App Organization
```
/                         # Landing page (index.html, styles.css, script.js)
/dex/                    # Decentralized exchange - trading pairs, order books
/fantasyfootball/        # NFT fantasy football - blockchain player assets
/social/                 # On-chain social media - posts stored as blockchain assets
/swap/                   # Cross-chain bridge - USDC (Solana) ↔ USDD (Nexus)
/masterdata/             # Product catalog - create/manage product NFTs
/content-verification/   # Content provenance - verify on-chain content registration
/ship-engineering/       # AI ship design research showcase (static info site)
```

Each app is independent with:
- `index.html` - main page
- `{app}.css` - app-specific styles
- `{app}.js` - main logic
- `api.js` or `api-config.js` - API endpoints
- `auth.js` - Q-Wallet integration (if needed)
- `README.md` - app documentation

### State Management Pattern

Apps use simple global state objects (see [dex/state.js](dex/state.js)):
```javascript
let currentPair = null;
let marketData = { pairs: [] };

function selectPair(pair) {
    currentPair = pair;
    // Update DOM directly
    document.getElementById('current-pair-name').textContent = pair.pair;
}
```

**No state libraries** - direct DOM manipulation with `document.getElementById()` and `querySelector()`.

### Modular JS Architecture (DEX Example)

DEX app splits functionality into modules:
- [dex/api-config.js](dex/api-config.js) - endpoint configuration
- [dex/api.js](dex/api.js) - API fetch functions
- [dex/auth.js](dex/auth.js) - utility functions (notifications, mobile detection)
- [dex/state.js](dex/state.js) - global state
- [dex/market-pairs.js](dex/market-pairs.js) - pair list rendering
- [dex/renderers.js](dex/renderers.js) - order book/chart rendering
- [dex/trade.js](dex/trade.js) - trading logic
- [dex/event-handlers.js](dex/event-handlers.js) - UI event handlers
- [dex/dex.js](dex/dex.js) - initialization and orchestration

All loaded via `<script>` tags in `index.html` (order matters for dependencies).

## Asset Naming Standards

NFT assets follow strict naming conventions:

### Fantasy Football (see `fantasyfootball/ASSET_STANDARD.md`)
```
distordia:player:{league}:{team}:{playerid}
Example: distordia:player:epl:mancity:haaland
```

### Social Posts
```json
{
    "distordia-type": "distordia-post",
    "distordia-status": "official" | "user-post",
    "Text": "post content..."
}
```

### Content Verification
```json
{
    "distordia": "content",
    "url": "https://example.com/article",
    "Title": "Article Title",
    "Author": "Author Name"
}
```

### Product Catalog (Masterdata)
```json
{
    "distordia-type": "product",
    "Name": "Product Name",
    "Description": "Product details",
    "Price": 100,
    "Category": "electronics"
}
```

## Development Workflow

### Local Development
```bash
# Serve from any directory
python -m http.server 8000
# or
npx serve
```
Navigate to `http://localhost:8000/{app}/` for specific apps.

### No Build Process
- Edit files directly
- Refresh browser to see changes
- No compilation, transpilation, or bundling required

### Debugging
- Use browser DevTools console
- Apps log extensively: `console.log('✅ Data received:', data)`
- Check Network tab for API calls (all are POST requests)

## Common Patterns

### Data Fetching with Fallbacks
```javascript
try {
    const response = await fetch(API_ENDPOINTS.systemInfo, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    });
    if (response.ok) {
        const data = await response.json();
        updateUI(data.result);
    }
} catch (error) {
    console.error('API error:', error);
    showFallbackData(); // Many apps have demo/fallback data
}
```

### Auto-Refresh Pattern
```javascript
function startLiveUpdates() {
    fetchData(); // Initial load
    setInterval(fetchData, 10000); // Refresh every 10 seconds
}
```

### Class-Based UI Modules
Most apps use ES6 classes for organization (see [masterdata/masterdata.js](masterdata/masterdata.js), [content-verification/content-verification.js](content-verification/content-verification.js)):
```javascript
class ProductCatalogue {
    constructor() {
        this.products = [];
        this.initEventListeners();
        this.loadProducts();
    }
    
    initEventListeners() {
        document.getElementById('addBtn').addEventListener('click', () => this.add());
    }
    
    async loadProducts() { /* ... */ }
}

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
    new ProductCatalogue();
});
```

### API Request Wrapper Pattern
Apps with complex API logic use class-based wrappers (see [masterdata/api.js](masterdata/api.js), [content-verification/api.js](content-verification/api.js)):
```javascript
class NexusAPI {
    constructor(baseURL = 'https://api.distordia.com') {
        this.baseURL = baseURL;
    }
    
    async request(endpoint, params = {}, method = 'POST') {
        const response = await fetch(`${this.baseURL}/${endpoint}`, {
            method, 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });
        const data = await response.json();
        if (!response.ok || data.error) throw new Error(data.error?.message);
        return data;
    }
}
```

### Order Book Aggregation (DEX)
See [dex/api.js](dex/api.js) `aggregateOrdersByPrice()` - groups market orders by price level for order book display.

### Price Calculation from Nexus Orders
Nexus market orders have complex structure. See [dex/utils.js](dex/utils.js) `calculatePriceFromOrder()` for conversion logic handling `contract.amount`/`order.amount` ratios and NXS divisibility (1 NXS = 1,000,000 base units).

## Styling Conventions

- **Color scheme**: Dark theme (`--bg-dark: #0a0a0f`) with orange gradients (`--primary-color: #FF6B35`)
- **Responsive**: Mobile-first with media queries
- **CSS variables**: Defined in `:root` selector in each app's CSS
- **No preprocessors**: Pure CSS3

## Documentation References

- `Nexus API docs/` - Complete API reference with command sets (ASSETS, MARKET, FINANCE, etc.)
- `q-wallet docs/DAPP-INTEGRATION.md` - Wallet connection guide
- `{app}/README.md` - App-specific documentation
- `fantasyfootball/ASSET_STANDARD.md` - NFT metadata format
- `dex/TRADE_FEATURE.md` - Trading implementation details
- `ship-engineering/README.md` - AI ship engineering research overview

## App-Specific Notes

### Content Verification (`/content-verification/`)
- **Purpose**: Verify content provenance via blockchain registration
- **Pattern**: Search for assets with `distordia: "content"` attribute and matching URL
- **API Usage**: `register/list/assets:asset` with client-side filtering
- **No Wallet**: Read-only app, no authentication required

### Masterdata (`/masterdata/`)
- **Purpose**: Create and manage product NFTs (catalog/inventory system)
- **Authentication**: Requires Q-Wallet connection only
- **Asset Creation**: `assets/create/asset` with JSON product data via Q-Wallet
- **See**: [masterdata/api.js](masterdata/api.js) for Q-Wallet API wrapper

### Swap (`/swap/`)
- **Purpose**: Cross-chain bridge between Solana (USDC) and Nexus (USDD)
- **Exchange**: 1:1 ratio with 0.5% bridge fee
- **Wallets**: Phantom (Solana) + Q-Wallet/manual address entry (Nexus)
- **Status**: Frontend prototype - production requires smart contracts
- **Non-Custodial**: Lock-and-mint mechanism (planned)

### Ship Engineering (`/ship-engineering/`)
- **Purpose**: Static research showcase for AI-powered ship design
- **No Blockchain**: Pure informational site, no API integration
- **Features**: Scroll animations, intersection observers, smooth scrolling
- **Content Focus**: AI agent architecture, design authority agents, blockchain governance

## Key Gotchas

1. **NXS divisibility**: 1 NXS = 1,000,000 base units. Always check `contract.ticker` and divide by 1e6 for NXS amounts.
2. **API always POST**: Even GET-like operations use POST method.
3. **Script load order**: In multi-file apps, dependencies must load before dependents (config → API → state → logic).
4. **Q-Wallet async**: Wait for `window.nexus` injection with timeout loop (see `auth.js` files).
5. **Data in .result**: Nexus API wraps response data in `{ result: {...} }` object.
