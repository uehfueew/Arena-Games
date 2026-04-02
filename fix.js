const fs = require('fs');
let css = fs.readFileSync('public/games/monopoly/monopoly.css', 'utf8');

css = css.replace(/\.deck-slots\s*\{[^}]+}/g, '');
css = css.replace(/\.deck\s*\{[^}]+}/g, '');
css = css.replace(/\.deck::before\s*\{[^}]+}/g, '');
css = css.replace(/\.deck::after\s*\{[^}]+}/g, '');
css = css.replace(/\.deck\.chance\s*\{[^}]+}/g, '');
css = css.replace(/\.deck\.chest\s*\{[^}]+}/g, '');

const newDeckCSS = `
.deck-slots { position: absolute; width: 100%; height: 100%; top: 0; left: 0; pointer-events: none; z-index: 5;}
.deck { width: 130px; height: 85px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; text-align: center; background: #fffcf2; position: absolute; pointer-events: auto; box-shadow: -2px 2px 0 #fff, -2px 2px 0 1px #cbd5e1, -4px 4px 0 #fff, -4px 4px 0 1px #cbd5e1, -6px 6px 0 #fff, -6px 6px 0 1px #cbd5e1, -8px 8px 15px rgba(0,0,0,0.2); border: 2px solid #cbd5e1; line-height: 1.2; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
.deck-inner { width: calc(100% - 12px); height: calc(100% - 12px); border: 3px dashed currentColor; border-radius: 4px; display: flex; align-items: center; justify-content: center; flex-direction: column; padding: 5px; box-sizing: border-box; pointer-events: none; }
.deck.chance { top: 12%; left: 12%; transform: rotate(135deg); color: #ea580c; }
.deck.chance:hover { transform: rotate(135deg) translate(-2px, -2px) scale(1.05); }
.deck.chest { bottom: 12%; right: 12%; transform: rotate(-45deg); color: #2563eb; }
.deck.chest:hover { transform: rotate(-45deg) translate(-2px, -2px) scale(1.05); }
`;
fs.writeFileSync('public/games/monopoly/monopoly.css', css + '
' + newDeckCSS);

