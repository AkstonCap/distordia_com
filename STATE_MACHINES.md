# Distordia dApp State Machine Diagrams

This document contains state machine diagrams for each dApp in the Distordia ecosystem, showing the state transitions and user flows.

## 1. DEX (Decentralized Exchange)

```mermaid
stateDiagram-v2
    [*] --> Disconnected
    
    Disconnected --> CheckingWallet: Page Load
    CheckingWallet --> WalletNotFound: No Q-Wallet
    CheckingWallet --> WalletFound: Q-Wallet Found
    
    WalletNotFound --> [*]: Show Install Prompt
    
    WalletFound --> CheckingConnection: Check Existing Connection
    CheckingConnection --> Connected: Already Connected
    CheckingConnection --> Disconnected: Not Connected
    
    Disconnected --> ConnectingWallet: Click Connect Wallet
    ConnectingWallet --> Disconnected: Connection Denied
    ConnectingWallet --> Connected: Wallet Connected
    
    Connected --> SelectingPair: Browse Pairs
    Connected --> ViewingOrderBook: Pair Selected
    
    ViewingOrderBook --> SelectingPair: Change Pair
    ViewingOrderBook --> PlacingOrder: Click Buy/Sell
    
    PlacingOrder --> ViewingOrderBook: Cancel
    PlacingOrder --> SubmittingOrder: Confirm Order
    
    SubmittingOrder --> ViewingOrderBook: Order Success
    SubmittingOrder --> PlacingOrder: Order Failed
    
    Connected --> Disconnecting: Click Disconnect
    Disconnecting --> Disconnected: Wallet Disconnected
    
    note right of Connected
        Q-Wallet handles authentication
        No session timeout
        Fee: 1 DIST per 24 hours
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
    CheckingAuth --> CreatingProduct: Wallet Connected
    
    WalletPrompt --> ConnectingWallet: Connect Q-Wallet
    ConnectingWallet --> WalletPrompt: Connection Failed
    ConnectingWallet --> CreatingProduct: Wallet Connected
    
    CreatingProduct --> ValidatingProduct: Fill Form
    ValidatingProduct --> CreatingProduct: Validation Failed
    ValidatingProduct --> SubmittingProduct: Form Valid
    
    SubmittingProduct --> CreatingAsset: Create Blockchain Asset
    CreatingAsset --> BrowsingProducts: Asset Created
    CreatingAsset --> CreatingProduct: Creation Failed
    
    BrowsingProducts --> RefreshingProducts: Auto Refresh
    RefreshingProducts --> BrowsingProducts: Updated
    
    note right of CheckingAuth
        Q-Wallet authentication only
        Fee: 1 DIST per 24 hours
    end note
    
    note right of CreatingAsset
        Creates NFT on blockchain
        with product metadata
        Q-Wallet prompts for PIN
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
        Uses browser sessionStorage
        for connection state only
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

2. **Authentication Pattern** (DEX, Masterdata, Social, Fantasy Football)
   - Q-Wallet browser extension connection
   - No username/password login
   - Q-Wallet handles PIN for transactions
   - Wallet connection persists across refresh

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
## 8. Verification System (On-Chain Verification)

### 8.1 User Verification Request Flow

```mermaid
stateDiagram-v2
    [*] --> Disconnected
    
    Disconnected --> CheckingWallet: Page Load
    CheckingWallet --> WalletNotFound: No Q-Wallet
    CheckingWallet --> WalletFound: Q-Wallet Detected
    
    WalletNotFound --> Disconnected: Show Install Prompt
    WalletFound --> Connected: Auto-Connect
    
    Disconnected --> ConnectingWallet: Click Connect
    ConnectingWallet --> Connected: Wallet Connected
    ConnectingWallet --> Disconnected: Connection Failed
    
    state "Request Submission" as RequestFlow {
        Connected --> CheckNamespace: Enter Namespace
        CheckNamespace --> NamespaceInvalid: Not Found
        CheckNamespace --> NamespaceValid: Exists
        
        NamespaceInvalid --> CheckNamespace: Try Again
        
        NamespaceValid --> CheckDISTBalance: Fetch Balance
        CheckDISTBalance --> InsufficientBalance: Below Tier Threshold
        CheckDISTBalance --> SelectTier: Balance OK
        
        InsufficientBalance --> ShowTopUpInfo: Display Requirements
        ShowTopUpInfo --> CheckNamespace: Try Again
        
        SelectTier --> FillRequestForm: Choose Tier
        FillRequestForm --> ValidateForm: Submit
        ValidateForm --> FillRequestForm: Invalid
        ValidateForm --> CreateRequestAsset: Valid
        
        CreateRequestAsset --> SignWithWallet: Q-Wallet Prompt
        SignWithWallet --> CreateRequestAsset: User Cancelled
        SignWithWallet --> RequestSubmitted: Transaction Signed
    }
    
    RequestSubmitted --> ViewRequestStatus: On-Chain Confirmation
    ViewRequestStatus --> RefreshStatus: Poll for Updates
    RefreshStatus --> ViewRequestStatus: Status Updated
    RefreshStatus --> RequestComplete: Approved/Rejected
    
    RequestComplete --> [*]: Show Final Status
    
    note right of CreateRequestAsset
        Creates on-chain asset:
        distordia-type: verification-request
        status: pending
        Includes balance snapshot
    end note
    
    note right of ViewRequestStatus
        Status values:
        - pending (waiting for daemon)
        - validating (being processed)
        - pending-review (L2/L3 needs human)
        - approved (verification complete)
        - rejected (failed validation)
    end note
```

### 8.2 Daemon Processing Flow

```mermaid
stateDiagram-v2
    [*] --> Idle
    
    Idle --> StartCycle: Timer (5 min interval)
    
    state "Request Processing Phase" as ReqPhase {
        StartCycle --> FetchPendingRequests: Query Chain
        FetchPendingRequests --> NoRequests: Empty
        FetchPendingRequests --> ProcessRequest: Found Requests
        
        NoRequests --> StartReviewPhase
        
        ProcessRequest --> ReadRequestAsset: Load Asset Data
        ReadRequestAsset --> ValidateNamespace: Check Exists
        
        ValidateNamespace --> RejectRequest_NS: Namespace Not Found
        ValidateNamespace --> VerifyDISTBalance: Namespace OK
        
        VerifyDISTBalance --> RejectRequest_Bal: Insufficient Balance
        VerifyDISTBalance --> DetermineTier: Balance Verified
        
        DetermineTier --> AutoApprove: L0 or L1
        DetermineTier --> CreateReviewAsset: L2 or L3
        
        AutoApprove --> AddToRegistry: Update Verified List
        AddToRegistry --> UpdateRequest_Approved: Set status=approved
        
        CreateReviewAsset --> UpdateRequest_PendingReview: Set status=pending-review
        
        RejectRequest_NS --> UpdateRequest_Rejected
        RejectRequest_Bal --> UpdateRequest_Rejected
        
        UpdateRequest_Approved --> CheckMoreRequests
        UpdateRequest_Rejected --> CheckMoreRequests
        UpdateRequest_PendingReview --> CheckMoreRequests
        
        CheckMoreRequests --> ProcessRequest: More Requests
        CheckMoreRequests --> StartReviewPhase: Done
    }
    
    state "Review Processing Phase" as RevPhase {
        StartReviewPhase --> FetchCompletedReviews: Query Decided Reviews
        FetchCompletedReviews --> NoReviews: Empty
        FetchCompletedReviews --> ProcessReview: Found Reviews
        
        NoReviews --> StartAuditPhase
        
        ProcessReview --> ReadReviewAsset: Load Decision
        ReadReviewAsset --> ApplyApproval: decision=approved
        ReadReviewAsset --> ApplyRejection: decision=rejected
        ReadReviewAsset --> SkipReview: decision=null
        
        ApplyApproval --> AddToRegistry_Rev
        AddToRegistry_Rev --> UpdateRequest_Final_A
        ApplyRejection --> UpdateRequest_Final_R
        
        SkipReview --> CheckMoreReviews
        UpdateRequest_Final_A --> CheckMoreReviews
        UpdateRequest_Final_R --> CheckMoreReviews
        
        CheckMoreReviews --> ProcessReview: More Reviews
        CheckMoreReviews --> StartAuditPhase: Done
    }
    
    state "Audit Phase" as AuditPhase {
        StartAuditPhase --> LoadVerifiedList: Fetch All Verified
        LoadVerifiedList --> AuditNamespace: Start Audit
        
        AuditNamespace --> CheckBalance: Query DIST Balance
        CheckBalance --> BalanceOK: Still Qualified
        CheckBalance --> BalanceDropped: Below Threshold
        
        BalanceOK --> NextNamespace
        BalanceDropped --> DowngradeNamespace: Move to Lower Tier
        DowngradeNamespace --> NextNamespace
        
        NextNamespace --> AuditNamespace: More to Audit
        NextNamespace --> AuditComplete: All Audited
    }
    
    AuditComplete --> Idle: Sleep Until Next Cycle
    
    note right of AutoApprove
        L0/L1 verifications are instant
        No human review required
        Based purely on DIST balance
    end note
    
    note right of CreateReviewAsset
        L2/L3 require human oversight
        Review asset created with:
        - 7 day deadline
        - Open status for reviewers
    end note
```

### 8.3 Human Reviewer Flow

```mermaid
stateDiagram-v2
    [*] --> ReviewerDisconnected
    
    ReviewerDisconnected --> ConnectWallet: Open Dashboard
    ConnectWallet --> CheckAuthorization: Wallet Connected
    CheckAuthorization --> NotAuthorized: Not a Reviewer
    CheckAuthorization --> ReviewerDashboard: Authorized
    
    NotAuthorized --> ReviewerDisconnected: Access Denied
    
    state "Reviewer Dashboard" as Dashboard {
        ReviewerDashboard --> LoadOpenReviews: Fetch Queue
        LoadOpenReviews --> DisplayQueue: Reviews Loaded
        
        DisplayQueue --> RefreshQueue: Auto-Refresh (1 min)
        RefreshQueue --> DisplayQueue: Updated
        
        DisplayQueue --> SelectReview: Click Review
        SelectReview --> ViewReviewDetails: Load Full Details
        
        ViewReviewDetails --> BackToQueue: Cancel
        ViewReviewDetails --> ClaimReview: Click Claim
        
        ClaimReview --> SignClaim: Q-Wallet Prompt
        SignClaim --> ClaimReview: Cancelled
        SignClaim --> ReviewLocked: Claim Recorded
        
        ReviewLocked --> ExamineEvidence: View Proofs
        ExamineEvidence --> CheckIdentity: Verify Identity
        CheckIdentity --> AssessLegitimacy: Check Business
        AssessLegitimacy --> ReadyToDecide: Complete Review
        
        ReadyToDecide --> ApproveAction: Click Approve
        ReadyToDecide --> RejectAction: Click Reject
        ReadyToDecide --> EscalateAction: Click Escalate
        
        ApproveAction --> EnterApproveReason: Add Justification
        EnterApproveReason --> SignApproval: Q-Wallet Prompt
        SignApproval --> DecisionRecorded_A: Signed
        
        RejectAction --> EnterRejectReason: Add Justification
        EnterRejectReason --> SignRejection: Q-Wallet Prompt
        SignRejection --> DecisionRecorded_R: Signed
        
        EscalateAction --> CreateVoteAsset: L3 Committee Vote
        CreateVoteAsset --> DecisionRecorded_E: Vote Created
        
        DecisionRecorded_A --> DisplayQueue: Return to Queue
        DecisionRecorded_R --> DisplayQueue: Return to Queue
        DecisionRecorded_E --> DisplayQueue: Return to Queue
    }
    
    note right of ClaimReview
        Claiming locks review to reviewer
        Prevents duplicate work
        Updates on-chain asset with:
        - reviewer = genesis_id
        - claimed_at = timestamp
    end note
    
    note right of ExamineEvidence
        Evidence includes:
        - Namespace ownership proof
        - Business documentation URL
        - Contact information
        - Optional message
    end note
```

### 8.4 Committee Voting Flow (L3)

```mermaid
stateDiagram-v2
    [*] --> VoteAssetCreated
    
    VoteAssetCreated --> VotingOpen: On-Chain Confirmation
    
    state "Voting Period (7 days)" as VotePeriod {
        VotingOpen --> LoadVoteDetails: Committee Opens Vote
        LoadVoteDetails --> DisplayVoteInfo: Show Request
        
        DisplayVoteInfo --> ReviewEvidence: Examine Proofs
        ReviewEvidence --> CastVote: Ready to Vote
        
        CastVote --> SelectApprove: Vote Approve
        CastVote --> SelectReject: Vote Reject
        CastVote --> SelectAbstain: Vote Abstain
        
        SelectApprove --> EnterVoteReason: Add Reason
        SelectReject --> EnterVoteReason
        SelectAbstain --> EnterVoteReason
        
        EnterVoteReason --> SignVote: Q-Wallet Prompt
        SignVote --> VoteRecorded: Vote On-Chain
        
        VoteRecorded --> CheckQuorum: Check Vote Count
        CheckQuorum --> VotingOpen: < 3 Votes
        CheckQuorum --> TallyVotes: >= 3 Votes
    }
    
    state "Vote Resolution" as Resolution {
        TallyVotes --> MajorityApprove: 3+ Approve
        TallyVotes --> MajorityReject: 3+ Reject
        TallyVotes --> NoMajority: Split Vote
        
        MajorityApprove --> FinalizeApprove: Update Vote Asset
        MajorityReject --> FinalizeReject: Update Vote Asset
        
        NoMajority --> CheckExtensions: Check Extension Count
        CheckExtensions --> ExtendDeadline: < 2 Extensions
        CheckExtensions --> AutoReject: >= 2 Extensions
        
        ExtendDeadline --> VotingOpen: +3 Days
        AutoReject --> FinalizeReject: No Consensus
    }
    
    FinalizeApprove --> VoteComplete: result=approved
    FinalizeReject --> VoteComplete: result=rejected
    
    VoteComplete --> [*]: Daemon Picks Up Result
    
    note right of CheckQuorum
        Committee: 5 members
        Quorum: 3 votes minimum
        Majority: 3/5 required
        
        Votes are on-chain:
        - Immutable record
        - Signed by voter
        - Includes reasoning
    end note
    
    note right of ExtendDeadline
        Deadlock handling:
        - First extension: +3 days
        - Second extension: +3 days
        - Third deadlock: auto-reject
    end note
```

### Verification State Variables

**User Interface:**
- `verifiedNamespaces` - loaded registry entries
- `disputes` - active dispute records
- `currentCheckResult` - namespace verification check result
- `api.connected` - wallet connection state
- `api.walletAddress` - connected wallet address

**Daemon State:**
- `session_id` - Nexus API session
- `config` - daemon configuration
- `thresholds` - tier DIST requirements
- `max_entries` - entries per registry asset

**On-Chain Assets:**
- `verification-request` - user requests (status: pending → approved/rejected)
- `verification-review` - L2/L3 review records (status: open → claimed → decided)
- `verification-vote` - L3 committee votes (status: voting → complete)
- `verification-registry` - verified namespace lists per tier
- `disputes-registry` - active penalty records