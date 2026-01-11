# Trade Feature Documentation

## Overview
The DEX now includes an integrated buy/sell trading feature that allows users to execute market orders directly through the interface when connected with Q-Wallet.

**Network Fees:** Trading fees are handled automatically by Q-Wallet's batch execution system. Single orders are free, multiple orders incur a small NXS fee (see Fee Structure section below).

## Features

### Trade Button
- **Visibility**: The trade button is only visible when:
  1. A user is connected via Q-Wallet
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
5. **Fee Notice**: Displays estimated network fee based on order count

#### Available Orders List
- Displays available orders from the order book
- For buy operations: shows ask orders (sell orders)
- For sell operations: shows bid orders (buy orders)
- Click on any order to auto-fill the form with that order's details
- Shows price, amount, and total for each order
- Visual selection indicator

### Trade Execution

#### Network Fee Structure
- **1 order**: Free
- **2-10 orders**: 0.01 NXS + ~0.01 NXS per order (congestion fee)
- **11-20 orders**: 0.02 NXS + ~0.01 NXS per order (congestion fee)
- **Paid in**: NXS from user's default account
- **Automatic**: Fees are handled by Q-Wallet's executeBatchCalls method

#### Q-Wallet Integration
When connected via Q-Wallet:
- Executes trades through the `window.qWallet.executeBatchCalls()` API
- User will be prompted to approve the transaction in Q-Wallet
- Requires PIN confirmation in the Q-Wallet extension
- Fee is calculated and displayed before confirmation

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
  to: "default"     // Receiving account
}
```

## User Flow

1. **Connect Wallet**
   - User connects Q-Wallet browser extension

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
   - Review total value and estimated fee

5. **Execute Trade**
   - Click "Execute Buy" or "Execute Sell"
   - Review estimated network fee (free for single orders)
   - Approve transaction in Q-Wallet
   - Receive confirmation notification

6. **Post-Trade**
   - Order book refreshes automatically
   - Recent trades list updates
   - Modal closes on successful execution

## Security Features

- Trade button only visible when wallet is connected
- All transactions require explicit user approval
- PIN confirmation required via Q-Wallet
- Network fee clearly displayed before execution
- No storage of sensitive credentials
- Direct blockchain interaction via Q-Wallet

## Error Handling

The system provides user-friendly error messages for:
- No wallet connected
- No trading pair selected
- No order selected
- Invalid amount or price
- Insufficient NXS for network fee
- Transaction failures
- Network errors

## Files Modified/Created

### New Files
- `dex/trade.js` - Trade functionality implementation

### Modified Files
- `dex/index.html` - Added trade button, modal HTML, and fee notice
- `dex/dex.css` - Added trade UI styles and fee notice styling
- `dex/dex.js` - Integrated trade initialization
- `dex/auth.js` - Added trade button visibility updates
- `dex/state.js` - Added pair selection callback
- `dex/api-config.js` - Added execute order endpoint and batch fee configuration

## Fee Structure

Fees are handled automatically by Q-Wallet's `executeBatchCalls` method. The fee structure is defined in `api-config.js`:

```javascript
const BATCH_FEE_STRUCTURE = {
    freeLimit: 1,           // First call is free
    baseFee: 0.01,          // 0.01 NXS per tier (2-10, 11-20, etc.)
    tierSize: 10,           // Calls per tier
    congestionFee: 0.01     // ~0.01 NXS per call (Nexus network fee)
};
```

### Fee Calculation

| Orders Executed | Service Fee | Est. Congestion Fee | Total Est. Fee |
|-----------------|-------------|---------------------|----------------|
| 1               | Free        | -                   | Free           |
| 2-10            | 0.01 NXS    | ~0.02-0.10 NXS      | ~0.03-0.11 NXS |
| 11-20           | 0.02 NXS    | ~0.11-0.20 NXS      | ~0.13-0.22 NXS |
| 21-30           | 0.03 NXS    | ~0.21-0.30 NXS      | ~0.24-0.33 NXS |

**Note:** Congestion fees are charged by the Nexus blockchain when multiple API calls are made within 10 seconds. The actual fee may vary based on network conditions.

### Fee Payment Process

1. User executes one or more trades
2. Q-Wallet bundles all market/execute/order calls into a single batch
3. Q-Wallet calculates and deducts NXS fees automatically
4. Fees are paid from the user's default NXS account
5. User sees estimated fee before confirming the transaction
- Partial order fills
- Stop-loss orders
- Market depth visualization
- Trade analytics
