(function () {
    let posts = [];
    let searchInput;
    let searchResults;

    // Load posts data
    async function loadPosts() {
        try {
            const response = await fetch('/posts.json');
            posts = await response.json();
        } catch (error) {
            console.error('Failed to load posts:', error);
        }
    }

    // Simple search function
    function searchPosts(query) {
        if (!query || query.length < 2) {
            return [];
        }

        const lowerQuery = query.toLowerCase();

        return posts.filter(post => {
            const titleMatch = post.title.toLowerCase().includes(lowerQuery);
            const excerptMatch = post.excerpt?.toLowerCase().includes(lowerQuery);
            const contentMatch = post.content?.toLowerCase().includes(lowerQuery);

            return titleMatch || excerptMatch || contentMatch;
        }).slice(0, 5); // Limit to 5 results
    }

    // Highlight matching text
    function highlightText(text, query) {
        if (!query || !text) return text;

        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    // Format date for display
    function formatDate(dateStr) {
        if (!dateStr) return '';

        // Parse DD-MM-YYYY format
        const [day, month, year] = dateStr.split('-').map(Number);
        if (!day || !month || !year) return dateStr; // fallback if format is wrong

        const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
            'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

        const monthName = months[month - 1];
        return `${day} ב${monthName} ${year}`;
    }

    // Display search results
    function displayResults(results, query) {
        if (results.length === 0) {
            searchResults.innerHTML = '<div class="no-results">לא נמצאו תוצאות</div>';
            searchResults.classList.remove('hidden');
            return;
        }

        const html = results.map(post => `
      <a href="${post.url}" class="search-result-item">
        <div class="search-result-title">${highlightText(post.title, query)}</div>
        <div class="search-result-excerpt">${highlightText(post.excerpt || '', query)}</div>
        <div class="search-result-date">${formatDate(post.date)}</div>
      </a>
    `).join('');

        searchResults.innerHTML = html;
        searchResults.classList.remove('hidden');
    }

    // Handle search input
    function handleSearch(event) {
        const query = event.target.value.trim();

        if (query.length < 2) {
            searchResults.classList.add('hidden');
            return;
        }

        const results = searchPosts(query);
        displayResults(results, query);
    }

    // Close search results when clicking outside
    function handleClickOutside(event) {
        if (!searchInput.contains(event.target) && !searchResults.contains(event.target)) {
            searchResults.classList.add('hidden');
        }
    }

    // Initialize search
    async function init() {
        searchInput = document.getElementById('search-input');
        searchResults = document.getElementById('search-results');

        if (!searchInput || !searchResults) {
            return; // Search not on this page
        }

        await loadPosts();

        // Add event listeners
        searchInput.addEventListener('input', handleSearch);
        document.addEventListener('click', handleClickOutside);

        // Focus search on '/' key
        document.addEventListener('keydown', (e) => {
            if (e.key === '/' && document.activeElement !== searchInput) {
                e.preventDefault();
                searchInput.focus();
            }
        });
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();