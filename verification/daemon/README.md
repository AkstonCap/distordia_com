# Verification Daemon

Local script for processing namespace verification requests on the Nexus blockchain.

## Overview

This daemon runs alongside a local Nexus node and:
1. Monitors for new verification requests (on-chain assets)
2. Monitors for new dispute requests (on-chain assets)
3. Validates DIST balances for each request
4. Updates verified namespace registries
5. Audits existing verifications for balance changes

## Requirements

- Python 3.8+
- `requests` library
- Local Nexus node with API access
- Logged-in session with `distordia` namespace credentials

## Installation

```bash
# Install dependencies
pip install requests

# Copy example config
cp config.example.json config.json

# Edit config with your settings
nano config.json
```

## Usage

### With Config File

```bash
python verification_daemon.py --config config.json
```

### With Command Line Options

```bash
python verification_daemon.py \
    --node http://localhost:8080 \
    --username your_username \
    --password your_password \
    --pin 1234
```

### With Existing Session

```bash
python verification_daemon.py \
    --node http://localhost:8080 \
    --session abc123...
```

### Run Once (No Loop)

```bash
python verification_daemon.py --once --config config.json
```

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `node_url` | `http://localhost:8080` | Nexus node API URL |
| `check_interval` | `300` | Seconds between checks |
| `distordia_namespace` | `distordia` | Namespace for registry assets |
| `asset_max_entries` | `50` | Max entries per asset |
| `tier_thresholds` | See below | DIST requirements per tier |
| `log_file` | `verification_daemon.log` | Log file path |
| `log_level` | `INFO` | Logging level |

### Tier Thresholds

```json
{
    "L0": 1,
    "L1": 1000,
    "L2": 10000,
    "L3": 100000
}
```

## How It Works

### Request Processing

1. **User submits verification request** via website (creates `verification-request` asset)
2. **Daemon reads pending requests** from blockchain
3. **Daemon validates**:
   - Namespace exists
   - DIST-verification account has sufficient balance
   - Effective balance (minus penalties) meets tier threshold
4. **Daemon updates**:
   - Adds namespace to appropriate `Lx-verified-x` asset
   - Updates request status to `approved` or `rejected`

### Balance Auditing

Every cycle, the daemon:
1. Reads all verified namespaces from registry assets
2. Checks current DIST-verification balance for each
3. Calculates effective balance (balance - penalties)
4. Downgrades or revokes namespaces that no longer qualify

### Dispute Processing

1. **Admin submits dispute** via website (creates `dispute-request` asset)
2. **Daemon reads pending disputes**
3. **Daemon adds dispute** to `disputes-x` registry
4. **Daemon re-audits** affected namespace

## On-Chain Asset Types

### Verification Request (created by users)

```json
{
    "distordia-type": "verification-request",
    "namespace": "mycompany",
    "tier": "L2",
    "status": "pending",
    "created": "2026-01-22T12:00:00Z"
}
```

### Dispute Request (created by admins)

```json
{
    "distordia-type": "dispute-request",
    "namespace": "badactor",
    "penalty": 1000,
    "reason": "Terms violation",
    "status": "pending",
    "created": "2026-01-22T12:00:00Z"
}
```

### Verified Registry (managed by daemon)

```json
{
    "distordia-type": "verification-registry",
    "tier": "L2",
    "updated": "2026-01-22T12:00:00Z",
    "namespaces": "[{...}]"
}
```

### Disputes Registry (managed by daemon)

```json
{
    "distordia-type": "disputes-registry",
    "updated": "2026-01-22T12:00:00Z",
    "disputes": "[{...}]"
}
```

## Logging

Logs are written to both console and `verification_daemon.log`:

```
2026-01-22 12:00:00 [INFO] Distordia Verification Daemon starting...
2026-01-22 12:00:00 [INFO] Processing verification requests...
2026-01-22 12:00:01 [INFO] Processing request for mycompany -> L2
2026-01-22 12:00:02 [INFO] ✓ mycompany verified as L2
```

## Security Notes

- Run on a secure server with the Nexus node
- Store credentials securely (use environment variables or secure config)
- The daemon requires write access to the `distordia` namespace
- Monitor logs for unauthorized request patterns

## Troubleshooting

### "Write operations will fail"

You need to provide credentials or an active session:
```bash
python verification_daemon.py --username admin --password secret --pin 1234
```

### "Namespace not found"

The requested namespace doesn't exist on the blockchain.

### "Insufficient balance"

The namespace's `{namespace}::DIST-verification` account doesn't have enough DIST for the requested tier.
