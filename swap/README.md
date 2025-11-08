# Distordia Swap - Cross-Chain Stablecoin Bridge

A cross-chain bridge service for swapping USDC on Solana to USDD on Nexus blockchain.

## Features

- **1:1 Exchange Rate**: USDC to USDD at parity
- **Low Fees**: 0.5% bridge fee
- **Fast Transfers**: 2-5 minute transaction time
- **Non-Custodial**: Trustless, secure bridge protocol
- **User-Friendly Interface**: Simple swap interface with real-time calculations

## How It Works

1. **Connect Wallets**: Connect both Solana (Phantom) and Nexus wallets
2. **Enter Amount**: Specify how much USDC to swap
3. **Confirm Transaction**: Review details and approve
4. **Receive USDD**: Get USDD in Nexus wallet within minutes

## Architecture

### Current Implementation (Development)
- Frontend-only interface for testing UX
- Simulated transactions
- Placeholder wallet connections

### Production Implementation (Planned)
- Smart contracts on both chains
- Lock-and-mint mechanism
- Multi-signature validation
- Automated market maker (AMM) pool
- Transaction verification layer
- Real wallet integrations

## Bridge Flow

```
Solana Chain                Bridge Protocol              Nexus Chain
-----------                 ----------------              -----------
   USDC    →  Lock Tokens  →   Verify   →  Mint Tokens  →   USDD
            ←  Release     ←   Confirm   ←  Burn        ←
```

## Configuration

- **Exchange Rate**: 1 USDC = 1 USDD
- **Bridge Fee**: 0.5%
- **Network Fee**: ~0.001 SOL (Solana transaction)
- **Minimum Swap**: 1 USDC
- **Maximum Swap**: 10,000 USDC per transaction

## Wallet Support

- **Solana**: Phantom Wallet
- **Nexus**: Nexus Wallet (integration planned)

## Security

- Non-custodial bridge design
- On-chain verification
- Multi-signature requirements
- Time-lock mechanisms
- Emergency pause functionality

## Development Status

🚧 **In Development** - Current version is for testing and demonstration purposes only.

### Completed
- ✅ User interface design
- ✅ Swap calculation logic
- ✅ Transaction flow mockup

### In Progress
- 🔄 Wallet integration
- 🔄 Smart contract development
- 🔄 Bridge protocol implementation

### Planned
- 📋 Security audits
- 📋 Testnet deployment
- 📋 Mainnet launch

## Files

- `index.html` - Main swap interface
- `swap.css` - Styling for swap page
- `swap.js` - Swap logic and wallet integration
- `README.md` - Documentation

## Future Enhancements

- Reverse swap (USDD → USDC)
- Support for additional stablecoins
- Batch transactions
- Advanced order types
- Liquidity pools
- Fee discounts for volume traders

## API Integration

Bridge will integrate with:
- Solana RPC nodes
- Nexus API endpoints
- Price oracles
- Transaction indexers

## Support

For issues or questions, contact: [Your contact info]

## License

[Your license]

---

**Disclaimer**: This bridge service is provided as-is. Users are responsible for verifying all transaction details before confirming swaps. Always ensure you're interacting with the official Distordia bridge interface.
