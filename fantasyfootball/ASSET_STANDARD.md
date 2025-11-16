# Fantasy Football NFT Asset Standard

## Asset Naming Convention

Player assets are registered as **tokens with local names**, then linked under the **distordia** namespace.

### Format:
1. **Local Asset Name**: `player.{league}.{team}.{playerid}` (e.g., `player.epl.mancity.haaland`)
2. **Namespace Link**: `distordia:{localName}` (e.g., `distordia:player.epl.mancity.haaland`)

### Examples:
- Local: `player.epl.mancity.haaland` → Namespace: `distordia:player.epl.mancity.haaland`
- Local: `player.laliga.realmadrid.vinicius` → Namespace: `distordia:player.laliga.realmadrid.vinicius`
- Local: `player.seriea.inter.martinez` → Namespace: `distordia:player.seriea.inter.martinez`

> **Note**: Assets are created and registered manually outside the website. The website only fetches, lists, and trades existing tokens.

## Asset Metadata Standard

Each player NFT contains the following metadata stored on-chain:

```json
{
  "standard": "distordia.player.v1",
  "player": {
    "id": "haaland",
    "name": "Erling Haaland",
    "realWorldId": "1100",
    "nationality": "Norway",
    "birthDate": "2000-07-21"
  },
  "team": {
    "id": "mancity",
    "name": "Manchester City",
    "league": "epl",
    "leagueName": "Premier League"
  },
  "position": "FWD",
  "attributes": {
    "overall": 91,
    "pace": 89,
    "shooting": 94,
    "passing": 75,
    "dribbling": 80,
    "defending": 45,
    "physical": 88
  },
  "rarity": "legendary",
  "season": "2024-2025",
  "stats": {
    "goals": 0,
    "assists": 0,
    "cleanSheets": 0,
    "appearances": 0,
    "weekPoints": 0,
    "totalPoints": 0
  }
}
```

## Rarity Levels

| Rarity | Player Rating | Drop Rate |
|--------|--------------|-----------|
| Common | 60-74 | 50% |
| Rare | 75-84 | 30% |
| Epic | 85-89 | 15% |
| Legendary | 90+ | 5% |

## Position Codes

- **GK**: Goalkeeper
- **DEF**: Defender
- **MID**: Midfielder
- **FWD**: Forward

## Supported Leagues

| Code | League Name | Country |
|------|------------|---------|
| epl | Premier League | England |
| laliga | La Liga | Spain |
| bundesliga | Bundesliga | Germany |
| seriea | Serie A | Italy |
| ligue1 | Ligue 1 | France |

## How to Work with Player Assets (Website Functionality)

The website provides three core functions for player tokens:

### 1. Fetch Player Assets

Retrieve all player assets from the blockchain using the register API (public access):

```javascript
POST /register/list/names
{
  "where": "object.namespace = 'distordia' AND object.name LIKE 'player.%'",
  "limit": 1000
}
```

**Response includes:**
- `address` - Asset address (used as player ID)
- `name` - Local name (e.g., `player.epl.mancity.haaland`)
- `namespace` - Always `distordia`
- `data` - Player metadata (JSON string)

> **Note**: Use `/register/list/names` for public access. The `/names/list/name` endpoint only returns assets owned by the logged-in user.

### 2. List Player Orders

View all players available for sale on the market:

```javascript
POST /market/list/order
{
  "where": "object.market = 'PLAYER/NXS'",
  "limit": 100
}
```

**Returns active sell orders with:**
- `txid` - Order transaction ID
- `asset` - Asset address or namespace name
- `price` - Price in satoshis (1 NXS = 1,000,000 satoshis)
- `amount` - Quantity (always 1 for player NFTs)
- `owner` - Seller's address

### 3. Trade Players

**Buy a player:**
```javascript
POST /market/execute/order
{
  "pin": "YOUR_PIN",
  "session": "YOUR_SESSION",
  "txid": "ORDER_TXID"
}
```

**Sell a player:**
```javascript
POST /market/create/order
{
  "pin": "YOUR_PIN",
  "session": "YOUR_SESSION",
  "name_from": "distordia",
  "name_to": "player.epl.mancity.haaland",
  "price": 100000000,
  "amount": 1,
  "market": "PLAYER/NXS"
}
```

## Asset Registration (Manual - Outside Website)

Assets are created manually by administrators using:

**Step 1: Create the token**
```javascript
POST /assets/create/token
{
  "pin": "ADMIN_PIN",
  "session": "ADMIN_SESSION",
  "name": "player.epl.mancity.haaland",
  "data": "{metadata_json}",
  "supply": 1,
  "decimals": 0
}
```

**Step 2: Link to namespace**
```javascript
POST /names/create/name
{
  "pin": "ADMIN_PIN",
  "session": "ADMIN_SESSION",
  "name": "player.epl.mancity.haaland",
  "namespace": "distordia",
  "address": "ASSET_ADDRESS_FROM_STEP_1"
}
```

This creates: `distordia:player.epl.mancity.haaland`

## Stats Updates (Manual - Outside Website)

Player stats are updated periodically by administrators:

```javascript
POST /assets/update/asset
{
  "pin": "ADMIN_PIN",
  "session": "ADMIN_SESSION",
  "address": "ASSET_ADDRESS",
  "data": "{updated_metadata_json}"
}
```

## Points Calculation

Points are calculated according to the scoring rules and stored in the `stats.weekPoints` and `stats.totalPoints` fields of the asset metadata.
