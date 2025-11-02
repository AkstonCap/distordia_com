# Distordia Fantasy Football

A blockchain-powered fantasy football platform that connects Nexus.io NFT assets with real-world football player performance.

## 🎮 Overview

Distordia Fantasy Football is an innovative platform where players own NFT assets on the Nexus blockchain, each representing a real football player. These assets earn points based on the actual performance of the players in real-life matches, creating a unique bridge between blockchain technology and traditional sports.

## ✨ Features

### 🏆 Team Management
- **11-Player Formation**: Build your squad with GK, DEF, MID, and FWD positions
- **Visual Pitch Display**: Interactive football field showing your team formation
- **Drag-and-Drop Interface**: Easy player selection and team building
- **Auto-Fill Feature**: Automatically populate your team with highest-scoring assets

### 💎 NFT Asset Integration
- **Blockchain Assets**: Each player NFT is stored on Nexus.io blockchain
- **Real Ownership**: Assets are verifiable on-chain tokens
- **Tradeable**: Buy, sell, and trade player NFTs on the marketplace
- **Rarity Levels**: Common, Rare, Epic, and Legendary player cards

### ⚽ Real-Time Scoring
- **Live Match Updates**: Real-time scores from ongoing football matches
- **Performance-Based Points**: Players earn points for goals, assists, clean sheets, etc.
- **Weekly Competitions**: Compete for prizes in weekly leaderboards
- **Historical Stats**: Track player performance over time

### 📊 Leaderboard System
- **Weekly Rankings**: See how your team stacks up against others
- **Monthly Competition**: Long-term strategy rewards
- **All-Time Leaders**: Hall of fame for best managers
- **Prize Pools**: Win NXS tokens and exclusive NFT rewards

### 🏪 Marketplace
- **Buy Player NFTs**: Purchase new players to strengthen your squad
- **Filter & Search**: Find players by league, position, or performance
- **Price Discovery**: Market-driven pricing for all assets
- **Instant Transactions**: Seamless Nexus blockchain integration

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

## 🔧 Technical Implementation

### Blockchain Integration

The platform integrates with the Nexus.io blockchain using the official API endpoints as documented in the [Nexus API Documentation](https://nexus.io/docs).

```javascript
// Nexus API base URL (no /v2 - not part of actual API)
const NEXUS_API_BASE = 'https://api.nexus.io:8080';

// Nexus API Endpoints
const NEXUS_ENDPOINTS = {
    // Assets API - for NFT player cards
    listAssets: `${NEXUS_API_BASE}/assets/list/asset`,
    getAsset: `${NEXUS_API_BASE}/assets/get/asset`,
    listAny: `${NEXUS_API_BASE}/assets/list/any`,
    
    // Profiles API - for user profiles  
    getProfile: `${NEXUS_API_BASE}/profiles/get/master`,
    
    // System API - for network info
    systemInfo: `${NEXUS_API_BASE}/system/get/info`
};
```

#### Assets API

The **Assets API** provides commands for creating and managing NFTs on the Nexus blockchain:

- **`assets/list/asset`** - Lists all assets owned by the logged-in user
  - Requires: `session` (user login session)
  - Returns: Array of asset objects with metadata
  
- **`assets/get/asset`** - Retrieves details of a specific asset
  - Parameters: `name` or `address` of the asset
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

### Demo Mode

The platform includes demo data for development and when APIs are unavailable:
- Pre-generated player NFTs with realistic stats
- Simulated match data and live scores
- Sample leaderboard rankings
- This allows the platform to function for demonstration purposes

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
