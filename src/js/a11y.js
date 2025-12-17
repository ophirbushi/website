let currentScale = 1;

// Toggle the menu visibility
document.getElementById('a11y-toggle').addEventListener('click', function (e) {
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

// Function to resize text
function resizeText(multiplier) {
    currentScale += (multiplier * 0.1);
    if (currentScale > 2) currentScale = 2; // Max limit
    if (currentScale < 0.8) currentScale = 0.8; // Min limit
    document.documentElement.style.setProperty('--font-scale', currentScale);
}

// Function to toggle High Contrast
function toggleContrast() {
    document.body.classList.toggle('high-contrast');
}

// Mobile scroll detection for button opacity
if (window.innerWidth <= 768) {
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
}
