const fs = require('fs');
let code = fs.readFileSync('public/games/monopoly/game.js', 'utf8');

code = code.replace(
    'if (p.money < 0 && !p.bankrupt) {', 
    'if (p.bankrupt && p.properties.length > 0) {'
);

fs.writeFileSync('public/games/monopoly/game.js', code);
console.log('Fixed auto bankrupt!');
