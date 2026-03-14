// player.js

let hlsInstance = null;

/**
 * Plays the given stream URL in the main video player.
 */
function playStream(url, title = null) {
    const video = document.getElementById("video-player");
    
    // Stop existing playback and clean up HLS instance if any
    if (hlsInstance) {
        hlsInstance.destroy();
        hlsInstance = null;
    }
    
    // Attempt playback
    if (Hls.isSupported()) {
        hlsInstance = new Hls({
            debug: false,
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
                        hlsInstance.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        console.error("Fatal media error encountered, try to recover");
                        hlsInstance.recoverMediaError();
                        break;
                    default:
                        console.error("Fatal error, cannot recover");
                        hlsInstance.destroy();
                        break;
                }
            }
        });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari, iOS, some smart TVs)
        video.src = url;
        video.addEventListener('loadedmetadata', function() {
            video.play().catch(e => console.error("Playback failed:", e));
        });
    } else {
        alert("Your browser does not support HLS playback.");
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
