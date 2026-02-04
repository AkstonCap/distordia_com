# Fantasy Football State Machines

This document describes the state machines that govern the Distordia Fantasy Football dApp flows.

---

## 1. Pack Purchase Flow

Users buy player card packs with NXS and receive random player NFT assets.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PACK PURCHASE STATE MACHINE                        │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────┐
    │  IDLE    │ ◄─────────────────────────────────────────────────┐
    └────┬─────┘                                                    │
         │ User clicks "Buy Pack"                                   │
         ▼                                                          │
    ┌──────────────┐                                                │
    │ SELECT_PACK  │ User chooses Bronze/Silver/Gold/Limited        │
    └──────┬───────┘                                                │
           │ Pack selected                                          │
           ▼                                                        │
    ┌──────────────┐     No wallet     ┌───────────────┐            │
    │ CHECK_WALLET │ ─────────────────►│ CONNECT_WALLET│            │
    └──────┬───────┘                   └───────┬───────┘            │
           │ Wallet connected                  │ Connected          │
           ▼                                   │                    │
    ┌──────────────┐◄──────────────────────────┘                    │
    │ CONFIRM_PRICE│ Display: "Buy Gold Pack for 50 NXS?"           │
    └──────┬───────┘                                                │
           │ User confirms                                          │
           ▼                                                        │
    ┌──────────────┐                                                │
    │ SIGN_TX      │ Q-Wallet prompts transaction signature         │
    └──────┬───────┘                                                │
           │                                                        │
      ┌────┴────┐                                                   │
      ▼         ▼                                                   │
┌─────────┐ ┌─────────┐                                             │
│TX_SIGNED│ │TX_DENIED│────────────────────────────────────────────►│
└────┬────┘ └─────────┘                                             │
     │                                                              │
     ▼                                                              │
┌──────────────┐                                                    │
│ SUBMIT_TX    │ Send NXS to Distordia treasury                     │
└──────┬───────┘                                                    │
       │                                                            │
  ┌────┴────┐                                                       │
  ▼         ▼                                                       │
┌─────────┐ ┌─────────┐                                             │
│TX_CONF  │ │TX_FAILED│─────────────────────────────────────────────►│
└────┬────┘ └─────────┘                                             │
     │ Transaction confirmed on-chain                               │
     ▼                                                              │
┌──────────────┐                                                    │
│ AWAIT_ORACLE │ Distordia daemon detects payment                   │
└──────┬───────┘ (polls mempool/confirms)                           │
       │                                                            │
       ▼                                                            │
┌──────────────┐                                                    │
│ MINT_CARDS   │ Daemon creates player assets based on pack type    │
└──────┬───────┘ Uses: block_hash + user_address for randomness     │
       │                                                            │
       ▼                                                            │
┌──────────────┐                                                    │
│ TRANSFER     │ assets/transfer/asset to user's address            │
└──────┬───────┘                                                    │
       │                                                            │
       ▼                                                            │
┌──────────────┐                                                    │
│ REVEAL       │ UI shows "pack opening" animation                  │
└──────┬───────┘ Displays received cards with rarity effects        │
       │                                                            │
       ▼                                                            │
┌──────────────┐                                                    │
│ COMPLETE     │ Cards added to user's inventory                    │
└──────┬───────┘                                                    │
       │                                                            │
       └───────────────────────────────────────────────────────────►┘


Pack Types & Probabilities:
┌────────────┬───────┬────────────────────────────────────────────┐
│ Pack Type  │ Price │ Contents                                   │
├────────────┼───────┼────────────────────────────────────────────┤
│ Bronze     │ 5 NXS │ 3 Common (80%) + 1 Rare (20%)              │
│ Silver     │ 15 NXS│ 2 Common + 2 Rare (70%) + 1 Epic (15%)     │
│ Gold       │ 50 NXS│ 1 Rare + 2 Epic (70%) + 1 Legend (10%)     │
│ Limited    │ Varies│ Event-specific (World Cup, UCL Finals)     │
└────────────┴───────┴────────────────────────────────────────────┘
```

---

## 2. Marketplace Trading Flow

P2P trading of player cards with Distordia taking a 5% fee.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MARKETPLACE STATE MACHINE                             │
└─────────────────────────────────────────────────────────────────────────────┘

=== SELLER FLOW ===

    ┌──────────┐
    │  IDLE    │
    └────┬─────┘
         │ User clicks "List for Sale"
         ▼
    ┌──────────────┐
    │ SELECT_ASSET │ Choose player card from inventory
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ SET_PRICE    │ Enter listing price in NXS
    └──────┬───────┘ Display: "You receive 95 NXS (5% fee)"
           │
           ▼
    ┌──────────────┐
    │ CREATE_ORDER │ market/create/order type=ask
    └──────┬───────┘ token=PLAYER/{assetAddress} amount=1 price={nxs}
           │
      ┌────┴────┐
      ▼         ▼
┌─────────┐ ┌─────────┐
│ LISTED  │ │ FAILED  │────► Show error, return to IDLE
└────┬────┘ └─────────┘
     │
     │ (Asset now visible in marketplace)
     │
     ├─────────────────────────────────┐
     ▼                                 ▼
┌──────────┐                    ┌──────────┐
│ SOLD     │                    │ CANCELLED│
└────┬─────┘                    └──────────┘
     │ Buyer executed order            │
     ▼                                 │
┌──────────────┐                       │
│ RECEIVE_NXS  │ 95% to seller         │
└──────┬───────┘ 5% to Distordia       │
       │                               │
       └───────────────────────────────┴──► IDLE


=== BUYER FLOW ===

    ┌──────────┐
    │  BROWSE  │ View marketplace listings
    └────┬─────┘
         │ Click "Buy" on listing
         ▼
    ┌──────────────┐
    │ VIEW_LISTING │ Show card details, stats, price
    └──────┬───────┘
           │ Confirm purchase
           ▼
    ┌──────────────┐
    │ CHECK_BALANCE│ Verify user has enough NXS
    └──────┬───────┘
           │
      ┌────┴────┐
      ▼         ▼
┌───────────┐ ┌────────────────┐
│ SUFFICIENT│ │ INSUFFICIENT   │────► Show "Not enough NXS"
└─────┬─────┘ └────────────────┘
      │
      ▼
┌──────────────┐
│ EXECUTE_ORDER│ market/execute/order txid={orderId}
└──────┬───────┘
       │
  ┌────┴────┐
  ▼         ▼
┌─────────┐ ┌─────────┐
│ SUCCESS │ │ FAILED  │────► "Order no longer available"
└────┬────┘ └─────────┘
     │
     ▼
┌──────────────┐
│ RECEIVE_ASSET│ Player card transferred to buyer
└──────┬───────┘
       │
       └────────────────────────────────────────────► BROWSE
```

---

## 3. Weekly League Competition Flow

Users enter weekly leagues, compete for prize pools.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      WEEKLY LEAGUE STATE MACHINE                             │
└─────────────────────────────────────────────────────────────────────────────┘

=== LEAGUE LIFECYCLE ===

┌───────────┐    Friday 00:00     ┌───────────┐
│ UPCOMING  │ ──────────────────► │   OPEN    │ Entry period begins
└───────────┘                     └─────┬─────┘
                                        │
                     Saturday 12:00     │ Entry deadline
                                        ▼
                                  ┌───────────┐
                                  │  LOCKED   │ Teams locked, matches start
                                  └─────┬─────┘
                                        │
                       Match results    │ Stats oracle updates
                                        ▼
                                  ┌───────────┐
                                  │   LIVE    │ Points accumulating
                                  └─────┬─────┘
                                        │
                        Sunday 23:59    │ All matches concluded
                                        ▼
                                  ┌───────────┐
                                  │ FINALIZED │ Final standings calculated
                                  └─────┬─────┘
                                        │
                         Monday 06:00   │ Prizes distributed
                                        ▼
                                  ┌───────────┐
                                  │ COMPLETED │ Results archived on-chain
                                  └───────────┘


=== USER ENTRY FLOW ===

    ┌──────────┐
    │  BROWSE  │ View available leagues
    └────┬─────┘
         │ Select league
         ▼
    ┌──────────────┐
    │ VIEW_LEAGUE  │ See entry fee, prize pool, rules
    └──────┬───────┘
           │ Click "Enter League"
           ▼
    ┌──────────────┐     Not enough cards    ┌────────────────┐
    │ CHECK_ROSTER │ ───────────────────────►│ NEED_MORE_CARDS│
    └──────┬───────┘                         └────────────────┘
           │ Has 11+ cards                          │
           ▼                                        │ Visit Shop
    ┌──────────────┐                                ▼
    │ SELECT_TEAM  │ Choose 11 players (formation) 
    └──────┬───────┘ GK + 4 DEF + 4 MID + 2 FWD
           │
           ▼
    ┌──────────────┐
    │ SET_CAPTAIN  │ Captain scores 2x points
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ PAY_ENTRY    │ 10 NXS entry fee
    └──────┬───────┘ 85% to prize pool, 15% to Distordia
           │
      ┌────┴────┐
      ▼         ▼
┌─────────┐ ┌─────────┐
│ ENTERED │ │ FAILED  │────► Show error
└────┬────┘ └─────────┘
     │
     │ On-chain: League entry asset created
     │ ┌─────────────────────────────────────────┐
     │ │ assets/create/asset                     │
     │ │   name=entry.league.week23.{username}   │
     │ │   json='{team composition}'             │
     │ └─────────────────────────────────────────┘
     │
     ▼
┌──────────────┐
│ AWAIT_START  │ League status = LOCKED
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ LIVE_SCORING │ Real-time point updates
└──────┬───────┘
       │
       ▼
┌──────────────┐      Position in top 3?
│ VIEW_RESULTS │ ◄─────────────────────────────┐
└──────┬───────┘                               │
       │                                       │
  ┌────┴────────────┐                          │
  ▼                 ▼                          │
┌───────────┐  ┌───────────┐                   │
│ WINNER    │  │ NO_PRIZE  │                   │
└─────┬─────┘  └───────────┘                   │
      │                                        │
      ▼                                        │
┌──────────────┐                               │
│ CLAIM_PRIZE  │ Automatic NXS distribution    │
└──────────────┘                               │


Prize Distribution:
┌──────────┬───────────────────┐
│ Position │ Share of Pool     │
├──────────┼───────────────────┤
│ 1st      │ 50%               │
│ 2nd      │ 30%               │
│ 3rd      │ 20%               │
└──────────┴───────────────────┘

Revenue Split:
┌──────────────────┬───────────┐
│ Entry Fee (10 NXS)           │
├──────────────────┼───────────┤
│ Prize Pool       │ 8.5 NXS   │
│ Distordia        │ 1.5 NXS   │
└──────────────────┴───────────┘
```

---

## 4. Stats Oracle Update Flow

Automated system that updates player card stats after matches.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       STATS ORACLE STATE MACHINE                             │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────┐
    │  IDLE    │ ◄──────────────────────────────────────────────────────┐
    └────┬─────┘                                                         │
         │ Match day detected (cron: every matchday)                     │
         ▼                                                               │
    ┌──────────────┐                                                     │
    │ FETCH_FIXTURES│ Get today's matches from football API             │
    └──────┬───────┘                                                     │
           │                                                             │
           ▼                                                             │
    ┌──────────────┐                                                     │
    │ MONITOR      │ Poll for live match updates                        │
    └──────┬───────┘ (every 60 seconds during match)                    │
           │                                                             │
           │ Match finished (FT status)                                  │
           ▼                                                             │
    ┌──────────────┐                                                     │
    │ FETCH_STATS  │ Get detailed player statistics                     │
    └──────┬───────┘ Goals, assists, cards, minutes, saves              │
           │                                                             │
           ▼                                                             │
    ┌──────────────┐                                                     │
    │ CALC_POINTS  │ Apply scoring rules to raw stats                   │
    └──────┬───────┘                                                     │
           │                                                             │
           ▼                                                             │
    ┌──────────────┐                                                     │
    │ FIND_ASSETS  │ Query Nexus for matching player assets             │
    └──────┬───────┘ register/list/names where name LIKE 'player.%'     │
           │                                                             │
           ▼                                                             │
    ┌──────────────┐                                                     │
    │ UPDATE_ASSETS│ For each player with on-chain asset:               │
    └──────┬───────┘                                                     │
           │         ┌─────────────────────────────────────┐             │
           │         │ assets/update/asset                 │             │
           │         │   name=distordia:player.epl.*.{id}  │             │
           │         │   weekPoints={calculated}           │             │
           │         │   totalPoints={cumulative}          │             │
           │         │   goals={season_total}              │             │
           │         │   assists={season_total}            │             │
           │         └─────────────────────────────────────┘             │
           │                                                             │
           ▼                                                             │
    ┌──────────────┐                                                     │
    │ UPDATE_LEAGUES│ Calculate league standings                        │
    └──────┬───────┘ Sum team points, update leaderboards               │
           │                                                             │
           ▼                                                             │
    ┌──────────────┐                                                     │
    │ EMIT_EVENTS  │ Broadcast updates to connected clients             │
    └──────┬───────┘ WebSocket: { type: 'statsUpdate', data: {...} }    │
           │                                                             │
           └─────────────────────────────────────────────────────────────┘


Points Calculation Example:
┌────────────────────────────────────────────────────────────┐
│ Player: Haaland (FWD)                                      │
│ Match: Man City 3-1 Chelsea                                │
├────────────────────────────────────────────────────────────┤
│ Event           │ Count │ Points/Each │ Total              │
├─────────────────┼───────┼─────────────┼────────────────────┤
│ Goals           │ 2     │ +8          │ +16                │
│ Assists         │ 1     │ +6          │ +6                 │
│ Minutes (90)    │ 1     │ +4          │ +4                 │
│ Man of Match    │ 1     │ +6          │ +6                 │
├─────────────────┴───────┴─────────────┼────────────────────┤
│ TOTAL WEEK POINTS                     │ 32                 │
└───────────────────────────────────────┴────────────────────┘
```

---

## 5. Fractional Ownership (Tokenization) Flow

Advanced feature for high-value legendary cards.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FRACTIONAL OWNERSHIP STATE MACHINE                        │
└─────────────────────────────────────────────────────────────────────────────┘

=== TOKENIZATION (Admin Only) ===

    ┌──────────────────┐
    │ SELECT_LEGENDARY │ Choose high-value player card
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ CREATE_TOKEN     │ finance/create/token
    └────────┬─────────┘ name=HAALAND001 supply=1000 decimals=0
             │
             ▼
    ┌──────────────────┐
    │ TOKENIZE_ASSET   │ assets/tokenize/asset
    └────────┬─────────┘ name=player.epl.mancity.haaland.leg.001
             │           token=HAALAND001
             ▼
    ┌──────────────────┐
    │ LIST_FOR_SALE    │ Create DEX market: HAALAND001/NXS
    └────────┬─────────┘ Initial price based on rarity + stats
             │
             ▼
    ┌──────────────────┐
    │ TRADING_ACTIVE   │ Fractions tradeable on DEX
    └──────────────────┘


=== FRACTION HOLDER FLOW ===

    ┌──────────┐
    │  BROWSE  │ View tokenized legendary cards
    └────┬─────┘
         │
         ▼
    ┌──────────────┐
    │ VIEW_CARD    │ See total supply, price, holders, performance
    └──────┬───────┘
           │ Click "Buy Fractions"
           ▼
    ┌──────────────┐
    │ SET_AMOUNT   │ How many fractions to buy (e.g., 50/1000)
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ EXECUTE_TRADE│ DEX order execution
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ HOLDING      │ User now owns 5% of the legendary card
    └──────┬───────┘
           │
           │ Weekly points earned by card
           ▼
    ┌──────────────┐
    │ EARN_REWARDS │ Points/rewards distributed proportionally
    └──────────────┘ 5% of card's earnings → user


Tokenization Example:
┌────────────────────────────────────────────────────────────┐
│ Card: Haaland Legendary #001                               │
│ Token: HAALAND001 (1000 supply)                            │
├────────────────────────────────────────────────────────────┤
│ Holder          │ Tokens │ Ownership │ Weekly Reward       │
├─────────────────┼────────┼───────────┼─────────────────────┤
│ Distordia       │ 500    │ 50%       │ 50% of points       │
│ user:alice      │ 200    │ 20%       │ 20% of points       │
│ user:bob        │ 150    │ 15%       │ 15% of points       │
│ user:carol      │ 100    │ 10%       │ 10% of points       │
│ user:dave       │ 50     │ 5%        │ 5% of points        │
└─────────────────┴────────┴───────────┴─────────────────────┘
```

---

## 6. User Session Flow

Overall user journey through the application.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         USER SESSION STATE MACHINE                           │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐
    │ LANDING      │ View home page, see featured cards
    └──────┬───────┘
           │
      ┌────┴────────────────────┐
      ▼                         ▼
┌───────────────┐        ┌───────────────┐
│ BROWSE_ONLY   │        │ CONNECT_WALLET│
│ (Guest Mode)  │        └───────┬───────┘
└───────┬───────┘                │
        │                        ▼
        │                 ┌───────────────┐
        │                 │ AUTHENTICATED │
        │                 └───────┬───────┘
        │                         │
        │     ┌───────────────────┼───────────────────┐
        │     ▼                   ▼                   ▼
        │ ┌───────┐         ┌───────────┐       ┌─────────┐
        │ │ SHOP  │         │ MY_TEAM   │       │ LEAGUES │
        │ └───┬───┘         └─────┬─────┘       └────┬────┘
        │     │                   │                  │
        │     ▼                   ▼                  ▼
        │ ┌───────────┐     ┌───────────┐      ┌───────────┐
        │ │ BUY_PACKS │     │ BUILD_TEAM│      │ ENTER_    │
        │ └───────────┘     └───────────┘      │ LEAGUE    │
        │                                      └───────────┘
        │
        └──────────────────────────────┐
                                       ▼
                                ┌─────────────┐
                                │ MARKETPLACE │ (Read-only for guests)
                                └─────────────┘


Navigation Structure:
┌─────────────────────────────────────────────────────────────┐
│  ┌──────┐ ┌──────┐ ┌────────────┐ ┌─────────┐ ┌──────────┐  │
│  │ Home │ │ Shop │ │ My Team    │ │ Leagues │ │ Market   │  │
│  └──────┘ └──────┘ └────────────┘ └─────────┘ └──────────┘  │
│                                                             │
│  Home: Hero, stats, featured cards, how it works            │
│  Shop: Buy packs (Bronze/Silver/Gold/Limited)               │
│  My Team: Build 11-player formation, view points            │
│  Leagues: Weekly competitions, leaderboards, prizes         │
│  Market: P2P trading, listings, order history               │
└─────────────────────────────────────────────────────────────┘
```

---

## On-Chain Data Structures

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
  "assists": 8,
  "cleanSheets": 0,
  "appearances": 28
}
```

### League Entry Asset

```json
{
  "standard": "distordia.league-entry.v1",
  "leagueId": "week23",
  "season": "2025-2026",
  "entryFee": 10000000,
  "captain": "distordia:player.epl.mancity.haaland",
  "team": {
    "GK": "distordia:player.epl.mancity.ederson",
    "DEF": ["player1", "player2", "player3", "player4"],
    "MID": ["player5", "player6", "player7", "player8"],
    "FWD": ["player9", "player10"]
  },
  "totalPoints": 0,
  "finalRank": null
}
```

### Pack Purchase Receipt

```json
{
  "standard": "distordia.pack-receipt.v1",
  "packType": "gold",
  "price": 50000000,
  "purchaseTime": 1738678200,
  "txHash": "abc123...",
  "cardsReceived": [
    "distordia:player.epl.liverpool.salah",
    "distordia:player.epl.arsenal.saka",
    "distordia:player.epl.mancity.foden",
    "distordia:player.epl.mancity.haaland"
  ]
}
```

---

## Revenue Summary

| Stream | Trigger | Amount | Recipient |
|--------|---------|--------|-----------|
| Pack Sales | User buys pack | 5-50 NXS | 100% Distordia |
| Market Fee | P2P trade executes | 5% of price | Distordia |
| League Entry | User enters league | 15% of entry | Distordia |
| Premium Listings | Featured spot | 2 NXS/day | Distordia |

---

## Technical Implementation Notes

1. **Randomness**: Pack contents use `keccak256(block.hash + user.address + timestamp)` for verifiable randomness
2. **Oracle**: Stats oracle runs as daemon, uses Distordia sigchain for on-chain updates
3. **Atomic Swaps**: Marketplace uses Nexus Market API for trustless trades
4. **Event Sourcing**: All state changes emit on-chain events for UI reactivity
