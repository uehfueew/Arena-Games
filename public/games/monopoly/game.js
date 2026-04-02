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
const chanceCards = ["Advance to Go (Collect $200)", "Go to Jail", "Bank pays you dividend of $50", "Advance to Illinois Ave", "Pay poor tax of $15"];
const chestCards = ["Life insurance matures - Collect $100", "Doctor's fees - Pay $50", "Holiday Fund matures - Receive $100", "Hospital Fees - Pay $100"];

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
    logMsg(`--- ${players[currentPlayerIndex].name}'s Turn ---`, 'system');
}

function initBoard() {
    boardData.forEach((space, index) => {
        const spaceEl = document.createElement('div');
        spaceEl.className = space.class;
        spaceEl.id = `space-${index}`;
        
        let html = '';
        if (space.color) {
            html += `<div class="color-bar" style="background-color: ${space.color}"></div>`;
        }
        html += `<div class="space-name">${space.name}</div>`;
        if (space.price > 0 && space.type === 'property' || space.type === 'railroad' || space.type === 'utility') {
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
                p.properties.forEach(propId => {
                    const space = boardData[propId];
                    const state = propertiesState[propId];
                    const propCard = document.createElement('div');
                    propCard.style = `border: 1px solid rgba(0,0,0,0.1); border-radius: 4px; padding: 5px; display:flex; justify-content: space-between; font-size: 0.85rem; font-weight: 700; ${state.mortgaged ? 'opacity: 0.6;' : ''}`;
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

        let isDouble = (v1 === v2);
        
        if (isDouble) {
            doublesCount++;
            if (doublesCount === 3) {
                logMsg(`${p.name} rolled doubles 3 times and is sent to jail!`, 'money-lost');
                p.pos = 10;
                doublesCount = 0;
                placeTokens();
                handleLandedSpace(p); // Handle Jail directly
                return;
            } else {
                logMsg(`${p.name} rolled doubles! Roll again!`, 'system');
            }
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
        if (p.money < 0 && !p.bankrupt) {
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
            
    // Rent multiplier for houses: Base logic to eliminate repetitive ifs
    let r = space.rent;
    if (state.houses > 0) {
        const multipliers = [1, 3, 8, 16, 20, 25]; // index 0 is 0 houses (handled), 1-5 are multipliers
        r *= multipliers[state.houses];
    } else if (checkMonopoly(owner.id, space.id)) {
        r *= 2; // Check Monopoly Multiplier for unupgraded properties
    }
            
            player.money -= r;
            owner.money += r;
            logMsg(`${player.name} paid $${r} rent to ${owner.name}`, 'money-lost');
            endTurn();
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
        const desc = isChance ? chanceCards[Math.floor(Math.random()*chanceCards.length)] : chestCards[Math.floor(Math.random()*chestCards.length)];
        
        const modal = document.getElementById('card-modal');
        const titleEl = document.getElementById('card-title');
        const descEl = document.getElementById('card-desc');
        const flipper = document.getElementById('card-flipper');
        
        document.getElementById('card-title-back').innerText = isChance ? '?' : '★';
        
        modal.classList.remove('hidden');
        flipper.classList.remove('flipped'); // Reset card un-flipped initially
        
        setTimeout(() => {
            titleEl.innerText = space.type.toUpperCase();
            titleEl.style.color = isChance ? '#f97316' : '#3b82f6';
            descEl.innerText = desc;
            flipper.classList.add('flipped'); // Flip card dynamically
            
            // Allow closing after a short delay so the flip animation completes before they spam click
            setTimeout(() => {
                const okBtn = modal.querySelector('.close-modal');
                okBtn.style.display = 'block';
            }, 800);
        }, 500);

        logMsg(`${player.name} drew a ${space.type} card!`, 'system');
        
        // Hide button initially while flip occurs
        const okBtn = modal.querySelector('.close-modal');
        okBtn.style.display = 'none';
        
        // Modal button will handle endTurn...
    } else {
        // Go, Jail, Free Parking
        actionTitle.innerText = space.name;
        actionDesc.innerText = "Nothing happens... yet.";
        btnBuy.classList.add('hidden');
        btnPass.classList.remove('hidden');
        btnPass.onclick = endTurn;
    }
    
    updateSidebar();
}

function endTurn() {
    if (checkBankruptcy()) return; // Stop if game is over

    // Hide the buy/pass buttons, show the dice roll UI
    btnBuy.classList.add('hidden');
    btnPass.classList.add('hidden');
    diceBtn.classList.remove('hidden');
    
    // Find next active player
    do {
        currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    } while (players[currentPlayerIndex].bankrupt);
    
    diceBtn.disabled = false;
    
    actionTitle.innerText = "Action Required";
    actionDesc.innerText = `Roll the dice to start your turn, ${players[currentPlayerIndex].name}.`;
    
    updateSidebar();
    logMsg(`--- ${players[currentPlayerIndex].name}'s Turn ---`, 'system');
}

function playerColors() {
    return ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];
}

function getPlayerColor(id) {
    return playerColors()[id - 1] || '#94a3b8'; 
}

function closeCardModal() {
    document.getElementById('card-modal').classList.add('hidden');
    endTurn(); // close dialog, proceed to next player
}

function showPropertyInfo(id) {
    const space = boardData[id];
    if (space.type !== 'property' && space.type !== 'railroad' && space.type !== 'utility') return;
    
    document.getElementById('m-title').innerText = space.name;
    document.getElementById('m-price').innerText = `$${space.price}`;
    
    let state = propertiesState[id];
    let r = space.rent;
    if (state && state.houses > 0) {
        const multipliers = [1, 3, 8, 16, 20, 25];
        r *= multipliers[state.houses];
    } else if (state && checkMonopoly(state.ownerId, id)) {
        r *= 2;
    }
    
    document.getElementById('m-rent').innerText = `$${r} ${state && state.houses > 0 ? '(Upgraded)' : ''} ${state && state.mortgaged ? '[MORTGAGED]' : ''}`;
    document.getElementById('m-owner').innerText = state ? players.find(p=>p.id===state.ownerId).name : 'None';
    
    const btnBuild = document.getElementById('btn-build');
    const btnMortgage = document.getElementById('btn-mortgage');
    
    // Reset to default
    document.getElementById('btn-close-modal').style.display = 'block';
    
    if (state && space.type === 'property' && players[currentPlayerIndex].id === state.ownerId && diceBtn.classList.contains('hidden')) {
        let hasMonopoly = checkMonopoly(players[currentPlayerIndex].id, id);
        
        btnBuild.style.display = 'block';
        if (state.mortgaged) {
            btnBuild.style.display = 'none';
        } else {
            btnBuild.innerText = !hasMonopoly ? `Need Monopoly to Build` : (state.houses < 4 ? `Buy House ($50)` : (state.houses === 4 ? `Buy Hotel ($50)` : `Max Upgraded`));
            btnBuild.disabled = state.houses >= 5 || !hasMonopoly;
            btnBuild.onclick = () => {
                if (players[currentPlayerIndex].money >= 50 && state.houses < 5 && hasMonopoly) {
                    players[currentPlayerIndex].money -= 50;
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
