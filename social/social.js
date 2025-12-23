// Distordia Social Platform - Main JavaScript

// State
let currentPosts = [];
let isConnected = false;
let userAddress = null;

// DOM Elements
const connectWalletBtn = document.getElementById('connectWalletBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const walletInfo = document.getElementById('walletInfo');
const walletAddress = document.getElementById('walletAddress');
const createPostCard = document.getElementById('createPostCard');
const postText = document.getElementById('postText');
const charCount = document.getElementById('charCount');
const createPostBtn = document.getElementById('createPostBtn');
const postStatus = document.getElementById('postStatus');
const filterType = document.getElementById('filterType');
const namespaceInput = document.getElementById('namespaceInput');
const refreshBtn = document.getElementById('refreshBtn');
const postsContainer = document.getElementById('postsContainer');
const loadingIndicator = document.getElementById('loadingIndicator');
const errorMessage = document.getElementById('errorMessage');
const noPosts = document.getElementById('noPosts');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkWalletConnection();
    loadPosts();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    connectWalletBtn?.addEventListener('click', connectWallet);
    disconnectBtn?.addEventListener('click', disconnectWallet);
    
    postText?.addEventListener('input', updateCharCount);
    createPostBtn?.addEventListener('click', createPost);
    
    filterType?.addEventListener('change', handleFilterChange);
    namespaceInput?.addEventListener('input', debounce(applyFilters, 500));
    refreshBtn?.addEventListener('click', loadPosts);
}

// Wallet Connection
function checkWalletConnection() {
    const connected = sessionStorage.getItem('nexus_connected') === 'true';
    const address = sessionStorage.getItem('nexus_genesis');
    
    if (connected && address) {
        isConnected = true;
        userAddress = address;
        updateWalletUI(address);
    }
}

async function connectWallet() {
    try {
        if (typeof window.nexus === 'undefined') {
            showError('Q-Wallet not detected. Please install the Q-Wallet browser extension.');
            return;
        }

        const response = await window.nexus.authenticate();
        
        if (response && response.genesis) {
            isConnected = true;
            userAddress = response.genesis;
            sessionStorage.setItem('nexus_connected', 'true');
            sessionStorage.setItem('nexus_genesis', response.genesis);
            updateWalletUI(response.genesis);
            showSuccess('Wallet connected successfully!');
        }
    } catch (error) {
        console.error('Wallet connection error:', error);
        showError('Failed to connect wallet: ' + error.message);
    }
}

function disconnectWallet() {
    isConnected = false;
    userAddress = null;
    sessionStorage.removeItem('nexus_connected');
    sessionStorage.removeItem('nexus_genesis');
    
    if (connectWalletBtn) connectWalletBtn.style.display = 'block';
    if (walletInfo) walletInfo.style.display = 'none';
    if (createPostCard) createPostCard.style.display = 'none';
    
    showSuccess('Wallet disconnected');
}

function updateWalletUI(address) {
    if (connectWalletBtn) connectWalletBtn.style.display = 'none';
    if (walletInfo) walletInfo.style.display = 'flex';
    if (walletAddress) walletAddress.textContent = formatAddress(address);
    if (createPostCard) createPostCard.style.display = 'block';
}

// Load Posts from Blockchain
async function loadPosts() {
    showLoading();
    hideError();
    
    try {
        const posts = await nexusAPI.query("register/list/assets:asset", {
            where: "results.distordia-type=distordia-post AND results.distordia-status=official"
        });
        
        if (posts && posts.length > 0) {
            currentPosts = posts.sort((a, b) => (b.created || 0) - (a.created || 0));
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
            "distordia-status": "user-post"
        };

        // Use Nexus API to create the asset
        const result = await nexusAPI.createAsset(assetData);
        
        if (result && result.success) {
            showSuccess('Post created successfully! Transaction: ' + result.txid);
            postText.value = '';
            updateCharCount();
            
            // Reload posts after short delay
            setTimeout(() => {
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
    let filteredPosts = [...currentPosts];
    
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
    const namespace = post["Creator's namespace"] || 'anonymous';
    const owner = post.owner || 'unknown';
    const text = post.Text || '';
    const created = post.created ? new Date(post.created * 1000).toLocaleString() : 'Unknown';
    const version = post.version || 1;
    
    postCard.innerHTML = `
        <div class="post-header">
            <div class="post-author">
                <div class="post-namespace">@${namespace}</div>
                <div class="post-owner">${formatAddress(owner, 16)}</div>
            </div>
            <div class="post-badges">
                ${isOfficial ? '<span class="badge badge-official">Official</span>' : ''}
            </div>
        </div>
        
        <div class="post-text">${escapeHtml(text)}</div>
        
        <div class="post-footer">
            <div class="post-meta">
                <span class="post-time">📅 ${created}</span>
                <span class="post-version">v${version}</span>
            </div>
            <div class="post-actions-footer">
                <button class="action-btn" onclick="viewOnChain('${owner}')">View on Chain</button>
            </div>
        </div>
    `;
    
    return postCard;
}

// View post on blockchain explorer
function viewOnChain(address) {
    // Open blockchain explorer (adjust URL as needed)
    window.open(`https://nexus.io/explorer/address/${address}`, '_blank');
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
