const fs = require('fs');
let html = fs.readFileSync('public/games/connect4/index.html', 'utf8');

if (!html.includes('Error fetching C4 stats')) {
    const jsContent = `
<script>
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = localStorage.getItem('username');
    if (currentUser) {
        fetch('/api/profile/' + currentUser)
            .then(res => res.json())
            .then(data => {
                if (data && data.stats) {
                    const c4Stats = data.stats.find(s => s.game === 'connect4');
                    if (c4Stats) {
                        const wins = c4Stats.wins || 0;
                        const losses = c4Stats.losses || 0;
                        const draws = c4Stats.draws || 0;
                        const total = wins + losses + draws;
                        const winrate = total > 0 ? Math.round((wins / total) * 100) : 0;
                        document.getElementById('c4-stat-wins').textContent = wins;
                        document.getElementById('c4-stat-losses').textContent = losses;
                        document.getElementById('c4-stat-draws').textContent = draws;
                        document.getElementById('c4-stat-total').textContent = total;
                        document.getElementById('c4-stat-winrate').textContent = winrate + '%';
                    }
                }
                if (data && data.user) {
                    const eloEl = document.getElementById('c4-stat-elo');
                    if (eloEl) eloEl.textContent = data.user.elo || 1000;
                    document.querySelectorAll('.elo').forEach(span => { span.textContent = data.user.elo || 1000; });
                }
                if (data && data.history) {
                    const hc = document.getElementById('c4-recent-history');
                    if (hc) {
                        hc.innerHTML = '';
                        const c4History = data.history.filter(h => h.game === 'connect4');
                        if (c4History.length === 0) hc.innerHTML = '<div style="color:#a1a1aa;font-style:italic;padding:10px;">No recent battle logs found.</div>';
                        else {
                            c4History.slice(0, 5).forEach(match => {
                                let c='#94a3b8', t='STALEMATE';
                                if(match.result==='win'){c='#00e676';t='VICTORY';}
                                else if(match.result==='loss'){c='#ff6b35';t='DEFEAT';}
                                hc.innerHTML += \`<div style="background:rgba(0,0,0,0.3);border-radius:10px;padding:15px;border-left:4px solid \${c};display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"><div><div style="font-weight:800;font-size:0.9rem;color:#fff;">vs \${match.opponent||'AI'}</div><div style="font-size:0.8rem;color:#a1a1aa;">\${new Date(match.date).toLocaleDateString()}</div></div><div style="color:\${c};font-weight:900;">\${t}</div></div>\`;
                            });
                        }
                    }
                }
            })
            .catch(err => console.error('Error fetching C4 stats:', err));
    }
});

window.closeModal = function(id) { const el = document.getElementById(id); if(el) { el.style.display = 'none'; el.classList.add('hidden'); } }
window.openModal = function(id) { const el = document.getElementById(id); if(el) { el.style.display = 'flex'; el.classList.remove('hidden'); } }
</script>
`;
    html = html.replace('</body>', jsContent + '\n</body>');
    fs.writeFileSync('public/games/connect4/index.html', html);
    console.log('Injected C4 Stats Script successfully');
} else {
    console.log('C4 Stats Script already present');
}
