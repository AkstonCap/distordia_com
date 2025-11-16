# Fantasy Football API Guide

## Overview

The fantasy football website interacts with player NFTs on the Nexus blockchain through three core operations:

1. **Fetch** - Retrieve all player assets
2. **List** - View players for sale
3. **Trade** - Buy/sell players

## Player Asset Format

**Local Name**: `player.{league}.{team}.{playerid}`
- Example: `player.epl.mancity.haaland`

**Namespace**: `distordia`

**Full Name**: `distordia:player.{league}.{team}.{playerid}`
- Example: `distordia:player.epl.mancity.haaland`

## 1. Fetch All Players

Retrieves all player assets from the `distordia` namespace using the register API (public access).

### API Call
```javascript
POST /register/list/names
{
  "where": "object.namespace = 'distordia' AND object.name LIKE 'player.%'",
  "limit": 1000
}
```

> **Important**: Use `/register/list/names` for public access to all registered assets. The `/names/list/name` endpoint only returns assets owned by the authenticated user.

### Response
```json
{
  "result": [
    {
      "address": "8ByH...abc123",
      "name": "player.epl.mancity.haaland",
      "namespace": "distordia",
      "data": "{...metadata json...}",
      "created": 1234567890
    }
  ]
}
```

### Usage
```javascript
const response = await fetch('https://api.distordia.com/register/list/names', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    where: "object.namespace = 'distordia' AND object.name LIKE 'player.%'",
    limit: 1000
  })
});

const data = await response.json();
const players = data.result.map(name => {
  const metadata = JSON.parse(name.data);
  return {
    address: name.address,
    localName: name.name,
    fullName: `${name.namespace}:${name.name}`,
    playerName: metadata.player.name,
    position: metadata.position,
    team: metadata.team.name,
    // ... other metadata fields
  };
});
```

## 2. List Market Orders

View all players currently for sale on the market.

### API Call
```javascript
POST /market/list/order
{
  "where": "object.market = 'PLAYER/NXS'",
  "limit": 100
}
```

### Response
```json
{
  "result": [
    {
      "txid": "01ab...xyz",
      "address": "8ByH...abc123",
      "price": 100000000,
      "amount": 1,
      "owner": "a1bc...seller",
      "timestamp": 1234567890,
      "market": "PLAYER/NXS"
    }
  ]
}
```

### Usage
```javascript
const response = await fetch('https://api.distordia.com/market/list/order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    where: "object.market = 'PLAYER/NXS'",
    limit: 100
  })
});

const data = await response.json();
const orders = data.result.map(order => ({
  orderId: order.txid,
  assetAddress: order.address,
  priceNXS: order.price / 1000000,  // Convert satoshis to NXS
  seller: order.owner
}));
```

## 3. Trade Players

### Buy a Player

Execute an existing market order to purchase a player.

**API Call**
```javascript
POST /market/execute/order
{
  "pin": "1234",
  "session": "abc123...",
  "txid": "01ab...xyz"  // Order transaction ID from market listing
}
```

**Usage**
```javascript
const response = await fetch('https://api.distordia.com/market/execute/order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    pin: userPin,
    session: userSession,
    txid: orderId
  })
});

const result = await response.json();
if (result.result) {
  console.log('Purchase successful!', result.result.txid);
}
```

### Sell a Player

Create a new market order to list your player for sale.

**API Call**
```javascript
POST /market/create/order
{
  "pin": "1234",
  "session": "abc123...",
  "name_from": "distordia",
  "name_to": "player.epl.mancity.haaland",
  "price": 100000000,  // 100 NXS in satoshis
  "amount": 1,
  "market": "PLAYER/NXS"
}
```

**Usage**
```javascript
const priceInSatoshis = 100 * 1000000;  // 100 NXS

const response = await fetch('https://api.distordia.com/market/create/order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    pin: userPin,
    session: userSession,
    name_from: 'distordia',
    name_to: 'player.epl.mancity.haaland',
    price: priceInSatoshis,
    amount: 1,
    market: 'PLAYER/NXS'
  })
});

const result = await response.json();
if (result.result) {
  console.log('Listed for sale!', result.result.txid);
}
```

## Player Metadata Format

Each player asset contains metadata in the `data` field:

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
    "goals": 12,
    "assists": 5,
    "cleanSheets": 0,
    "appearances": 15,
    "weekPoints": 18,
    "totalPoints": 254
  }
}
```

## Price Conversion

Nexus uses satoshis (smallest unit) for prices:
- **1 NXS = 1,000,000 satoshis**
- To convert NXS to satoshis: `price * 1000000`
- To convert satoshis to NXS: `price / 1000000`

## Authentication

Trading operations require:
- `pin`: User's PIN code (numeric)
- `session`: Active session token from login

To get a session token:
```javascript
POST /users/login/user
{
  "username": "your_username",
  "password": "your_password",
  "pin": "1234"
}
```

## Complete Example

```javascript
// 1. Fetch all players
async function loadPlayers() {
  const response = await fetch('https://api.distordia.com/register/list/names', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      where: "object.namespace = 'distordia' AND object.name LIKE 'player.%'",
      limit: 1000
    })
  });
  
  const data = await response.json();
  return data.result;
}

// 2. View market orders
async function getMarketListings() {
  const response = await fetch('https://api.distordia.com/market/list/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      where: "object.market = 'PLAYER/NXS'",
      limit: 100
    })
  });
  
  const data = await response.json();
  return data.result;
}

// 3. Buy a player
async function buyPlayer(orderId, pin, session) {
  const response = await fetch('https://api.distordia.com/market/execute/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pin: pin,
      session: session,
      txid: orderId
    })
  });
  
  return await response.json();
}

// 4. Sell a player
async function sellPlayer(localName, priceNXS, pin, session) {
  const response = await fetch('https://api.distordia.com/market/create/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pin: pin,
      session: session,
      name_from: 'distordia',
      name_to: localName,
      price: priceNXS * 1000000,
      amount: 1,
      market: 'PLAYER/NXS'
    })
  });
  
  return await response.json();
}
```

## Summary

| Operation | Endpoint | Authentication | Purpose |
|-----------|----------|----------------|---------|
| Fetch Players | `/register/list/names` | No | Get all player assets (public) |
| List Orders | `/market/list/order` | No | View players for sale |
| Buy Player | `/market/execute/order` | Yes | Purchase a player |
| Sell Player | `/market/create/order` | Yes | List player for sale |

The website focuses on these three core operations - all asset creation and registration happens manually outside the website.

> **Note**: The `/names/list/name` and `/assets/list/asset` endpoints only return assets owned by the authenticated user. Use the `/register/list/names` endpoint to fetch all publicly registered assets.
