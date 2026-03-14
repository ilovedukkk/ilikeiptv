// playlist.js

let channels = [];

/**
 * Loads and parses an M3U playlist from a URL.
 * Implements a CORS proxy fallback.
 */
async function loadPlaylist(url) {
    console.log("Loading playlist from:", url);
    let text = "";
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("HTTP Status " + res.status);
        text = await res.text();
    } catch (e) {
        console.log("Direct load failed, trying proxy. Error:", e);
        const proxyUrl = "https://corsproxy.io/?" + encodeURIComponent(url);
        
        try {
            const res = await fetch(proxyUrl);
            if (!res.ok) throw new Error("Proxy HTTP Status " + res.status);
            text = await res.text();
        } catch (proxyError) {
            console.error("Proxy load failed as well. Error:", proxyError);
            alert("Failed to load playlist. Check URL or CORS policies.");
            throw proxyError;
        }
    }
    
    return parseM3U(text);
}

/**
 * Parses raw M3U text content into an array of channel objects.
 */
function parseM3U(m3uContent) {
    const lines = m3uContent.split('\n');
    channels = [];
    
    let currentChannel = {};
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line === '') continue;
        
        if (line.startsWith('#EXTINF:')) {
            // Extract channel name: #EXTINF:-1 tvg-id="" tvg-name="",Channel Name
            const lastCommaIndex = line.lastIndexOf(',');
            if (lastCommaIndex !== -1) {
                currentChannel.name = line.substring(lastCommaIndex + 1).trim();
            } else {
                currentChannel.name = "Unknown Channel";
            }

            // Extract tvg-logo
            const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
            if (logoMatch && logoMatch[1]) {
                currentChannel.logo = logoMatch[1];
            } else {
                currentChannel.logo = null;
            }
        } else if (!line.startsWith('#')) {
            // This line is assumed to be the stream URL
            if (line.startsWith('http') || line.startsWith('https')) {
                currentChannel.url = line;
                channels.push({...currentChannel});
                currentChannel = {}; // Reset for next channel
            }
        }
    }
    
    console.log(`Parsed ${channels.length} channels.`);
    return channels;
}

// Export functions for global use
window.playlist = {
    loadPlaylist,
    getChannels: () => channels,
    filterChannels: (query) => {
        if (!query) return channels;
        const q = query.toLowerCase();
        return channels.filter(c => c.name && c.name.toLowerCase().includes(q));
    }
};
