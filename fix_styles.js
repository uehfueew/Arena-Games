const fs = require('fs');

let css = fs.readFileSync('public/games/monopoly/monopoly.css', 'utf8');

// 1. On the middle where the community chest is, make its font be smaller.
css = css.replace(/COMMUNITY<br>CHEST/, '<span style="font-size:0.8rem; line-height:1;">COMMUNITY</span><br>CHEST');

// 2. Also the name "Chance" and "Community chest" on the boards is on top of the icon,
// make it so it shows where the colors of the properties show
// This means the color bar area should be occupied by the icon, and text should be underneath.
css += `
.space-icon { padding-top: 5px; height: 22%; display: flex; align-items: center; justify-content: center; }
.bottom-row .space-icon { border-bottom: 2px solid rgba(0,0,0,0.1); width: 100%; height: 22%; }
.top-row .space-icon { border-top: 2px solid rgba(0,0,0,0.1); width: 100%; height: 22%; }
.left-col .space-icon { border-right: 2px solid rgba(0,0,0,0.1); width: 22%; height: 100%; }
.right-col .space-icon { border-left: 2px solid rgba(0,0,0,0.1); width: 22%; height: 100%; }
`;

// 5. I would like to make the dices look better, remove the red sqaure in the middle and keep only the dots, but make them show higher because they are a little lower right now.
css = css.replace(/\.die\s*\{[^}]+\}/, '.die { font-size: 3.5rem; color: #ef4444; text-shadow: 0 4px 10px rgba(239, 68, 68, 0.4); display: flex; align-items: center; justify-content: center; background: transparent; border-radius: 8px; width: 60px; height: 60px; border: none; padding-bottom: 10px; }');
css = css.replace(/\.cube__face\s*\{[^}]+\}/, '.cube__face { position: absolute; width: 60px; height: 60px; background: white; border: 2px solid #ccc; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 4.5rem; color: #1e293b; font-weight: bold; line-height: 1; padding-bottom: 8px; box-sizing: border-box; }');

// 4. On the right and left side properties, the prices cant be seen on some of them when the name is longer
css += `
.left-col .space-name, .right-col .space-name { line-height: 1; margin: 2px; }
.left-col .space-price { left: 2px; }
.right-col .space-price { right: 2px; }
`;

fs.writeFileSync('public/games/monopoly/monopoly.css', css);

let gameJs = fs.readFileSync('public/games/monopoly/game.js', 'utf8');
gameJs = gameJs.replace(/COMMUNITY<br>CHEST/g, '<span style="font-size:0.8rem; line-height:1;">COMMUNITY</span><br>CHEST');
// make sure space icons are correctly appended to div instead of color-bar for those spaces
gameJs = gameJs.replace(/if\s*\(space\.icon\)\s*\{\s*html\s*\+\=\s*`<div\s*class="space-icon">\$\{space\.icon\}<\/div>`;\s*\}/g, 'if(space.icon) html += `<div class="color-bar space-icon">${space.icon}</div>`;');
fs.writeFileSync('public/games/monopoly/game.js', gameJs);

