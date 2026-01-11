// Authentication for DEX - Q-Wallet only
// Session-based login has been removed. All authentication is done via Q-Wallet.

// Detect if running on mobile browser
function isMobileBrowser() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    
    // Check for mobile devices
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i;
    const isMobile = mobileRegex.test(userAgent.toLowerCase());
    
    // Also check for touch-only devices with small screens
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const isSmallScreen = window.innerWidth <= 768;
    
    return isMobile || (isTouchDevice && isSmallScreen);
}

// Show notification (used by wallet connection)
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

// Initialize auth system (minimal - just for compatibility)
function initializeAuth() {
    console.log('[Auth] Q-Wallet only authentication initialized');
    
    // Hide wallet connect button on mobile browsers
    const connectWalletBtn = document.getElementById('connectWalletBtn');
    if (connectWalletBtn && isMobileBrowser()) {
        connectWalletBtn.style.display = 'none';
        console.log('[Auth] Wallet connect button hidden on mobile browser');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeAuth();
});