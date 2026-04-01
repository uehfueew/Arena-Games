
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
            const container = document.getElementById('game-fullscreen-target') || document.getElementById('actual-game-container');
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

// Ensure socket is available globally for invites
let globalSocket = null;

function setupGlobalSocket() {
    globalSocket = io(window.location.origin);
    const username = localStorage.getItem('username');
    if (username) {
        globalSocket.emit('registerUser', username);
    }

    globalSocket.on('receiveGameInvite', (data) => {
        showIncomingInvite(data);
    });
}

if (typeof io !== 'undefined') {
    setupGlobalSocket();
} else {
    const script = document.createElement('script');
    script.src = '/socket.io/socket.io.js';
    script.onload = () => setupGlobalSocket();
    document.head.appendChild(script);
}

function showIncomingInvite(data) {
    const toast = document.createElement('div');
    toast.style = `
        position: fixed; top: 20px; right: 20px; background: rgba(20, 20, 30, 0.95);
        color: white; padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);
        box-shadow: 0 10px 40px rgba(0,0,0,0.8); z-index: 10000;
        display: flex; flex-direction: column; gap: 15px;
        transform: translateX(120%); transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;
    toast.innerHTML = `
        <div style="display:flex; align-items:center; gap: 15px;">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: #3b82f6; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:1.2rem;">
                ${data.from.charAt(0).toUpperCase()}
            </div>
            <div>
                <h4 style="margin: 0; font-size: 1.1rem; font-weight: 600;">Game Challenge!</h4>
                <p style="margin: 5px 0 0 0; color: #aaa; font-size: 0.9rem;">${data.from} invited you to play ${data.game}.</p>
            </div>
        </div>
        <div style="display:flex; gap: 10px;">
            <button id="accept-inv" style="flex:1; background: #558B6E; color: white; border: none; padding: 8px; border-radius: 6px; cursor: pointer; font-weight: 600;">Accept</button>
            <button id="decline-inv" style="flex:1; background: rgba(255,255,255,0.1); color: white; border: none; padding: 8px; border-radius: 6px; cursor: pointer;">Decline</button>
        </div>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => { toast.style.transform = 'translateX(0)'; }, 100);

    toast.querySelector('#accept-inv').onclick = () => {
        window.location.href = data.link;
    };
    
    const dismiss = () => {
        toast.style.transform = 'translateX(120%)';
        setTimeout(() => toast.remove(), 400);
    };

    toast.querySelector('#decline-inv').onclick = dismiss;
    setTimeout(dismiss, 15000); // Auto-dismiss after 15s
}

window.showInviteModal = function() { 
    requireAuth(() => { 
        // Remove any old static invite modal
        const oldStatic = document.getElementById('inviteModal');
        if (oldStatic) oldStatic.remove();

        const overlay = document.createElement('div');
        overlay.id = 'inviteModal';
        overlay.classList.add('modal-overlay');
        overlay.style = 'position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 9999; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s ease;';

        const link = window.location.origin + window.location.pathname + '?mode=multi&room=' + Math.random().toString(36).substr(2, 6).toUpperCase();

        const mContent = document.createElement('div');
        mContent.style = 'background: #1A1A24; width: 90%; max-width: 450px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 60px rgba(0,0,0,0.8); padding: 30px; color: white; transform: scale(0.9); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);';
        
        mContent.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <h3 style="margin: 0; font-size: 1.6rem; font-weight: 700; display: flex; align-items: center; gap: 10px;">
                    <i class="bi bi-people" style="color: #3b82f6;"></i> Invite Friend
                </h3>
                <button id="close-btn" style="background: transparent; border: none; color: #aaa; font-size: 1.5rem; cursor: pointer; transition: color 0.2s;"><i class="bi bi-x-lg"></i></button>
            </div>
            
            <div style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 20px; margin-bottom: 25px; border: 1px solid rgba(255,255,255,0.05);">
                <p style="margin: 0 0 10px 0; font-weight: 600; font-size: 0.95rem; color: #ddd;">Share Invite Link</p>
                <div style="display: flex; gap: 10px;">
                    <input type="text" readonly value="${link}" id="invite-link-val" style="flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 12px; color: #aaa; font-family: monospace; font-size: 0.9rem; outline: none; box-shadow: inset 0 2px 5px rgba(0,0,0,0.5);">
                    <button id="copy-btn" style="background: #3b82f6; border: none; color: white; border-radius: 8px; padding: 0 20px; font-weight: 600; cursor: pointer; transition: transform 0.1s, background 0.2s; white-space: nowrap;"><i class="bi bi-copy"></i> Copy</button>
                </div>
            </div>

            <div style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 20px; border: 1px solid rgba(255,255,255,0.05);">
                <p style="margin: 0 0 10px 0; font-weight: 600; font-size: 0.95rem; color: #ddd;">Send Direct Invite</p>
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <div style="flex: 1; position: relative;">
                        <i class="bi bi-search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #777;"></i>
                        <input type="text" id="direct-invite-user" placeholder="Enter username..." style="width: 100%; box-sizing: border-box; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 12px 12px 12px 35px; color: white; font-size: 0.95rem; outline: none;">
                    </div>
                    <button id="send-direct" style="background: #558B6E; border: none; color: white; border-radius: 8px; padding: 0 20px; font-weight: 600; cursor: pointer; transition: background 0.2s, transform 0.1s;"><i class="bi bi-send"></i> Send</button>
                </div>
            </div>
        `;
        
        overlay.appendChild(mContent);
        document.body.appendChild(overlay);

        // Enhance interactions
        setTimeout(() => {
            overlay.style.opacity = '1';
            mContent.style.transform = 'scale(1)';
        }, 10);

        const closeFunc = () => {
            overlay.style.opacity = '0';
            mContent.style.transform = 'scale(0.9)';
            setTimeout(() => overlay.remove(), 300);
        };

        mContent.querySelector('#close-btn').addEventListener('click', closeFunc);
        overlay.addEventListener('click', (e) => { if(e.target === overlay) closeFunc(); });

        mContent.querySelector('#copy-btn').addEventListener('click', function() {
            const input = mContent.querySelector('#invite-link-val');
            input.select();
            document.execCommand('copy');
            this.innerHTML = '<i class="bi bi-check-lg"></i> Copied!';
            this.style.background = '#558B6E';
            setTimeout(() => {
                this.innerHTML = '<i class="bi bi-copy"></i> Copy';
                this.style.background = '#3b82f6';
            }, 2000);
        });

        mContent.querySelector('#send-direct').addEventListener('click', function() {
            const targetUser = mContent.querySelector('#direct-invite-user').value.trim();
            if(!targetUser) return;
            
            if (globalSocket) {
                const myUser = localStorage.getItem('username');
                const pathParts = window.location.pathname.split('/');
                const gameName = pathParts[pathParts.length - 2] || 'a game';
                globalSocket.emit('sendGameInvite', {
                    from: myUser,
                    to: targetUser,
                    game: gameName,
                    link: link
                });
                
                this.innerHTML = '<i class="bi bi-check-lg"></i> Sent!';
                this.style.background = '#558B6E';
                setTimeout(() => {
                    this.innerHTML = '<i class="bi bi-send"></i> Send';
                    this.style.background = '#558B6E';
                    closeFunc();
                }, 1500);
            } else {
                alert("Real-time connection not established yet.");
            }
        });
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
