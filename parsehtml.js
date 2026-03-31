const fs = require('fs');
const html = fs.readFileSync('public/games/tictactoe/index.html', 'utf8');
const regex = /<script>([\s\S]*?)<\/script>/g;
let i = 0;
let match;
while ((match = regex.exec(html)) !== null) {
    try {
        new (require('vm').Script)(match[1]);
        console.log(`Script ${i} OK`);
    } catch(e) {
        console.log(`Script ${i} ERROR: ${e.message}`);
    }
    i++;
}
