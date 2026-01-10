# Distordia dApp State Machine Diagrams

This document contains state machine diagrams for each dApp in the Distordia ecosystem, showing the state transitions and user flows.

## 1. DEX (Decentralized Exchange)

```mermaid
stateDiagram-v2
    [*] --> Disconnected
    
    Disconnected --> CheckingWallet: Page Load
    CheckingWallet --> WalletNotFound: No Q-Wallet
    CheckingWallet --> LoggedOut: Q-Wallet Found
    
    WalletNotFound --> [*]: Show Install Prompt
    
    LoggedOut --> LoginPrompt: Click Login
    LoginPrompt --> Authenticating: Enter Credentials
    Authenticating --> LoggedOut: Auth Failed
    Authenticating --> Authenticated: Auth Success
    
    Authenticated --> SelectingPair: Browse Pairs
    Authenticated --> ViewingOrderBook: Pair Selected
    
    ViewingOrderBook --> SelectingPair: Change Pair
    ViewingOrderBook --> PlacingOrder: Click Buy/Sell
    
    PlacingOrder --> ViewingOrderBook: Cancel
    PlacingOrder --> SubmittingOrder: Confirm Order
    
    SubmittingOrder --> ViewingOrderBook: Order Success
    SubmittingOrder --> PlacingOrder: Order Failed
    
    Authenticated --> CheckingActivity: User Activity
    CheckingActivity --> Authenticated: Activity Detected
    CheckingActivity --> LoggedOut: Timeout (3min)
    
    Authenticated --> LoggingOut: Click Logout
    LoggingOut --> LoggedOut: Session Terminated
    
    note right of Authenticated
        Activity monitoring active
        Session timeout: 3 minutes
        Refreshes every 10s
    end note
    
    note right of ViewingOrderBook
        Auto-refresh enabled
        Shows bids/asks
        Recent trades
        Price chart
    end note
```

## 2. Masterdata (Product Catalog)

```mermaid
stateDiagram-v2
    [*] --> Initializing
    
    Initializing --> LoadingProducts: App Start
    LoadingProducts --> BrowsingProducts: Products Loaded
    
    BrowsingProducts --> FilteringProducts: Apply Filters
    FilteringProducts --> BrowsingProducts: Results Updated
    
    BrowsingProducts --> SearchingProducts: Enter Search
    SearchingProducts --> BrowsingProducts: Results Updated
    
    BrowsingProducts --> ViewingProduct: Click Product
    ViewingProduct --> BrowsingProducts: Close Details
    
    BrowsingProducts --> CheckingAuth: Click Add Product
    CheckingAuth --> WalletPrompt: Not Connected
    CheckingAuth --> SessionPrompt: Wallet Connected, No Session
    CheckingAuth --> CreatingProduct: Authenticated
    
    WalletPrompt --> ConnectingWallet: Connect Q-Wallet
    ConnectingWallet --> WalletPrompt: Connection Failed
    ConnectingWallet --> SessionPrompt: Wallet Connected
    
    SessionPrompt --> AuthenticatingSession: Enter Credentials
    AuthenticatingSession --> SessionPrompt: Auth Failed
    AuthenticatingSession --> CreatingProduct: Session Created
    
    CreatingProduct --> ValidatingProduct: Fill Form
    ValidatingProduct --> CreatingProduct: Validation Failed
    ValidatingProduct --> SubmittingProduct: Form Valid
    
    SubmittingProduct --> CreatingAsset: Create Blockchain Asset
    CreatingAsset --> BrowsingProducts: Asset Created
    CreatingAsset --> CreatingProduct: Creation Failed
    
    BrowsingProducts --> RefreshingProducts: Auto Refresh
    RefreshingProducts --> BrowsingProducts: Updated
    
    note right of CheckingAuth
        Dual authentication:
        1. Q-Wallet connection
        2. Nexus session (user/pin)
    end note
    
    note right of CreatingAsset
        Creates NFT on blockchain
        with product metadata
    end note
```

## 3. Social (On-Chain Social Media)

```mermaid
stateDiagram-v2
    [*] --> Disconnected
    
    Disconnected --> CheckingConnection: Page Load
    CheckingConnection --> BrowsingPosts: Load Posts
    
    BrowsingPosts --> FilteringPosts: Apply Filters
    FilteringPosts --> BrowsingPosts: Update Results
    
    BrowsingPosts --> SearchingPosts: Search Namespace
    SearchingPosts --> BrowsingPosts: Update Results
    
    BrowsingPosts --> ViewingPost: Click Post
    ViewingPost --> BrowsingPosts: Close
    ViewingPost --> QuotingPost: Click Quote
    
    BrowsingPosts --> RefreshingPosts: Manual/Auto Refresh
    RefreshingPosts --> BrowsingPosts: Updated
    
    BrowsingPosts --> ConnectPrompt: Click Post/Login
    ViewingPost --> ConnectPrompt: Click Quote/Reply
    
    ConnectPrompt --> ConnectingWallet: Connect Q-Wallet
    ConnectingWallet --> ConnectPrompt: Connection Failed
    ConnectingWallet --> Connected: Wallet Connected
    
    Connected --> BrowsingPosts: Continue Browsing
    Connected --> ComposingPost: Click New Post
    
    ComposingPost --> ValidatingPost: Type Content
    ValidatingPost --> ComposingPost: Invalid (<280 chars)
    ValidatingPost --> SubmittingPost: Valid
    
    SubmittingPost --> CreatingAsset: Create Blockchain Post
    CreatingAsset --> BrowsingPosts: Post Created
    CreatingAsset --> ComposingPost: Creation Failed
    
    QuotingPost --> ComposingQuote: Add Comment
    ComposingQuote --> ValidatingQuote: Type Content
    ValidatingQuote --> ComposingQuote: Invalid
    ValidatingQuote --> SubmittingQuote: Valid
    
    SubmittingQuote --> CreatingQuote: Create Quote Asset
    CreatingQuote --> BrowsingPosts: Quote Created
    CreatingQuote --> ComposingQuote: Failed
    
    Connected --> Disconnecting: Click Disconnect
    Disconnecting --> Disconnected: Wallet Disconnected
    
    note right of Connected
        Wallet persists across refresh
        Uses sessionStorage
    end note
    
    note right of CreatingAsset
        Posts stored as blockchain assets
        with distordia-type: "distordia-post"
    end note
```

## 4. Content Verification

```mermaid
stateDiagram-v2
    [*] --> Idle
    
    Idle --> EnteringURL: User Input URL
    EnteringURL --> ValidatingURL: Click Verify
    
    ValidatingURL --> Idle: Invalid URL Format
    ValidatingURL --> SearchingBlockchain: Valid URL
    
    SearchingBlockchain --> QueryingAssets: Search Assets API
    QueryingAssets --> FilteringResults: Assets Retrieved
    
    FilteringResults --> ContentFound: Matching Asset
    FilteringResults --> ContentNotFound: No Match
    
    ContentFound --> DisplayingVerified: Show Details
    DisplayingVerified --> Idle: New Search
    
    ContentNotFound --> DisplayingNotFound: Show Not Found
    DisplayingNotFound --> Idle: New Search
    
    QueryingAssets --> DisplayingError: API Error
    DisplayingError --> Idle: Try Again
    
    note right of SearchingBlockchain
        Read-only operation
        No authentication required
        Searches for assets with:
        - distordia: "content"
        - matching URL
    end note
    
    note right of ContentFound
        Displays:
        - Creator/Owner
        - Registration date
        - Asset address
        - TXID
        - Content metadata
    end note
```

## 5. Fantasy Football

```mermaid
stateDiagram-v2
    [*] --> Initializing
    
    Initializing --> CheckingWallet: App Load
    CheckingWallet --> WalletNotFound: No Q-Wallet
    CheckingWallet --> Disconnected: Q-Wallet Found
    
    WalletNotFound --> [*]: Show Install Prompt
    
    Disconnected --> BrowsingPlayers: View Available Players
    Disconnected --> ViewingLeaderboard: View Leaderboard
    Disconnected --> ViewingLiveMatches: View Live Matches
    
    BrowsingPlayers --> FilteringPlayers: Apply Filters
    FilteringPlayers --> BrowsingPlayers: Update Results
    
    BrowsingPlayers --> ViewingPlayerDetails: Click Player
    ViewingPlayerDetails --> BrowsingPlayers: Close
    
    BrowsingPlayers --> ConnectPrompt: Click Trade/Buy
    ViewingPlayerDetails --> ConnectPrompt: Click Trade/Buy
    
    ConnectPrompt --> ConnectingWallet: Connect Wallet
    ConnectingWallet --> ConnectPrompt: Failed
    ConnectingWallet --> Connected: Success
    
    Connected --> BrowsingPlayers: Continue
    Connected --> ViewingMyTeam: My Team Tab
    Connected --> ViewingMyAssets: My Assets Tab
    
    ViewingMyTeam --> BuildingTeam: Select Formation
    BuildingTeam --> AssigningPlayers: Drag/Drop Players
    AssigningPlayers --> ViewingMyTeam: Team Set
    
    ViewingMyAssets --> ViewingAssetDetails: Click Asset
    ViewingAssetDetails --> ViewingMyAssets: Back
    
    Connected --> TradingPlayer: Click Trade
    TradingPlayer --> CreatingOrder: Set Price
    CreatingOrder --> SubmittingOrder: Confirm
    SubmittingOrder --> Connected: Order Created
    SubmittingOrder --> TradingPlayer: Failed
    
    BrowsingPlayers --> ExecutingOrder: Buy Player
    ExecutingOrder --> SubmittingPurchase: Confirm
    SubmittingPurchase --> ViewingMyAssets: Purchase Success
    SubmittingPurchase --> BrowsingPlayers: Failed
    
    ViewingLiveMatches --> UpdatingScores: Auto Refresh
    UpdatingScores --> ViewingLiveMatches: Updated
    
    ViewingLeaderboard --> UpdatingLeaderboard: Auto Refresh
    UpdatingLeaderboard --> ViewingLeaderboard: Updated
    
    Connected --> Disconnecting: Disconnect
    Disconnecting --> Disconnected: Done
    
    note right of Connected
        Wallet events:
        - accountsChanged
        - disconnect
    end note
    
    note right of ViewingMyTeam
        Formation: GK, 4 DEF, 4 MID, 2 FWD
        Scoring based on live matches
    end note
```

## 6. Swap (Cross-Chain Bridge)

```mermaid
stateDiagram-v2
    [*] --> Disconnected
    
    Disconnected --> CheckingWallets: Page Load
    CheckingWallets --> WalletPrompt: No Wallets
    CheckingWallets --> Disconnected: Ready
    
    Disconnected --> ConnectingWallets: Click Connect
    
    ConnectingWallets --> CheckingPhantom: Check Phantom Wallet
    CheckingPhantom --> ShowPhantomInstall: Not Found
    CheckingPhantom --> ConnectingPhantom: Found
    
    ShowPhantomInstall --> [*]: Install Prompt
    
    ConnectingPhantom --> ConnectingWallets: Failed
    ConnectingPhantom --> PromptingNexus: Phantom Connected
    
    PromptingNexus --> EnteringNexusAddress: User Input
    EnteringNexusAddress --> ConnectingWallets: Invalid/Cancelled
    EnteringNexusAddress --> Connected: Valid Address
    
    Connected --> LoadingBalances: Fetch Balances
    LoadingBalances --> ReadyToSwap: Balances Loaded
    
    ReadyToSwap --> EnteringAmount: User Input Amount
    EnteringAmount --> CalculatingFees: Valid Amount
    EnteringAmount --> ReadyToSwap: Invalid Amount
    
    CalculatingFees --> ReviewingSwap: Show Calculation
    ReviewingSwap --> EnteringAmount: Edit Amount
    ReviewingSwap --> InitiatingSwap: Click Swap
    
    InitiatingSwap --> ValidatingBalance: Check Balance
    ValidatingBalance --> ReadyToSwap: Insufficient Balance
    ValidatingBalance --> ExecutingSwap: Balance OK
    
    ExecutingSwap --> LockingSource: Lock Source Tokens
    LockingSource --> ReadyToSwap: Lock Failed
    LockingSource --> MintingTarget: Lock Success
    
    MintingTarget --> CompletingSwap: Mint Tokens
    CompletingSwap --> ReadyToSwap: Swap Complete
    CompletingSwap --> ReadyToSwap: Mint Failed
    
    ReadyToSwap --> SwappingDirection: Click Swap Direction
    SwappingDirection --> ReadyToSwap: Direction Flipped
    
    ReadyToSwap --> SettingMax: Click Max
    SettingMax --> ReadyToSwap: Amount Set
    
    Connected --> Disconnecting: User Action
    Disconnecting --> Disconnected: Wallets Disconnected
    
    note right of Connected
        Dual wallet connection:
        - Phantom (Solana/USDC)
        - Q-Wallet or manual (Nexus/USDD)
    end note
    
    note right of ExecutingSwap
        Bridge mechanism:
        - Lock on source chain
        - Mint on target chain
        - 0.5% bridge fee
        - 1:1 exchange rate
    end note
    
    note right of CompletingSwap
        Note: Frontend prototype
        Production requires smart contracts
        for actual cross-chain bridging
    end note
```

## State Transition Patterns

### Common Patterns Across Apps

1. **Wallet Connection Pattern** (DEX, Masterdata, Social, Fantasy Football, Swap)
   - Check for wallet availability
   - Connect on user action
   - Handle connection failures
   - Persist connection state
   - Listen for disconnect events

2. **Authentication Pattern** (DEX, Masterdata)
   - Wallet connection + Session creation
   - Username/password or username/pin
   - Session timeout monitoring
   - Activity tracking
   - Automatic logout on timeout

3. **Data Loading Pattern** (All apps)
   - Initial load on page mount
   - Show loading indicators
   - Handle API errors with fallbacks
   - Auto-refresh for live data
   - Manual refresh option

4. **Asset Creation Pattern** (Masterdata, Social, Fantasy Football)
   - Require authentication
   - Validate input
   - Submit to blockchain
   - Handle transaction confirmation
   - Update UI on success

5. **Filtering/Search Pattern** (DEX, Masterdata, Social, Fantasy Football)
   - Apply filters to loaded data
   - Debounced search input
   - Clear filters option
   - Update display instantly

### State Management Approaches

- **DEX**: Explicit state object (`state.js`) with global functions
- **Masterdata**: Class-based state within `ProductCatalogue` class
- **Social**: Module-level state variables with function-based management
- **Content Verification**: Class-based state within `ContentVerification` class
- **Fantasy Football**: Global state objects with function-based management
- **Swap**: Module-level state variables with function-based management

### Key State Variables by App

**DEX:**
- `currentPair` - selected trading pair
- `marketData` - all pairs and market data
- `sessionData` - user session and authentication

**Masterdata:**
- `products` - all product assets
- `currentFilters` - active filter criteria
- `currentProduct` - selected product details

**Social:**
- `currentPosts` - loaded posts
- `isConnected` - wallet connection status
- `userAddress` - connected wallet address
- `quotedPostsCache` - cache for quoted post data

**Content Verification:**
- `currentResult` - verification result data

**Fantasy Football:**
- `myAssets` - user's player NFTs
- `myTeam` - user's team formation
- `allPlayers` - available players
- `liveMatches` - ongoing matches
- `walletConnected` - connection state

**Swap:**
- `walletConnected` - connection status
- `solanaWallet` - Solana wallet address
- `nexusWallet` - Nexus wallet address
- `fromAmount`/`toAmount` - swap amounts
