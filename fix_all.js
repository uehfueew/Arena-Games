const fs = require('fs');
let bd = fs.readFileSync('public/games/monopoly/boardData.js', 'utf8');

bd = bd.replace(/icon: '<i class="fas fa-question"><\/i>', name: "Chance"/g, 'icon: \'<i class="fas fa-question" style="color:#ea580c; font-size:1.5rem;"><\/i>\', name: "Chance"');
bd = bd.replace(/icon: '<i class="fas fa-box-open"><\/i>', name: "Community Chest"/g, 'icon: \'<i class="fas fa-box-open" style="color:#2563eb; font-size:1.5rem;"><\/i>\', name: "Community Chest"');
bd = bd.replace(/name: "Reading Railroad"/, 'icon: \'<i class="fas fa-train"></i>\', name: "Reading Railroad"');
bd = bd.replace(/name: "Pennsylvania Railroad"/, 'icon: \'<i class="fas fa-train"></i>\', name: "Pennsylvania Railroad"');
bd = bd.replace(/name: "B. & O. Railroad"/, 'icon: \'<i class="fas fa-train"></i>\', name: "B. & O. Railroad"');
bd = bd.replace(/name: "Short Line"/, 'icon: \'<i class="fas fa-train"></i>\', name: "Short Line"');
bd = bd.replace(/name: "Electric Company"/, 'icon: \'<i class="fas fa-lightbulb" style="color:#eab308;"></i>\', name: "Electric Company"');
bd = bd.replace(/name: "Water Works"/, 'icon: \'<i class="fas fa-faucet" style="color:#0ea5e9;"></i>\', name: "Water Works"');

bd = bd.replace(/icon: '<i class="fas fa-long-arrow-alt-left"><\/i>', name: "GO"/, 'icon: \'<i class="fas fa-arrow-left" style="color:#ef4444; font-size:2.5rem; margin-bottom:5px;"></i>\', name: "GO"');
bd = bd.replace(/icon: '<i class="fas fa-gavel"><\/i>', name: "IN JAIL"/, 'icon: \'<i class="fas fa-ban" style="color:#1e293b; font-size:2.5rem; margin-bottom:5px;"></i>\', name: "IN JAIL"');
bd = bd.replace(/icon: '<i class="fas fa-car"><\/i>', name: "FREE PARKING"/, 'icon: \'<i class="fas fa-car-side" style="color:#ef4444; font-size:2.5rem; margin-bottom:5px;"></i>\', name: "FREE PARKING"');
bd = bd.replace(/icon: '<i class="fas fa-user-lock"><\/i>', name: "GO TO JAIL"/, 'icon: \'<i class="fas fa-hand-holding-usd" style="color:#1e293b; font-size:2.5rem; margin-bottom:5px;"></i>\', name: "GO TO JAIL"');

fs.writeFileSync('public/games/monopoly/boardData.js', bd);

let features = fs.readFileSync('public/games/monopoly/features.css', 'utf8');
features = features.replace(/font-size: 4rem; color: #ef4444; font-weight: bold;\s*line-height: 1; \/\* Match dot size \*\//, 'font-size: 5rem; color: #1e293b; font-weight: bold; line-height: 0.8; padding-bottom: 25px; border-radius: 12px;');
fs.writeFileSync('public/games/monopoly/features.css', features);

let css = fs.readFileSync('public/games/monopoly/monopoly.css', 'utf8');

/* Clean old overlapping rules if needed */
css += '
/* New Rules for corners and property texts */
';
css += '.space.corner { flex-direction: column; justify-content: center; }
';
css += '.space.corner .space-icon { position: static; height: auto; transform: none; opacity: 1; margin-bottom: 10px; }
';
css += '.space.corner .space-name { z-index: 1; font-size: 0.8rem; font-weight: 900; }
';

css += '.left-col .space-name { width: auto; margin:0; padding: 2px; writing-mode: vertical-rl; transform: rotate(180deg); height: auto; }
';
css += '.right-col .space-name { width: auto; margin:0; padding: 2px; writing-mode: vertical-rl; height: auto; }
';
css += '.left-col .space-price { position: static; writing-mode: vertical-rl; transform: rotate(180deg); text-align: center; font-size: 0.5rem; margin-top: auto; }
';
css += '.right-col .space-price { position: static; writing-mode: vertical-rl; text-align: center; font-size: 0.5rem; margin-bottom: auto; }
';
fs.writeFileSync('public/games/monopoly/monopoly.css', css);

