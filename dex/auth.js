// Authentication and session management for DEX

// Session configuration
const SESSION_TIMEOUT = 3 * 60 * 1000; // 3 minutes in milliseconds
const ACTIVITY_CHECK_INTERVAL = 10 * 1000; // Check every 10 seconds

// Session state (stored in memory only for security)
let sessionData = {
    genesis: null,
    session: null,
    lastActivity: null,
    timeoutId: null,
    activityCheckId: null
};

// Check if user is logged in
function isLoggedIn() {
    return sessionData.genesis !== null && sessionData.session !== null;
}

// Get current session
function getSession() {
    if (!isLoggedIn()) {
        return null;
    }
    return {
        genesis: sessionData.genesis,
        session: sessionData.session
    };
}

// Get genesis address
function getGenesis() {
    return sessionData.genesis;
}

// Update last activity timestamp
function updateActivity() {
    if (isLoggedIn()) {
        sessionData.lastActivity = Date.now();
        console.log('[Auth] Activity updated');
    }
}

// Start activity monitoring
function startActivityMonitoring() {
    // Clear any existing interval
    if (sessionData.activityCheckId) {
        clearInterval(sessionData.activityCheckId);
    }
    
    // Check for inactivity periodically
    sessionData.activityCheckId = setInterval(() => {
        if (isLoggedIn()) {
            const timeSinceActivity = Date.now() - sessionData.lastActivity;
            const timeRemaining = SESSION_TIMEOUT - timeSinceActivity;
            
            console.log(`[Auth] Time since activity: ${Math.floor(timeSinceActivity / 1000)}s, Remaining: ${Math.floor(timeRemaining / 1000)}s`);
            
            if (timeSinceActivity >= SESSION_TIMEOUT) {
                console.log('[Auth] Session timeout due to inactivity');
                logout('Session expired due to inactivity');
            }
        }
    }, ACTIVITY_CHECK_INTERVAL);
}

// Stop activity monitoring
function stopActivityMonitoring() {
    if (sessionData.activityCheckId) {
        clearInterval(sessionData.activityCheckId);
        sessionData.activityCheckId = null;
    }
}

// Login function
async function login(username, password, pin) {
    try {
        console.log(`[Auth] Attempting login for user: ${username}`);
        
        // Call Nexus API to create session
        const response = await fetch(API_ENDPOINTS.sessionCreate, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username,
                password: password,
                pin: pin
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('[Auth] Login response:', data);
            
            if (data.result && data.result.genesis && data.result.session) {
                // Store session data in memory
                sessionData.genesis = data.result.genesis;
                sessionData.session = data.result.session;
                sessionData.lastActivity = Date.now();
                
                console.log(`[Auth] Login successful for genesis: ${sessionData.genesis.substring(0, 16)}...`);
                
                // Start monitoring activity
                startActivityMonitoring();
                
                // Update UI
                updateAuthUI();
                
                return {
                    success: true,
                    genesis: sessionData.genesis
                };
            } else {
                console.error('[Auth] Invalid response format:', data);
                return {
                    success: false,
                    error: 'Invalid response from server'
                };
            }
        } else {
            const errorData = await response.json().catch(() => ({}));
            console.error('[Auth] Login failed:', errorData);
            return {
                success: false,
                error: errorData.error?.message || 'Login failed'
            };
        }
    } catch (error) {
        console.error('[Auth] Login error:', error);
        return {
            success: false,
            error: error.message || 'Network error'
        };
    }
}

// Logout function
async function logout(reason = 'User logged out') {
    if (!isLoggedIn()) {
        console.log('[Auth] No active session to logout');
        return;
    }
    
    console.log(`[Auth] Logging out: ${reason}`);
    
    const session = sessionData.session;
    
    // Clear session data immediately
    const wasLoggedIn = isLoggedIn();
    sessionData.genesis = null;
    sessionData.session = null;
    sessionData.lastActivity = null;
    
    // Stop activity monitoring
    stopActivityMonitoring();
    
    // Update UI immediately
    updateAuthUI();
    
    // Show logout message if it was a timeout
    if (reason.includes('expired') || reason.includes('inactivity')) {
        showNotification(reason, 'warning');
    }
    
    // Call API to terminate session (fire and forget, don't block UI)
    if (wasLoggedIn) {
        try {
            await fetch(API_ENDPOINTS.sessionTerminate, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session: session
                })
            });
            console.log('[Auth] Session terminated on server');
        } catch (error) {
            console.error('[Auth] Failed to terminate session on server:', error);
        }
    }
}

// Update UI based on auth state
function updateAuthUI() {
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userInfo = document.getElementById('user-info');
    const loginModal = document.getElementById('login-modal');
    
    if (isLoggedIn()) {
        // Show logged in state
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
        if (userInfo) {
            userInfo.style.display = 'block';
            const shortGenesis = sessionData.genesis.substring(0, 8) + '...' + sessionData.genesis.substring(sessionData.genesis.length - 6);
            userInfo.textContent = shortGenesis;
        }
        if (loginModal) loginModal.style.display = 'none';
        
        // Update trade button visibility
        if (typeof updateTradeButtonVisibility === 'function') {
            updateTradeButtonVisibility();
        }
        // Enable authenticated features
        document.body.classList.add('authenticated');
    } else {
        // Show logged out state
        if (loginBtn) loginBtn.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (userInfo) userInfo.style.display = 'none';
        
        // Update trade button visibility
        if (typeof updateTradeButtonVisibility === 'function') {
            updateTradeButtonVisibility();
        }
        
        // Disable authenticated features
        document.body.classList.remove('authenticated');
    }
}

// Show notification
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

// Setup login modal
function setupLoginModal() {
    const loginBtn = document.getElementById('login-btn');
    const loginModal = document.getElementById('login-modal');
    const closeModal = document.getElementById('close-modal');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    
    // Open modal
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            if (loginModal) {
                loginModal.style.display = 'flex';
                document.getElementById('username')?.focus();
            }
        });
    }
    
    // Close modal
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            if (loginModal) loginModal.style.display = 'none';
            if (loginError) loginError.style.display = 'none';
        });
    }
    
    // Close on background click
    if (loginModal) {
        loginModal.addEventListener('click', (e) => {
            if (e.target === loginModal) {
                loginModal.style.display = 'none';
                if (loginError) loginError.style.display = 'none';
            }
        });
    }
    
    // Handle form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username')?.value;
            const password = document.getElementById('password')?.value;
            const pin = document.getElementById('pin')?.value;
            
            if (!username || !password || !pin) {
                if (loginError) {
                    loginError.textContent = 'All fields are required';
                    loginError.style.display = 'block';
                }
                return;
            }
            
            // Show loading state
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn?.textContent;
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Logging in...';
            }
            
            // Attempt login
            const result = await login(username, password, pin);
            
            // Reset button
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
            
            if (result.success) {
                // Clear form
                loginForm.reset();
                if (loginError) loginError.style.display = 'none';
                
                // Show success message
                showNotification(`Logged in as ${result.genesis.substring(0, 16)}...`, 'success');
            } else {
                // Show error
                if (loginError) {
                    loginError.textContent = result.error || 'Login failed';
                    loginError.style.display = 'block';
                }
            }
        });
    }
    
    // Setup logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            logout('User logged out');
        });
    }
}

// Track user activity
function setupActivityTracking() {
    // Track mouse movement, clicks, keyboard events
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    let throttleTimer = null;
    const throttleDelay = 1000; // Only update once per second
    
    const throttledUpdate = () => {
        if (!throttleTimer) {
            updateActivity();
            throttleTimer = setTimeout(() => {
                throttleTimer = null;
            }, throttleDelay);
        }
    };
    
    activityEvents.forEach(event => {
        document.addEventListener(event, throttledUpdate, true);
    });
}

// Initialize auth system
function initializeAuth() {
    console.log('[Auth] Initializing authentication system');
    setupLoginModal();
    setupActivityTracking();
    updateAuthUI();
    
    // Handle window close/refresh - terminate session
    window.addEventListener('beforeunload', (e) => {
        if (isLoggedIn()) {
            // Use sendBeacon for reliable delivery during page unload
            const session = sessionData.session;
            if (session) {
                const data = JSON.stringify({ session: session });
                const blob = new Blob([data], { type: 'application/json' });
                navigator.sendBeacon(API_ENDPOINTS.sessionTerminate, blob);
                console.log('[Auth] Session termination sent via beacon');
            }
        }
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeAuth();
});
