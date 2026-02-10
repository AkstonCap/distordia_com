# Content Verification

A blockchain-powered application for verifying content authenticity and provenance on the Nexus blockchain.

## Overview

Content Verification allows users to check whether specific content (articles, documents, media, etc.) has been registered and verified by creators on the Nexus blockchain. By searching for a URL, users can instantly confirm if content is authentic and see detailed metadata about its registration.

## Features

- **URL-based Verification**: Search for any URL to check if it's registered on the blockchain
- **Instant Authentication**: Real-time verification against the Nexus blockchain
- **Creator Information**: Display creator details including genesis address and username
- **Registration Details**: View registration and modification timestamps
- **Asset Metadata**: See all additional metadata attached to the content asset
- **No Wallet Required**: Read-only operation—no authentication or wallet connection needed
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## How It Works

### Verification Process

1. User enters a URL in the search form
2. App queries the Nexus blockchain for registered content assets
3. Searches for assets with `distordia: "content"` attribute matching the provided URL
4. Displays verification results with creator and registration details
5. Shows full asset metadata if content is verified

### Asset Standard

Content assets follow this structure:

```json
{
    "distordia-type": "content",
    "url": "https://example.com/article",
    "Title": "Article Title",
    "Author": "Author Name",
    "Description": "Article description",
    "Date": "Publication date",
    // ... additional metadata
}
```

## User Interface

### Main Search Section
- **URL Input Field**: Enter the content URL to verify (e.g., `https://example.com/article`)
- **Verify Button**: Trigger the blockchain verification
- **Loading State**: Shows progress while querying the blockchain

### Results Display

The app displays three possible outcomes:

#### ✅ Verified Content
Shows when content is found on the blockchain:
- **Content URL**: The verified URL
- **Creator Genesis Address**: Blockchain address of the creator
- **Creator Username**: Username or identifier associated with the content
- **Registration Date**: When the content was first registered
- **Last Modified**: Last update timestamp
- **Asset Address**: Blockchain address of the content asset
- **Transaction ID**: Reference transaction on the blockchain
- **Content Details**: All additional metadata fields

#### ⚠️ Content Not Found
Displayed when the URL hasn't been registered on the blockchain:
- Indicates no verification record exists
- User can try a different URL or suggest content for registration

#### ❌ Error State
Shows if a verification attempt fails:
- Network issues
- Invalid URL format
- Blockchain connectivity problems
- Specific API error messages

## Technical Architecture

### Files

- **index.html**: Main page structure and UI layout
- **content-verification.js**: Core verification logic and UI interactions
- **api.js**: Nexus blockchain API wrapper
- **content-verification.css**: Responsive styling

### Key Classes

#### ContentVerification
Main application class handling:
- Form submission and URL validation
- Blockchain verification requests
- Result display and formatting
- Error handling

Methods:
- `handleVerification(e)`: Process verification request
- `displayVerifiedContent(asset, url)`: Show verified results
- `displayNotFound(url)`: Show not-found state
- `showError(message)`: Display error messages
- `buildContentDetails(asset)`: Format asset metadata

#### ContentVerificationAPI
Blockchain API wrapper providing:
- `verifyContentByURL(url)`: Search for content by URL
- `getAssetDetails(address)`: Fetch full asset information
- `getAssetHistory(address)`: Get transaction history
- `formatDate(timestamp)`: Convert timestamps to readable format
- `shortenAddress(address)`: Truncate long addresses for display

### API Integration

**Base URL**: `https://api.distordia.com`

**Endpoints Used**:
- `register/list/assets:asset` - List all registered assets (limited to 1000)
  - Used to search for content by matching `distordia` and `url` attributes
  - Client-side filtering applied for accuracy

**Request Pattern** (All requests use POST):
```javascript
POST /register/list/assets:asset
Content-Type: application/json

{
    "limit": 1000
}

Response:
{
    "result": [
        {
            "distordia": "content",
            "url": "https://example.com/article",
            "Title": "...",
            "owner": "blockchain_address",
            "created": timestamp,
            ...
        }
    ]
}
```

## Usage

### Local Development

```bash
# Serve from workspace root
python -m http.server 8000
# or
npx serve

# Navigate to
http://localhost:8000/content-verification/
```

### Live Deployment

App is deployed as static site at:
```
https://distordia.com/content-verification/
```

## Search Examples

**News Article**:
```
https://news.example.com/verified-story-2024
```

**Academic Paper**:
```
https://papers.example.edu/research/blockchain-study
```

**Blog Post**:
```
https://blog.example.com/author/article-title
```

**Media Content**:
```
https://media.example.com/videos/content-piece
```

## Browser Compatibility

- Chrome/Chromium (v90+)
- Firefox (v88+)
- Safari (v14+)
- Edge (v90+)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Styling & Theming

- **Dark Theme**: Default background `#0a0a0f` with accent colors
- **Primary Color**: Orange gradient `#FF6B35`
- **Responsive**: Mobile-first design with breakpoints at 768px, 1024px
- **CSS Variables**: Customizable via `:root` in `content-verification.css`

## Error Handling

The app handles various error scenarios:

1. **Invalid URL Format**: Validates URL structure before blockchain query
2. **Network Issues**: Catches fetch errors and displays user-friendly message
3. **No Results**: Gracefully handles cases where content hasn't been registered
4. **API Failures**: Shows specific error messages from Nexus blockchain
5. **Timeout Protection**: Prevents hanging requests with reasonable timeouts

## Performance Considerations

- **Asset Listing**: Currently fetches up to 1000 assets for search (client-side filtering)
- **Production Optimization**: Future versions may implement server-side filtering for large datasets
- **Caching**: No caching implemented—each search queries live blockchain data
- **Load Times**: Typically 1-3 seconds depending on network and blockchain node response

## Future Enhancements

- Advanced filtering and search parameters
- Batch URL verification
- Asset history timeline view
- Creator profile integration
- Content registration submission (requires wallet)
- Server-side filtering for improved performance
- Verification badges for high-volume creators

## Security

- **Read-Only**: No wallet connection required, no private key exposure
- **URL Validation**: Client-side validation prevents malformed requests
- **XSS Protection**: HTML escaping on all displayed asset data
- **No Data Storage**: No local or server-side storage of verification history

## Related Documentation

- [Nexus API Documentation](../docs/Nexus%20API%20docs/)
- [Content Standard](../standards/content-standard.json)
- [Asset Standards Overview](../standards/)

## Support

For issues, questions, or suggestions:
- GitHub Issues: [distordia repository](https://github.com/AkstonCap/distordia_com)
- Contact: See main site contact form

---

**Last Updated**: February 2026  
**Status**: Active  
**Blockchain**: Nexus  
**Authentication**: None required (read-only)
