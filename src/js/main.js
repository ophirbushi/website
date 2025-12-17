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
            searchResults.innerHTML = '<div class="no-results" role="status">לא נמצאו תוצאות</div>';
            searchResults.classList.remove('hidden');
            announceToScreenReader('לא נמצאו תוצאות עבור החיפוש שלך');
            return;
        }

        const html = results.map((post, index) => `
      <a href="${post.url}" class="search-result-item" role="option" tabindex="0" aria-posinset="${index + 1}" aria-setsize="${results.length}">
        <div class="search-result-title">${highlightText(post.title, query)}</div>
        <div class="search-result-excerpt">${highlightText(post.excerpt || '', query)}</div>
        <div class="search-result-date">${formatDate(post.date)}</div>
      </a>
    `).join('');

        searchResults.innerHTML = html;
        searchResults.classList.remove('hidden');
        
        // Announce results to screen readers
        const resultCount = results.length;
        const announcement = resultCount === 1 
            ? 'נמצאה תוצאה אחת. השתמש בחצים לניווט.'
            : `נמצאו ${resultCount} תוצאות. השתמש בחצים לניווט.`;
        announceToScreenReader(announcement);
    }

    // Screen reader announcements helper (defined early for use in displayResults)
    function announceToScreenReader(message) {
        let announcer = document.getElementById('sr-announcer');
        if (!announcer) {
            announcer = document.createElement('div');
            announcer.id = 'sr-announcer';
            announcer.setAttribute('aria-live', 'polite');
            announcer.setAttribute('aria-atomic', 'true');
            announcer.className = 'visually-hidden';
            document.body.appendChild(announcer);
        }
        announcer.textContent = message;
        // Clear after announcement
        setTimeout(() => { announcer.textContent = ''; }, 1000);
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
            announceToScreenReader('תוצאות חיפוש נסגרו');
        }
    }

    // Toggle search on mobile
    function toggleSearch() {
        const searchContainer = document.getElementById('search-container');
        const searchToggle = document.getElementById('search-toggle');
        const isActive = searchContainer.classList.toggle('active');
        
        // Update aria-expanded for accessibility
        if (searchToggle) {
            searchToggle.setAttribute('aria-expanded', isActive ? 'true' : 'false');
        }
        
        if (isActive) {
            searchInput.focus();
            announceToScreenReader('חיפוש נפתח');
        } else {
            searchInput.value = '';
            searchResults.classList.add('hidden');
            announceToScreenReader('חיפוש נסגר');
        }
    }

    // Keyboard navigation for search results
    function handleSearchKeyboard(event) {
        const results = searchResults.querySelectorAll('.search-result-item');
        if (results.length === 0) return;
        
        const currentIndex = Array.from(results).findIndex(r => r === document.activeElement);
        
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                if (document.activeElement === searchInput) {
                    results[0].focus();
                } else if (currentIndex < results.length - 1) {
                    results[currentIndex + 1].focus();
                }
                break;
            case 'ArrowUp':
                event.preventDefault();
                if (currentIndex > 0) {
                    results[currentIndex - 1].focus();
                } else if (currentIndex === 0) {
                    searchInput.focus();
                }
                break;
            case 'Escape':
                searchResults.classList.add('hidden');
                searchInput.focus();
                announceToScreenReader('תוצאות חיפוש נסגרו');
                break;
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
        searchInput.addEventListener('keydown', handleSearchKeyboard);
        searchResults.addEventListener('keydown', handleSearchKeyboard);
        document.addEventListener('click', handleClickOutside);
        
        // Mobile search toggle
        const searchToggle = document.getElementById('search-toggle');
        if (searchToggle) {
            searchToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleSearch();
            });
        }
        
        // Close mobile search on outside click
        document.addEventListener('click', (e) => {
            const searchContainer = document.getElementById('search-container');
            if (searchContainer && searchContainer.classList.contains('active')) {
                if (!searchContainer.contains(e.target) && !searchToggle?.contains(e.target)) {
                    searchContainer.classList.remove('active');
                    searchInput.value = '';
                    searchResults.classList.add('hidden');
                }
            }
        });

        // Focus search on '/' key
        document.addEventListener('keydown', (e) => {
            if (e.key === '/' && document.activeElement !== searchInput) {
                e.preventDefault();
                searchInput.focus();
            }
        });
    }

    // Sticky navigation on scroll
    function handleStickyNav() {
        const nav = document.querySelector('nav');
        if (!nav) return;

        // Create placeholder to prevent layout shift
        const placeholder = document.createElement('div');
        placeholder.style.display = 'none';
        nav.parentNode.insertBefore(placeholder, nav);

        // Measure nav total height including margins when it's in normal position
        const navStyles = window.getComputedStyle(nav);
        const originalNavHeight = nav.offsetHeight;
        const marginBottom = parseFloat(navStyles.marginBottom);
        const totalHeight = originalNavHeight + marginBottom;

        let isSticky = false;
        let ticking = false;
        const showThreshold = 120;
        const hideThreshold = 80;

        function updateNav() {
            const currentScrollY = window.scrollY;
            
            // Use different thresholds for showing vs hiding to prevent flickering
            if (!isSticky && currentScrollY > showThreshold) {
                isSticky = true;
                
                // Set placeholder to exact total height including margin
                placeholder.style.height = totalHeight + 'px';
                placeholder.style.display = 'block';
                
                nav.classList.add('sticky');
            } else if (isSticky && currentScrollY < hideThreshold) {
                isSticky = false;
                
                nav.classList.add('hiding');
                nav.classList.remove('sticky');
                
                // Hide placeholder
                placeholder.style.display = 'none';
                
                // Remove hiding class after animation completes
                setTimeout(() => {
                    nav.classList.remove('hiding');
                }, 250);
            }

            ticking = false;
        }

        function requestTick() {
            if (!ticking) {
                requestAnimationFrame(updateNav);
                ticking = true;
            }
        }

        window.addEventListener('scroll', requestTick, { passive: true });
    }

    // ========================================
    // MATOMO TRACKING
    // ========================================
    
    // Helper function to track events
    function trackEvent(category, action, name, value) {
        if (typeof _paq !== 'undefined') {
            _paq.push(['trackEvent', category, action, name, value]);
        }
    }

    // Track CTA clicks
    function initCTATracking() {
        // Primary CTA buttons
        document.querySelectorAll('.cta-btn, .cta-btn.primary').forEach(btn => {
            btn.addEventListener('click', function() {
                const btnText = this.textContent.trim();
                const href = this.getAttribute('href') || '';
                trackEvent('CTA', 'Click', btnText, null);
            });
        });

        // Hero links (external site links)
        document.querySelectorAll('.hero-link').forEach(link => {
            link.addEventListener('click', function() {
                const linkText = this.querySelector('span')?.textContent || this.textContent.trim();
                const href = this.getAttribute('href') || '';
                trackEvent('Hero Link', 'Click', linkText, null);
            });
        });

        // Partner links in go-deeper section
        document.querySelectorAll('.partner-links a').forEach(link => {
            link.addEventListener('click', function() {
                const linkText = this.textContent.trim();
                trackEvent('Partner Link', 'Click', linkText, null);
            });
        });

        // "See all posts" link
        document.querySelectorAll('.see-all').forEach(link => {
            link.addEventListener('click', function() {
                trackEvent('Navigation', 'Click', 'See All Posts', null);
            });
        });

        // Back to blog link
        document.querySelectorAll('.back-link').forEach(link => {
            link.addEventListener('click', function() {
                trackEvent('Navigation', 'Click', 'Back to Blog', null);
            });
        });

        // Post card clicks
        document.querySelectorAll('.post-card').forEach(card => {
            card.addEventListener('click', function() {
                const postTitle = this.querySelector('h3, h2')?.textContent || 'Unknown Post';
                trackEvent('Post Card', 'Click', postTitle, null);
            });
        });

        // Footer links
        document.querySelectorAll('.footer-links a').forEach(link => {
            link.addEventListener('click', function() {
                const linkText = this.textContent.trim();
                trackEvent('Footer Link', 'Click', linkText, null);
            });
        });

        // Navigation links
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', function() {
                const linkText = this.textContent.trim();
                const isExternal = this.getAttribute('target') === '_blank';
                trackEvent('Navigation', 'Click', linkText, isExternal ? 1 : 0);
            });
        });

        // Logo click
        document.querySelectorAll('.logo').forEach(logo => {
            logo.addEventListener('click', function() {
                trackEvent('Navigation', 'Click', 'Logo/Home', null);
            });
        });

        // Related posts clicks
        document.querySelectorAll('.related-posts-grid .post-card').forEach(card => {
            card.addEventListener('click', function() {
                const postTitle = this.querySelector('h3, h2')?.textContent || 'Unknown Post';
                trackEvent('Related Posts', 'Click', postTitle, null);
            });
        });
    }

    // Track search interactions
    function initSearchTracking() {
        const searchInput = document.getElementById('search-input');
        const searchToggle = document.getElementById('search-toggle');
        let searchDebounce = null;

        if (searchToggle) {
            searchToggle.addEventListener('click', function() {
                trackEvent('Search', 'Toggle', 'Search Opened', null);
            });
        }

        if (searchInput) {
            // Track when user performs a search (debounced)
            searchInput.addEventListener('input', function() {
                clearTimeout(searchDebounce);
                const query = this.value.trim();
                
                if (query.length >= 2) {
                    searchDebounce = setTimeout(() => {
                        trackEvent('Search', 'Query', query, query.length);
                        // Also use Matomo's built-in site search tracking
                        if (typeof _paq !== 'undefined') {
                            _paq.push(['trackSiteSearch', query, false, false]);
                        }
                    }, 1000); // Wait 1 second after typing stops
                }
            });

            // Track search result clicks
            document.addEventListener('click', function(e) {
                const resultItem = e.target.closest('.search-result-item');
                if (resultItem) {
                    const title = resultItem.querySelector('.search-result-title')?.textContent || 'Unknown';
                    trackEvent('Search', 'Result Click', title, null);
                }
            });
        }
    }

    // Track scroll depth on article pages
    function initScrollTracking() {
        const article = document.querySelector('.article-content, article, .post-content');
        if (!article) return;

        const milestones = [25, 50, 75, 100];
        const trackedMilestones = new Set();
        let ticking = false;

        function checkScrollDepth() {
            const articleRect = article.getBoundingClientRect();
            const articleTop = window.scrollY + articleRect.top;
            const articleHeight = article.offsetHeight;
            const scrollPosition = window.scrollY + window.innerHeight;
            const articleEnd = articleTop + articleHeight;
            
            const percentScrolled = Math.min(100, Math.round(
                ((scrollPosition - articleTop) / articleHeight) * 100
            ));

            milestones.forEach(milestone => {
                if (percentScrolled >= milestone && !trackedMilestones.has(milestone)) {
                    trackedMilestones.add(milestone);
                    const pageTitle = document.title.split('|')[0].trim();
                    trackEvent('Scroll Depth', `${milestone}%`, pageTitle, milestone);
                }
            });

            ticking = false;
        }

        window.addEventListener('scroll', function() {
            if (!ticking) {
                requestAnimationFrame(checkScrollDepth);
                ticking = true;
            }
        }, { passive: true });
    }

    // Track content impressions using Intersection Observer
    function initContentImpressions() {
        if (typeof _paq === 'undefined') return;

        // Enable content tracking in Matomo
        _paq.push(['enableHeartBeatTimer']);

        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.5 // Element is 50% visible
        };

        const trackedElements = new Set();

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    const elementId = el.dataset.trackId || el.className;
                    
                    if (!trackedElements.has(el)) {
                        trackedElements.add(el);
                        
                        const contentName = el.dataset.trackName || getContentName(el);
                        const contentPiece = el.dataset.trackPiece || 'default';
                        
                        trackEvent('Content Impression', 'View', contentName, null);
                    }
                }
            });
        }, observerOptions);

        // Track specific elements
        const elementsToTrack = [
            { selector: '.hero', name: 'Hero Section' },
            { selector: '.go-deeper-cta', name: 'Go Deeper CTA' },
            { selector: '.related-posts', name: 'Related Posts Section' },
            { selector: '.recent-posts', name: 'Recent Posts Section' },
            { selector: '.article-content, article, .post-content', name: 'Article Content' },
            { selector: '.hero-links', name: 'Hero Links' },
            { selector: '.cta-grid', name: 'CTA Grid' },
            { selector: '.footer-content', name: 'Footer' }
        ];

        elementsToTrack.forEach(({ selector, name }) => {
            document.querySelectorAll(selector).forEach(el => {
                el.dataset.trackName = name;
                observer.observe(el);
            });
        });

        // Track individual post cards impression
        document.querySelectorAll('.post-card').forEach((card, index) => {
            const postTitle = card.querySelector('h3, h2')?.textContent || `Post ${index + 1}`;
            card.dataset.trackName = `Post Card: ${postTitle}`;
            observer.observe(card);
        });
    }

    function getContentName(el) {
        if (el.classList.contains('hero')) return 'Hero Section';
        if (el.classList.contains('go-deeper-cta')) return 'Go Deeper CTA';
        if (el.classList.contains('related-posts')) return 'Related Posts';
        if (el.classList.contains('post-card')) {
            const title = el.querySelector('h3, h2')?.textContent;
            return title ? `Post Card: ${title}` : 'Post Card';
        }
        return el.className || 'Unknown Element';
    }

    // Track time on page for articles
    function initTimeOnPageTracking() {
        const article = document.querySelector('.article-content, article, .post-content');
        if (!article) return;

        const startTime = Date.now();
        const pageTitle = document.title.split('|')[0].trim();

        // Track when user leaves the page
        window.addEventListener('beforeunload', function() {
            const timeSpent = Math.round((Date.now() - startTime) / 1000);
            // Use sendBeacon for reliable tracking on page exit
            if (typeof _paq !== 'undefined') {
                _paq.push(['trackEvent', 'Engagement', 'Time on Article', pageTitle, timeSpent]);
            }
        });
    }

    // Initialize all Matomo tracking
    function initMatomoTracking() {
        initCTATracking();
        initSearchTracking();
        initScrollTracking();
        initContentImpressions();
        initTimeOnPageTracking();
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            init();
            handleStickyNav();
            initMatomoTracking();
        });
    } else {
        init();
        handleStickyNav();
        initMatomoTracking();
    }
})();