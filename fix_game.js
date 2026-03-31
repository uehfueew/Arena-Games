const fs = require('fs');
let text = fs.readFileSync('public/games/tictactoe/game.js', 'utf8');

if (!text.includes("cell.setAttribute('data-value', value);")) {
    text = text.replace("cell.textContent = value;", "cell.textContent = value;\n            cell.setAttribute('data-value', value);");
    fs.writeFileSync('public/games/tictactoe/game.js', text);
}
