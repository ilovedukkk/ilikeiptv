// player.js

let hlsInstance = null;

function showError(message) {
    const errorEl = document.getElementById("player-error");
    if (errorEl) {
        errorEl.innerHTML = `<span>Error: ${message}</span>`;
        errorEl.classList.remove("hidden");
    } else {
        console.error("Playback Error:", message);
    }
}

function clearError() {
    const errorEl = document.getElementById("player-error");
    if (errorEl) {
        errorEl.classList.add("hidden");
    }
}

/**
 * Plays the given stream URL in the main video player.
 */
function playStream(url, title = null) {
    const video = document.getElementById("video-player");
    clearError();
    
    // Stop existing playback and clean up HLS instance if any
    if (hlsInstance) {
        hlsInstance.destroy();
        hlsInstance = null;
    }
    
    // Clear old native error listeners to prevent stacking
    video.onerror = null;
    video.onerror = function() {
        const errorMsg = video.error ? video.error.message : "Video stream failed to load or is not supported.";
        showError(errorMsg || "Unsupported video format or broken stream.");
    };
    
    // Check if it's an HLS stream explicitly OR if device has zero native support fallback.
    // The user requested: if(url.includes(".m3u8") && Hls.isSupported()){ ... }
    if (url.includes(".m3u8") && typeof Hls !== 'undefined' && Hls.isSupported()) {
        hlsInstance = new Hls({
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
            enableWorker: true
        });
        
        hlsInstance.loadSource(url);
        hlsInstance.attachMedia(video);
        
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, function() {
            video.play().catch(e => console.error("Playback failed (autoplay policy?):", e));
        });
        
        hlsInstance.on(Hls.Events.ERROR, function (event, data) {
            console.error("HLS Error:", event, data);
            if (data.fatal) {
                switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        console.error("Fatal network error encountered, try to recover");
                        showError("Network Error. Trying to recover...");
                        hlsInstance.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        console.error("Fatal media error encountered, try to recover");
                        hlsInstance.recoverMediaError();
                        break;
                    default:
                        console.error("Fatal error, cannot recover");
                        showError("Stream cannot be played. Fatal Error.");
                        hlsInstance.destroy();
                        break;
                }
            }
        });
    } else {
        // Fallback for MP4, MPEG-TS, and general HTTP streams.
        // Or for browsers like Safari that support Native HLS without hls.js.
        video.src = url;
        video.addEventListener('loadedmetadata', function() {
            video.play().catch(e => {
                console.error("Playback failed:", e);
                showError("Autoplay blocked or format unsupported.");
            });
        }, { once: true });
    }

    // Show title overlay briefly
    if (title) {
        showOverlay(title);
    }
}

let overlayTimeout = null;
function showOverlay(title) {
    const overlay = document.getElementById("player-overlay");
    const titleEl = document.getElementById("current-channel-name");
    
    titleEl.textContent = title;
    overlay.classList.remove("hidden");
    
    if (overlayTimeout) clearTimeout(overlayTimeout);
    
    overlayTimeout = setTimeout(() => {
        overlay.classList.add("hidden");
    }, 4000); // Hide after 4 seconds
}

// Export globals
window.player = {
    playStream
};
