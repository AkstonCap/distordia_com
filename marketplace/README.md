# NFT Marketplace

On-chain NFT marketplace for the Nexus blockchain. Mint, tokenize, and trade digital art and collectible assets with fractional ownership support.

## Overview

The NFT Marketplace allows users to:

1. **Mint NFTs** — Create on-chain assets with metadata (name, description, category) and an open image URL
2. **Tokenize NFTs** — Link a fungible token to the asset, enabling fractional ownership and on-chain trading
3. **List for Sale** — Create ask orders on the Nexus Market API (TOKEN/NXS pair)
4. **Buy NFTs** — Execute existing ask orders to purchase NFT tokens
5. **Transfer** — Direct peer-to-peer asset transfers

## Architecture

```
marketplace/
├── index.html        # Main page (gallery, modals, forms)
├── marketplace.css   # All styles (cards, grid, modals, responsive)
├── api.js            # NexusAPI class — blockchain interactions
├── auth.js           # WalletAuth class — Q-Wallet connection
├── marketplace.js    # NFTMarketplace class — UI logic and event handling
└── README.md         # This file
```

### Script Load Order

```html
<script src="api.js"></script>        <!-- API layer (no dependencies) -->
<script src="auth.js"></script>       <!-- Wallet auth (uses api.js notifications) -->
<script src="marketplace.js"></script> <!-- Main app (depends on both above) -->
```

## NFT Asset Standard

Each NFT is stored as a Nexus `asset` register with `basic` format:

| Field           | Description                              | Required |
|-----------------|------------------------------------------|----------|
| `distordia-type`| Always `"nft"`                           | Yes      |
| `status`        | `"active"` or `"burned"`                 | Yes      |
| `nft-name`      | Display name of the NFT                  | Yes      |
| `description`   | Description (max 256 chars)              | Yes      |
| `image`         | Public image URL (PNG, JPG, GIF, etc.)   | Yes      |
| `category`      | Category: art, photography, music, etc.  | Yes      |
| `collection`    | Collection name                          | No       |
| `creator`       | Artist/creator name                      | No       |
| `external_url`  | Link to more info                        | No       |

**Asset name format:** `nft-{slugified-name}-{timestamp}`

### Image Hosting

NFT images are **not stored on this site or on-chain**. The `image` field must be a publicly accessible URL to the image. Supported formats: PNG, JPG, GIF, SVG, WebP.

## Trading Flow (Tokenization Required)

Nexus requires assets to be **tokenized** before they can be traded on the on-chain market. Here's the full flow:

### Step 1: Create Token

```
finance/create/token
  name: "MYNFT"
  supply: 1          (1 = unique, >1 = fractional)
  decimals: 0
```

Cost: 1 NXS + 1 NXS for global name

### Step 2: Tokenize Asset

```
assets/tokenize/asset
  address: <asset-register-address>
  token: "MYNFT"
```

This links the token to the asset. Token holders now represent ownership.

### Step 3: List for Sale (Ask Order)

```
market/create/ask
  market: "MYNFT/NXS"
  price: 10.0
  amount: 1
  from: <your-token-account>
  to: <your-nxs-account>
```

### Step 4: Buy (Execute Order)

```
market/execute/order
  txid: <ask-order-txid>
  from: <buyer-nxs-account>
  to: <buyer-token-account>
```

### Fractional Ownership

If a token has supply > 1, multiple users can own fractions. Check ownership with:

```
assets/list/partial        — lists all partial ownership for user
assets/verify/partial      — verify if a token is linked to an asset
```

## API Endpoints Used

| Endpoint                      | Purpose                          |
|-------------------------------|----------------------------------|
| `assets/create/asset`         | Mint new NFT                     |
| `register/list/assets:asset`  | Browse all NFTs (public)         |
| `assets/list/asset`           | List user's own assets           |
| `assets/get/asset`            | Get single asset details         |
| `assets/tokenize/asset`       | Tokenize an asset                |
| `assets/transfer/asset`       | Direct transfer to another user  |
| `assets/history/asset`        | View asset ownership history     |
| `assets/list/partial`         | List fractional ownership        |
| `assets/verify/partial`       | Verify tokenized asset           |
| `finance/create/token`        | Create token for tokenization    |
| `market/create/ask`           | List tokens for sale             |
| `market/create/bid`           | Place buy order                  |
| `market/execute/order`        | Fill an existing order           |
| `market/cancel/order`         | Cancel an active order           |
| `market/list/order`           | Browse market orders             |
| `market/user/order`           | View user's own orders           |

## Q-Wallet Integration

All write operations (mint, tokenize, list, buy, cancel, transfer) go through the Q-Wallet browser extension using `executeBatchCalls`. This ensures:

- User approves each transaction with their PIN
- No private keys or sessions are handled by the site
- All transactions are signed client-side

Read operations (browsing, searching) use direct API calls to `https://api.distordia.com` and require no wallet connection.

## Costs

| Action              | Approximate Cost |
|---------------------|-----------------|
| Mint NFT            | ~2 NXS          |
| Create Token        | ~2 NXS          |
| Tokenize            | ~0.01 NXS       |
| Create Market Order | ~0.01 NXS       |
| Execute Order       | ~0.01 NXS       |

## Development

No build tools required. Serve with any static HTTP server:

```bash
cd marketplace
python -m http.server 8000
# Open http://localhost:8000/
```

Or navigate to `https://distordia.com/marketplace/` for the live version.
