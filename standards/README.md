# Distordia Asset Standards

Open specifications for blockchain-native assets on the Nexus blockchain.

## Overview

This documentation site provides comprehensive JSON schemas and examples for all Distordia-standard asset types. These standards enable interoperability across the ecosystem and define how data is structured, verified, and indexed.

All schemas follow JSON Schema Draft 2020-12 for documentation purposes and include:
- Full property definitions with types and constraints
- Real-world examples formatted for Nexus blockchain
- Nexus API integration commands
- Validation patterns

---

## ⚠️ Nexus Blockchain Constraints

When creating assets on Nexus, the following constraints apply:

| Constraint | Value |
|------------|-------|
| **Maximum asset data size** | 1 KB |
| **Format** | `JSON` (typed fields with mutability control) |
| **Supported types** | `uint8`, `uint16`, `uint32`, `uint64`, `uint256`, `uint512`, `uint1024`, `string`, `bytes` |
| **Nested objects** | ❌ Not supported on-chain |
| **Arrays** | ❌ Not supported on-chain (use comma/pipe-separated strings) |

The `JSON` format allows proper typed fields:
```json
json='[
  {"name":"distordia-type","type":"string","value":"product","mutable":false,"maxlength":16},
  {"name":"weight-kg","type":"uint32","value":250,"mutable":false},
  {"name":"status","type":"string","value":"active","mutable":true,"maxlength":12}
]'
```

All standard files document:
- `nexusFields`: Array of field definitions for Nexus asset creation
- `fieldDefinitions`: Human-readable descriptions and validation rules
- `examples`: Sample asset data with proper typed values

---

## Standard Files

| Standard | File | Type Identifier |
|----------|------|-----------------|
| [Content Verification](#content-verification) | `content-standard.json` | `distordia: "content"` |
| [Product Masterdata](#product-masterdata) | `product-standard.json` | `distordia-type: "product"` |
| [Social Posts](#social-posts) | `social-standard.json` | `distordia-type: "distordia-post"` |
| [Fantasy Football Players](#fantasy-football-players) | `player-standard.json` | `standard: "distordia.player.v1"` |
| [Namespace Attestation](#namespace-attestation) | `namespace-standard.json` | (attestation object) |
| [Agent Registration](#agent-registration) | `agent-standard.json` | `distordia-type: "agent"` |
| [Swarm Coordination](#swarm-coordination) | `swarm-standard.json` | `distordia-type: "swarm"` |

---

## Asset Types

### Content Verification
**File:** `content-standard.json`  
**Type:** `distordia: "content"`

On-chain content provenance and attestation. Enables verification of web content by URL lookup to combat AI-generated misinformation.

```json
{
  "distordia": "content",
  "status": "official",
  "url": "https://example.com/article",
  "title": "Article Title",
  "author": "Author Name",
  "hash": "sha256:abc123..."
}
```

### Product Masterdata
**File:** `product-standard.json`  
**Type:** `distordia-type: "product"`

Global master data registry for products and materials. Based on GS1, UN/CEFACT, and ISO standards. Enables supply chain traceability and B2B data exchange.

```json
{
  "distordia-type": "product",
  "status": "valid",
  "art-nr": "WIDGET-2000",
  "gtin": "5901234123457",
  "desc": "Industrial Widget",
  "mfr": "Acme Industries",
  "cat": "industrial-components",
  "uom": "EA"
}
```

### Social Posts
**File:** `social-standard.json`  
**Type:** `distordia-type: "distordia-post"`

Decentralized social media posts stored permanently on the Nexus blockchain. Supports threading, quotes, media attachments, and polls.

```json
{
  "distordia-type": "distordia-post",
  "distordia-status": "user-post",
  "text": "Hello decentralized world!",
  "tags": "nexus,blockchain",
  "lang": "en"
}
```

### Fantasy Football Players
**File:** `player-standard.json`  
**Type:** `standard: "distordia.player.v1"`

NFT player assets for blockchain-based fantasy football. Includes player attributes, team info, rarity tiers, and live stats.

```json
{
  "standard": "distordia.player.v1",
  "player-id": "haaland",
  "player-name": "Erling Haaland",
  "team-id": "mancity",
  "league": "epl",
  "position": "FWD",
  "overall": "91",
  "rarity": "legendary",
  "season": "2024-2025"
}
```

### Namespace Attestation
**File:** `namespace-standard.json`  
**Type:** `distordia-type: "namespace"`

Verified namespace attestations stored on-chain. Core identity primitive for all Distordia protocols. Includes tier levels, staking, delegation chains, and reputation.

```json
{
  "distordia-type": "namespace",
  "namespace": "acme-corp",
  "tier": "L2",
  "stake": 2500,
  "verified-ts": 1750000000,
  "valid-until": 1781536000,
  "protocols": "content,masterdata,a2a",
  "entity-type": "organization",
  "reputation": 850,
  "attester": "distordia"
}
```

### Agent Registration
**File:** `agent-standard.json`  
**Type:** `distordia-type: "agent"`

AI agent identity and capability registration. Enables agent-to-agent (A2A) trust verification. Uses typed fields for permissions and rate limits.

```json
{
  "distordia-type": "agent",
  "agent-id": "logistics-coordinator-01",
  "namespace": "acme-corp",
  "agent-type": "autonomous",
  "status": "active",
  "caps": "route-optimization,dispatch,tracking",
  "protocols": "a2a,mcp",
  "can-transact": 1,
  "max-tx-value": 1000,
  "rate-rpm": 100,
  "rate-rpd": 10000,
  "kill-switch": 1
}
```

### Swarm Coordination
**File:** `swarm-standard.json`  
**Type:** `distordia-type: "swarm"` / `distordia-type: "swarm-mission"`

Coordinated agent swarm registration and mission contracts. Uses typed numeric fields for stake, payments, and statistics.

```json
{
  "distordia-type": "swarm",
  "swarm-id": "acme-logistics-fleet",
  "namespace": "acme-corp",
  "swarm-type": "logistics",
  "member-count": 4,
  "members": "logistics-01|delivery-01|delivery-02|tracker",
  "consensus": "leader",
  "stake": 5000,
  "missions-done": 1250,
  "reputation": 890
}
```

---

## Core Principles

1. **Open Standards** - All schemas are publicly documented and JSON Schema compliant
2. **Namespace-Centric** - Trust propagates from verified namespaces to all registered assets
3. **Agent-Readable** - Structured typed fields for both human and AI agent consumption
4. **On-Chain First** - All core data on Nexus blockchain using `format=JSON`
5. **Versioned** - All standards include version identifiers for evolution
6. **Typed Fields** - Proper numeric types (`uint8`-`uint64`) avoid string parsing

---

## Verification Tiers

| Tier | Name | Stake | Annual Fee | Use Case |
|------|------|-------|------------|----------|
| L0 | Verified Agent | 0 DIST | 1 DIST | Automated AI agents |
| L1 | Verified Individual | 100 DIST | 10 DIST | Creators, developers |
| L2 | Verified Organization | 2,500 DIST | 250 DIST | DAOs, companies |
| L3 | Verified Enterprise | 25,000 DIST | 2,500 DIST | Legal entities, SLA |
| L4 | Human Attested | 50,000 DIST | 5,000 DIST | Premium human verification |

---

## Nexus Blockchain Integration

All assets are registered via POST requests to `https://api.distordia.com`.

**Asset Format:** All Distordia assets use `format=JSON` with typed field definitions.

**Supported Types:**
- `uint8`, `uint16`, `uint32`, `uint64` - Unsigned integers
- `uint256`, `uint512`, `uint1024` - Large unsigned integers
- `string` - Text with optional `maxlength`
- `bytes` - Binary data

**Common Endpoints:**
- `assets/create/asset` - Create new asset
- `assets/update/asset` - Update mutable fields
- `assets/get/asset` - Retrieve asset by address
- `register/list/assets:asset` - List/search assets
- `register/list/names` - List namespace-registered names

**Create Asset Example:**
```bash
# Via Nexus API
assets/create/asset format=JSON name=product-WIDGET-2000 json='[
  {"name":"distordia-type","type":"string","value":"product","mutable":false},
  {"name":"art-nr","type":"string","value":"WIDGET-2000","mutable":false,"maxlength":32},
  {"name":"desc","type":"string","value":"Industrial Widget","mutable":true,"maxlength":256},
  {"name":"weight-kg","type":"uint32","value":250,"mutable":false},
  {"name":"status","type":"string","value":"valid","mutable":true,"maxlength":8}
]'
```

**Query Example:**
```javascript
const response = await fetch('https://api.distordia.com/register/list/assets:asset', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    where: "distordia-type = 'product'",
    limit: 100
  })
});
const data = await response.json();
const assets = data.result;
```

**Notes:**
- Numeric fields are properly typed (no string parsing needed)
- Booleans use `uint8` with values 0 or 1
- Lists stored as comma/pipe-separated strings, parsed client-side
- Timestamps stored as `uint64` Unix timestamps

---

## Usage

**Browse Standards UI:**
```bash
# Serve locally
python -m http.server 8000
# Open http://localhost:8000/standards/
```

**Validate Assets:**
Use any JSON Schema validator with the standard files:
```bash
npm install ajv
# Validate asset against schema
```

**Integrate in Apps:**
```javascript
// Load standard for reference
const contentStandard = await fetch('/standards/content-standard.json').then(r => r.json());
console.log(contentStandard.properties); // View all fields
```

---

## Related Documentation

- [Masterdata App](../masterdata/README.md) - Product catalog application
- [Social App](../social/README.md) - Decentralized social platform
- [Fantasy Football](../fantasyfootball/ASSET_STANDARD.md) - Player NFT details
- [Content Verification](../content-verification/) - Verification app
- [Nexus API Docs](../docs/Nexus%20API%20docs/README.MD) - Blockchain API reference
- [Q-Wallet Integration](../docs/q-wallet%20docs/DAPP-INTEGRATION.md) - Wallet connection
