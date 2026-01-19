# Distordia Asset Standards

Open specifications for blockchain-native assets on the Nexus blockchain.

## Overview

This documentation site provides comprehensive schemas and examples for all Distordia-standard asset types. These standards enable interoperability across the ecosystem and define how data is structured, verified, and indexed.

## Asset Types

### Product / Masterdata (`distordia-type: product`)
Global master data registry for products and materials. Based on GS1, UN/CEFACT, and ISO standards.

### Content Verification (`distordia: content`)
On-chain content provenance and attestation. Enables verification of web content by URL lookup.

### Social Posts (`distordia-type: distordia-post`)
Decentralized social media posts stored permanently on the Nexus blockchain.

### Fantasy Football Players (`standard: distordia.player.v1`)
NFT player assets for blockchain-based fantasy football with tradeable stats.

## Core Principles

1. **Open Standards** - All schemas are publicly documented
2. **Namespace-Centric** - Trust propagates from verified namespaces
3. **Agent-Readable** - Structured JSON for both human and AI consumption
4. **On-Chain First** - Core metadata ≤1KB, extended data linked via URLs

## Verification Tiers

- **L0 - Verified Agent**: Automated, for AI agents
- **L1 - Verified Individual**: Pseudonymous, low stake
- **L2 - Verified Organization**: Domain/DAO proofs
- **L3 - Verified Enterprise**: Legal entity, SLA agreements

## Usage

Open `index.html` in a browser or serve via HTTP server.

## Related Documentation

- [Masterdata README](../masterdata/README.md) - Full product schema details
- [Social README](../social/README.md) - Social post format
- [Fantasy Football Asset Standard](../fantasyfootball/ASSET_STANDARD.md) - Player NFT schema
- [Nexus API Docs](../Nexus%20API%20docs/README.MD) - Blockchain API reference
