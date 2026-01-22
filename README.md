# Distordia Labs Website

A multi-app static website for Distordia Labs - blockchain-powered dApps built on the Nexus blockchain.

## 🌐 Live Site

**[distordia.com](https://distordia.com)**

## ✨ Features

- **Modern Design**: Dark-themed UI with orange gradient accents
- **Fully Responsive**: Optimized for desktop, tablet, and mobile devices
- **No Build Tools**: Pure vanilla JavaScript - open HTML files directly
- **Nexus Blockchain Integration**: All apps communicate with Nexus blockchain via REST API
- **Q-Wallet Integration**: Web3 authentication via Q-Wallet browser extension

## 🚀 dApps & Projects

### Core dApps

| App | Description | Path |
|-----|-------------|------|
| **DEX** | Decentralized exchange with order books, trading pairs, and charts | `/dex/` |
| **Master Data** | Product catalog NFT management system | `/masterdata/` |
| **Q-Wallet Plugin** | Browser extension info and installation page | `/q-wallet/` |

### Projects

| Project | Description | Path |
|---------|-------------|------|
| **Stablecoin Bridge** | Cross-chain swap between USDC (Solana) and USDD (Nexus) | `/swap/` |
| **Content Verification** | Verify content provenance via blockchain registration | `/content-verification/` |
| **Social** | On-chain social media - posts stored as blockchain assets | `/social/` |
| **Q-Mobile** | Mobile wallet app information and features | `/q-mobile/` |
| **Verification** | Namespace verification system with tiered DIST staking | `/verification/` |
| **Fantasy Football** | NFT-based fantasy football with real match scoring | `/fantasyfootball/` |
| **Ship Engineering** | AI-powered ship design research showcase | `/ship-engineering/` |

### Documentation

| Resource | Description | Path |
|----------|-------------|------|
| **Standards** | Asset naming conventions and blockchain standards | `/standards/` |
| **Nexus API Docs** | Complete Nexus blockchain API reference | `/docs/Nexus API docs/` |
| **Q-Wallet Docs** | dApp integration guide for Q-Wallet | `/docs/q-wallet docs/` |

## 📁 Project Structure

```
distordia_com/
├── index.html              # Landing page
├── styles.css              # Shared styles
├── script.js               # Landing page scripts
├── dex/                    # Decentralized exchange
├── masterdata/             # Product catalog NFTs
├── q-wallet/               # Wallet plugin info
├── swap/                   # Cross-chain bridge
├── content-verification/   # Content provenance
├── social/                 # On-chain social media
├── q-mobile/               # Mobile wallet info
├── verification/           # Namespace verification
│   └── daemon/             # Python processing daemon
├── fantasyfootball/        # NFT fantasy football
├── ship-engineering/       # AI ship research
├── standards/              # Blockchain standards
├── docs/                   # API documentation
└── images/                 # Shared assets
```

## 🛠️ Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/distordia_com.git
cd distordia_com

# Serve with Python
python -m http.server 8000

# Or with Node.js
npx serve

# Navigate to http://localhost:8000
```

## 🔗 Blockchain Integration

### API Endpoint
All apps connect to `https://api.distordia.com` (Nexus node).

### Request Pattern
```javascript
const response = await fetch('https://api.distordia.com/system/get/info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
});
const data = await response.json();
const info = data.result;
```

### Q-Wallet Connection
```javascript
if (typeof window.qWallet !== 'undefined') {
    const accounts = await window.qWallet.connect();
    const userAddress = accounts[0];
}
```

## 🎨 Tech Stack

- **HTML5/CSS3**: Semantic markup with modern styling
- **Vanilla JavaScript**: No frameworks, no build tools
- **Nexus Blockchain API**: Real-time blockchain data
- **Q-Wallet**: Browser extension for Web3 authentication
- **Python** (daemon only): Verification processing script

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

MIT License

## 📧 Contact

**Distordia Labs**
- Website: [distordia.com](https://distordia.com)
- GitHub: [@AkstonCap](https://github.com/AkstonCap)

---

⧈ Built on Nexus blockchain
