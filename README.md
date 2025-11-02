# Distordia Crypto Lab Website

A modern, responsive website for Distordia - a cutting-edge cryptographic research laboratory.

## 🌐 Live Preview

Simply open `index.html` in your web browser to view the website.

## ✨ Features

- **Modern Design**: Dark-themed UI with orange gradient accents matching the Distordia brand
- **Custom Branding**: Uses official Distordia logo throughout the site
- **Fully Responsive**: Optimized for desktop, tablet, and mobile devices
- **Interactive Animations**: Smooth scrolling, parallax effects, and particle animations
- **DEX Marketplace**: Full-featured decentralized exchange interface for Nexus.io blockchain
- **Fantasy Football**: NFT-based fantasy football game combining blockchain assets with real football data
- **Sections Include**:
  - Hero section with glitch effect
  - About the lab
  - Research areas
  - Featured projects
  - Contact information
  - DEX trading interface (`/dex/`)
  - Fantasy Football game (`/fantasyfootball/`)

## 🚀 Getting Started

### Local Development

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/distordia_com.git
   cd distordia_com
   ```

2. Open `index.html` in your browser:
   - Double-click the file, or
   - Use a local server (recommended):
     ```bash
     # Using Python
     python -m http.server 8000
     
     # Using Node.js
     npx serve
     ```

3. Navigate to `http://localhost:8000` in your browser

## 📁 Project Structure

```
distordia_com/
├── images/
│   ├── distordia-stor-medtekst-bred.png  # Wide logo with text
│   ├── distordia-stor-medtekst.png       # Logo with text
│   └── logo-utentekst.png                # Icon only
├── dex/
│   ├── index.html      # DEX marketplace page
│   ├── dex.css         # DEX-specific styling
│   ├── dex.js          # Market data API integration
│   └── README.md       # DEX documentation
├── fantasyfootball/
│   ├── index.html      # Fantasy football game page
│   ├── fantasy.css     # Football-themed styling
│   ├── fantasy.js      # Game logic and NFT integration
│   └── README.md       # Fantasy football documentation
├── index.html          # Main HTML file
├── styles.css          # CSS styling
├── script.js           # JavaScript interactivity
└── README.md           # This file
```

## 🎨 Customization

### Colors

Edit the CSS variables in `styles.css` to change the color scheme:

```css
:root {
    --primary-color: #FF6B35;      /* Orange */
    --secondary-color: #FF8C42;     /* Light Orange */
    --accent-color: #FFA577;        /* Soft Orange */
    --bg-dark: #0a0a0f;            /* Dark background */
    --bg-card: #1a1a2e;            /* Card background */
}
```

### Content

- Update company information in `index.html`
- Modify research areas, projects, and contact details
- Add your own logo/branding

## 🛠️ Technologies Used

- **HTML5**: Semantic markup
- **CSS3**: Modern styling with gradients, animations, and flexbox/grid
- **JavaScript**: Interactive features and animations
- **Nexus.io API**: Real-time blockchain data for DEX marketplace
- **No frameworks required**: Pure vanilla JavaScript

## 🔗 Subsite: DEX Marketplace

The `/dex/` subsite provides a full-featured decentralized exchange interface:

### Features
- **Real-time Market Data**: Live prices from Nexus.io blockchain
- **Order Book Display**: Live bid/ask orders with depth visualization
- **Trading Pairs**: NXS/BTC, NXS/USD, NXS/ETH, and more
- **Price Charts**: Interactive charts with multiple time intervals
- **Network Statistics**: Block height, hash rate, 24h volume
- **Auto-refresh**: Data updates every 10 seconds

### Access
- Navigate to `/dex/` from the main site
- Or directly: `http://localhost:8000/dex/`

### API Integration
Connects to Nexus.io blockchain API endpoints for live market data. Includes fallback demo data for development and when API is unavailable.

See `/dex/README.md` for detailed documentation.

## ⚽ Subsite: Fantasy Football

The `/fantasyfootball/` subsite combines blockchain NFT assets with real-world football performance:

### Features
- **NFT Player Assets**: Own football player assets on Nexus.io blockchain
- **Real-time Scoring**: Points based on actual match performance (goals, assists, clean sheets)
- **Team Formation**: Build your squad with 1 GK, 4 DEF, 4 MID, 2 FWD
- **Live Leaderboard**: Compete with other asset holders globally
- **Marketplace**: Buy, sell, and trade player assets
- **Match Integration**: Live match data updates player scores in real-time

### Scoring System
Points are awarded based on real football performance:
- **Goals**: 10 points (GK/DEF), 8 points (MID), 6 points (FWD)
- **Assists**: 6 points (all positions)
- **Clean Sheet**: 8 points (GK/DEF), 2 points (MID)
- **Yellow Card**: -2 points
- **Red Card**: -5 points
- **Match appearances**: +2 points

### Access
- Navigate to `/fantasyfootball/` from the main site
- Or directly: `http://localhost:8000/fantasyfootball/`

### How It Works
1. Own NFT assets representing football players on Nexus blockchain
2. Form your 11-player team from your owned assets
3. Earn points as your players perform in real matches
4. Climb the leaderboard and compete globally
5. Trade assets in the marketplace to improve your team

See `/fantasyfootball/README.md` for detailed documentation.

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 📧 Contact

Distordia Crypto Lab
- Email: contact@distordia.com
- GitHub: [@distordia](https://github.com/distordia)
- Twitter: [@distordia](https://twitter.com/distordia)

---

⧈ Built with passion for cryptographic research and innovation
