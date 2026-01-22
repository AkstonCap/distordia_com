// Distordia Social Platform - Main JavaScript

// State
let currentPosts = [];
let quotedPostsCache = {}; // Cache for quoted posts
let isConnected = false;
let userAddress = null;

// DOM Elements (will be initialized after DOM loads)
let connectWalletBtn;
let disconnectBtn;
let walletInfo;
let walletAddress;
let postBtn;
let loginToPostBtn;
let postText;
let charCount;
let createPostBtn;
let postStatus;
let filterType;
let namespaceInput;
let realNamespaceOnly;
let refreshBtn;
let postsContainer;
let loadingIndicator;
let errorMessage;
let noPosts;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize DOM elements
    connectWalletBtn = document.getElementById('connectWalletBtn');
    disconnectBtn = document.getElementById('disconnectBtn');
    walletInfo = document.getElementById('walletInfo');
    walletAddress = document.getElementById('walletAddress');
    postBtn = document.getElementById('postBtn');
    loginToPostBtn = document.getElementById('loginToPostBtn');
    postText = document.getElementById('postText');
    charCount = document.getElementById('charCount');
    createPostBtn = document.getElementById('createPostBtn');
    postStatus = document.getElementById('postStatus');
    filterType = document.getElementById('filterType');
    namespaceInput = document.getElementById('namespaceInput');
    realNamespaceOnly = document.getElementById('realNamespaceOnly');
    refreshBtn = document.getElementById('refreshBtn');
    postsContainer = document.getElementById('postsContainer');
    loadingIndicator = document.getElementById('loadingIndicator');
    errorMessage = document.getElementById('errorMessage');
    noPosts = document.getElementById('noPosts');
    
    await checkWalletConnection();
    loadPosts();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    connectWalletBtn?.addEventListener('click', connectWallet);
    disconnectBtn?.addEventListener('click', disconnectWallet);
    postBtn?.addEventListener('click', openCreatePostModal);
    loginToPostBtn?.addEventListener('click', connectWallet);
    
    postText?.addEventListener('input', updateCharCount);
    createPostBtn?.addEventListener('click', createPost);
    
    filterType?.addEventListener('change', handleFilterChange);
    namespaceInput?.addEventListener('input', debounce(applyFilters, 500));
    realNamespaceOnly?.addEventListener('change', applyFilters);
    refreshBtn?.addEventListener('click', loadPosts);
    
    // Info button
    const infoBtn = document.getElementById('infoBtn');
    infoBtn?.addEventListener('click', openInfoModal);
}

// Wallet Connection
async function checkWalletConnection() {
    // Wait for Q-Wallet to be injected (with timeout)
    const maxWaitTime = 3000;
    const checkInterval = 100;
    let waited = 0;
    
    while (typeof window.qWallet === 'undefined' && waited < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        waited += checkInterval;
    }
    
    if (typeof window.qWallet === 'undefined') {
        console.warn('Q-Wallet not detected after waiting');
        return;
    }
    
    // Check if already connected from previous session
    try {
        const accounts = await window.qWallet.getAccounts();
        if (accounts && accounts.length > 0) {
            console.log('Already connected to wallet:', accounts[0]);
            isConnected = true;
            userAddress = accounts[0];
            sessionStorage.setItem('nexus_connected', 'true');
            sessionStorage.setItem('nexus_genesis', accounts[0]);
            updateWalletUI(accounts[0]);
            return;
        }
    } catch (error) {
        console.log('Not connected to wallet yet:', error.message);
    }
    
    // Fallback to session storage check
    const connected = sessionStorage.getItem('nexus_connected') === 'true';
    const address = sessionStorage.getItem('nexus_genesis');
    
    if (connected && address) {
        isConnected = true;
        userAddress = address;
        updateWalletUI(address);
    }
}

async function connectWallet() {
    console.log('Connect wallet clicked');
    try {
        // Wait for Q-Wallet to be injected (with timeout)
        const maxWaitTime = 3000;
        const checkInterval = 100;
        let waited = 0;
        
        while (typeof window.qWallet === 'undefined' && waited < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            waited += checkInterval;
        }
        
        if (typeof window.qWallet === 'undefined') {
            alert('Q-Wallet not detected. Please install the Q-Wallet browser extension.');
            console.error('Q-Wallet not detected');
            return;
        }

        // Request connection from Q-Wallet (free, no fee)
        const accounts = await window.qWallet.connect();
        
        if (accounts && accounts.length > 0) {
            isConnected = true;
            userAddress = accounts[0];
            sessionStorage.setItem('nexus_connected', 'true');
            sessionStorage.setItem('nexus_genesis', accounts[0]);
            updateWalletUI(accounts[0]);
            console.log('Wallet connected successfully:', accounts[0]);
        } else {
            console.error('No accounts returned from wallet');
            alert('No accounts found. Please unlock your Q-Wallet.');
        }
    } catch (error) {
        console.error('Wallet connection error:', error);
        if (error.message.includes('denied') || error.message.includes('rejected')) {
            alert('Connection request was denied. Please approve the connection in Q-Wallet.');
        } else {
            alert('Failed to connect wallet: ' + error.message);
        }
    }
}

async function disconnectWallet() {
    console.log('Disconnecting wallet...');
    
    try {
        // Call Q-Wallet disconnect method
        if (typeof window.qWallet !== 'undefined' && window.qWallet.disconnect) {
            await window.qWallet.disconnect();
            console.log('Q-Wallet disconnected via API');
        }
    } catch (error) {
        console.error('Error disconnecting from Q-Wallet:', error);
    }
    
    // Clear local state
    isConnected = false;
    userAddress = null;
    sessionStorage.removeItem('nexus_connected');
    sessionStorage.removeItem('nexus_genesis');
    
    // Update UI
    if (walletInfo) walletInfo.style.display = 'none';
    if (postBtn) postBtn.style.display = 'none';
    if (loginToPostBtn) loginToPostBtn.style.display = 'block';
    if (connectWalletBtn) connectWalletBtn.style.display = 'none';
    
    showSuccess('Wallet disconnected');
}

function updateWalletUI(address) {
    if (walletInfo) walletInfo.style.display = 'flex';
    if (walletAddress) walletAddress.textContent = formatAddress(address);
    if (postBtn) postBtn.style.display = 'block';
    if (loginToPostBtn) loginToPostBtn.style.display = 'none';
    if (connectWalletBtn) connectWalletBtn.style.display = 'none';
}

// Load Posts from Blockchain
async function loadPosts() {
    showLoading();
    hideError();
    
    try {
        // Load both posts (with Quoted address=0) and quotes (with existing quoted address)
        const [posts, quotes] = await Promise.all([
            // Regular posts with no quoted address
            nexusAPI.query("register/list/assets:asset", {
                where: "results.distordia-type=distordia-post AND results.distordia-status=official"
            }),
            // Quotes with existing quoted address
            nexusAPI.query("register/list/assets:asset", {
                where: "results.distordia-type=distordia-quote AND results.distordia-status=official"
            })
        ]);
        
        // Combine posts and quotes
        const allPosts = [...(posts || []), ...(quotes || [])];
        
        if (allPosts && allPosts.length > 0) {
            currentPosts = allPosts.sort((a, b) => (b.created || 0) - (a.created || 0));
            
            // Fetch all quoted posts
            await fetchQuotedPosts(currentPosts);
            
            applyFilters();
        } else {
            currentPosts = [];
            showNoPosts();
        }
    } catch (error) {
        console.error('Error loading posts:', error);
        showError('Failed to load posts from blockchain: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Fetch Quoted Posts
async function fetchQuotedPosts(posts) {
    // Extract unique quoted addresses from quote posts
    const quotedAddresses = posts
        .filter(post => post['distordia-type'] === 'distordia-quote')
        .map(post => post['quoted-address'] || post['Quoted address'])
        .filter(addr => addr && addr !== '0');
    
    // Remove duplicates
    const uniqueAddresses = [...new Set(quotedAddresses)];
    
    // Fetch all quoted posts in parallel
    const fetchPromises = uniqueAddresses.map(async (address) => {
        try {
            const result = await nexusAPI.query("register/get/assets:asset", {
                address: address
            });
            if (result) {
                quotedPostsCache[address] = result;
            }
        } catch (error) {
            console.error(`Failed to fetch quoted post ${address}:`, error);
        }
    });
    
    await Promise.all(fetchPromises);
}

// Create New Post
async function createPost() {
    if (!isConnected) {
        showError('Please connect your wallet first');
        return;
    }

    const text = postText.value.trim();
    
    if (!text) {
        showError('Post text cannot be empty');
        return;
    }

    if (text.length > 500) {
        showError('Post text is too long (max 500 characters)');
        return;
    }

    try {
        createPostBtn.disabled = true;
        createPostBtn.textContent = 'Posting to Blockchain...';
        
        // Create asset on Nexus blockchain
        const assetData = {
            "Text": text,
            "distordia-type": "distordia-post",
            "distordia-status": "official"
        };

        // Use Nexus API to create the asset
        const result = await nexusAPI.createAsset(assetData);
        
        if (result && result.success) {
            showSuccess('Post created successfully! Transaction: ' + result.txid);
            postText.value = '';
            updateCharCount();
            
            // Close modal and reload posts after a short delay
            setTimeout(() => {
                closeCreatePostModal();
                loadPosts();
            }, 2000);
        } else {
            throw new Error('Failed to create post');
        }
    } catch (error) {
        console.error('Error creating post:', error);
        showError('Failed to create post: ' + error.message);
    } finally {
        createPostBtn.disabled = false;
        createPostBtn.textContent = 'Post to Blockchain';
    }
}

// Filter Posts
function handleFilterChange() {
    const filterValue = filterType.value;
    
    if (filterValue === 'namespace') {
        namespaceInput.style.display = 'block';
    } else {
        namespaceInput.style.display = 'none';
    }
    
    applyFilters();
}

function applyFilters() {
    const filterValue = filterType.value;
    const onlyRealNamespace = realNamespaceOnly?.checked ?? true;
    let filteredPosts = [...currentPosts];
    
    // Filter by real namespace (not empty or "*")
    if (onlyRealNamespace) {
        filteredPosts = filteredPosts.filter(post => {
            const namespace = post["Creator's namespace"] || '';
            return namespace !== '' && namespace !== '*';
        });
    }
    
    if (filterValue === 'official') {
        filteredPosts = filteredPosts.filter(post => 
            post['distordia-status'] === 'official'
        );
    } else if (filterValue === 'namespace') {
        const namespace = namespaceInput.value.trim().toLowerCase();
        if (namespace) {
            filteredPosts = filteredPosts.filter(post => 
                (post["Creator's namespace"] || '').toLowerCase().includes(namespace)
            );
        }
    }
    
    displayPosts(filteredPosts);
}

// Display Posts
function displayPosts(posts) {
    postsContainer.innerHTML = '';
    
    if (!posts || posts.length === 0) {
        showNoPosts();
        return;
    }
    
    hideNoPosts();
    
    posts.forEach(post => {
        const postElement = createPostElement(post);
        postsContainer.appendChild(postElement);
    });
}

function createPostElement(post) {
    const postCard = document.createElement('div');
    postCard.className = 'post-card';
    
    const isOfficial = post['distordia-status'] === 'official';
    const isQuote = post['distordia-type'] === 'distordia-quote';
    const namespace = post["Creator's namespace"] || 'anonymous';
    const owner = post.owner || 'unknown';
    const assetAddress = post.address || 'unknown';
    const text = post.Text || '';
    const created = post.created ? new Date(post.created * 1000).toLocaleString() : 'Unknown';
    const version = post.version || 1;
    const quotedAddress = post['quoted-address'] || post['Quoted address'];
    
    // Build the quoted post section if this is a quote
    let quotedPostHTML = '';
    if (isQuote && quotedAddress && quotedAddress !== '0') {
        const quotedPost = quotedPostsCache[quotedAddress];
        if (quotedPost) {
            const quotedText = quotedPost.Text || 'No text';
            const quotedAuthor = quotedPost["Creator's namespace"] || 'Unknown';
            quotedPostHTML = `
                <div class="quoted-post">
                    <div class="quoted-author">@${escapeHtml(quotedAuthor)}</div>
                    <div class="quoted-text">${escapeHtml(quotedText)}</div>
                </div>
            `;
        } else {
            quotedPostHTML = `
                <div class="quoted-post">
                    <div class="quoted-text">Quoted post not found</div>
                </div>
            `;
        }
    }
    
    postCard.innerHTML = `
        <div class="post-header">
            <div class="post-author">
                <div class="post-namespace">@${namespace}</div>
                <div class="post-owner">${formatAddress(owner, 16)}</div>
            </div>
            <div class="post-badges">
                ${isOfficial ? '<span class="badge badge-official">Official</span>' : ''}
                ${isQuote ? '<span class="badge badge-verified">Quote</span>' : ''}
            </div>
        </div>
        
        <div class="post-text">${escapeHtml(text)}</div>
        ${quotedPostHTML}
        
        <div class="post-footer">
            <div class="post-meta">
                <span class="post-time">📅 ${created}</span>
                <span class="post-version">v${version}</span>
            </div>
            <div class="post-actions-footer">
                <button class="action-btn" onclick="viewOnChain('${assetAddress}')">View on Chain</button>
            </div>
        </div>
    `;
    
    return postCard;
}

// View post on blockchain - show modal with full asset JSON
async function viewOnChain(assetAddress) {
    const modal = document.getElementById('assetModal');
    const container = document.getElementById('assetJsonContainer');
    
    if (!modal || !container) return;
    
    // Show modal with loading state
    container.innerHTML = '<div class="loading-spinner">Loading asset data...</div>';
    modal.classList.add('show');
    
    try {
        // Fetch the full asset data from the blockchain
        const assetData = await nexusAPI.query("register/get/assets:asset", {
            address: assetAddress
        });
        
        if (assetData) {
            // Display the full JSON in a formatted way
            container.innerHTML = `<pre>${JSON.stringify(assetData, null, 2)}</pre>`;
        } else {
            container.innerHTML = '<div class="loading-spinner" style="color: var(--error-color);">Asset not found</div>';
        }
    } catch (error) {
        console.error('Error fetching asset data:', error);
        container.innerHTML = `<div class="loading-spinner" style="color: var(--error-color);">Error loading asset: ${escapeHtml(error.message)}</div>`;
    }
}

// Close the asset modal
function closeAssetModal() {
    const modal = document.getElementById('assetModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Open create post modal
function openCreatePostModal() {
    const modal = document.getElementById('createPostModal');
    if (modal) {
        modal.classList.add('show');
        // Clear previous content
        const postText = document.getElementById('postText');
        if (postText) {
            postText.value = '';
            updateCharCount();
        }
        const postStatus = document.getElementById('postStatus');
        if (postStatus) {
            postStatus.style.display = 'none';
        }
    }
}

// Close create post modal
function closeCreatePostModal() {
    const modal = document.getElementById('createPostModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Open info modal
function openInfoModal() {
    const modal = document.getElementById('infoModal');
    if (modal) {
        modal.classList.add('show');
    }
}

// Close info modal
function closeInfoModal() {
    const modal = document.getElementById('infoModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// Utility Functions
function updateCharCount() {
    const count = postText.value.length;
    charCount.textContent = count;
    
    if (count > 450) {
        charCount.classList.add('error');
        charCount.classList.remove('warning');
    } else if (count > 400) {
        charCount.classList.add('warning');
        charCount.classList.remove('error');
    } else {
        charCount.classList.remove('warning', 'error');
    }
}

function formatAddress(address, length = 12) {
    if (!address) return 'Unknown';
    if (address.length <= length) return address;
    const start = Math.floor(length / 2);
    const end = Math.floor(length / 2);
    return `${address.slice(0, start)}...${address.slice(-end)}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// UI State Functions
function showLoading() {
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (postsContainer) postsContainer.style.display = 'none';
}

function hideLoading() {
    if (loadingIndicator) loadingIndicator.style.display = 'none';
    if (postsContainer) postsContainer.style.display = 'block';
}

function showError(message) {
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
}

function hideError() {
    if (errorMessage) errorMessage.style.display = 'none';
}

function showNoPosts() {
    if (noPosts) noPosts.style.display = 'block';
    if (postsContainer) postsContainer.innerHTML = '';
}

function hideNoPosts() {
    if (noPosts) noPosts.style.display = 'none';
}

function showSuccess(message) {
    if (postStatus) {
        postStatus.className = 'status-message success';
        postStatus.textContent = message;
        postStatus.style.display = 'block';
        
        setTimeout(() => {
            postStatus.style.display = 'none';
        }, 5000);
    }
}

function showError(message) {
    if (postStatus) {
        postStatus.className = 'status-message error';
        postStatus.textContent = message;
        postStatus.style.display = 'block';
        
        setTimeout(() => {
            postStatus.style.display = 'none';
        }, 5000);
    }
}

// Close modals when clicking outside of them
window.onclick = function(event) {
    const assetModal = document.getElementById('assetModal');
    const createPostModal = document.getElementById('createPostModal');
    
    if (event.target === assetModal) {
        closeAssetModal();
    } else if (event.target === createPostModal) {
        closeCreatePostModal();
    }
};
