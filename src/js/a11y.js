let currentScale = 1;

// Load saved settings on page load
function loadSettings() {
    // Load font scale
    const savedScale = localStorage.getItem('a11y-font-scale');
    if (savedScale) {
        currentScale = parseFloat(savedScale);
        document.documentElement.style.setProperty('--font-scale', currentScale);
    }
    
    // Load high contrast mode
    const savedContrast = localStorage.getItem('a11y-high-contrast');
    if (savedContrast === 'enabled') {
        document.body.classList.add('high-contrast');
    }
}

// Initialize settings when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSettings);
} else {
    loadSettings();
}

// Toggle the menu visibility
document.getElementById('a11y-toggle').addEventListener('click', function (e) {
    e.stopPropagation(); // Prevent this click from immediately closing the menu
    const panel = document.getElementById('a11y-panel');
    panel.classList.toggle('hidden');
    
    // Add/remove menu-open class for opacity control
    if (panel.classList.contains('hidden')) {
        this.classList.remove('menu-open');
    } else {
        this.classList.add('menu-open');
    }
    
    // Remove focus from button after click to clear the border
    this.blur();
});

// Close menu when clicking outside
document.addEventListener('click', function(e) {
    const panel = document.getElementById('a11y-panel');
    const toggle = document.getElementById('a11y-toggle');
    const menu = document.querySelector('.a11y-menu');
    
    // Check if click is outside the entire menu (panel + toggle)
    if (!panel.classList.contains('hidden') && !menu.contains(e.target)) {
        panel.classList.add('hidden');
        toggle.classList.remove('menu-open');
    }
});

// Function to resize text
function resizeText(multiplier) {
    currentScale += (multiplier * 0.1);
    if (currentScale > 2) currentScale = 2; // Max limit
    if (currentScale < 0.8) currentScale = 0.8; // Min limit
    document.documentElement.style.setProperty('--font-scale', currentScale);
    // Save to localStorage
    localStorage.setItem('a11y-font-scale', currentScale);
}

// Function to toggle High Contrast
function toggleContrast() {
    document.body.classList.toggle('high-contrast');
    // Save to localStorage
    if (document.body.classList.contains('high-contrast')) {
        localStorage.setItem('a11y-high-contrast', 'enabled');
    } else {
        localStorage.setItem('a11y-high-contrast', 'disabled');
    }
}

// Function to reset all accessibility settings
function resetAccessibility() {
    // Reset font scale to default
    currentScale = 1;
    document.documentElement.style.setProperty('--font-scale', 1);
    localStorage.removeItem('a11y-font-scale');
    
    // Reset high contrast
    document.body.classList.remove('high-contrast');
    localStorage.removeItem('a11y-high-contrast');
    
    // Reset button opacity state
    const toggleBtn = document.getElementById('a11y-toggle');
    if (toggleBtn) {
        toggleBtn.classList.remove('scrolling-down', 'scrolling-up');
        localStorage.removeItem('a11y-button-state');
    }
}

// Scroll detection for button opacity (all screen sizes)
let lastScrollTop = 0;
const toggleBtn = document.getElementById('a11y-toggle');

// Restore button state from localStorage on page load
const savedState = localStorage.getItem('a11y-button-state');
if (savedState === 'transparent') {
    toggleBtn.classList.add('scrolling-down');
    toggleBtn.classList.remove('scrolling-up');
} else if (savedState === 'opaque') {
    toggleBtn.classList.add('scrolling-up');
    toggleBtn.classList.remove('scrolling-down');
}

window.addEventListener('scroll', function() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollDelta = lastScrollTop - scrollTop;
    
    if (scrollTop > lastScrollTop && scrollTop > 100) {
        // Scrolling down
        toggleBtn.classList.add('scrolling-down');
        toggleBtn.classList.remove('scrolling-up');
        // Save state to localStorage
        localStorage.setItem('a11y-button-state', 'transparent');
    } else if (scrollDelta > 14) {
        // Scrolling up with threshold
        toggleBtn.classList.add('scrolling-up');
        toggleBtn.classList.remove('scrolling-down');
        // Save state to localStorage
        localStorage.setItem('a11y-button-state', 'opaque');
    }
    
    lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
}, { passive: true });
