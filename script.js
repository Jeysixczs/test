document.addEventListener('DOMContentLoaded', function() {
    // API Configuration
    const API_BASE = 'https://scrapergo.vercel.app/api';
    const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
    
    // DOM elements
    const loadingOverlay = document.getElementById('loading-overlay');
    const manhwaGrid = document.getElementById('manhwa-grid');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const homeLink = document.getElementById('home-link');
    const popularLink = document.getElementById('popular-link');
    const sectionTitle = document.getElementById('section-title');
    const currentPageElement = document.getElementById('current-page');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const manhwaModal = document.getElementById('manhwa-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const modalBody = document.getElementById('modal-body');

    // State variables
    let currentPage = 1;
    let currentView = 'home';
    let currentSearchQuery = '';
    let matureContent = 0;
    let currentManhwaId = null;
    let currentChapter = null;
    let currentChapterImages = [];
    let currentManhwaDetails = null; 

    // Event Listeners
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleSearch();
    });
    homeLink.addEventListener('click', function(e) {
        e.preventDefault();
        currentView = 'home';
        currentPage = 1;
        loadManhwaList();
    });
    popularLink.addEventListener('click', function(e) {
        e.preventDefault();
        currentView = 'popular';
        currentPage = 1;
        loadManhwaList();
    });
    prevPageBtn.addEventListener('click', goToPreviousPage);
    nextPageBtn.addEventListener('click', goToNextPage);
    closeModalBtn.addEventListener('click', closeModal);

    // Initial Load
    loadManhwaList();

    // Utility Functions
    function showLoading() {
        loadingOverlay.style.display = 'flex';
    }

    function hideLoading() {
        loadingOverlay.style.display = 'none';
    }

    function closeModal() {
        manhwaModal.style.display = 'none';
        currentManhwaId = null;
        currentChapter = null;
        currentChapterImages = [];
    }

    function getFallbackImage() {
        return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300" viewBox="0 0 200 300"><rect width="200" height="300" fill="%23f0f0f0"/><rect x="20" y="20" width="160" height="220" fill="%23e0e0e0" rx="4" ry="4"/><text x="100" y="120" font-family="Arial" font-size="14" text-anchor="middle" fill="%23999999">MANHWA</text><text x="100" y="140" font-family="Arial" font-size="14" text-anchor="middle" fill="%23999999">COVER</text><text x="100" y="280" font-family="Arial" font-size="12" text-anchor="middle" fill="%23999999">Image Not Available</text></svg>';
    }

    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
    }

    // Main Functions
    function handleSearch() {
        currentSearchQuery = searchInput.value.trim();
        if (!currentSearchQuery) {
            alert('Please enter a search term');
            return;
        }
        currentView = 'search';
        currentPage = 1;
        loadManhwaList();
    }

    function goToPreviousPage() {
        if (currentPage > 1) {
            currentPage--;
            loadManhwaList();
        }
    }

    function goToNextPage() {
        currentPage++;
        loadManhwaList();
    }

    async function loadManhwaList() {
        showLoading();
        try {
            let endpoint;
            
            if (currentView === 'home') {
                endpoint = `/manwha/home/${currentPage}?mature=${matureContent}`;
                sectionTitle.textContent = 'Latest Manhwa';
            } else if (currentView === 'popular') {
                endpoint = `/manwha/popular/${currentPage}?mature=${matureContent}`;
                sectionTitle.textContent = 'Popular Manhwa';
            } else if (currentView === 'search') {
                endpoint = `/search/${encodeURIComponent(currentSearchQuery)}/${currentPage}?mature=${matureContent}`;
                sectionTitle.textContent = `Search Results for "${currentSearchQuery}"`;
            }

            const url = `${CORS_PROXY}${encodeURIComponent(`${API_BASE}${endpoint}`)}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Handle different response structures
            const manhwaList = data.data || data;
            
            if (!manhwaList || !Array.isArray(manhwaList)) {
                throw new Error('Invalid data structure from API - Expected an array');
            }
            
            displayManhwaList(manhwaList);
            
            // Update pagination
            currentPageElement.textContent = currentPage;
            prevPageBtn.disabled = currentPage === 1;
        } catch (error) {
            console.error("Error loading manhwa list:", error);
            manhwaGrid.innerHTML = `
                <div class="error-message">
                    Failed to load manhwa. Please try again later.
                    <small>${error.message}</small>
                </div>
            `;
        } finally {
            hideLoading();
        }
    }

    function displayManhwaList(manhwaList) {
        manhwaGrid.innerHTML = '';
        
        if (!manhwaList || manhwaList.length === 0) {
            manhwaGrid.innerHTML = `<p class="no-results">No manhwa found.</p>`;
            return;
        }
        
        manhwaList.forEach(manhwa => {
            const manhwaItem = document.createElement('div');
            manhwaItem.className = 'manhwa-item';
            const manhwaId = manhwa.manwhaId || manhwa.id;
            manhwaItem.dataset.id = manhwaId;
            
            const latestChapter = manhwa.latestEp && manhwa.latestEp[0] ? 
                manhwa.latestEp[0].title : 'Chapter N/A';
            
            manhwaItem.innerHTML = `
                <div class="manhwa-img">
                    <img src="${manhwa.image || manhwa.thumbnail || getFallbackImage()}" 
                         alt="${manhwa.title}"
                         onerror="this.src='${getFallbackImage()}'">
                    ${manhwa.status ? `<span class="status-badge">${manhwa.status}</span>` : ''}
                </div>
                <div class="manhwa-info">
                    <h3>${manhwa.title}</h3>
                    <p class="latest-chapter">${latestChapter}</p>
                </div>
            `;
            
            manhwaItem.addEventListener('click', () => {
                loadManhwaDetails(manhwaId);
            });
            
            manhwaGrid.appendChild(manhwaItem);
        });
    }

   async function loadManhwaDetails(manhwaId) {
    console.log("Loading details for manhwa ID:", manhwaId);
    showLoading();
    currentManhwaId = manhwaId;
    
    try {
        const url = `${CORS_PROXY}${encodeURIComponent(`${API_BASE}/manwha/${manhwaId}`)}`;
        console.log("Fetching from URL:", url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Failed to load manhwa details. Status: ${response.status}`);
        }
        
        const responseData = await response.json();
        console.log("API Response:", responseData);
        
        if (!responseData.success || !responseData.data) {
            throw new Error('Invalid API response structure');
        }
        
        const data = responseData.data;
        const info = data.info && data.info.length > 0 ? data.info[0] : {};
        
        // Transform the API response and store it
        currentManhwaDetails = {
            title: data.title || "Untitled Manhwa",
            image: data.image || getFallbackImage(),
            description: data.summary || "No description available.",
            status: data.status || "Status unknown",
            author: info.Author || "Author unknown",
            genre: info.Genre ? info.Genre.join(', ') : "Genre unknown",
            chapters: data.chapters ? data.chapters.map(chapter => ({
                chapterNumber: chapter.chapterId,
                title: chapter.name,
                date: chapter.releaseDate
            })) : []
        };
        
        console.log("Transformed Details:", currentManhwaDetails);
        displayManhwaDetails(currentManhwaDetails);
        manhwaModal.style.display = 'block';
        
    } catch (error) {
        console.error("Error loading manhwa details:", error);
        displayErrorDetails(manhwaId, error.message);
    } finally {
        hideLoading();
    }
}

    function displayManhwaDetails(manhwa) {
        modalBody.innerHTML = `
            <div class="manhwa-detail">
                <div class="detail-header">
                    <div class="detail-poster">
                        <img src="${manhwa.image}" 
                             alt="${manhwa.title}'">
                        ${manhwa.status ? `<span class="status-badge">${manhwa.status}</span>` : ''}
                    </div>
                    <div class="detail-info">
                        <h2>${manhwa.title}</h2>
                        <div class="detail-meta">
                            ${manhwa.author ? `<span><i class="fas fa-user"></i> ${manhwa.author}</span>` : ''}
                            ${manhwa.genre ? `<span><i class="fas fa-tag"></i> ${manhwa.genre}</span>` : ''}
                        </div>
                        <div class="detail-description">
                            <p>${manhwa.description}</p>
                        </div>
                    </div>
                </div>
                
                <div class="chapter-section">
                    <h3><i class="fas fa-list-ol"></i> Chapters (${manhwa.chapters.length})</h3>
                    <div class="chapter-list">
                        ${manhwa.chapters.length > 0 ? 
                            manhwa.chapters.map(chapter => `
                                <div class="chapter-item" data-chapter="${chapter.chapterNumber}">
                                    <span class="chapter-title">${chapter.title}</span>
                                    <span class="chapter-date">${chapter.date}</span>
                                </div>
                            `).join('') : 
                            '<div class="no-chapters">No chapters available</div>'
                        }
                    </div>
                </div>
            </div>
        `;
        
        // Add click handlers to chapter items
        document.querySelectorAll('.chapter-item').forEach(item => {
            item.addEventListener('click', function() {
                const chapterNum = this.dataset.chapter;
                loadChapterImages(currentManhwaId, chapterNum);
            });
        });
    }

    async function loadChapterImages(manhwaId, chapterNumber) {
        console.log("Loading chapter", chapterNumber, "for manhwa", manhwaId);
        showLoading();
        currentManhwaId = manhwaId;
        currentChapter = chapterNumber;
        
        try {
            const url = `${CORS_PROXY}${encodeURIComponent(`${API_BASE}/manwha/${manhwaId}/${chapterNumber}`)}`;
            console.log("Fetching chapter from:", url);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Failed to load chapter: ${response.status}`);
            }
            
            const responseData = await response.json();
            console.log("Chapter API Response:", responseData);
            
            if (!responseData.success || !responseData.data || !Array.isArray(responseData.data.images)) {
                throw new Error('Invalid chapter data format - expected images array in data property');
            }
            
            currentChapterImages = responseData.data.images.map(img => ({ url: img }));
            displayChapterViewer();
            
        } catch (error) {
            console.error("Error loading chapter:", error);
            displayChapterError(manhwaId, chapterNumber, error.message);
        } finally {
            hideLoading();
        }
    }

    function displayChapterViewer() {
        modalBody.innerHTML = `
            <div class="chapter-viewer">
                <div class="chapter-header">
                    <h2>Chapter ${currentChapter}</h2>
                   
                    <button class="close-chapter" id="close-chapter">
                        <i class="fas fa-times"></i> Back to Details
                    </button>
                </div>
                <div class="chapter-images" id="chapter-images">
                    ${currentChapterImages.map((img, index) => `
                        <div class="chapter-image ${index === 0 ? 'active' : ''}">
                            <img src="${img.url}" 
                                 alt="Page ${index + 1}'">
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        // Add event listeners
        document.getElementById('close-chapter').addEventListener('click', () => {
            loadManhwaDetails(currentManhwaId);
        });
        
        setupChapterNavigation();
    }
                                

                                    
  function setupChapterNavigation() {
    let currentPageIndex = 0;
    const chapterImagesContainer = document.getElementById('chapter-images');
    const images = document.querySelectorAll('.chapter-image');
    const pageIndicator = document.getElementById('current-page-display');
    
    // Create chapter navigation container
    const chapterNavContainer = document.createElement('div');
    chapterNavContainer.className = 'chapter-nav-container';
    chapterNavContainer.innerHTML = `

        <button id="next-chapter-btn" class="chapter-nav-btn">
            <i class="fas fa-arrow-left"></i>Previous Chapter 
        </button>
        
        <div class="page-nav">
            <button id="prev-page-btn"><i class="fas fa-chevron-left"></i></button>
            <span id="current-page-display">1/${images.length}</span>
            <button id="next-page-btn"><i class="fas fa-chevron-right"></i></button>
        </div>

        <button id="prev-chapter-btn" class="chapter-nav-btn">
             Next Chapter<i class="fas fa-arrow-right"></i>
        </button>
        
    `;
    
    // Insert the navigation container before the chapter images
    chapterImagesContainer.parentNode.insertBefore(chapterNavContainer, chapterImagesContainer);
    
    // Scroll to the active image
    function scrollToActiveImage() {
        const activeImage = images[currentPageIndex];
        if (activeImage) {
            activeImage.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }
    }
    
    function showPage(index) {
        // Validate index range
        index = Math.max(0, Math.min(index, images.length - 1));
        
        images.forEach((img, i) => {
            img.classList.toggle('active', i === index);
        });
        
        pageIndicator.textContent = `${index + 1}/${images.length}`;
        currentPageIndex = index;
        
        // Scroll to the new active image
        scrollToActiveImage();
        
        // Update chapter navigation button states
        updateChapterNavButtons();
    }
    
    function updateChapterNavButtons() {
        if (!currentManhwaDetails || !currentManhwaDetails.chapters) return;
        
        const currentChapterIndex = currentManhwaDetails.chapters.findIndex(
            ch => ch.chapterNumber === currentChapter
        );
        
        document.getElementById('prev-chapter-btn').disabled = currentChapterIndex <= 0;
        document.getElementById('next-chapter-btn').disabled = 
            currentChapterIndex >= currentManhwaDetails.chapters.length - 1;
    }
    
    // Initial scroll to first image
    scrollToActiveImage();
    updateChapterNavButtons();
    
    // Previous page button handler
    document.getElementById('prev-page-btn').addEventListener('click', () => {
        if (currentPageIndex > 0) {
            showPage(currentPageIndex - 1);
        }
    });
    
    // Next page button handler
    document.getElementById('next-page-btn').addEventListener('click', () => {
        if (currentPageIndex < images.length - 1) {
            showPage(currentPageIndex + 1);
        }
    });
    
    // Previous chapter button handler
    document.getElementById('prev-chapter-btn').addEventListener('click', async () => {
        if (!currentManhwaDetails || !currentManhwaDetails.chapters) return;
        
        const currentChapterIndex = currentManhwaDetails.chapters.findIndex(
            ch => ch.chapterNumber === currentChapter
        );
        
        if (currentChapterIndex > 0) {
            const prevChapter = currentManhwaDetails.chapters[currentChapterIndex - 1];
            await loadChapterImages(currentManhwaId, prevChapter.chapterNumber);
        }
    });
    
    // Next chapter button handler
    document.getElementById('next-chapter-btn').addEventListener('click', async () => {
        if (!currentManhwaDetails || !currentManhwaDetails.chapters) return;
        
        const currentChapterIndex = currentManhwaDetails.chapters.findIndex(
            ch => ch.chapterNumber === currentChapter
        );
        
        if (currentChapterIndex < currentManhwaDetails.chapters.length - 1) {
            const nextChapter = currentManhwaDetails.chapters[currentChapterIndex + 1];
            await loadChapterImages(currentManhwaId, nextChapter.chapterNumber);
        }
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' && currentPageIndex > 0) {
            showPage(currentPageIndex - 1);
        } else if (e.key === 'ArrowRight' && currentPageIndex < images.length - 1) {
            showPage(currentPageIndex + 1);
        }
    });
    
    // Touch/swipe support for mobile
    let touchStartX = 0;
    let touchEndX = 0;
    
    chapterImagesContainer.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    chapterImagesContainer.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });
    
    function handleSwipe() {
        const threshold = 50; // Minimum swipe distance
        
        if (touchStartX - touchEndX > threshold) {
            // Swipe left - go to next page
            if (currentPageIndex < images.length - 1) {
                showPage(currentPageIndex + 1);
            }
        } else if (touchEndX - touchStartX > threshold) {
            // Swipe right - go to previous page
            if (currentPageIndex > 0) {
                showPage(currentPageIndex - 1);
            }
        }
    }
}



    function displayErrorDetails(manhwaId, errorMessage) {
        modalBody.innerHTML = `
            <div class="error-details">
                <h2>Error Loading Details</h2>
                <p>Failed to load details for manhwa ID: ${manhwaId}</p>
                <p><small>${errorMessage}</small></p>
                <button class="retry-btn" id="retry-btn">
                    <i class="fas fa-sync-alt"></i> Try Again
                </button>
            </div>
        `;
        
        document.getElementById('retry-btn').addEventListener('click', () => {
            loadManhwaDetails(manhwaId);
        });
        
        manhwaModal.style.display = 'block';
    }

    function displayChapterError(manhwaId, chapterNumber, errorMessage) {
        modalBody.innerHTML = `
            <div class="chapter-error">
                <h2>Error Loading Chapter ${chapterNumber}</h2>
                <p>${errorMessage}</p>
                <div class="error-actions">
                    <button class="retry-btn" id="retry-chapter-btn">
                        <i class="fas fa-sync-alt"></i> Try Again
                    </button>
                    <button class="back-btn" id="back-to-details-btn">
                        <i class="fas fa-arrow-left"></i> Back to Details
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('retry-chapter-btn').addEventListener('click', () => {
            loadChapterImages(manhwaId, chapterNumber);
        });
        
        document.getElementById('back-to-details-btn').addEventListener('click', () => {
            loadManhwaDetails(manhwaId);
        });
    }

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === manhwaModal) {
            closeModal();
        }
    });
});

