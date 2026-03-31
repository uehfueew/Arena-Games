const fs = require('fs');
let html = fs.readFileSync('public/games/tictactoe/index.html', 'utf8');

const keyframes = `
<style>
@keyframes winPulse {
  0% { transform: scale(1); box-shadow: inset 0 0 20px rgba(0,0,0,0.5), 0 0 0 rgba(0,0,0,0); }
  20% { transform: scale(1.05); box-shadow: inset 0 0 20px rgba(0,0,0,0.5), 0 0 40px rgba(255, 215, 0, 0.8); border-color: rgba(255, 215, 0, 1); }
  50% { transform: scale(1); box-shadow: inset 0 0 20px rgba(0,0,0,0.5), 0 0 20px rgba(255, 215, 0, 0.4); border-color: rgba(255, 215, 0, 0.5); }
  100% { transform: scale(1); box-shadow: inset 0 0 20px rgba(0,0,0,0.5), 0 0 0 rgba(0,0,0,0); border-color: transparent; }
}
</style>
`;

if(!html.includes('@keyframes winPulse')) {
    html = html.replace('</body>', keyframes + '\n</body>');
    fs.writeFileSync('public/games/tictactoe/index.html', html);
}
