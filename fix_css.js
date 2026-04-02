const fs = require('fs');
let css = fs.readFileSync('public/games/monopoly/monopoly.css', 'utf8');

css += "\n/* Fix Train sideways issues and rotate text correctly */\n";
css += ".left-col .space-icon { transform: rotate(90deg); margin-right: 5px; }\n";
css += ".right-col .space-icon { transform: rotate(-90deg); margin-left: 5px; }\n";
css += ".top-row .space-icon { transform: rotate(180deg); margin-bottom: 5px; }\n";
css += ".top-row .space-name { transform: rotate(180deg); }\n";
css += ".top-row .space-price { transform: rotate(180deg); }\n";

fs.writeFileSync('public/games/monopoly/monopoly.css', css);
