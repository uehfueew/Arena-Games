// api.js
// Shared client-side logic for API requests (Saving stats, fetching user profile)

const API = {
    // Current logged-in user
    getCurrentUser() {
        return localStorage.getItem('username');
    },

    // Log the user out
    logout() {
        localStorage.removeItem('username');
        window.location.href = '/login.html';
    },

    // Save game stats generically
    async saveGameStats({ game, result, score = 0, opponent = null }) {
        const username = this.getCurrentUser();
        if (!username) {
            console.warn("User is not logged in. Discarding stats.");
            return { success: false, error: 'Not logged in' };
        }

        try {
            const response = await fetch('/api/record-match', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    game,
                    result, // 'win', 'loss', 'draw', or 'score_only'
                    score,
                    opponent
                })
            });
            const data = await response.json();
            if (data.success) {
                console.log(`Stats saved successfully for ${game}`);
            } else {
                console.error(`Failed to save stats for ${game}:`, data.error);
            }
            return data;
        } catch (error) {
            console.error("Error connecting to server:", error);
            return { success: false, error: error.message };
        }
    },

    // Fetch full user profile
    async getProfile() {
        const username = this.getCurrentUser();
        if (!username) return null;

        try {
            const res = await fetch(`/api/users/${username}`);
            if (res.ok) {
                return await res.json();
            }
        } catch (err) {
            console.error("Failed to fetch profile:", err);
        }
        return null;
    },

    // Start auto Playtime Tracker
    startPlaytimeTracking() {
        const username = this.getCurrentUser();
        if (!username) return; // not logged in

        // Auto detect game name from URL path (/games/monopoly/..., etc)
        const pathParts = window.location.pathname.split('/');
        const gameIndex = pathParts.indexOf('games');
        if (gameIndex === -1 || !pathParts[gameIndex+1]) return; // not in a game folder
        
        const gameName = pathParts[gameIndex+1];
        
        console.log(`[API] Playtime XP tracking started for ${gameName}...`);
        
        // Every 1 minute, ping the server for XP reward
        setInterval(async () => {
            try {
                const response = await fetch('/api/record-playtime', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username,
                        game: gameName,
                        minutes: 1 // 1 minute per ping
                    })
                });
                const data = await response.json();
                if (data.message) {
                    console.log(`[XP] +${data.xpAdded} XP ✨ Level: ${data.level}`);
                    // Dispatch custom event for UI updates if any exist
                    window.dispatchEvent(new CustomEvent('xpUpdate', { detail: data }));
                }
            } catch (err) {
                console.error("Failed to ping playtime:", err);
            }
        }, 60000); // 60,000 ms = 1 Minute
    }
};

window.API = API;

// Auto initialize playtime tracker
document.addEventListener('DOMContentLoaded', () => {
    if (window.API) window.API.startPlaytimeTracking();
});