# Distordia Swap - Cross-Chain Stablecoin Bridge

A bidirectional bridge service for swapping between USDC (Solana) and USDD (Nexus).

> **Backend Service**: Powered by [swapService](https://github.com/AkstonCap/swapService) - see `docs/swapService docs/` for full documentation.

## Features

- **1:1 Exchange Rate**: USDC to USDD at parity
- **Low Fees**: 0.1 USDC flat + 0.1% dynamic fee
- **Bidirectional**: Swap both USDC→USDD and USDD→USDC
- **Fast Transfers**: 2-5 minute transaction time
- **Non-Custodial**: Trustless, secure bridge protocol

## How It Works

### USDC → USDD (Solana to Nexus)

1. Send USDC to vault: `Bg1MUQDMjAuXSAFr8izhGCUUhsrta1EjHcTvvgFnJEzZ`
2. Include memo: `nexus:<YOUR_USDD_ACCOUNT>`
3. Service validates memo and sends USDD to specified Nexus account
4. Invalid/missing memo → refund (flat fee applies)

### USDD → USDC (Nexus to Solana)

1. **One-time setup**: Create a bridge asset with `receival_account`:
   ```bash
   nexus assets/create/asset name=distordiaBridge format=basic \
       txid_toService="" \
       receival_account=<YOUR_SOLANA_USDC_ATA> \
       pin=<PIN>
   ```

2. **Send USDD** to treasury and capture txid:
   ```bash
   nexus finance/debit/token from=USDD to=<TREASURY_ACCOUNT> amount=10.5 pin=<PIN>
   ```

3. **Update asset** with txid:
   ```bash
   nexus assets/update/asset name=distordiaBridge format=basic \
       txid_toService=<TXID> pin=<PIN>
   ```

4. Service finds your asset mapping (by txid + owner), sends USDC to `receival_account`
5. If no mapping within 1 hour → USDD is refunded

## Configuration

| Parameter | Value |
|-----------|-------|
| Exchange Rate | 1 USDC = 1 USDD |
| Flat Fee (USDC path) | 0.1 USDC |
| Dynamic Fee | 0.1% (10 bps) |
| Minimum Amount | 0.100101 (both directions) |
| Refund Timeout | 1 hour (USDD→USDC path) |

**Note**: Amounts below minimum are treated as fees (100% micro fee policy).

## Wallet Support

### Solana Wallets
- **Solflare** (recommended) - has built-in memo field in send UI
- **Phantom** - requires programmatic memo via transaction builder

### Nexus Wallets  
- **Q-Wallet** browser extension
- Manual address entry (fallback)

## Security

- Asset owner must match USDD sender (signature chain verification)
- Non-custodial bridge design
- On-chain verification
- Automatic refund on failures

## Files

- `index.html` - Main swap interface
- `swap.css` - Styling for swap page
- `swap.js` - Swap logic and wallet integration
- `README.md` - This documentation

## Related Documentation

- [swapService README](../docs/swapService%20docs/README.md) - Full service documentation
- [STATE_MACHINES.md](../docs/swapService%20docs/STATE_MACHINES.md) - Processing state flows
- [ASSET_STANDARD.md](../docs/swapService%20docs/ASSET_STANDARD.md) - Bridge asset specification

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
