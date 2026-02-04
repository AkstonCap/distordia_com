# Distordia Fantasy Football

A blockchain-powered fantasy football platform that connects Nexus NFT assets with real-world football player performance. Features pack shop, weekly leagues, and P2P marketplace - all fully on-chain.

## 🎮 Overview

Distordia Fantasy Football is an innovative platform where players own NFT assets on the Nexus blockchain, each representing a real football player. These assets earn points based on the actual performance of the players in real-life matches, creating a unique bridge between blockchain technology and traditional sports.

**Revenue Model**: Distordia earns NXS through pack sales, marketplace fees (5%), and league entry fees (15%).

## ✨ Features

### 🎁 Pack Shop (Primary Revenue)
- **Bronze Pack (5 NXS)**: 3 Common + 20% chance Rare
- **Silver Pack (15 NXS)**: 2 Common + 2 Rare + 15% Epic
- **Gold Pack (50 NXS)**: 1 Rare + 2 Epic + 10% Legendary
- **Limited Edition (100 NXS)**: Event-specific cards

### 🏆 Weekly Leagues
- **Entry Fee**: 10 NXS (85% to prize pool, 15% to Distordia)
- **Prize Distribution**: 1st: 50%, 2nd: 30%, 3rd: 20%
- **Team Selection**: Choose 11 players in 4-4-2 formation
- **Captain**: Selected player earns 2x points

### 🏪 Marketplace
- **5% Fee**: On all P2P trades
- **Order Book**: Uses Nexus Market API
- **Instant Settlement**: On-chain transfers

### 💎 NFT Asset Integration
- **Blockchain Assets**: Each player NFT is stored on Nexus blockchain
- **Real Ownership**: Assets are verifiable on-chain tokens
- **Tradeable**: Buy, sell, and trade player NFTs on the marketplace
- **Rarity Levels**: Common, Rare, Epic, and Legendary player cards

### ⚽ Real-Time Scoring
- **Live Match Updates**: Real-time scores from ongoing football matches
- **Performance-Based Points**: Players earn points for goals, assists, clean sheets, etc.
- **Weekly Competitions**: Compete for prizes in weekly leaderboards
- **Historical Stats**: Track player performance over time

## 🔄 State Machines

See [STATE_MACHINES.md](STATE_MACHINES.md) for detailed flow diagrams:

1. **Pack Purchase Flow**: IDLE → SELECT_PACK → CHECK_WALLET → CONFIRM_PRICE → SIGN_TX → AWAIT_ORACLE → REVEAL → COMPLETE
2. **Marketplace Flow**: BROWSE → VIEW_LISTING → EXECUTE_ORDER → SUCCESS
3. **League Entry Flow**: SELECT_LEAGUE → CHECK_ROSTER → SELECT_TEAM → SET_CAPTAIN → PAY_ENTRY → ENTERED
4. **Stats Oracle Flow**: Automated daemon that updates player stats after matches

## 🎯 Scoring System

### Goals & Assists
- **Forward Goal**: +8 points
- **Midfielder Goal**: +10 points
- **Defender/GK Goal**: +12 points
- **Assist**: +6 points

### Defense
- **Clean Sheet (GK/DEF)**: +8 points
- **Clean Sheet (MID)**: +4 points
- **Goalkeeper Save**: +2 points
- **Penalty Saved**: +10 points

### Penalties
- **Yellow Card**: -2 points
- **Red Card**: -6 points
- **Own Goal**: -4 points
- **Penalty Missed**: -4 points

### Playing Time
- **60+ Minutes**: +4 points
- **30-59 Minutes**: +2 points
- **Man of the Match**: +6 points

## 💰 Revenue Breakdown

| Stream | Rate | Description |
|--------|------|-------------|
| Pack Sales | 100% | All pack revenue goes to Distordia |
| Market Fees | 5% | Fee on every P2P sale |
| League Entry | 15% | Platform fee on league entries |

**Example Monthly Revenue (100 active users)**:
- Pack Sales: ~2,000+ NXS
- Market Fees: ~500+ NXS
- League Entries: ~300+ NXS

## 🔧 Technical Implementation

### Blockchain Integration

The platform integrates with the Nexus blockchain using the official API endpoints.

```javascript
// Nexus API base URL
const NEXUS_API_BASE = 'https://api.distordia.com';

// Key Endpoints
const NEXUS_ENDPOINTS = {
    // Register API - for listing public player assets
    listNames: `${NEXUS_API_BASE}/register/list/names`,
    listAssets: `${NEXUS_API_BASE}/register/list/assets`,
    
    // Assets API - for asset details
    getAsset: `${NEXUS_API_BASE}/assets/get/asset`,
    
    // Market API - for trading
    createOrder: `${NEXUS_API_BASE}/market/create/order`,
    executeOrder: `${NEXUS_API_BASE}/market/execute/order`,
    
    // Finance API - for payments
    debitAccount: `${NEXUS_API_BASE}/finance/debit/account`
};
```

### Player Card Asset (JSON Format)

```json
{
  "standard": "distordia.player.v1",
  "playerId": "haaland",
  "playerName": "Erling Haaland",
  "team": "mancity",
  "league": "epl",
  "position": "FWD",
  "rarity": "legendary",
  "overall": 91,
  "season": "2025-2026",
  "weekPoints": 32,
  "totalPoints": 458,
  "goals": 24,
  "assists": 8
}
```
  - Returns: Asset object with all fields and values

- **`assets/create/asset`** - Creates a new NFT asset (for minting player cards)
  - Requires: `session`, `pin`, `format` (JSON or basic)
  - Parameters: Asset fields (playerName, team, position, etc.)

#### User Authentication

To access user-specific assets, the Nexus API requires authentication:

```javascript
// 1. Create a session (login)
const loginResponse = await fetch(`${NEXUS_API_BASE}/sessions/create/local`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        username: 'user',
        password: 'pass',
        pin: '1234'
    })
});

// 2. Use session to list assets
const assetsResponse = await fetch(`${NEXUS_API_BASE}/assets/list/asset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        session: sessionId,
        limit: 100
    })
});
```

**Note**: All Nexus API requests use **POST** method with JSON body. Responses contain data in a `result` object.

### Football Data Integration

The platform integrates with football APIs to fetch:
- Live match scores
- Player statistics (goals, assists, cards)
- Team lineups and formations
- Match schedules and results

### Points Calculation Algorithm

```javascript
function calculatePoints(player, matchStats) {
    let points = 0;
    
    // Goals
    if (matchStats.goals > 0) {
        const pointsPerGoal = SCORING_RULES.goal[player.position];
        points += matchStats.goals * pointsPerGoal;
    }
    
    // Assists
    points += matchStats.assists * SCORING_RULES.assist;
    
    // Clean sheets
    if (matchStats.cleanSheet && player.position !== 'FWD') {
        points += SCORING_RULES.cleanSheet[player.position];
    }
    
    // Minutes played
    if (matchStats.minutesPlayed >= 60) {
        points += SCORING_RULES.minutesPlayed[60];
    } else if (matchStats.minutesPlayed >= 30) {
        points += SCORING_RULES.minutesPlayed[30];
    }
    
    // Penalties
    points += matchStats.yellowCards * SCORING_RULES.yellowCard;
    points += matchStats.redCards * SCORING_RULES.redCard;
    
    return points;
}
```

## 📁 File Structure

```
fantasyfootball/
├── index.html          # Main fantasy football interface
├── fantasy.css         # Football-themed styling
├── fantasy.js          # Game logic and blockchain integration
└── README.md           # This file
```

## 🚀 Getting Started

### Prerequisites

1. **Nexus Wallet**: Required to own and trade NFT assets
2. **NXS Tokens**: For purchasing player NFTs on the marketplace

### How to Play

1. **Connect Wallet**
   - Connect your Nexus wallet to the platform
   - View your owned player NFT assets

2. **Build Your Team**
   - Select up to 11 players from your assets
   - Arrange them in a valid formation (1 GK, 4 DEF, 4 MID, 2 FWD)

3. **Earn Points**
   - Your players automatically earn points from real matches
   - Points are calculated based on actual player performance

4. **Compete & Win**
   - Climb the leaderboard rankings
   - Win weekly prizes in NXS tokens
   - Earn exclusive NFT rewards

## 🎨 Customization

### Team Formation

Edit the formation layout in `index.html`:

```html
<div class="formation-row defenders">
    <!-- Adjust number of defender slots -->
    <div class="position-slot" data-position="DEF"></div>
    <div class="position-slot" data-position="DEF"></div>
    <!-- Add more as needed -->
</div>
```

### Scoring Rules

Modify point values in `fantasy.js`:

```javascript
const SCORING_RULES = {
    goal: { FWD: 8, MID: 10, DEF: 12, GK: 12 },
    assist: 6,
    // Adjust other rules as needed
};
```

## 🔗 API Endpoints

### Nexus Blockchain API

According to the official Nexus API documentation, the following endpoints are used:

#### Assets API (NFT Player Cards)
- **`assets/list/asset`** - List all assets owned by logged-in user
  - Requires: `session` (user authentication)
  - Optional: `limit`, `page`, filters
  
- **`assets/get/asset`** - Get details of a specific asset
  - Parameters: `name` or `address`
  - Returns: Full asset object with metadata
  
- **`assets/create/asset`** - Create new NFT asset (admin/minting only)
  - Requires: `session`, `pin`, `format`
  - Parameters: Asset schema fields

#### Sessions API (Authentication)
- **`sessions/create/local`** - Login and create session
  - Parameters: `username`, `password`, `pin`
  - Returns: `session` ID and `genesis` hash

#### System API (Network Info)
- **`system/get/info`** - Get node and network information
  - Returns: Block height, connections, version, timestamp

### Football Data API

External football data API integration for real-world match data:

- **Live Fixtures**: Real-time match scores and events
- **Player Statistics**: Goals, assists, cards, minutes played
- **Team Lineups**: Starting XI and formations
- **Match Results**: Historical performance data

### On-Chain Only

This platform operates **fully on-chain**:
- All player assets are stored on the Nexus blockchain
- Match data and stats come from on-chain assets updated by the Distordia oracle
- Leaderboard entries are blockchain assets
- Market orders use the native Nexus Market API
- No fallback demo data - if data isn't on-chain, it won't display

## 💡 Future Enhancements

Planned features for future releases:

- [ ] Multi-league support (Premier League, La Liga, etc.)
- [ ] Team vs Team challenges
- [ ] Private leagues for friends
- [ ] NFT card breeding/fusion
- [ ] Historical season archives
- [ ] Mobile app version
- [ ] Live match commentary integration
- [ ] Player performance predictions using AI
- [ ] Staking rewards for long-term holders

## 🎮 Game Mechanics

### Weekly Competition Cycle

1. **Monday-Friday**: Build and adjust your team
2. **Weekend**: Matches are played, points are earned
3. **Sunday Night**: Final calculations and leaderboard update
4. **Monday**: Prize distribution and new week begins

### Asset Value Dynamics

Player NFT values fluctuate based on:
- Recent performance (points earned)
- Real-world transfer news
- Injury status
- Form and consistency
- Market demand

## 🛡️ Security

- **Non-Custodial**: Your NFTs remain in your wallet
- **Read-Only API**: No unauthorized transactions
- **Blockchain Verification**: All asset ownership is on-chain
- **Transparent Scoring**: All calculations are visible and auditable

## 📊 Statistics & Analytics

Track detailed metrics:
- Total points by position
- Best performing assets
- ROI on NFT purchases
- Historical team performance
- Player consistency ratings

## 🤝 Community

- **Discord**: Join strategy discussions
- **Twitter**: Follow for match updates
- **GitHub**: Contribute to the platform
- **Forum**: Share tips and team suggestions

## 📄 License

Part of the Distordia Crypto Lab project. See main repository for license details.

## 📧 Support

For questions or issues:
- Email: contact@distordia.com
- GitHub: [distordia](https://github.com/distordia)
- Twitter: [@distordia](https://twitter.com/distordia)

---

⚽ Built with passion for football and blockchain technology by Distordia Crypto Lab
