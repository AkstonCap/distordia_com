// AI Ship Engineering Platform - Interactive Features
// Distordia Labs 2025

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeScrollAnimations();
    initializeResearchAreas();
    initializeSmoothScroll();
    initializeStats();
});

// Scroll-triggered animations
function initializeScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    // Observe all cards and content sections
    const animatedElements = document.querySelectorAll(
        '.problem-card, .research-area, .arch-layer, .timeline-item, .project-card, .collab-card'
    );
    
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        observer.observe(el);
    });
}

// Add animation class
const style = document.createElement('style');
style.textContent = `
    .animate-in {
        opacity: 1 !important;
        transform: translateY(0) !important;
    }
`;
document.head.appendChild(style);

// Interactive research areas (expandable on mobile)
function initializeResearchAreas() {
    const researchAreas = document.querySelectorAll('.research-area');
    
    researchAreas.forEach((area, index) => {
        const header = area.querySelector('.research-header');
        const content = area.querySelector('.research-content');
        
        // Add staggered animation delay
        area.style.transitionDelay = `${index * 0.1}s`;
        
        // Add click handler for mobile (optional collapse/expand)
        header.addEventListener('click', () => {
            if (window.innerWidth < 768) {
                area.classList.toggle('expanded');
                
                if (area.classList.contains('expanded')) {
                    content.style.maxHeight = content.scrollHeight + 'px';
                } else {
                    content.style.maxHeight = '0';
                }
            }
        });
        
        // Highlight on hover
        area.addEventListener('mouseenter', () => {
            area.style.transform = 'translateX(10px)';
        });
        
        area.addEventListener('mouseleave', () => {
            area.style.transform = 'translateX(0)';
        });
    });
}

// Smooth scroll for navigation links
function initializeSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            
            if (target) {
                const navHeight = document.querySelector('.navbar').offsetHeight;
                const targetPosition = target.offsetTop - navHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Animated statistics counter
function initializeStats() {
    const stats = document.querySelectorAll('.stat-number');
    const observerOptions = {
        threshold: 0.5
    };
    
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
                entry.target.classList.add('counted');
                animateStat(entry.target);
            }
        });
    }, observerOptions);
    
    stats.forEach(stat => statsObserver.observe(stat));
}

function animateStat(element) {
    const text = element.textContent;
    
    // Check if it's a percentage
    if (text.includes('%')) {
        const value = parseInt(text);
        animateNumber(element, 0, value, 1500, '%');
    }
    // Check if it contains a hyphen (range like "30-40%")
    else if (text.includes('-')) {
        const parts = text.split('-');
        const start = parseInt(parts[0]);
        const end = parseInt(parts[1]);
        animateRange(element, start, end, 1500);
    }
    // Otherwise, just fade in the text
    else {
        element.style.opacity = '0';
        setTimeout(() => {
            element.style.transition = 'opacity 1s';
            element.style.opacity = '1';
        }, 100);
    }
}

function animateNumber(element, start, end, duration, suffix = '') {
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out cubic
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(start + (end - start) * easeProgress);
        
        element.textContent = current + suffix;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

function animateRange(element, start, end, duration) {
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out cubic
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const currentStart = Math.floor(start * easeProgress);
        const currentEnd = Math.floor(end * easeProgress);
        
        element.textContent = `${currentStart}-${currentEnd}%`;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

// Timeline progressive reveal
function initializeTimeline() {
    const timelineItems = document.querySelectorAll('.timeline-item');
    const observerOptions = {
        threshold: 0.3
    };
    
    const timelineObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * 200);
            }
        });
    }, observerOptions);
    
    timelineItems.forEach(item => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(30px)';
        item.style.transition = 'all 0.6s ease-out';
        timelineObserver.observe(item);
    });
}

// Parallax effect for hero background
let lastScrollY = 0;

window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const hero = document.querySelector('.hero-background');
    
    if (hero && scrollY < window.innerHeight) {
        // Fade out the background grid as user scrolls down
        const opacity = Math.max(0, 0.03 * (1 - (scrollY / window.innerHeight)));
        hero.style.opacity = opacity;
        // Subtle parallax movement
        hero.style.transform = `translateY(${scrollY * 0.3}px)`;
    } else if (hero) {
        // Completely hide when past hero section
        hero.style.opacity = '0';
    }
    
    lastScrollY = scrollY;
});

// Navbar scroll behavior
let lastScroll = 0;
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;
    
    if (currentScroll > 100) {
        navbar.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
    } else {
        navbar.style.boxShadow = 'none';
    }
    
    lastScroll = currentScroll;
});

// Interactive architecture diagram connections (visual enhancement)
function initializeArchitectureDiagram() {
    const layers = document.querySelectorAll('.arch-layer');
    
    layers.forEach((layer, index) => {
        layer.addEventListener('mouseenter', () => {
            // Highlight connected layers
            layers.forEach((l, i) => {
                if (Math.abs(i - index) <= 1) {
                    l.style.opacity = '1';
                    l.style.transform = 'scale(1.02)';
                } else {
                    l.style.opacity = '0.7';
                }
            });
        });
        
        layer.addEventListener('mouseleave', () => {
            layers.forEach(l => {
                l.style.opacity = '1';
                l.style.transform = 'scale(1)';
            });
        });
    });
}

// Initialize architecture diagram interactions
setTimeout(initializeArchitectureDiagram, 1000);

// Copy email to clipboard functionality
function setupEmailCopy() {
    const emailLinks = document.querySelectorAll('a[href^="mailto:"]');
    
    emailLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (e.shiftKey) {
                e.preventDefault();
                const email = link.getAttribute('href').replace('mailto:', '');
                
                navigator.clipboard.writeText(email).then(() => {
                    showNotification('Email copied to clipboard!');
                });
            }
        });
    });
}

setupEmailCopy();

// Simple notification system
function showNotification(message, duration = 3000) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: linear-gradient(135deg, #FF6B35, #FF8C42);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
        font-weight: 500;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

// Add notification animations
const notificationStyle = document.createElement('style');
notificationStyle.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(notificationStyle);

// Progress indicator on scroll
function createProgressBar() {
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        height: 3px;
        background: linear-gradient(90deg, #FF6B35, #FF8C42, #FFA577);
        width: 0%;
        z-index: 9999;
        transition: width 0.1s ease-out;
    `;
    document.body.appendChild(progressBar);
    
    window.addEventListener('scroll', () => {
        const windowHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrolled = (window.scrollY / windowHeight) * 100;
        progressBar.style.width = scrolled + '%';
    });
}

createProgressBar();

// Log initialization
console.log('%c🚢 Distordia AI Ship Engineering Platform', 'color: #FF6B35; font-size: 16px; font-weight: bold;');
console.log('%cBuilding the future of autonomous maritime design', 'color: #FF8C42; font-size: 12px;');
console.log('%cPowered by AI Agents + Nexus Blockchain', 'color: #FFA577; font-size: 12px;');
