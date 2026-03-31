const fs = require('fs');
let content = fs.readFileSync('public/games/tictactoe/main.js', 'utf8');

const replacementCosmetics = `
function applyCosmetics() {
    const theme = localStorage.getItem('ttt_theme') || 'classic';
    const token = localStorage.getItem('ttt_token') || 'classic';
    
    const board = document.getElementById('board');
    if (theme === 'classic') board.style.background = '#1A1C2B';
    if (theme === 'cyberpunk') board.style.background = '#22223b';
    if (theme === 'chalkboard') board.style.background = '#2d3e35';

    let xHtml = 'X', oHtml = 'O';
    let xColor = '#ef4444', oColor = '#3b82f6';
    
    if (token === 'neon') { xHtml = '🗡️'; oHtml = '🛡️'; xColor = '#39ff14'; oColor = '#00eaff'; }
    if (token === 'skulls') { xHtml = '💀'; oHtml = '👻'; xColor = '#fff'; oColor = '#aaa'; }

    document.querySelectorAll('.tic-tac-cell').forEach(cell => {
        const raw = cell.getAttribute('data-value'); // Assuming game.js saves raw X/O here, if not, fallback to text
        const val = raw || cell.textContent;
        if (val === 'X' || val === '🗡️' || val === '💀') {
            cell.innerHTML = xHtml;
            cell.style.color = xColor;
            cell.setAttribute('data-value', 'X'); // keep track
        }
        else if (val === 'O' || val === '🛡️' || val === '👻') {
            cell.innerHTML = oHtml;
            cell.style.color = oColor;
            cell.setAttribute('data-value', 'O');
        }
    });
}
`;

// Replace the mock block
content = content.replace(/const cosmeticsList = \[[\s\S]*?function applyCosmetics\(\) \{[\s\S]*?\n\}/, replacementCosmetics);

fs.writeFileSync('public/games/tictactoe/main.js', content);
