# Namespace Verification System

On-chain namespace verification system for Distordia Labs.

## Overview

The Namespace Verification System has two components:

1. **Website** (`/verification/`) - Read-only interface for viewing verification status. Users can connect their Q-Wallet to submit verification or dispute requests as on-chain assets.

2. **Daemon** (`/verification/daemon/`) - Local Python script that runs with a Nexus node. Processes verification requests, audits balances, and updates the verified namespaces registry.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Nexus Blockchain                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐   │
│  │ Verification     │  │ Verified Lists   │  │ Disputes Registry    │   │
│  │ Request Assets   │  │ L3, L2, L1       │  │ distordia:disputes-N │   │
│  └────────┬─────────┘  └────────▲─────────┘  └───────────▲──────────┘   │
│           │                     │                        │              │
└───────────┼─────────────────────┼────────────────────────┼──────────────┘
            │                     │                        │
    ┌───────▼─────────────────────┴────────────────────────┴────────┐
    │                    Verification Daemon                         │
    │         (runs locally with Nexus node credentials)            │
    │  - Processes verification requests                            │
    │  - Audits DIST balances                                       │
    │  - Updates verified lists                                     │
    │  - Handles disputes                                           │
    └───────────────────────────────────────────────────────────────┘
            ▲
            │ Reads requests, writes verified lists
            │
    ┌───────┴───────────────────────────────────────────────────────┐
    │                    Website (read-only)                        │
    │         (public access via api.distordia.com)                │
    │  - View verified namespaces                                   │
    │  - Check namespace eligibility                                │
    │  - Submit verification requests (via Q-Wallet)                │
    │  - Submit dispute requests (via Q-Wallet)                     │
    └───────────────────────────────────────────────────────────────┘
```

## Verification Tiers

| Tier | Required DIST | Description |
|------|---------------|-------------|
| L0   | 1             | Auto-verified (default) |
| L1   | 1,000         | Basic verification |
| L2   | 10,000        | Verified status |
| L3   | 100,000       | Premium verification |

## How It Works

### Verification Account

Each namespace seeking verification must create a DIST token account named:
```
{namespace}::DIST-verification
```

The balance in this account determines their eligible verification tier.

### On-Chain Storage

Verified namespaces are stored in assets under the `distordia` namespace:

**Verified Lists:**
- `distordia:L3-verified-1` (up to 50 entries)
- `distordia:L3-verified-2` (overflow if needed)
- `distordia:L2-verified-1`
- `distordia:L2-verified-2`
- `distordia:L1-verified-1`
- etc.

**Disputes Registry:**
- `distordia:disputes-1` (up to 50 entries)
- `distordia:disputes-2` (overflow if needed)

### Asset Structure

**Verified Asset:**
```json
{
  "distordia-type": "verification-registry",
  "tier": "L3",
  "version": 1,
  "updated": "2026-01-22T12:00:00Z",
  "namespaces": "[{\"namespace\":\"example\",\"genesis\":\"abc123...\",\"verified\":\"2026-01-22T12:00:00Z\",\"balance\":150000}]"
}
```

**Disputes Asset:**
```json
{
  "distordia-type": "disputes-registry",
  "version": 1,
  "updated": "2026-01-22T12:00:00Z",
  "disputes": "[{\"id\":\"dispute-1234\",\"namespace\":\"badactor\",\"penalty\":1000,\"reason\":\"Violation of terms\",\"status\":\"active\",\"created\":\"2026-01-22T12:00:00Z\"}]"
}
```

## Effective Balance Calculation

A namespace's effective balance for tier eligibility:

```
Effective Balance = DIST-verification balance - Total Active Penalties
```

If effective balance drops below the tier threshold, verification may be revoked.

## Features

### Website Features

**Namespace Checking**
- Enter any namespace to check its verification status
- View DIST balance, penalties, and eligible tier
- See if current verification is still valid

**Request Submission (requires Q-Wallet)**
- Submit verification requests for your namespace
- Submit dispute requests against other namespaces
- Requests are stored on-chain for daemon processing

**Registry Viewing**
- View all verified namespaces by tier
- Filter by L3, L2, L1 or view all
- Export registry data

### Daemon Features

**Request Processing**
- Monitors for new verification request assets
- Validates DIST balances via `{namespace}::DIST-verification`
- Adds verified namespaces to appropriate tier lists
- Marks processed requests as complete

**Balance Auditing**
- Periodically checks all verified namespace balances
- Automatically updates tiers when balance changes
- Revokes verification when balance drops below threshold

**Dispute Handling**
- Processes dispute request assets
- Applies penalties to namespace effective balance
- Recalculates tier eligibility after penalties

## Request Assets

Users submit requests by creating assets with their Q-Wallet:

**Verification Request:**
```json
{
  "distordia-type": "verification-request",
  "target-namespace": "example",
  "requested-tier": "L2",
  "status": "pending",
  "timestamp": "2026-01-22T12:00:00Z"
}
```

**Dispute Request:**
```json
{
  "distordia-type": "dispute-request",
  "target-namespace": "badactor",
  "penalty": 1000,
  "reason": "Violation of terms",
  "status": "pending",
  "timestamp": "2026-01-22T12:00:00Z"
}
```

## Daemon Setup

See [daemon/README.md](daemon/README.md) for full installation and configuration instructions.

Quick start:
```bash
cd daemon
cp config.example.json config.json
# Edit config.json with your Nexus credentials
python verification_daemon.py
```

## API Integration

**Website (read-only):**
- Uses public `register/get` endpoints via `https://api.distordia.com`
- No authentication required for reading verified lists
- Q-Wallet connection for submitting requests

**Daemon (read/write):**
- Connects to local Nexus node (default: `http://localhost:8080`)
- Requires authenticated session for modifying assets
- Uses `assets/create`, `assets/update` endpoints

## Local Development

```bash
# Serve website from project root
python -m http.server 8000

# Navigate to
http://localhost:8000/verification/
```

## File Structure

```
verification/
├── index.html          # Main application page
├── verification.css    # Styles
├── verification.js     # Main logic & UI (request-based)
├── api.js             # Read-only API + Q-Wallet requests
├── README.md          # This file
└── daemon/
    ├── verification_daemon.py  # Processing daemon
    ├── config.example.json     # Example configuration
    └── README.md              # Daemon documentation
```
