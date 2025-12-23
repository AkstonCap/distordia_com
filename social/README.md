# Distordia Social

A decentralized social media platform built on the Nexus blockchain.

## Overview

Distordia Social is a Twitter/X-like platform where all posts are stored permanently on the Nexus blockchain. Users have true ownership of their content, with no central authority able to censor or delete posts.

## Features

- **On-Chain Posts**: All posts are stored as assets on the Nexus blockchain
- **True Ownership**: Content creators own their posts forever
- **No Censorship**: Decentralized storage means no single entity can remove content
- **Wallet Integration**: Connect with Q-Wallet to create posts
- **Filter & Search**: Filter posts by namespace or official status
- **Real-time Updates**: View the latest posts from the blockchain

## Post Format

Posts are stored on-chain with the following structure:

```json
{
    "owner": "<genesis_address>",
    "version": 1,
    "created": 1708875876,
    "modified": 1708876254,
    "type": "OBJECT",
    "form": "ASSET",
    "Creator's namespace": "distordia",
    "Quoted address": 0,
    "Text": "Post content here...",
    "distordia-status": "official",
    "distordia-type": "distordia-post"
}
```

## API Usage

### Fetch Posts

```javascript
const query = "register/list/assets:asset WHERE results.distordia-type=distordia-post";
const posts = await nexusAPI.query(query);
```

### Create Post

```javascript
const assetData = {
    "Text": "Your post content",
    "distordia-type": "distordia-post",
    "distordia-status": "user-post"
};
const result = await nexusAPI.createAsset(assetData);
```

## Getting Started

1. Install the Q-Wallet browser extension
2. Visit the Distordia Social platform
3. Connect your wallet
4. Start creating posts on the blockchain!

## Technical Details

- **Blockchain**: Nexus (nexus.io)
- **Wallet**: Q-Wallet browser extension
- **API**: Nexus REST API
- **Post Type**: Asset registration on Nexus blockchain

## Requirements

- Q-Wallet browser extension
- Nexus account with NXS for transaction fees
- Modern web browser with JavaScript enabled

## License

Built by Distordia Labs
