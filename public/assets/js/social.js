
// Utility: Check if user is logged in
function isLoggedIn() {
    return localStorage.getItem('username') !== null;
}

// Ensure function only runs if logged in, else show login modal
function requireAuth(callback) {
    if (isLoggedIn()) {
        callback();
    } else {
        const modal = document.getElementById('authGuardModal');
        if(modal) {
            modal.style.display = 'flex';
            modal.classList.remove('hidden');
        }
    }
}

let isLiked = false;
let isDisliked = false;
let likesCount = 0; // Mock current likes

function initSocials() {
    likesCount = Math.floor(Math.random() * 50) + 10;
    const counter = document.getElementById('like-count');
    if(counter) counter.innerText = likesCount;
    
    // Wire fullscreen buttons
    const fsBtns = document.querySelectorAll('#fullscreen-btn');
    fsBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const container = document.getElementById('actual-game-container');
            if (container) {
                if (!document.fullscreenElement) {
                    container.requestFullscreen().catch(err => {
                        console.error("Error attempting to enable fullscreen:", err);
                    });
                } else {
                    document.exitFullscreen();
                }
            }
        });
    });
}

function likeGame() {
    requireAuth(() => {
        const likeBtn = document.querySelector('.like-btn');
        const dislikeBtn = document.querySelector('.dislike-btn');
        const counter = document.getElementById('like-count');
        
        if (isLiked) {
            isLiked = false;
            likesCount--;
            likeBtn.classList.remove('liked');
        } else {
            isLiked = true;
            likesCount++;
            likeBtn.classList.add('liked');
            if (isDisliked) {
                isDisliked = false;
                dislikeBtn.classList.remove('disliked');
            }
        }
        counter.innerText = likesCount;
    });
}

function dislikeGame() {
    requireAuth(() => {
        const likeBtn = document.querySelector('.like-btn');
        const dislikeBtn = document.querySelector('.dislike-btn');
        const counter = document.getElementById('like-count');

        if (isDisliked) {
            isDisliked = false;
            dislikeBtn.classList.remove('disliked');
        } else {
            isDisliked = true;
            dislikeBtn.classList.add('disliked');
            if (isLiked) {
                isLiked = false;
                likesCount--;
                likeBtn.classList.remove('liked');
                counter.innerText = likesCount;
            }
        }
    });
}

function toggleFavorite() {
    requireAuth(() => {
        const favBtn = document.querySelector('.fav-btn');
        const icon = favBtn.querySelector('i');
        if (favBtn.classList.contains('liked')) {
            favBtn.classList.remove('liked');
            icon.classList.remove('bi-heart-fill');
            icon.classList.add('bi-heart');
        } else {
            favBtn.classList.add('liked');
            icon.classList.remove('bi-heart');
            icon.classList.add('bi-heart-fill');
        }
    });
}

function showInviteModal() { 
    requireAuth(() => { 
        const m = document.getElementById('inviteModal');
        if(m) { m.style.display='flex'; m.classList.remove('hidden'); }
    }); 
}

function showFeedbackModal() { 
    requireAuth(() => { 
        const m = document.getElementById('feedbackModal');
        if(m) { m.style.display='flex'; m.classList.remove('hidden'); }
    }); 
}

function closeAuthGuard() {
    const modal = document.getElementById('authGuardModal');
    if(modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    }
}

function toggleControls() {
    const accordion = document.getElementById('game-controls-accordion');
    if(accordion) {
        accordion.classList.toggle('open');
    }
}

// Run init
document.addEventListener("DOMContentLoaded", initSocials);
