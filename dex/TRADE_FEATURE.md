# Trade Feature Documentation

## Overview
The DEX now includes an integrated buy/sell trading feature that allows users to execute market orders directly through the interface when connected with Q-Wallet or logged in with a Nexus account.

**Trading Fee:** Each buy or sell transaction incurs a fee of **1 DIST token**, which is automatically debited to the DIST token account (name=DIST) upon successful trade execution.

## Features

### Trade Button
- **Visibility**: The trade button is only visible when:
  1. A user is connected via Q-Wallet OR logged in with Nexus credentials
  2. A trading pair has been selected
- **Location**: Top-right of the chart panel, next to the chart interval controls
- **Icon**: 💱 Trade

### Trade Modal Dialog
When clicking the trade button, a modal opens with the following features:

#### Buy/Sell Selection
- Toggle buttons to select between Buy or Sell operations
- Visual indication of the selected trade type

#### Pair Information
- Current trading pair display
- Current market price
- Real-time price updates

#### Trade Form
1. **Amount Input**: Enter the amount of base currency to trade
2. **Price Input**: Set the price per unit in quote currency
3. **Use Market Price**: Button to quickly fill in the current market price
4. **Total Display**: Automatically calculated total value in quote currency
5. **Fee Notice**: Displays the 1 DIST token trading fee

#### Available Orders List
- Displays available orders from the order book
- For buy operations: shows ask orders (sell orders)
- For sell operations: shows bid orders (buy orders)
- Click on any order to auto-fill the form with that order's details
- Shows price, amount, and total for each order
- Visual selection indicator

### Trade Execution

#### Trading Fee
- **Amount**: 1 DIST token per transaction
- **Recipient**: Token account "DIST" (name=DIST)
- **Automatic**: Fee is automatically collected after successful trade execution
- **Applies to**: Both buy and sell operations
- **User Notice**: Fee is displayed in the trade modal and mentioned in the PIN prompt

#### Q-Wallet Integration
When connected via Q-Wallet:
- Executes trades through the `window.qWallet.executeMarketOrder()` API
- User will be prompted to approve the transaction in Q-Wallet
- Requires PIN confirmation in the Q-Wallet extension

#### Native Session Integration
When logged in with Nexus credentials:
- Executes trades directly through the Nexus API
- Prompts for PIN confirmation before executing
- Maintains session activity tracking

### API Integration

#### Endpoints Used
- `GET /market/list/ask` - Fetch available sell orders (for buying)
- `GET /market/list/bid` - Fetch available buy orders (for selling)
- `POST /market/execute/order` - Execute the selected order

#### Order Execution Parameters
```javascript
{
  txid: "order_transaction_hash",
  from: "default",  // Sending account
  to: "default",    // Receiving account
  session: "session_id", // For native auth
  pin: "user_pin"   // For native auth
}
```

## User Flow

1. **Connect Wallet/Login**
   - User connects Q-Wallet or logs in with Nexus credentials

2. **Select Trading Pair**
   - Choose a trading pair from the market pairs list
   - Trade button becomes visible

3. **Open Trade Dialog**
   - Click the "Trade" button
   - Modal opens with current pair information

4. **Configure Trade**
   - Select Buy or Sell
   - View available orders
   - Click an order to select it (or manually enter values)
   - Adjust amount/price as needed
   - Review total value

5. **Execute Trade**
   - Click "Execute Buy" or "Execute Sell"
   - Note: A 1 DIST token fee will be charged
   - Approve transaction in Q-Wallet (if using Q-Wallet)
   - Enter PIN when prompted (if using native session)
   - Fee is automatically collected after successful trade
   - Receive confirmation notification

6. **Post-Trade**
   - Order book refreshes automatically
   - Recent trades list updates
   - Modal closes on successful execution

## Security Features

- Trade button only visible when authenticated
- All transactions require explicit user approval
- PIN confirmation required for all executions
- Trading fee clearly displayed before execution
- Session timeout protection (3 minutes inactivity)
- No storage of sensitive credentials
- Direct blockchain interaction

## Error Handling

The system provides user-friendly error messages for:
- No wallet connected
- No trading pair selected
- No order selected
- Invalid amount or price
- Insufficient DIST tokens for fee
- Transaction failures
- Fee collection failures (trade still completes)
- Network errors
- Session expiration

## Files Modified/Created

### New Files
- `dex/trade.js` - Trade functionality implementation

### Modified Files
- `dex/index.html` - Added trade button, modal HTML, and fee notice
- `dex/dex.css` - Added trade UI styles and fee notice styling
- `dex/dex.js` - Integrated trade initialization
- `dex/auth.js` - Added trade button visibility updates
- `dex/state.js` - Added pair selection callback
- `dex/api-config.js` - Added execute order endpoint and fee configuration
- `dex/trade.js` - Added fee collection logic

## Fee Configuration

The trading fee is configured in `api-config.js`:

```javascript
const TRADE_FEE = {
    amount: 1.0,           // 1 DIST token per trade
    token: 'DIST',         // DIST token
    recipient: 'DIST'      // Account name to receive fees
};
```

### Fee Collection Process

1. User executes a trade (buy or sell)
2. Market order is executed on-chain
3. If trade succeeds, fee collection is triggered
4. 1 DIST token is debited from user's DIST token account
5. Token is credited to the DIST fee account (name=DIST)
6. If fee collection fails, trade still completes but user is notified
7. Fee transaction uses timestamp as reference for tracking

## Future Enhancements

Potential improvements:
- Limit order placement
- Order history view
- Portfolio tracking
- Trade confirmation preview
- Multiple order execution
- Partial order fills
- Stop-loss orders
- Market depth visualization
- Trade analytics
