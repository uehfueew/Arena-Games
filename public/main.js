export const config = {
    serverUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? `http://${window.location.hostname}:3000` 
        : window.location.origin
};

// --- Particles Background Engine ---
function createParticles() {
    const bg = document.createElement('div');
    bg.id = 'particles-bg';
    document.body.appendChild(bg);

    for(let i=0; i<40; i++) {
        let p = document.createElement('div');
        p.className = 'particle';
        let size = Math.random() * 4 + 1;
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        p.style.left = Math.random() * 100 + 'vw';
        p.style.top = Math.random() * 100 + 'vh';
        p.style.animationDuration = (Math.random() * 20 + 20) + 's';
        p.style.animationDelay = (Math.random() * 5) + 's';
        bg.appendChild(p);
    }
}

// --- Global Audio Effects ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
export function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'win') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.setValueAtTime(400, now + 0.1);
        osc.frequency.setValueAtTime(600, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
    }
}

// --- Dynamic Global Audio Binder ---
document.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.classList.contains('btn') || e.target.closest('a')) {
        playSound('click');
    }
});

// Global Auth Check & Header UI
export async function checkAuth() {
    const user = localStorage.getItem('username');
    const authLinks = document.getElementById('auth-links');
    const userLinks = document.getElementById('user-links');

    if (user) {
        if(authLinks) authLinks.style.display = 'none';
        if(userLinks) {
            userLinks.style.display = 'flex';
            if (!document.getElementById('logoutBtnDynamic')) {
                buildTopBar(user);
            }
        }
        
        // Fetch User Metagame Stats
        try {
            let res = await fetch(`/api/profile/${user}`);
            if (res.ok) {
                let data = await res.json();
                let u = data.user;
                
                // Update dynamic values if they exist
                const xpEl = document.getElementById('nav-xp');
                const tixEl = document.getElementById('nav-tickets');
                const avatarEl = document.getElementById('nav-avatar');
                
                if(xpEl) {
                    xpEl.innerText = u.level || 1;
                    const xpBar = document.getElementById('nav-xp-bar');
                    if(xpBar) {
                        const max_xp = (u.level || 1) * 100;
                        const pct = ((u.xp || 0) / max_xp) * 100;
                        xpBar.style.width = Math.min(pct, 100) + '%';
                    }
                }

                if(tixEl) tixEl.innerText = u.tickets || 0;
                if(avatarEl && u.avatar) avatarEl.innerText = u.avatar;
            }
        } catch(e) { console.error(e) }
        
        initGlobalChat(user);
    } else {
        if(authLinks) authLinks.style.display = 'flex';
        if(userLinks) userLinks.style.display = 'none';
        
        // We only redirect if it is a sensitive page
        if (window.location.pathname.includes('profile.html') || window.location.pathname.includes('shop.html')) {
            window.location.href = 'login.html';
        }
    }
}

function buildTopBar(user) {
    const userLinks = document.getElementById('user-links');
    if (!userLinks) return;

    // Detect if we are in a subfolder (like games/snake)
    const inSubDir = window.location.pathname.includes('/games/');
    const pfx = inSubDir ? '../../' : '';
    
    userLinks.innerHTML = `
        <!-- Stats -->
        <div class="user-stats-badges">
                        <div class="stat-badge level-badge" title="Level" style="position:relative; overflow:hidden; padding-bottom:5px;">
                <div style="z-index:2; position:relative; display:flex; align-items:center; gap:6px;">
                    <svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                    <span>Lvl <b id="nav-xp">...</b></span>
                </div>
                <div id="nav-xp-bar" style="position:absolute; bottom:0; left:0; height:3px; background:var(--accent-warning); width:0%;"></div>
            </div>
        </div>

        <!-- Actions Group -->
        <div class="nav-actions-group">
            <div class="dropdown-container">
                <button class="btn-icon" id="friendsToggle" title="Friends">
                   <svg viewBox="0 0 24 24"><path d="M15 8c0-1.42-.5-2.73-1.33-3.76.42-.14.86-.24 1.33-.24 2.21 0 4 1.79 4 4s-1.79 4-4 4c-.43 0-.84-.09-1.23-.21-.03-.01-.06-.02-.08-.03A5.98 5.98 0 0 0 15 8zm1.66 5.13C18.03 14.06 19 15.32 19 17v3h4v-3c0-2.18-3.57-3.47-6.34-3.87zM9 4c2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4 1.79-4 4-4zm0 9c2.67 0 8 1.34 8 4v3H1v-3c0-2.66 5.33-4 8-4z"/></svg>
                </button>
                <div class="dropdown-menu" id="friendsDropdown">
                    <div class="dropdown-header">Friends <span id="friendsCount">0</span></div>
                    <div class="dropdown-body" id="friendsList"><div class="dropdown-empty">Loading...</div></div>
                </div>
            </div>

            <div class="dropdown-container">
                <button class="btn-icon" id="favsToggle" title="Favorites">
                   <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                </button>
                <div class="dropdown-menu" id="favsDropdown">
                    <div class="dropdown-header">Favorites</div>
                    <div class="dropdown-body" id="favsList"><div class="dropdown-empty">Loading...</div></div>
                </div>
            </div>

            <div class="dropdown-container">
                <button class="btn-icon" id="notifToggle" title="Notifications">
                   <svg viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
                </button>
                <div class="dropdown-menu" id="notifDropdown">
                    <div class="dropdown-header">Notifications</div>
                    <div class="dropdown-body" id="notifList"><div class="dropdown-empty">Loading...</div></div>
                </div>
            </div>
        </div>

        <div class="user-badge" onclick="window.location.href='${pfx}profile.html'" style="cursor: pointer;">
            <div class="user-avatar" id="nav-avatar">${user.charAt(0).toUpperCase()}</div>
            <span class="user-name" id="profile-name">${user}</span>
        </div>

        <button id="logoutBtnDynamic" class="btn btn-outline" style="border: none; padding: 8px 12px; color: var(--text-muted);" title="Logout">
            <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; fill: currentColor;"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
        </button>
    `;

    document.getElementById('logoutBtnDynamic').addEventListener('click', () => {
        localStorage.removeItem('arcade_user');
        window.location.reload();
    });

    // Dropdown toggles
    const toggles = ['friendsToggle', 'favsToggle', 'notifToggle'];
    const dropdowns = ['friendsDropdown', 'favsDropdown', 'notifDropdown'];
    
    toggles.forEach((tId, idx) => {
        const btn = document.getElementById(tId);
        const dd = document.getElementById(dropdowns[idx]);
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close others
            dropdowns.forEach((otherId, otherIdx) => {
                if (otherIdx !== idx) document.getElementById(otherId).classList.remove('show');
            });
            dd.classList.toggle('show');
            
            // Load data if opening
            if(dd.classList.contains('show')) {
                loadDropdownData(user, dropdowns[idx]);
            }
        });
    });

    document.addEventListener('click', () => {
        dropdowns.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.classList.remove('show');
        });
    });
}

function loadDropdownData(user, type) {
    const listMap = {
        'friendsDropdown': { url: '/api/friends/' + user, listId: 'friendsList', emptyMsg: 'No friends yet' },
        'favsDropdown': { url: '/api/favorites/' + user, listId: 'favsList', emptyMsg: 'No favorites added' },
        'notifDropdown': { url: '/api/notifications/' + user, listId: 'notifList', emptyMsg: 'No new notifications' }
    };
    
    const conf = listMap[type];
    const listEl = document.getElementById(conf.listId);
    
    fetch(conf.url).then(r=>r.json()).then(data => {
        listEl.innerHTML = '';
        if(!data || data.length === 0) {
            let emptyHtml = `<div class="dropdown-empty">${conf.emptyMsg}</div>`;
            if (type === 'friendsDropdown') {
                emptyHtml += `
                <div style="padding: 10px; border-top: 1px solid var(--bg-card); display: flex; gap: 5px;">
                    <input type="text" id="addFriendInput" placeholder="Friend Username..." style="flex:1; border-radius: 4px; border: 1px solid var(--bg-card); background: #191b23; color: #fff; padding: 4px 8px; font-size: 0.85rem;" />
                    <button onclick="addFriend(document.getElementById('addFriendInput').value)" style="background: var(--bg-button); border:none; color:#fff; border-radius: 4px; padding: 4px 10px; cursor: pointer; font-size: 0.85rem;">Add</button>
                </div>
                `;
            }
            listEl.innerHTML = emptyHtml;
            return;
        }
        
        let html = '';
        data.forEach(item => {
            if(type === 'friendsDropdown') {
                html += `<div class="dropdown-item">
                    <div class="dropdown-item-icon" style="border-radius:50%"><svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>
                    <div class="dropdown-item-content">
                        <div class="dropdown-item-title">${item.friend}</div>
                        <div class="dropdown-item-desc">${item.status === 'online' ? 'Online' : 'Offline'}</div>
                    </div>
                </div>`;
            } else if(type === 'favsDropdown') {
                const inSubDir = window.location.pathname.includes('/games/');
                const pfx = inSubDir ? '../' : 'games/';
                html += `<a class="dropdown-item" href="${pfx}${item.game}/index.html">
                    <div class="dropdown-item-icon"><svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></div>
                    <div class="dropdown-item-content">
                        <div class="dropdown-item-title">${item.game_title || item.game}</div>
                        <div class="dropdown-item-desc">Play now</div>
                    </div>
                </a>`;
            } else if(type === 'notifDropdown') {
                html += `<div class="dropdown-item">
                    <div class="dropdown-item-icon"><svg viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg></div>
                    <div class="dropdown-item-content">
                        <div class="dropdown-item-title">${item.message}</div>
                        <div class="dropdown-item-desc">${item.time_ago || 'Recent'}</div>
                    </div>
                </div>`;
            }
        });
        
        listEl.innerHTML = html;
            if(type === 'friendsDropdown') {
                document.getElementById('friendsCount').innerText = data.length;
                html += `
                <div style="padding: 10px; border-top: 1px solid var(--bg-card); display: flex; gap: 5px;">
                    <input type="text" id="addFriendInput" placeholder="Username..." style="flex:1; border-radius: 4px; border: 1px solid var(--bg-card); background: #191b23; color: #fff; padding: 4px 8px; font-size: 0.85rem;" />
                    <button onclick="addFriend(document.getElementById('addFriendInput').value)" style="background: var(--bg-button); border:none; color:#fff; border-radius: 4px; padding: 4px 10px; cursor: pointer; font-size: 0.85rem;">Add</button>
                </div>
                `;
                listEl.innerHTML = html;
            } else {
                listEl.innerHTML = html;
            }
        }
    }).catch(err => {
        listEl.innerHTML = `<div class="dropdown-empty">No items yet</div>`;
    });
}

window.addFriend = function(friendName) {
    if(!friendName) return;
    const username = localStorage.getItem('username');
    fetch('/api/friends/add', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username, friend: friendName})
    }).then(r=>r.json()).then(d => {
        if(d.error) alert(d.error);
        else {
            alert('Friend added!');
            document.getElementById('addFriendInput').value = '';
            // refresh
            document.getElementById('friendsToggle').click();
            setTimeout(() => document.getElementById('friendsToggle').click(), 10);
        }
    });
};


document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    const logoutBtn = document.getElementById('logoutBtn');
    if(logoutBtn) logoutBtn.addEventListener('click', logout);
});


document.addEventListener('DOMContentLoaded', () => {
    // ...existing...
    const searchInput = document.querySelector('.topbar-search input');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const cards = document.querySelectorAll('.game-card');
            cards.forEach(card => {
                const title = card.querySelector('.game-card-title').innerText.toLowerCase();
                card.style.display = title.includes(query) ? 'flex' : 'none';
            });
        });
    }

    // Category filtering logic
    const filterBtns = document.querySelectorAll('.cat-btn');
    const gameCards = document.querySelectorAll('.game-card');

    if (filterBtns.length > 0) {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active button styling
                filterBtns.forEach(b => {
                    b.classList.remove('active');
                });
                btn.classList.add('active');

                const filter = btn.getAttribute('data-filter');

                // Filter games
                gameCards.forEach(card => {
                    if (filter === 'all' || card.getAttribute('data-category') === filter) {
                        card.style.display = 'flex';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        });
    }
});
