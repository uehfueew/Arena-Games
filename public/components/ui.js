// ui.js
// Globally shared component library. Injects common headers, footers, wrappers, and connects them.

import './api.js'; // Ensure API works anywhere UI is loaded

const UI = {
    // 1. Insert Nav into the current page 
    //    Assumes game page provides <div id="app-nav"></div> or uses a fixed position
    injectNav(title = 'Arcade', badge = '') {
        const username = window.API.getCurrentUser() || 'Guest';

        const isMultiplayer = ['Tic-Tac-Toe', 'Connect 4', 'Retro Snake', 'Labyrinth', 'Monopoly'].includes(title);
        
        const inviteBtn = isMultiplayer ? `
            <button onclick="window.UI.showInviteModal('${title}')" style="background: var(--accent-primary, #6c5ce7); border: none; color: white; padding: 6px 12px; border-radius: 6px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-user-plus"></i> Invite
            </button>
        ` : '';

        const navHtml = `
            <nav class="monopoly-nav" style="display: flex; justify-content: space-between; align-items: center; height: 60px; background: #0f172a; padding: 0 30px; border-bottom: 2px solid #1e293b; color: white; box-shadow: 0 4px 10px rgba(0,0,0,0.1); width: 100%; z-index: 100; box-sizing: border-box; flex-shrink: 0;">
                <div style="display: flex; gap: 15px; align-items: center;">
                    <a href="../../index.html" style="text-decoration: none; color: #94a3b8; background: rgba(255,255,255,0.05); padding: 6px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); font-weight: 600; display: flex; align-items: center; gap: 8px; transition: 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)';this.style.color='#fff'" onmouseout="this.style.background='rgba(255,255,255,0.05)';this.style.color='#94a3b8'">
                        <i class="fas fa-arrow-left"></i> Hub
                    </a>
                    ${inviteBtn}
                </div>
                <div style="font-weight: 900; font-size: 1.5rem; letter-spacing: 2px; color: #fff; display: flex; align-items: center; gap: 8px;">
                    ${title}
                    ${badge ? `<span style="background: linear-gradient(135deg, #10b981, #059669); color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 800;">${badge}</span>` : ''}
                </div>
                <div style="display: flex; gap: 15px; font-weight: 700; background: #1e293b; padding: 6px 15px; border-radius: 50px; border: 1px solid #334155;">
                    <span id="global-nav-user"><i class="fas fa-user-circle"></i> ${username}</span>
                    <span id="global-nav-balance" style="color: #10b981;"><i class="fas fa-coins"></i> -</span>
                </div>
            </nav>
        `;

        // Inject at top of body, or into a specific container if it exists
        const mainNav = document.getElementById('main-nav');
        if (mainNav) {
            mainNav.innerHTML = navHtml;
        } else {
            document.body.insertAdjacentHTML('afterbegin', navHtml);
        }
        
        // Fetch balance from profile
        window.API.getProfile().then(profile => {
            if (profile && profile.tickets !== undefined) {
                const bal = document.getElementById('global-nav-balance');
                if(bal) bal.innerHTML = `<i class="fas fa-coins"></i> ${profile.tickets}`;
            }
        });
    },

    showInviteModal(gameTitle) {
        const username = window.API.getCurrentUser();
        if(!username) return alert('Must be logged in!');
        
        let modal = document.getElementById('inviteModal');
        if(!modal) {
            modal = document.createElement('div');
            modal.id = 'inviteModal';
            modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;';
            document.body.appendChild(modal);
        }
        
        modal.innerHTML = `
            <div style="background:#1e293b; padding:25px; border-radius:12px; width:350px; text-align:center; color:white; font-family:Inter,sans-serif; position:relative; border: 1px solid #334155; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                <button onclick="document.getElementById('inviteModal').style.display='none'" style="position:absolute;top:10px;right:15px;background:none;border:none;color:#94a3b8;font-size:1.5rem;cursor:pointer;transition:color 0.2s;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='#94a3b8'">&times;</button>
                <h3 style="margin-bottom:15px; font-weight:800; font-size:1.4rem;">Invite Friend</h3>
                <p style="color:#94a3b8; font-size:0.9rem; margin-bottom:20px;">Invite a friend to play ${gameTitle} with you!</p>
                
                <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px; text-align:left;">
                    <label style="font-size:0.8rem; font-weight:bold; color:#94a3b8; letter-spacing:1px;">FRIEND USERNAME</label>
                    <input type="text" id="inviteTarget" placeholder="Enter username..." style="padding:12px; border-radius:6px; border:1px solid #334155; background:#0f172a; color:white; width:100%; box-sizing:border-box; outline:none; transition:border-color 0.2s;" onfocus="this.style.borderColor='#6c5ce7'" onblur="this.style.borderColor='#334155'" />
                </div>
                
                <button onclick="window.UI.sendInvite('${gameTitle}')" style="width:100%; padding:12px; border:none; background:linear-gradient(135deg, #6c5ce7, #5a4ac3); color:white; font-weight:bold; border-radius:6px; cursor:pointer; font-size:1rem; transition:transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'"><i class="fas fa-paper-plane" style="margin-right:8px;"></i>Send Invite</button>
            </div>
        `;
        modal.style.display = 'flex';
    },

    sendInvite(gameTitle) {
        const from = window.API.getCurrentUser();
        const to = document.getElementById('inviteTarget').value;
        if(!to) return;
        
        fetch('/api/friends/invite', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ from, to, game: gameTitle, link: window.location.pathname })
        }).then(r=>r.json()).then(d => {
            if(d.error) alert('Error: ' + d.error);
            else {
                alert('Invite sent!');
                document.getElementById('inviteModal').style.display = 'none';
            }
        });
    }
};

window.UI = UI;