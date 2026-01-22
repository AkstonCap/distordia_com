# NexGo - Decentralized Taxi Service

A blockchain-powered taxi hiring dApp on the Nexus network.

## Overview

NexGo allows taxi drivers to broadcast their real-time position and availability status on-chain, enabling passengers to find and request rides from nearby available taxis in a trustless, decentralized manner.

## Features

### For Passengers
- **Real-time Map** - View all nearby taxis on an interactive map
- **Filter by Status** - See available vs occupied taxis
- **Distance Calculation** - Know how far each taxi is
- **Vehicle Types** - Choose from sedan, SUV, van, or luxury
- **No Account Required** - View taxis without connecting a wallet

### For Drivers
- **Position Broadcasting** - Share your GPS location on-chain every 30 seconds
- **Status Toggle** - Switch between available and occupied
- **Vehicle Registration** - Register your vehicle ID and type
- **On-Chain Presence** - Your availability is verifiable on the blockchain

## How It Works

### Driver Workflow
1. Connect Q-Wallet
2. Enter vehicle ID and select vehicle type
3. Allow GPS location access
4. Click "Start Broadcasting"
5. Your position updates on-chain every 30 seconds
6. Toggle status when picking up/dropping off passengers

### Passenger Workflow
1. Allow location access
2. View nearby taxis on the map
3. See taxi details (distance, vehicle type, status)
4. Request a ride (coming soon)

## On-Chain Data

Driver positions are stored as Nexus assets with the following structure:

```json
{
  "distordia-type": "nexgo-taxi",
  "vehicle-id": "ABC-1234",
  "vehicle-type": "sedan",
  "status": "available",
  "latitude": "59.9139",
  "longitude": "10.7522",
  "driver": "genesis-address",
  "timestamp": "2026-01-22T12:00:00Z"
}
```

### Status Values
- `available` - Taxi is free and accepting rides
- `occupied` - Taxi has a passenger
- `offline` - Driver has stopped broadcasting

## Technology

- **Map**: Leaflet.js with CartoDB dark tiles
- **Blockchain**: Nexus network via API
- **Wallet**: Q-Wallet browser extension
- **GPS**: Browser Geolocation API

## Local Development

```bash
# Serve from project root
python -m http.server 8000

# Navigate to
http://localhost:8000/nexgo/
```

## File Structure

```
nexgo/
├── index.html      # Main page
├── nexgo.css       # Styles
├── nexgo.js        # Application logic
└── README.md       # This file
```

## Future Features

- [ ] Ride request system with on-chain payments
- [ ] Driver ratings and reviews
- [ ] Fare estimation
- [ ] Ride history
- [ ] Multi-city support
- [ ] Push notifications for drivers
