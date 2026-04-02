const fs = require('fs'); let css = fs.readFileSync('public/games/monopoly/monopoly.css', 'utf8'); css += '
.deck.chest { font-size: 0.9rem; }'; fs.writeFileSync('public/games/monopoly/monopoly.css', css);
