const fs = require('fs');
let data = fs.readFileSync('public/games/monopoly/boardData.js', 'utf8');

// Use custom HTML markup for the special corners to make them look authentic
const goHTML = `<div style="text-align:center;"><div style="font-size:1.8rem; font-weight:900; color:red; line-height:1;">GO</div><i class="fas fa-long-arrow-alt-left" style="font-size:2.5rem; color:red; display:block; margin:auto; transform:rotate(-45deg);"></i><div style="font-size:0.5rem; font-weight:600;">COLLECT $200<br>SALARY AS YOU PASS</div></div>`;
const inJailHTML = `<div style="width: 100%; height: 100%; display: grid; grid-template-rows: 1fr 2fr; grid-template-columns: 2fr 1fr; background: #fbbf24; position: relative;"><div style="grid-area: 1/1/2/3; text-align: center; font-size: 0.8rem; font-weight: 900; transform: rotate(180deg) translateX(50%); align-self: center; justify-self: center; padding:2px;">JUST</div><div style="grid-area: 2/2/3/3; text-align: center; foconst inJailHTML = `<dweight: 900; writing-mode: vertical-rl; padding:2px;">VISITING</div><div style="grid-area: 2/1/3/2; background: white; border-top-right-radius: 10px; border: 2px solid black; display: flex; align-items: center; justify-content: center; position: relative; background-image: repeating-linear-gradient(90deg, transparent, transparent 15px, #333 15px, #333 20px);"><i class="fas fa-user-secret" style="font-size: 1.5rem; color: #f97316; z-index:1; position: absolute; margin-bottom: -10px;"></i></div></div>`;
const parkingHTML = `<div style="text-align:center; transform: rotate(-45deg); padding: 5px;"><div style="font-size: 1rem; color: red; font-weight: 900;">FREE</div><i class="fas fa-car-side" style="font-size:2.5rem; color:red; display:block;"></i><div style="font-size: 1rem; color: red; font-weight: 900;">PARKING</div></div>`;
const goJailHTML = `<div style="text-align: center; transform: rotate(-45deg);"><div style="font-size: 1rem; color: white; font-weight: 900;">GO TO</div><i class="fas fa-gavel" style="font-size: 2.2rem; color: white; display:block; margin: 3px 0;"></i><div style="font-size: 1rem; color: white; font-weight: 900;">JAIL</div></div>`;


data = data.replace(/{ id: 0,[\s\S]*?name: "GO"[^}]+}/, `{ id: 0, icon: \`${goHTML}\`, name: '', type: "go", price: 0, rent: 0, color: null, class: "space go corner" }`);
data = data.replace(/{ id: 10,[\s\S]*?name: "IN JAIL"[^}]+}/, `{ id: 10, icon: \`${inJailHTML}\`, name: '', type: "jail", price: 0, rent: 0, color: null, class: "space jail corner" }`);
data = data.replace(/{ id: 20,[\s\S]*?name: "FREE PARKING"[^}]+}/, `{ id: 20, icon: \`${parkingHTML}\`, name: '', type: "parking", price: 0, rent: 0, color: null, class: "space parking corner" }`);
data = data.replace(/{ id: 30,[\s\S]*?name: "GO TO JAIL"[^}]+}/, `{ id: 30, icon: \`${goJailHTML}\`, name: '', type: "goto-jail", price: 0, rent: 0, color: null, class: "space goto-jail corner" }`);


data = data.replace(/{ id: (\d+),\s*icon:\s*'[^\']+',\s*name: "Chance"/g, '{ id: $1, icon: \'<i class="fas fa-question" style="color: #ea580c; font-size: 1.5rem; text-shadow: 1px 1px 0px rgba(0,0,0,0.2);"></i>\', name: "Chance"');
data = data.replace(/{ id: (\d+),\s*icon:\s*'[^\']+',\s*name: "Community Chest"/g, '{ id: $1, icon: \'<i class="fas fa-box-open" style="color: #2563eb; font-size: 1.5rem; text-shadow: 1px 1px 0px rgba(0,0,0,0.2);"></i>\', name: "Community Chest"');

// Fix trains & utilities
data = data.replace(/name: "Reading Railroad"/g, 'icon: \'<i class="fas fa-train" style="font-size:1.5rem; color:#111;"></i>\', name: "Reading Railroad"');
data = data.replace(/name: "Pennsylvania Railroad"/g, 'icon: \'<i class="fas fa-train" style="font-size:1.5rem; color:#111;"></i>\', name: "Pennsylvania Railroad"');
data = data.replace(/name: "B\. & O\. Railroad"/g, 'icon: \'<i class="fas fa-train" style="font-size:1.5rem; color:#111;"></i>\', name: "B. & O. Railroad"');
data = data.replace(/name: "Short Line"/g, 'icon: \'<i class="fas fa-train" style="font-size:1.5rem; color:#111;"></i>\', name: "Short Line"');
data = data.replace(/name: "Electric Company"/g, 'icon: \'<i class="fas fa-lightbulb" style="font-size:1.5rem; color:#eab308;"></i>\', name: "Electric Company"');
data = data.replace(/name: "Water Works"/g, 'icon: \'<i class="fas fa-faucet" style="font-size:1.5rem; color:#0ea5e9;"></i>\', name: "Water Works"');

// Eliminate double icons if injected multiple times
data = data.replace(/(icon:\s*'[^']+',\s*){2,}/g, '$1');

fs.writeFileSync('public/games/monopoly/boardData.js', data);
