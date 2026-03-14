// app.js

document.addEventListener("DOMContentLoaded", () => {
    // UI Elements
    const urlInput = document.getElementById("playlist-url");
    const loadBtn = document.getElementById("load-btn");
    const searchInput = document.getElementById("search-input");
    const channelListEl = document.getElementById("channel-list");
    const videoPlayer = document.getElementById("video-player");

    // State
    let currentlyFocusedIndex = 0; // Focus index for navigable elements array
    let currentChannelData = null; // Currently playing channel

    // 1. Initialize Event Listeners
    loadBtn.addEventListener("click", () => {
        const url = urlInput.value.trim();
        if (url) {
            handleLoadPlaylist(url);
        } else {
            alert("Please enter a valid M3U URL");
        }
    });

    searchInput.addEventListener("input", (e) => {
        const term = e.target.value;
        const filtered = window.playlist.filterChannels(term);
        renderChannels(filtered);
    });

    // 2. Playlist Loading Logic
    async function handleLoadPlaylist(url) {
        channelListEl.innerHTML = '<div class="empty-state">Loading playlist...</div>';
        try {
            const channels = await window.playlist.loadPlaylist(url);
            searchInput.value = ''; // clear search
            renderChannels(channels);
        } catch (error) {
            channelListEl.innerHTML = '<div class="empty-state">Error loading playlist.</div>';
        }
    }

    // 3. Rendering Logic
    function renderChannels(channels) {
        channelListEl.innerHTML = "";
        
        if (channels.length === 0) {
            channelListEl.innerHTML = '<div class="empty-state">No channels found.</div>';
            updateNavigables();
            return;
        }

        // Use DocumentFragment for faster rendering of potentially long lists
        const fragment = document.createDocumentFragment();

        channels.forEach((channel, index) => {
            const div = document.createElement("div");
            div.className = "channel-item navigable";
            div.dataset.nav = `channel-${index}`;
            
            // Build channel DOM structure (Logo + Title)
            const imgHTML = channel.logo 
                ? `<img src="${channel.logo}" class="channel-logo" loading="lazy" alt="logo" onerror="this.style.display='none'">` 
                : `<div class="channel-logo" style="display:flex;align-items:center;justify-content:center;font-size:10px;color:#666;">No Logo</div>`;
            
            div.innerHTML = `
                ${imgHTML}
                <div class="channel-name">${channel.name || `Channel ${index + 1}`}</div>
            `;
            
            // Mark as active if it is currently playing
            if (currentChannelData && currentChannelData.url === channel.url) {
                div.classList.add("active");
            }

            // Click support for mouse users
            div.addEventListener("click", () => {
                selectChannel(channel, div);
            });

            fragment.appendChild(div);
        });

        channelListEl.appendChild(fragment);

        // Update spatial navigation targets since DOM changed
        updateNavigables();
    }

    // 4. Playback Logic
    function selectChannel(channel, element = null) {
        // Remove active class from all
        document.querySelectorAll('.channel-item').forEach(el => el.classList.remove('active'));
        
        // Add active class to selected
        if (element) {
            element.classList.add('active');
        } else {
            // Find by dataset if triggered via keyboard
            const nodes = Array.from(document.querySelectorAll('.channel-item.navigable'));
            const match = nodes.find(n => n.textContent === channel.name);
            if (match) match.classList.add('active');
        }

        currentChannelData = channel;
        window.player.playStream(channel.url, channel.name);
    }

    // 5. Spatial Navigation for Smart TV (Keyboard based)
    let navigables = [];

    function updateNavigables() {
        navigables = Array.from(document.querySelectorAll('.navigable'));
        if (navigables.length > 0 && !document.querySelector('.navigable.focused')) {
            // Ensure something is focused. If url input is there, focus it.
            setFocus(0);
        }
    }

    function setFocus(index) {
        // Remove focus from all
        navigables.forEach(el => el.classList.remove('focused'));
        
        // Bounds check
        if (index < 0) index = 0;
        if (index >= navigables.length) index = navigables.length - 1;
        
        currentlyFocusedIndex = index;
        const target = navigables[index];
        
        if (target) {
            target.classList.add('focused');
            // Scroll into view if it's a channel item
            if (target.classList.contains('channel-item')) {
                target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }

    // TV Remote Key Mapping
    document.addEventListener("keydown", (e) => {
        // Prevent default scrolling for arrows
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
            e.preventDefault();
        }

        const focusedEl = navigables[currentlyFocusedIndex];

        switch (e.key) {
            case "ArrowDown":
                if (currentlyFocusedIndex < navigables.length - 1) {
                    setFocus(currentlyFocusedIndex + 1);
                }
                break;
            case "ArrowUp":
                if (currentlyFocusedIndex > 0) {
                    setFocus(currentlyFocusedIndex - 1);
                }
                break;
            case "ArrowRight":
                // If on list or inputs, move focus to video player if it exists
                const videoIndex = navigables.findIndex(el => el.id === "video-player");
                if (videoIndex !== -1 && currentlyFocusedIndex !== videoIndex) {
                    setFocus(videoIndex);
                }
                break;
            case "ArrowLeft":
                // If on video player, go back to channel list or url input
                if (focusedEl && focusedEl.id === "video-player") {
                     // Try to find an active channel or go to first channel
                     const activeChannel = navigables.findIndex(el => el.classList.contains('active'));
                     if (activeChannel !== -1) {
                         setFocus(activeChannel);
                     } else {
                         // Default back to first navigable (usually URL input)
                         setFocus(0);
                     }
                }
                break;
            case "Enter":
                if (!focusedEl) return;
                
                if (focusedEl.id === "load-btn") {
                    loadBtn.click();
                } else if (focusedEl.id === "search-input" || focusedEl.id === "playlist-url") {
                    focusedEl.focus(); // actual focus to allow typing
                } else if (focusedEl.id === "video-player") {
                    // Toggle play/pause
                    if (videoPlayer.paused) videoPlayer.play();
                    else videoPlayer.pause();
                } else if (focusedEl.classList.contains("channel-item")) {
                    // It's a channel list item
                    // Extract index from dataset to get the channel object
                    // Note: If filtered, index might not match original channels array exactly
                    // Use name to find matching channel object from filtered layout context.
                    // A more robust way: use dataset to store original index in real app, but here 
                    // we'll just search by name from the currently displayed channel list.
                    const channelName = focusedEl.textContent;
                    const channelMatch = window.playlist.getChannels().find(c => c.name === channelName);
                    
                    if (channelMatch) {
                        selectChannel(channelMatch, focusedEl);
                    }
                }
                break;
            case "Escape":
            case "Backspace":
                // In TV interfaces, mapped often to 'Back'
                // If input is focused natively, blurb it.
                if (document.activeElement.tagName === 'INPUT') {
                    document.activeElement.blur();
                } else if (focusedEl && focusedEl.id === "video-player") {
                    // Return focus to list
                    setFocus(0);
                }
                break;
        }
    });

    // Cleanup native focus rings if user clicks around
    document.addEventListener('focusin', (e) => {
        if (e.target.classList && e.target.classList.contains('navigable')) {
             const index = navigables.indexOf(e.target);
             if (index !== -1) {
                 setFocus(index);
             }
        }
    });

    // Initial setup
    updateNavigables();
    
    // Optional: Auto-load a test playlist for dev if URL has ?playlist=...
    const urlParams = new URLSearchParams(window.location.search);
    const testPlaylist = urlParams.get('playlist');
    if (testPlaylist) {
        urlInput.value = testPlaylist;
        handleLoadPlaylist(testPlaylist);
    }
});
