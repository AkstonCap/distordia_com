# Master Data Registry

A blockchain-powered global master data registry for products and materials. Replace fragmented ERP-specific master data with a single source of truth on the blockchain.

## 🎯 Why Global Master Data?

### The Problem with Traditional Master Data

**Every company maintains their own master data:**
- Company A: Steel Pipe 12mm → SKU: SP-001
- Company B: Steel Pipe 12mm → SKU: PIPE-12-ST
- Company C: Steel Pipe 12mm → SKU: MTL-789

**Result:**
- ❌ No common reference across organizations
- ❌ Duplicate data maintenance in every ERP system
- ❌ Integration nightmares for supply chains
- ❌ Inconsistent specifications and descriptions
- ❌ Manual reconciliation between systems

### The Blockchain Solution

**One material registered once, referenced everywhere:**
- Steel Pipe 12mm → Blockchain Address: `87Vm...yhK1`
- All companies reference the same on-chain master data
- Specifications are immutable and transparent
- No duplicate maintenance needed

**Benefits:**
- ✓ **Single Source of Truth**: One registration, universal reference
- ✓ **No Data Silos**: All companies access the same data
- ✓ **Immutable Records**: Blockchain-verified specifications
- ✓ **Universal Reference**: Use blockchain addresses in any ERP/MRP system
- ✓ **Supply Chain Transparency**: Everyone sees the same material data
- ✓ **Cost Reduction**: Eliminate duplicate master data maintenance

## Use Case Example

### Traditional Way (Fragmented)
```
Supplier registers material in their ERP:
- Material: "Stainless Steel Bolt M8x20"
- Their SKU: "BOLT-M8-SS-20"

Manufacturer needs same material:
- Creates own master data entry
- Their SKU: "MTL-8877"
- Tries to match specifications manually

Distributor also needs it:
- Creates another entry
- Their SKU: "HW-001-M8"
- More manual reconciliation
```

### Blockchain Way (Unified)
```
Anyone registers material ONCE as an "asset" on the Nexus blockchain in a  standard format pre-defined by Distordia, generating a unique address in the asset's json element on-chain:
- Material: "Stainless Steel Bolt M8x20"
- Blockchain Address: 87VmNhitFJv3WA3Yrovt9A3hts2...

Everyone references this address:
- Supplier: Links address to their internal SKU
- Manufacturer: References same address
- Distributor: Uses same address
- All see identical specifications automatically
```

## Features

### 🔐 Wallet Authentication
- Secure authentication via Q-Wallet browser extension
- Connect/disconnect wallet functionality
- Session management

### 📦 Master Data Management
- **Register Materials**: Create blockchain-based master data records
- **Universal Reference**: Each material gets a unique blockchain address
- **View All Materials**: Browse the global master data registry
- **Search & Filter**: Find materials by name, SKU, category, or registrar
- **Material Details**: View comprehensive specifications and blockchain data
- **My Materials**: Filter to show materials you've registered

### 🔗 Blockchain Integration
- All materials stored as Assets on the Nexus blockchain
- Immutable product records with timestamps
- Ownership tracking and transfer capabilities
- Transaction history for each material
- Universal addressing for cross-company reference

## Material Attributes

Products are registered with the following standardized attributes:

### Required Fields
- **Name**: Product name (max 100 characters)
- **SKU**: Unique product code (Nexus asset address added here)
- **Category**: Product category (Electronics, Clothing, Food, etc.)

### Optional Fields
- **Description**: Material specifications (max 500 characters)
- **Manufacturer**: Manufacturer or supplier name
- **Country of Origin**: Where the material is produced
- **Barcode/GTIN**: Standard barcode identifier
- **Unit**: Unit of measure (pieces, kg, meters, etc.)
- **Weight**: Weight per unit in grams
- **Dimensions**: Physical dimensions
- **Custom Attributes**: Additional attributes in JSON format

## Integration with ERP/MRP Systems

### Step 1: Register Material
Register your material once on the blockchain and get a unique address.

### Step 2: Link to Internal Systems
In your ERP/MRP system, store the blockchain address alongside your internal SKU:
```
Internal SKU: MTL-12345
Blockchain Reference: 87VmNhitFJv3WA3Yrovt9A3hts2MoXcfExyy9LiXyhK1sdThwYM
```

### Step 3: Share with Partners
Share the blockchain address with suppliers, customers, or partners. They can:
- View the authoritative material specifications
- Reference the same material in their systems
- Verify specifications without manual data entry

## Technical Implementation

### Architecture
```
masterdata/
├── index.html       # Main HTML structure
├── masterdata.css   # Styling
├── masterdata.js    # Main UI logic and coordination
├── auth.js          # Q-Wallet authentication module
├── api.js           # Nexus blockchain API module
└── README.md        # Documentation
```

### Modules

#### auth.js - Wallet Authentication
- Handles Q-Wallet connection via connectWithFee
- Manages wallet state and user sessions
- Provides UI feedback for connection status

#### api.js - Nexus API
- Interfaces with Nexus blockchain API
- Asset creation, retrieval, and management
- Product data parsing and formatting

#### masterdata.js - Main Application
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
    name: "Example Material",
    sku: "MAT-12345",
    category: "electronics",
    description: "Material specifications",
    manufacturer: "Manufacturer Name",
    origin: "USA",
    barcode: "1234567890123",
    unit: "pieces",
    weight: 150,  // in grams
    attributes: {
        color: "blue",
        size: "M"
    }
};

// Via NexusAPI class (api.js)
const nexusAPI = new NexusAPI('https://api.distordia.com');
const result = await nexusAPI.createProduct(productData, pin, session);
```

#### Querying Products

```javascript
// List all products (with distordia-type=product filter)
const products = await nexusAPI.listAllProducts();

// Get specific product by address
const product = await nexusAPI.getProduct(address);

// Products are filtered client-side using ProductCatalogue class
catalogue.applyFilters(); // Uses category, owner, search filters
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
