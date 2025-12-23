# Product Catalogue

A blockchain-powered product catalogue for registering, managing, and tracking products on the Nexus blockchain.

## Features

### 🔐 Wallet Authentication
- Secure authentication via Q-Wallet browser extension
- Connect/disconnect wallet functionality
- Session management

### 📦 Product Management
- **Register Products**: Create new product assets on-chain with standardized attributes
- **View Products**: Browse all registered products from the blockchain
- **Search & Filter**: Find products by name, SKU, category, or owner
- **Product Details**: View comprehensive information including blockchain data
- **My Products**: Filter to show only products you own

### 🔗 Blockchain Integration
- All products stored as Assets on Nexus blockchain
- Immutable product records with timestamps
- Ownership tracking and transfer capabilities
- Transaction history for each product

## Product Attributes

Products are registered with the following standardized attributes:

### Required Fields
- **Name**: Product name (max 100 characters)
- **SKU**: Unique product code or SKU
- **Category**: Product category (Electronics, Clothing, Food, etc.)

### Optional Fields
- **Description**: Product description (max 500 characters)
- **Manufacturer**: Manufacturer name
- **Country of Origin**: Where the product is made
- **Barcode/GTIN**: Product barcode or GTIN number
- **Weight**: Product weight in kilograms
- **Custom Attributes**: Additional attributes in JSON format

## Technical Implementation

### Architecture
```
products/
├── index.html       # Main HTML structure
├── products.css     # Styling
├── products.js      # Main UI logic and coordination
├── auth.js          # Q-Wallet authentication module
├── api.js           # Nexus blockchain API module
└── README.md        # Documentation
```

### Modules

#### auth.js - Wallet Authentication
- Handles Q-Wallet connection and authentication
- Manages wallet state and user sessions
- Provides UI feedback for connection status

#### api.js - Nexus API
- Interfaces with Nexus blockchain API
- Asset creation, retrieval, and management
- Product data parsing and formatting

#### products.js - Main Application
- Coordinates between auth and API modules
- Manages UI state and interactions
- Handles product listing, filtering, and display
- Form validation and submission

## Usage

### For Users

1. **Connect Wallet**
   - Click "Connect Wallet" button
   - Approve connection in Q-Wallet popup
   - Your wallet address will be displayed

2. **Browse Products**
   - Products are automatically loaded from blockchain
   - Use search bar to find specific products
   - Filter by category or ownership

3. **Register New Product**
   - Click "Register New Product" button (only visible when connected)
   - Fill in product details
   - Submit to register on blockchain
   - Q-Wallet will prompt for PIN confirmation

4. **View Product Details**
   - Click any product card to view full details
   - See blockchain information and timestamps
   - View ownership and transaction history

### For Developers

#### Creating a Product Asset

```javascript
const productData = {
    name: "Example Product",
    sku: "PROD-12345",
    category: "electronics",
    description: "Product description",
    manufacturer: "Manufacturer Name",
    origin: "USA",
    barcode: "1234567890123",
    weight: 1.5,
    attributes: {
        color: "blue",
        size: "M"
    }
};

// Via Q-Wallet
const result = await window.nexus.sendTransaction({
    type: 'asset.create',
    data: productData
});
```

#### Querying Products

```javascript
// List all products
const products = await nexusAPI.listAllProducts({ limit: 100 });

// Get specific product
const product = await nexusAPI.getProduct(address);

// Filter products
const filtered = nexusAPI.filterProducts(products, {
    category: 'electronics',
    search: 'phone',
    owner: 'mine'
});
```

## API Reference

### Nexus Blockchain Endpoints Used

- `assets/create/asset` - Register new product
- `assets/get/asset` - Retrieve product details
- `assets/list/asset` - List all products
- `assets/update/asset` - Update product information
- `assets/transfer/asset` - Transfer product ownership
- `assets/history/asset` - Get transaction history

## Security

- All transactions require user approval via Q-Wallet
- PIN verification required for on-chain operations
- No private keys or sensitive data stored in browser
- All product data is publicly visible on blockchain

## Browser Compatibility

- Modern browsers with ES6+ support
- Q-Wallet browser extension required for wallet functionality
- Responsive design for mobile and desktop

## Future Enhancements

- [ ] Product image uploads (IPFS integration)
- [ ] QR code generation for products
- [ ] Batch product registration
- [ ] Export products to CSV
- [ ] Product categories management
- [ ] Advanced search with multiple filters
- [ ] Product transfer workflow
- [ ] Integration with supply chain tracking
- [ ] Multi-language support

## License

Part of the Distordia project.
