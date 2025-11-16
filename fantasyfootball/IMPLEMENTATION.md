# Fantasy Football - Nexus Blockchain Integration

## Overview

The fantasy football platform now integrates with the Nexus blockchain to use tokenized player assets (NFTs) that can be bought, sold, and traded through the Nexus market API.

## Implementation Summary

### 1. Asset Standard (ASSET_STANDARD.md)

Defined a standardized format for player NFTs:

**Naming Convention:**
```
distordia:player:{league}:{team}:{playerid}
```

**Examples:**
- `distordia:player:epl:mancity:haaland`
- `distordia:player:laliga:realmadrid:vinicius`

**Metadata Structure:**
- Player info (name, real-world ID, nationality, birth date)
- Team info (team name, league)
- Position (GK, DEF, MID, FWD)
- Attributes (overall, pace, shooting, passing, etc.)
- Rarity levels (common, rare, epic, legendary)
- Season stats (goals, assists, points, appearances)

### 2. Updated fantasy.js

**API Endpoints Added:**
- `/register/list/assets` - Fetch all player NFTs from blockchain
- `/market/create/order` - List players for sale
- `/market/execute/order` - Buy players from market
- `/market/list/order` - View active market orders
- `/market/list/executed` - View trade history

**Key Functions:**

#### Asset Loading
- `fetchPlayerAssets()` - Fetches all registered player NFTs from the distordia namespace
- `parsePlayerAsset()` - Parses blockchain data into player objects
- `calculatePlayerValue()` - Calculates player value based on stats and rarity

#### Market Integration
- `fetchPlayerMarketOrders()` - Lists all players available for purchase
- `buyPlayerFromMarket()` - Executes a market order to buy a player
- `listPlayerForSale()` - Creates a sell order for a player
- `fetchTradeHistory()` - Gets historical trade data

### 3. Registration Tool (register-players.js)

A utility script to register player NFTs on the blockchain:

**Features:**
- Sample player data for 5 legendary/epic players
- Generates complete metadata according to the standard
- Registers assets using `/register/create/token` API
- Batch registration with rate limiting

**Usage:**
```javascript
// In browser console after loading the script:
registerAllPlayers('YOUR_PIN', 'YOUR_SESSION')
```

## How It Works

### Player Asset Flow

1. **Registration** (One-time)
   - Admin registers players as tokens on Nexus blockchain
   - Each player gets a unique asset name following the standard
   - Metadata includes all player info and stats

2. **Discovery**
   - Website fetches all registered players using `/register/list/assets`
   - Filters for assets with `distordia:player:*` naming pattern
   - Parses metadata to display player cards

3. **Market Trading**
   - Players can list their player NFTs for sale using `/market/create/order`
   - Buyers browse available players using `/market/list/order`
   - Purchase executes on-chain using `/market/execute/order`
   - NFT ownership transfers automatically

4. **Team Building**
   - Users select their owned players to build fantasy teams
   - Points calculated based on real-world performance
   - Weekly competitions and leaderboards

### Technical Details

**Data Flow:**
```
Nexus Blockchain
    ↓ (Register API)
Player Assets (NFTs)
    ↓ (Market API)
Buy/Sell Orders
    ↓ (Website)
Fantasy Teams & Gameplay
```

**Asset Address:**
Each registered player gets a unique blockchain address that serves as the asset ID.

**Price Format:**
Prices are stored in satoshis (1 NXS = 1,000,000 satoshis) and converted for display.

**Authentication:**
Market transactions require:
- `pin` - User's PIN code
- `session` - Active session token from login

## Next Steps

### To Deploy:

1. **Register Initial Players**
   - Run `register-players.js` with admin credentials
   - Register at least 100+ players across different leagues/positions

2. **Market Seeding**
   - Create initial sell orders for players
   - Set competitive pricing based on rarity and stats

3. **User Authentication**
   - Implement Nexus wallet connection
   - Allow users to login with their Nexus accounts
   - Store session tokens securely

4. **Stats Updates**
   - Set up cron job to fetch real-world match data
   - Update player metadata weekly with new stats
   - Recalculate points according to scoring rules

5. **Testing**
   - Test asset fetching from blockchain
   - Test market order creation and execution
   - Verify NFT ownership transfers correctly

### Future Enhancements:

- **Pack Opening**: Buy randomized player packs
- **Trading**: Direct peer-to-peer player swaps
- **Tournaments**: Entry fee pools with prize distribution
- **Staking**: Stake NXS to earn special player cards
- **Achievements**: NFT badges for milestones

## API Reference

### Fetch All Players
```javascript
POST /register/list/assets
{
  "where": "object.name LIKE 'distordia:player:%'",
  "limit": 1000
}
```

### List Player for Sale
```javascript
POST /market/create/order
{
  "pin": "1234",
  "session": "abc123",
  "asset": "distordia:player:epl:mancity:haaland",
  "price": 100000000,  // 100 NXS in satoshis
  "amount": 1,
  "market": "PLAYER/NXS"
}
```

### Buy Player
```javascript
POST /market/execute/order
{
  "pin": "1234",
  "session": "abc123",
  "txid": "ORDER_TRANSACTION_ID"
}
```

### View Market Orders
```javascript
POST /market/list/order
{
  "where": "object.market = 'PLAYER/NXS'",
  "limit": 100
}
```

## Files Modified

- `fantasyfootball/fantasy.js` - Main application with blockchain integration
- `fantasyfootball/ASSET_STANDARD.md` - Player NFT specification
- `fantasyfootball/register-players.js` - Asset registration utility
- `fantasyfootball/IMPLEMENTATION.md` - This documentation

## Testing Checklist

- [ ] Verify `/register/list/assets` returns registered players
- [ ] Confirm metadata parsing works correctly
- [ ] Test market order creation (requires auth)
- [ ] Test market order execution (requires auth)
- [ ] Verify asset ownership after purchase
- [ ] Check price conversions (satoshis ↔ NXS)
- [ ] Validate asset name format compliance
- [ ] Test fallback to demo data when no assets found
