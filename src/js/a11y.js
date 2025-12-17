let currentScale = 1;

// Toggle the menu visibility
document.getElementById('a11y-toggle').addEventListener('click', function () {
    document.getElementById('a11y-panel').classList.toggle('hidden');
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
