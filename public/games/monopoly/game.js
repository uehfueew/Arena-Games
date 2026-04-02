// game.js
// Logic for Monopoly game

const boardEl = document.getElementById('monopoly-board');
const diceBtn = document.getElementById('btn-roll');
const die1 = document.getElementById('die1');
const die2 = document.getElementById('die2');
const playersContainer = document.getElementById('players-container');
const actionPanel = document.getElementById('action-panel');
const actionTitle = document.getElementById('action-title');
const actionDesc = document.getElementById('action-desc');
const btnBuy = document.getElementById('btn-buy');
const btnPass = document.getElementById('btn-pass');
const gameLog = document.getElementById('game-log');
const modalOverlay = document.getElementById('property-modal');
const btnCloseModal = document.getElementById('btn-close-modal');

let players = [];
let currentPlayerIndex = 0;
let propertiesState = {}; // maps property id to { ownerId: int, houses: int, mortgaged: bool }
let doublesCount = 0;

// Decks logic stub
const chanceCards = [
    { text: "Advance to Go (Collect $200)", action: (p) => { movePlayer(p, 40 - p.pos, false); } },
    { text: "Go to Jail", action: (p) => { p.pos = 10; p.inJail = true; p.jailTurns = 0; placeTokens(); endTurn(); } },
    { text: "Bank pays you dividend of $50", action: (p) => { p.money += 50; updateSidebar(); endTurn(); } },
    { text: "Advance to Illinois Ave", action: (p) => { let dist = (24 + 40 - p.pos) % 40; movePlayer(p, dist, false); } },
    { text: "Pay poor tax of $15", action: (p) => { p.money -= 15; updateSidebar(); endTurn(); } }
];
const chestCards = [
    { text: "Life insurance matures - Collect $100", action: (p) => { p.money += 100; updateSidebar(); endTurn(); } },
    { text: "Doctor's fees - Pay $50", action: (p) => { p.money -= 50; updateSidebar(); endTurn(); } },
    { text: "Holiday Fund matures - Receive $100", action: (p) => { p.money += 100; updateSidebar(); endTurn(); } },
    { text: "Hospital Fees - Pay $100", action: (p) => { p.money -= 100; updateSidebar(); endTurn(); } }
];

let ruleStartMoney = 1500;
let ruleGoBonus = 200;

function addPlayerRow() {
    const inputs = document.getElementById('player-inputs');
    const count = inputs.children.length + 1;
    if(count > 4) return alert("Max 4 players!");
    const div = document.createElement('div');
    div.className = 'player-input-row';
    div.style.marginBottom = '10px';
    div.innerHTML = `<input type="text" id="p${count}-name" value="Player ${count}">
                     <select id="p${count}-token">
                         <option value="🐕" selected>🐕 Dog</option><option value="🚗">🚗 Car</option><option value="🎩">🎩 Hat</option><option value="🚢">🚢 Ship</option><option value="🏃">🏃 Runner</option><option value="🐎">🐎 Horse</option><option value="🥾">🥾 Boot</option><option value="🐧">🐧 Penguin</option><option value="🚂">🚂 Train</option><option value="🚁">🚁 Copter</option>
                     </select>`;
    inputs.appendChild(div);
}

function startGame() {
    localStorage.removeItem('monopoly_save');
    const inputs = document.getElementById('player-inputs');
    players = [];
    let selectedTokens = new Set();
    
    // Check tokens before doing anything
    for(let i=0; i<inputs.children.length; i++) {
        const token = document.getElementById(`p${i+1}-token`).value;
        if (selectedTokens.has(token)) {
            alert("Each player must select a UNIQUE character token!");
            return;
        }
        selectedTokens.add(token);
    }
    
    ruleStartMoney = parseInt(document.getElementById('rule-start-money').value) || 1500;
    ruleGoBonus = parseInt(document.getElementById('rule-go-bonus').value) || 200;

    for(let i=0; i<inputs.children.length; i++) {
        const name = document.getElementById(`p${i+1}-name`).value;
        const token = document.getElementById(`p${i+1}-token`).value;
        players.push({ id: i+1, name: name, token: token, money: ruleStartMoney, pos: 0, properties: [] });
    }
    
    document.getElementById('setup-lobby').classList.add('hidden');
    initBoard();
    
    setTimeout(() => {
        try {
            const docEl = document.documentElement;
            const requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
            if (requestFullScreen) {
                requestFullScreen.call(docEl).catch(e => console.log('Fullscreen rejected', e));
            }
        } catch(e) {}
    }, 100);
    
    logMsg(`--- ${players[currentPlayerIndex].name}'s Turn ---`, 'system');
}

function initBoard() {
    boardData.forEach((space, index) => {
        const spaceEl = document.createElement('div');
        spaceEl.className = space.class;
        spaceEl.id = `space-${index}`;
        
        let html = '';
        if (space.color && space.type === 'property') {
            html += `<div class="color-bar" style="background-color: ${space.color}"></div>`;
        }

        if (space.type !== 'go' && space.type !== 'goto-jail' && space.type !== 'jail' && space.type !== 'parking') {
            html += `<div class="space-name">${space.name}</div>`;
        }

        if (space.icon) {
            html += `<div class="space-icon">${space.icon}</div>`;
        }

        if ((space.price > 0 && space.type === 'property') || space.type === 'railroad' || space.type === 'utility') {
            html += `<div class="space-price">$${space.price}</div>`;
        }

        html += `<div class="owner-indicator" id="owner-${index}"></div>`;
        html += `<div class="buildings" id="buildings-${index}"></div>`;
        html += `<div class="tokens-container" id="tokens-${index}"></div>`;

        spaceEl.innerHTML = html;
        spaceEl.addEventListener('click', () => showPropertyInfo(index));

        // Add to grid according to ID logic (handled purely by CSS grid lines in index/css? Wait, I didn't set specific grid row/cols for the non-corners, only classes like .bottom-row!)
        // CSS Grid flow needs specific positioning or order to work correctly, because flex flow inside grid is linear.
        // For a true monopoly board grid, we explicitly set grid-column and grid-row. Let's do that inline.
        
        if (index > 0 && index < 10) { // bottom row (right to left)
            spaceEl.style.gridColumn = `${11 - index} / ${12 - index}`;
            spaceEl.style.gridRow = `11 / 12`;
        } else if (index > 10 && index < 20) { // left col (bottom to top)
            spaceEl.style.gridColumn = `1 / 2`;
            spaceEl.style.gridRow = `${21 - index} / ${22 - index}`;
        } else if (index > 20 && index < 30) { // top row (left to right)
            spaceEl.style.gridColumn = `${index - 19} / ${index - 18}`;
            spaceEl.style.gridRow = `1 / 2`;
        } else if (index > 30 && index < 40) { // right col (top to bottom)
            spaceEl.style.gridColumn = `11 / 12`;
            spaceEl.style.gridRow = `${index - 29} / ${index - 28}`;
        }

        boardEl.appendChild(spaceEl);
    });

    // Add Center block
    const centerBlock = document.createElement('div');
    centerBlock.className = 'board-center';
    centerBlock.innerHTML = `
        <div class="deck-slots">
            <div class="deck chance">CHANCE</div>
            <div class="deck chest">COMMUNITY CHEST</div>
        </div>
        <div class="center-branding">
            <h1>ESTATES</h1>
            <p>PRO EDITION</p>
        </div>
    `;
    boardEl.appendChild(centerBlock);

    updateSidebar();
    placeTokens();
}

function updateSidebar() {
    playersContainer.innerHTML = '';
    const portfolioContainer = document.getElementById('owned-properties');
    portfolioContainer.innerHTML = ''; // reset portfolio
    
    players.forEach((p, index) => {
        const pCard = document.createElement('div');
        pCard.className = `player-card ${index === currentPlayerIndex ? 'active' : ''}`;
        pCard.innerHTML = `
            <div>
                <span class="p-token">${p.token}</span>
                <span>${p.name}</span>
            </div>
            <div class="balance-badge">$${p.money}</div>
        `;
        playersContainer.appendChild(pCard);
        
        // Show current player portfolio
        if (index === currentPlayerIndex) {
            if (p.properties.length === 0) {
                portfolioContainer.innerHTML = '<div class="empty-state">No properties owned.</div>';
            } else {
                p.properties.sort((a, b) => a - b).forEach(propId => {
                    const space = boardData[propId];
                    const state = propertiesState[propId];
                    const propCard = document.createElement('div');
                    propCard.style = `border: 1px solid rgba(0,0,0,0.1); border-radius: 4px; padding: 5px; display:flex; justify-content: space-between; font-size: 0.85rem; font-weight: 700; cursor: pointer; ${state.mortgaged ? 'opacity: 0.6;' : ''}`;
                    propCard.onclick = () => showPropertyInfo(space.id);
                    propCard.innerHTML = `
                        <div style="display:flex; align-items:center; gap: 8px;">
                            ${space.color ? `<div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${space.color};"></div>` : ''}
                            ${space.name}
                        </div>
                        <div>
                            ${state.mortgaged ? '[M]' : ''} ${state.houses > 0 ? '(' + state.houses + ' 🏠)' : ''}
                        </div>
                    `;
                    portfolioContainer.appendChild(propCard);
                });
            }
        }
    });
}

function placeTokens() {
    players.forEach(p => {
        const c = document.getElementById(`tokens-${p.pos}`);
        if(c) {
            let t = document.getElementById(`token-p${p.id}`);
            if (!t) {
                t = document.createElement('div');
                t.id = `token-p${p.id}`;
                t.className = 'token';
                t.innerText = p.token;
            }
            if (t.parentElement !== c) {
                c.appendChild(t);
            }
        }
    });
}

function logMsg(msg, type = '') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerText = msg;
    gameLog.prepend(entry);
}

const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    if (type === 'dice') {
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'step') {
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.05);
    } else if (type === 'buy') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.setValueAtTime(660, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    }
}

function rollDice() {
    diceBtn.disabled = true;
    const d1 = document.getElementById('die1-3d');
    const d2 = document.getElementById('die2-3d');
    
    d1.classList.add('rolling');
    d2.classList.add('rolling');
    
    playSound('dice');

    setTimeout(() => {
        d1.classList.remove('rolling');
        d2.classList.remove('rolling');

        const v1 = Math.floor(Math.random() * 6) + 1;
        const v2 = Math.floor(Math.random() * 6) + 1;
        const total = v1 + v2;
        window.lastDiceTotal = total;

        const diceMap = ['⚀','⚁','⚂','⚃','⚄','⚅'];
        
        let rots = [
            'rotateX(0deg) rotateY(0deg)',      // 1 (front)
            'rotateX(-90deg) rotateY(0deg)',    // 2 (top)
            'rotateX(0deg) rotateY(-90deg)',    // 3 (right)
            'rotateX(0deg) rotateY(90deg)',     // 4 (left)
            'rotateX(90deg) rotateY(0deg)',     // 5 (bottom)
            'rotateX(180deg) rotateY(0deg)'     // 6 (back)
        ];
        
        d1.style.transform = rots[v1-1];
        d2.style.transform = rots[v2-1];

        const p = players[currentPlayerIndex];
        logMsg(`${p.name} rolled a ${total}`, 'system');

        const isDouble = (v1 === v2);
        window.currentRollIsDouble = isDouble;
        
        if (p.inJail) {
            if (isDouble) {
                logMsg(`${p.name} rolled doubles and escapes Jail!`, 'money-gained');
                p.inJail = false;
                doublesCount = 0;
                window.currentRollIsDouble = false;
                movePlayer(p, total, false);
            } else {
                p.jailTurns = (p.jailTurns || 0) + 1;
                if (p.jailTurns >= 3) {
                    logMsg(`${p.name} served their time and paid $50 to escape Jail.`, 'money-lost');
                    p.money -= 50;
                    p.inJail = false;
                    p.jailTurns = 0;
                    movePlayer(p, total, false);
                } else {
                    logMsg(`${p.name} failed to roll doubles and stays in Jail.`, 'system');
                    handleLandedSpace(p);
                }
            }
            return;
        }

        if (isDouble) {
            doublesCount++;
            if (doublesCount === 3) {
                logMsg(`${p.name} rolled doubles 3 times and is sent to jail!`, 'money-lost');
                p.pos = 10;
                p.inJail = true;
                p.jailTurns = 0;
                doublesCount = 0;
                window.currentRollIsDouble = false;
                placeTokens();
                handleLandedSpace(p); // Handle Jail directly
                return;
            } else {
                logMsg(`${p.name} rolled doubles! Roll again!`, 'system');
            }
        } else {
            doublesCount = 0;
        }

        movePlayer(p, total, isDouble);
        
    }, 1000);
}

function checkMonopoly(ownerId, propId) {
    const color = boardData[propId].color;
    if(!color) return false;
    const sameColorProps = boardData.filter(d => d.color === color && (d.type === 'property' || d.type === 'railroad' || d.type === 'utility'));
    return sameColorProps.every(p => propertiesState[p.id] && propertiesState[p.id].ownerId === ownerId);
}

function checkBankruptcy() {
    for (let i = 0; i < players.length; i++) {
        let p = players[i];
        if (p.bankrupt && p.properties.length > 0) {
            logMsg(`${p.name} has gone BANKRUPT!`, 'money-lost');
            p.bankrupt = true;
            // Free their properties
            p.properties.forEach(propId => {
                delete propertiesState[propId];
                document.getElementById(`owner-${propId}`).style.backgroundColor = "transparent";
                document.getElementById(`owner-${propId}`).style.opacity = '1';
                updateBuildings(propId);
            });
            p.properties = [];
            
            // Send loss to API if logged in user is this person
            if (p.name === localStorage.getItem('username')) {
                if (window.API) window.API.saveGameStats({ game: 'monopoly', result: 'loss', score: 0 });
            }
        }
    }
    
    // Check if only 1 active player remains
    const activePlayers = players.filter(p => !p.bankrupt);
    if (activePlayers.length === 1 && players.length > 1) {
        const winner = activePlayers[0];
        logMsg(`${winner.name} WINS THE GAME!`, 'money-gained');
        diceBtn.disabled = true;
        diceBtn.innerText = "GAME OVER";
        
        let overScreen = document.createElement('div');
        overScreen.style.position = 'fixed';
        overScreen.style.inset = '0';
        overScreen.style.backgroundColor = 'rgba(0,0,0,0.85)';
        overScreen.style.color = 'gold';
        overScreen.style.display = 'flex';
        overScreen.style.flexDirection = 'column';
        overScreen.style.alignItems = 'center';
        overScreen.style.justifyContent = 'center';
        overScreen.style.zIndex = '10000';
        overScreen.style.backdropFilter = 'blur(10px)';
        overScreen.innerHTML = `
            <h1 style="font-size: 5rem; text-shadow: 0 0 20px gold; margin-bottom: 20px; transform: scale(0.5); animation: zoomIn 0.8s forwards cubic-bezier(0.175, 0.885, 0.32, 1.275);">🏆 ${winner.name} WINS! 🏆</h1>
            <p style="font-size: 2rem; color: white;">Final Balance: $${winner.money}</p>
            <button onclick="location.reload()" style="margin-top: 30px; font-size: 1.5rem; padding: 15px 30px; background: #eab308; color: #000; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; box-shadow: 0 5px 15px rgba(0,0,0,0.5);">Play Again</button>
        `;
        document.body.appendChild(overScreen);
        
        let style = document.createElement('style');
        style.innerHTML = `@keyframes zoomIn { to { transform: scale(1); } }`;
        document.head.appendChild(style);

        setInterval(fireConfetti, 500); // Continuous confetti

        if (winner.name === localStorage.getItem('username')) {
            if (window.API) window.API.saveGameStats({ game: 'monopoly', result: 'win', score: winner.money });
        }
        return true; // Game Over
    }
    return false; // Continue
}

function fireConfetti() {
    const cc = document.getElementById('confetti-container');
    for(let i=0; i<30; i++) {
        let conf = document.createElement('div');
        conf.className = 'confetti';
        conf.style.left = Math.random() * 100 + '%';
        conf.style.animationDuration = (Math.random() * 2 + 1) + 's';
        conf.style.backgroundColor = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][Math.floor(Math.random()*5)];
        cc.appendChild(conf);
        setTimeout(() => conf.remove(), 3000);
    }
}

function movePlayer(player, steps, isDouble) {
    player.lastDouble = isDouble;
    // Animated movement instead of instant pop
    let currentStep = 0;
    let oldPos = player.pos;
    
    function step() {
        if(currentStep >= steps) {
            if (player.pos < oldPos) {
                 player.money += ruleGoBonus;
                 logMsg(`${player.name} passed GO and collected $${ruleGoBonus}!`, 'money-gained');
                 fireConfetti();
                 playSound('buy'); // Use 'buy' chime for GO
            }
            updateSidebar();
            setTimeout(() => handleLandedSpace(player), 300);
            return;
        }
        player.pos = (player.pos + 1) % 40;
        playSound('step');
        placeTokens();
        currentStep++;
        setTimeout(step, 200);
    }
    step();
}

function handleLandedSpace(player) {
    const space = boardData[player.pos];
    logMsg(`${player.name} landed on ${space.name}`);

    // Hide dice roll after landing until turn is over
    diceBtn.classList.add('hidden');

    if (space.type === 'property' || space.type === 'railroad' || space.type === 'utility') {
        if (!propertiesState[space.id]) {
            // Unowned - Trigger Modal
            document.getElementById('m-title').innerText = space.name;
            document.getElementById('m-price').innerText = `$${space.price}`;
            document.getElementById('m-rent').innerText = `$${space.rent}`;
            document.getElementById('m-owner').innerText = 'Unowned';
            
            const modal = document.getElementById('property-modal');
            const btnBuild = document.getElementById('btn-build');
            const btnMortgage = document.getElementById('btn-mortgage');
            
            btnBuild.style.display = 'block';
            btnBuild.innerText = `Buy for $${space.price}`;
            btnBuild.disabled = player.money < space.price;
            
            btnMortgage.style.display = 'block';
            btnMortgage.innerText = 'Pass / Do Not Buy';
            btnMortgage.style.background = '#cbd5e1';
            btnMortgage.style.color = '#334155';

            btnBuild.onclick = () => {
                if (player.money >= space.price) {
                    player.money -= space.price;
                    propertiesState[space.id] = { ownerId: player.id, houses: 0, mortgaged: false };
                    player.properties.push(space.id);
                    document.getElementById(`owner-${space.id}`).style.backgroundColor = getPlayerColor(player.id);
                    logMsg(`${player.name} bought ${space.name} for $${space.price}`, 'system');
                    playSound('buy');
                    modal.classList.add('hidden');
                    endTurn();
                } else {
                    alert("Not enough funds!");
                }
            };
            
            btnMortgage.onclick = () => {
                modal.classList.add('hidden');
                endTurn();
            };

            // Hide the default close button
            document.getElementById('btn-close-modal').style.display = 'none';

            modal.classList.remove('hidden');
        } else if (propertiesState[space.id].ownerId !== player.id) {
            // Owned by someone else, pay rent
            const state = propertiesState[space.id];
            
            if (state.mortgaged) {
                actionTitle.innerText = `${space.name} (Mortgaged)`;
                actionDesc.innerText = `This property is mortgaged. No rent owed!`;
                btnBuy.classList.add('hidden');
                btnPass.classList.remove('hidden');
                btnPass.onclick = endTurn;
                return;
            }

            const owner = players.find(p => p.id === state.ownerId);
            
    // Determine rent based on space type
    let r = space.rent;
    if (space.type === 'property') {
        if (state.houses > 0) {
            const multipliers = [1, 3, 8, 16, 20, 25]; // ind 0=none, 1-5=multipliers
            r *= multipliers[state.houses];
        } else if (checkMonopoly(owner.id, space.id)) {
            r *= 2; // Check Monopoly Multiplier for unupgraded properties
        }
    } else if (space.type === 'railroad') {
        const rrCount = owner.properties.filter(id => boardData[id].type === 'railroad').length;
        r = space.rent * Math.pow(2, rrCount - 1); // 25, 50, 100, 200
    } else if (space.type === 'utility') {
        const utilCount = owner.properties.filter(id => boardData[id].type === 'utility').length;
        const diceTotal = window.lastDiceTotal || 7;
        r = diceTotal * (utilCount === 2 ? 10 : 4);
    }
            
            player.money -= r;
            owner.money += r;
            logMsg(`${player.name} paid $${r} rent to ${owner.name}`, 'money-lost');
            
            // Cool Rent Animation
            try {
                const playerToken = document.getElementById("token-p" + player.id);
                const ownerToken = document.getElementById("token-p" + owner.id);
                if (playerToken && ownerToken) {
                    const rectP = playerToken.getBoundingClientRect();
                    const rectO = ownerToken.getBoundingClientRect();
                    
                    const paymentFlyer = document.createElement('div');
                    paymentFlyer.innerText = "-$" + r;
                    paymentFlyer.style.position = 'fixed';
                    paymentFlyer.style.color = '#ef4444';
                    paymentFlyer.style.fontWeight = '900';
                    paymentFlyer.style.fontSize = '2rem';
                    paymentFlyer.style.zIndex = '1000';
                    paymentFlyer.style.textShadow = '0 0 10px white, 0 0 5px black';
                    paymentFlyer.style.pointerEvents = 'none';
                    paymentFlyer.style.left = rectP.left + 'px';
                    paymentFlyer.style.top = rectP.top + 'px';
                    paymentFlyer.style.transition = 'all 1.0s cubic-bezier(0.25, 0.8, 0.25, 1)';
                    document.body.appendChild(paymentFlyer);
                    
                    setTimeout(() => {
                        paymentFlyer.style.left = rectO.left + 'px';
                        paymentFlyer.style.top = rectO.top + 'px';
                        paymentFlyer.style.color = '#10b981';
                        paymentFlyer.innerText = "+$" + r;
                        paymentFlyer.style.transform = 'scale(1.3) translateY(-20px)';
                    }, 50);
                    
                    setTimeout(() => paymentFlyer.remove(), 2200);
                }
            } catch (e) {}

            actionTitle.innerText = `${space.name}`;
            
            const buyPrice = space.price * 2;
            actionDesc.innerText = `You paid $${r} rent to ${owner.name}.\n\nYou can forcibly BUY this property for $${buyPrice}.`;
            
            btnBuy.classList.remove('hidden');
            btnBuy.innerText = `Buy ($${buyPrice})`;
            btnBuy.disabled = player.money < buyPrice;
            btnBuy.onclick = () => {
                player.money -= buyPrice;
                owner.money += buyPrice;
                propertiesState[space.id].ownerId = player.id;
                player.properties.push(space.id);
                owner.properties = owner.properties.filter(id => id !== space.id);
                document.getElementById(`owner-${space.id}`).style.backgroundColor = getPlayerColor(player.id);
                logMsg(`${player.name} forced-bought ${space.name} from ${owner.name} for $${buyPrice}!`, 'money-gained');
                btnBuy.classList.add('hidden');
                updateDashboard();
                endTurn();
            };
            
            btnPass.classList.remove('hidden');
            btnPass.onclick = endTurn;
        } else {
            // Owns it
            actionTitle.innerText = `${space.name}`;
            actionDesc.innerText = "You own this property. Click it to mortgage or build.";
            btnBuy.classList.add('hidden');
            btnPass.classList.remove('hidden');
            btnPass.onclick = endTurn;
        }
    } else if (space.type === 'tax') {
        player.money -= space.price;
        logMsg(`${player.name} paid $${space.price} in Taxes.`, 'money-lost');
        endTurn();
    } else if (space.type === 'chance' || space.type === 'chest') {
        const isChance = space.type === 'chance';
        const cardObj = isChance ? chanceCards[Math.floor(Math.random()*chanceCards.length)] : chestCards[Math.floor(Math.random()*chestCards.length)];
        const desc = cardObj.text;
        
        const modal = document.getElementById('card-modal');
        const titleEl = document.getElementById('card-title');
        const descEl = document.getElementById('card-desc');
        const flipper = document.getElementById('card-flipper');
        
        let headerColor = isChance ? '#f97316' : '#3b82f6';
        let outlineColor = isChance ? '#f59e0b' : '#2563eb';
        
        document.getElementById('card-title-back').innerText = isChance ? '?' : '★';
        document.querySelector('#card-modal .property-card-modal').style.borderColor = outlineColor;
        
        modal.classList.remove('hidden');
        flipper.classList.remove('flipped'); // Reset card un-flipped initially
        
        setTimeout(() => {
            titleEl.innerText = space.name;
            titleEl.style.color = headerColor;
            descEl.innerText = desc;
            flipper.classList.add('flipped'); // Flip card dynamically
            
            // Allow closing after a short delay so the flip animation completes before they spam click
            setTimeout(() => {
                const okBtn = modal.querySelector('.close-modal');
                okBtn.style.display = 'block';
                okBtn.onclick = () => {
                    modal.classList.add('hidden');
                    cardObj.action(player);
                };
            }, 800);
        }, 500);

        logMsg(`${player.name} drew a ${space.type} card!`, 'system');
        
        // Hide button initially while flip occurs
        const okBtn = modal.querySelector('.close-modal');
        okBtn.style.display = 'none';
        
        // Modal button handles action and turn logic...
    } else if (space.type === 'goto-jail') {
        actionTitle.innerText = "Busted!";
        actionDesc.innerText = "You have to go directly to Jail!";
        btnBuy.classList.add('hidden');
        btnPass.classList.remove('hidden');
        btnPass.innerText = "Go to Jail";
        btnPass.onclick = () => {
            player.pos = 10;
            player.inJail = true;
            player.jailTurns = 0;
            placeTokens();
            playSound('dice'); // Thud sound
            btnPass.innerText = "End Turn";
            endTurn();
        };
    } else {
        // Go, Jail, Free Parking
        if(player.inJail && space.id === 10) {
             actionTitle.innerText = "In Jail";
             actionDesc.innerText = "You are locked up. Next turn, roll doubles to escape or pay a $50 fine.";
        } else {
             actionTitle.innerText = space.name;
             actionDesc.innerText = "Nothing happens... yet.";
        }
        btnBuy.classList.add('hidden');
        btnPass.classList.remove('hidden');
        btnPass.innerText = "End Turn";
        btnPass.onclick = endTurn;
    }
    
    updateSidebar();
}

function endTurn() {
    let cp = players[currentPlayerIndex];
    if (cp.money < 0 && !cp.bankrupt) {
        actionTitle.innerText = "In Debt!";
        actionDesc.innerText = "Mortgage property or sell houses to raise funds. Click below if you cannot pay.";
        btnBuy.classList.add('hidden');
        btnPass.classList.remove('hidden');
        btnPass.innerText = "Declare Bankruptcy";
        btnPass.onclick = () => {
            cp.bankrupt = true;
            logMsg(`${cp.name} has declared BANKRUPTCY!`, 'money-lost');
            // Free their properties immediately
            cp.properties.forEach(propId => {
                delete propertiesState[propId];
                const ownerEl = document.getElementById(`owner-${propId}`);
                if(ownerEl) {
                    ownerEl.style.backgroundColor = "transparent";
                    ownerEl.style.opacity = '1';
                }
                updateBuildings(propId);
            });
            cp.properties = [];
            checkBankruptcy(); // evaluate win cond
            endTurn();
        };
        diceBtn.classList.add('hidden');
        return; // Prevent passing
    }

    if (checkBankruptcy()) return; // Stop if game is over

    // Hide the buy/pass buttons, show the dice roll UI
    btnBuy.classList.add('hidden');
    btnPass.classList.add('hidden');
    diceBtn.classList.remove('hidden');
    
    let p = players[currentPlayerIndex];
    let rollAgain = window.currentRollIsDouble && p.pos !== 10 && !p.inJail;
    
    if (!rollAgain) {
        do {
            currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
        } while (players[currentPlayerIndex].bankrupt);
        doublesCount = 0;
        window.currentRollIsDouble = false;
        
        actionTitle.innerText = "Action Required";
        actionDesc.innerText = `Roll the dice to start your turn, ${players[currentPlayerIndex].name}.`;
        logMsg(`--- ${players[currentPlayerIndex].name}'s Turn ---`, 'system');
    } else {
        actionTitle.innerText = "Roll Again!";
        actionDesc.innerText = `You rolled doubles! Roll again, ${p.name}.`;
    }
    
    diceBtn.disabled = false;
    updateSidebar();
    saveGameState();
}

function playerColors() {
    return ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];
}

function getPlayerColor(id) {
    return playerColors()[id - 1] || '#94a3b8'; 
}

function showPropertyInfo(id) {
    const space = boardData[id];
    if (space.type !== 'property' && space.type !== 'railroad' && space.type !== 'utility') return;
    
    document.getElementById('m-title').innerText = space.name;
    document.getElementById('m-price').innerText = `$${space.price}`;
    
    const header = document.getElementById('modal-header');
    const deedTitle = document.getElementById('m-deed-title');
    if (space.color && space.type === 'property') {
        header.style.backgroundColor = space.color;
        
        let rgb = hexToRgb(space.color);
        let luminance = rgb ? (0.299*rgb.r + 0.587*rgb.g + 0.114*rgb.b) : 255;
        header.style.color = luminance < 128 ? '#fff' : '#000';
        deedTitle.style.display = 'block';
    } else {
        header.style.backgroundColor = '#fff';
        header.style.color = '#000';
        deedTitle.style.display = 'none';
        if (space.icon) {
            document.getElementById('m-title').innerHTML = `${space.icon} ${space.name}`;
        }
    }
    
    let state = propertiesState[id];
    let r = space.rent;
    if (state && state.houses > 0) {
        const multipliers = [1, 3, 8, 16, 20, 25];
        r *= multipliers[state.houses];
    } else if (state && checkMonopoly(state.ownerId, id)) {
        r *= 2;
    }
    
    let rentStr = space.type === 'utility' ? '4x/10x Dice' : `$${r}`;
    document.getElementById('m-rent').innerText = `${rentStr} ${state && state.houses > 0 ? '(Upgraded)' : ''} ${state && state.mortgaged ? '[MORTGAGED]' : ''}`;
    
    let hCost = space.price <= 120 ? 50 : (space.price <= 200 ? 100 : (space.price <= 280 ? 150 : 200));
    if (space.type === 'property') {
        document.getElementById('m-house-cost-row').style.display = 'block';
        document.getElementById('m-house-cost').innerText = `$${hCost}`;
    } else {
        document.getElementById('m-house-cost-row').style.display = 'none';
    }
    
    document.getElementById('m-owner').innerText = state ? players.find(p=>p.id===state.ownerId).name : 'None';
    
    const btnBuild = document.getElementById('btn-build');
    const btnMortgage = document.getElementById('btn-mortgage');
    
    // Reset to default
    document.getElementById('btn-close-modal').style.display = 'block';
    
    if (state && space.type === 'property' && players[currentPlayerIndex].id === state.ownerId && diceBtn.classList.contains('hidden')) {
        let hasMonopoly = true; // Relaxed so you don't need all colors to build
        
        btnBuild.style.display = 'block';
        if (state.mortgaged) {
            btnBuild.style.display = 'none';
        } else {
            btnBuild.innerText = !hasMonopoly ? `Need Monopoly to Build` : (state.houses < 4 ? `Buy House ($${hCost})` : (state.houses === 4 ? `Buy Hotel ($${hCost})` : `Max Upgraded`));
            btnBuild.disabled = state.houses >= 5 || !hasMonopoly;
            btnBuild.onclick = () => {
                if (players[currentPlayerIndex].money >= hCost && state.houses < 5 && hasMonopoly) {
                    players[currentPlayerIndex].money -= hCost;
                    state.houses += 1;
                    updateBuildings(id);
                    updateSidebar();
                    logMsg(`${players[currentPlayerIndex].name} built on ${space.name}`, 'system');
                    showPropertyInfo(id); // refresh modal
                } else if (!hasMonopoly) {
                    alert("You need all properties of this color to build!");
                } else {
                    alert("Cannot build! Check balance.");
                }
            };
        }
        
        btnMortgage.style.display = 'block';
        btnMortgage.style.background = '#f59e0b'; // Reset in case it was 'pass' previously
        btnMortgage.style.color = 'white';
        if (state.mortgaged) {
            let unmortgageCost = Math.floor((space.price / 2) * 1.1);
            btnMortgage.innerText = `Unmortgage ($${unmortgageCost})`;
            btnMortgage.onclick = () => {
                if (state.houses > 0) {
                    alert("Sell houses before unmortgaging!"); // Normally impossible, but safety first
                } else if (players[currentPlayerIndex].money >= unmortgageCost) {
                    players[currentPlayerIndex].money -= unmortgageCost;
                    state.mortgaged = false;
                    document.getElementById(`owner-${space.id}`).style.opacity = '1';
                    logMsg(`${players[currentPlayerIndex].name} unmortgaged ${space.name}`, 'system');
                    updateSidebar();
                    showPropertyInfo(id);
                } else {
                    alert("Not enough funds to unmortgage!");
                }
            };
        } else {
            let mortgageValue = Math.floor(space.price / 2);
            btnMortgage.innerText = `Mortgage (+$${mortgageValue})`;
            btnMortgage.onclick = () => {
                if (state.houses > 0) {
                    alert("Sell houses before mortgaging!");
                } else {
                    players[currentPlayerIndex].money += mortgageValue;
                    state.mortgaged = true;
                    document.getElementById(`owner-${space.id}`).style.opacity = '0.5';
                    logMsg(`${players[currentPlayerIndex].name} mortgaged ${space.name}`, 'system');
                    updateSidebar();
                    showPropertyInfo(id);
                }
            };
        }
    } else {
        btnBuild.style.display = 'none';
        btnMortgage.style.display = 'none';
    }
    
    modalOverlay.classList.remove('hidden');
}

function updateBuildings(id) {
    const state = propertiesState[id];
    const bContainer = document.getElementById(`buildings-${id}`);
    bContainer.innerHTML = '';
    if(!state) return;
    
    if(state.houses === 5) {
        bContainer.innerHTML = '<div class="hotel"></div>';
    } else {
        for(let i=0; i<state.houses; i++) {
            bContainer.innerHTML += '<div class="house"></div>';
        }
    }
}

btnCloseModal.onclick = () => modalOverlay.classList.add('hidden');
diceBtn.onclick = rollDice;

// Lobby logic replaces manual initBoard calls on page load.
document.getElementById('setup-lobby').classList.remove('hidden');

// Auto fetch username if logged in
fetch('/api/user')
    .then(res => res.json())
    .then(data => {
        if(data && data.success && data.user) {
            document.getElementById('nav-username').innerHTML = `<i class="fas fa-user-circle"></i> ${data.user.username}`;
            document.getElementById('p1-name').value = data.user.username;
        }
    })
    .catch(console.warn);

function hexToRgb(hex) {
    if (!hex) return null;
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
}

function saveGameState() {
    const state = {
        players, currentPlayerIndex, propertiesState, doublesCount
    };
    localStorage.setItem('monopoly_save', JSON.stringify(state));
}

function loadGameState() {
    const saved = localStorage.getItem('monopoly_save');
    if (saved === null) return false;
    try {
        const state = JSON.parse(saved);
        if (state.players == null || state.players.length === 0) return false;
        
        players = state.players;
        currentPlayerIndex = state.currentPlayerIndex;
        propertiesState = state.propertiesState;
        doublesCount = state.doublesCount || 0;
        
        document.getElementById('setup-lobby').classList.add('hidden');
        initBoard();
        
        for (let p in propertiesState) {
            updateBuildings(p);
            const owner = propertiesState[p].ownerId;
            document.getElementById(`owner-${p}`).style.backgroundColor = getPlayerColor(owner);
        }
        
        actionTitle.innerText = "Action Required";
        actionDesc.innerText = `Roll the dice to start your turn, ${players[currentPlayerIndex].name}.`;
        
        logMsg('--- Game Resumed ---', 'system');
        return true;
    } catch(e) {
        return false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if(loadGameState() === false) {
        document.getElementById('setup-lobby').classList.remove('hidden');
    }
});

document.querySelectorAll('.close-modal').forEach(btn => {
    if (btn.innerText === 'OK') {
        btn.addEventListener('click', closeCardModal);
    }
});
