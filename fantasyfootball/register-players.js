// Player Asset Registration Tool
// This script helps register football player NFTs on the Nexus blockchain

const NEXUS_API_BASE = 'https://api.distordia.com';
const ASSET_NAMESPACE = 'distordia';
const ASSET_TYPE = 'player';
const ASSET_STANDARD = 'distordia.player.v1';

// Sample players to register
const SAMPLE_PLAYERS = [
    {
        league: 'epl',
        team: 'mancity',
        playerId: 'haaland',
        playerName: 'Erling Haaland',
        realWorldId: '1100',
        position: 'FWD',
        nationality: 'Norway',
        birthDate: '2000-07-21',
        overall: 91,
        rarity: 'legendary'
    },
    {
        league: 'epl',
        team: 'liverpool',
        playerId: 'salah',
        playerName: 'Mohamed Salah',
        realWorldId: '306',
        position: 'FWD',
        nationality: 'Egypt',
        birthDate: '1992-06-15',
        overall: 89,
        rarity: 'epic'
    },
    {
        league: 'laliga',
        team: 'realmadrid',
        playerId: 'vinicius',
        playerName: 'Vinícius Júnior',
        realWorldId: '1449',
        position: 'FWD',
        nationality: 'Brazil',
        birthDate: '2000-07-12',
        overall: 89,
        rarity: 'epic'
    },
    {
        league: 'laliga',
        team: 'realmadrid',
        playerId: 'bellingham',
        playerName: 'Jude Bellingham',
        realWorldId: '1100',
        position: 'MID',
        nationality: 'England',
        birthDate: '2003-06-29',
        overall: 88,
        rarity: 'epic'
    },
    {
        league: 'epl',
        team: 'mancity',
        playerId: 'debruyne',
        playerName: 'Kevin De Bruyne',
        realWorldId: '629',
        position: 'MID',
        nationality: 'Belgium',
        birthDate: '1991-06-28',
        overall: 91,
        rarity: 'legendary'
    }
];

// Generate player metadata
function generatePlayerMetadata(player) {
    const teamNames = {
        'mancity': 'Manchester City',
        'liverpool': 'Liverpool',
        'arsenal': 'Arsenal',
        'realmadrid': 'Real Madrid',
        'barcelona': 'Barcelona'
    };
    
    const leagueNames = {
        'epl': 'Premier League',
        'laliga': 'La Liga',
        'bundesliga': 'Bundesliga',
        'seriea': 'Serie A',
        'ligue1': 'Ligue 1'
    };
    
    // Generate realistic attributes based on overall rating
    const overall = player.overall;
    const variance = 10;
    
    return {
        standard: ASSET_STANDARD,
        player: {
            id: player.playerId,
            name: player.playerName,
            realWorldId: player.realWorldId,
            nationality: player.nationality,
            birthDate: player.birthDate
        },
        team: {
            id: player.team,
            name: teamNames[player.team] || player.team,
            league: player.league,
            leagueName: leagueNames[player.league] || player.league.toUpperCase()
        },
        position: player.position,
        attributes: {
            overall: overall,
            pace: Math.min(99, overall + Math.floor(Math.random() * variance) - 5),
            shooting: Math.min(99, overall + Math.floor(Math.random() * variance) - 5),
            passing: Math.min(99, overall + Math.floor(Math.random() * variance) - 5),
            dribbling: Math.min(99, overall + Math.floor(Math.random() * variance) - 5),
            defending: player.position === 'DEF' ? 
                Math.min(99, overall + Math.floor(Math.random() * variance)) :
                Math.max(30, overall - Math.floor(Math.random() * 20)),
            physical: Math.min(99, overall + Math.floor(Math.random() * variance) - 5)
        },
        rarity: player.rarity,
        season: '2024-2025',
        stats: {
            goals: 0,
            assists: 0,
            cleanSheets: 0,
            appearances: 0,
            weekPoints: 0,
            totalPoints: 0
        }
    };
}

// Generate asset name
function generateAssetName(player) {
    return `${ASSET_NAMESPACE}:${ASSET_TYPE}:${player.league}:${player.team}:${player.playerId}`;
}

// Register player asset on blockchain
async function registerPlayerAsset(player, pin, session) {
    const assetName = generateAssetName(player);
    const metadata = generatePlayerMetadata(player);
    
    console.log(`\nRegistering player: ${player.playerName}`);
    console.log(`Asset name: ${assetName}`);
    console.log(`Metadata:`, JSON.stringify(metadata, null, 2));
    
    try {
        const response = await fetch(`${NEXUS_API_BASE}/register/create/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pin: pin,
                session: session,
                name: assetName,
                data: JSON.stringify(metadata),
                supply: 1,
                decimals: 0
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Registration failed: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log(`✅ Successfully registered ${player.playerName}`);
        console.log(`Transaction ID: ${result.result?.txid || result.txid}`);
        
        return {
            success: true,
            txid: result.result?.txid || result.txid,
            assetName: assetName
        };
        
    } catch (error) {
        console.error(`❌ Failed to register ${player.playerName}:`, error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// Register all sample players
async function registerAllPlayers(pin, session) {
    console.log('=== Player Asset Registration ===');
    console.log(`Registering ${SAMPLE_PLAYERS.length} players on Nexus blockchain...`);
    
    const results = [];
    
    for (const player of SAMPLE_PLAYERS) {
        const result = await registerPlayerAsset(player, pin, session);
        results.push(result);
        
        // Wait 2 seconds between registrations
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n=== Registration Complete ===');
    const successful = results.filter(r => r.success).length;
    console.log(`✅ Success: ${successful}/${SAMPLE_PLAYERS.length}`);
    
    return results;
}

// Export for Node.js or browser console
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        registerPlayerAsset,
        registerAllPlayers,
        generatePlayerMetadata,
        generateAssetName,
        SAMPLE_PLAYERS
    };
}

// Example usage in browser console:
console.log(`
=== Distordia Fantasy Football - Player Registration Tool ===

To register players on the Nexus blockchain:

1. Login to your Nexus account to get a session token
2. Run: registerAllPlayers('YOUR_PIN', 'YOUR_SESSION')

Example sample players available:
${SAMPLE_PLAYERS.map(p => `  - ${p.playerName} (${p.team})`).join('\n')}

Asset naming format: ${ASSET_NAMESPACE}:${ASSET_TYPE}:{league}:{team}:{playerid}
`);
