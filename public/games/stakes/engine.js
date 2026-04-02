let activeGame = 'mines';
let balance = 1000.00;
let isPlaying = false;
let currentBet = 10.00;
const currentUser = localStorage.getItem('username');

// Game State
let minesState = { grid: [], safeCount: 0, currentMultiplier: 1.0, maxMines: 3 };
let crashState = { multiplier: 1.0, crashed: false, interval: null, canvas: null };

document.addEventListener('DOMContentLoaded', () => {
    if (currentUser) {
        fetch(`/api/stakes/balance?username=${currentUser}`)
            .then(res => res.json())
            .then(data => {
                if (data.tokens !== undefined) balance = data.tokens;
                updateBalanceDisplay();
            })
            .catch(e => console.error(e));
    } else {
        const stored = localStorage.getItem('stakesBalance');
        if (stored) balance = parseFloat(stored);
        updateBalanceDisplay();
    }
    renderGame(activeGame);
});

function updateBalance(amount) {
    if (currentUser) {
        fetch('/api/stakes/update', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username: currentUser, amount: amount})
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                balance = data.tokens;
                updateBalanceDisplay();
            }
        });
    } else {
        balance += amount;
        localStorage.setItem('stakesBalance', balance.toFixed(2));
        updateBalanceDisplay();
    }
}

function updateBalanceDisplay() {
    document.getElementById('token-balance').innerText = balance.toFixed(2);
}

function addToLedger(game, bet, multiplier, payout) {
    const tbody = document.getElementById('ledger-body');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><i class="bi bi-${game === 'mines' ? 'grid-3x3-gap-fill' : game === 'dice' ? 'dice-5-fill' : game === 'crash' ? 'graph-up-arrow' : 'triangle'}"></i> ${game.toUpperCase()}</td>
        <td style="color:#aaa;">$${bet.toFixed(2)}</td>
        <td class="${multiplier > 1.0 ? 'win-text' : 'lose-text'}">${multiplier.toFixed(2)}x</td>
        <td class="${payout >= bet ? 'win-text' : 'lose-text'} font-weight-bold">${payout >= bet ? '+' : ''}$${payout.toFixed(2)}</td>
    `;
    tbody.prepend(tr);
    if (tbody.children.length > 20) tbody.removeChild(tbody.lastChild);
}

function updateBetInput(val) {
    if (isPlaying) return;
    const input = document.getElementById('betAmount');
    if (val === 'half') currentBet = Math.max(1, currentBet / 2);
    else if (val === 'double') currentBet = Math.min(balance, currentBet * 2);
    else if (val === 'max') currentBet = balance;
    input.value = currentBet.toFixed(2);
}

window.switchGame = function(game) {
    if (isPlaying) {
        alert("Cannot switch games while a bet is active!");
        return;
    }
    
    activeGame = game;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelector(`.nav-item[onclick="switchGame('${game}')"]`).classList.add('active');
    
    renderGame(game);
}

function renderGame(game) {
    const controls = document.getElementById('controls-panel');
    const screen = document.getElementById('game-panel');
    controls.innerHTML = '';
    screen.innerHTML = '';

    // Common Bet Input
    controls.innerHTML += `
        <div class="input-group">
            <label>Bet Amount</label>
            <div class="bet-input-wrapper">
                <i class="bi bi-currency-dollar"></i>
                <input type="number" id="betAmount" value="${currentBet.toFixed(2)}" step="1.00" onchange="currentBet=parseFloat(this.value)">
                <button class="btn-inline" onclick="updateBetInput('half')">1/2</button>
                <button class="btn-inline" onclick="updateBetInput('double')">x2</button>
                <button class="btn-inline" onclick="updateBetInput('max')" style="border-radius: 0 8px 8px 0;">MAX</button>
            </div>
        </div>
    `;

    if (game === 'mines') renderMines(controls, screen);
    else if (game === 'dice') renderDice(controls, screen);
    else if (game === 'crash') renderCrash(controls, screen);
    else if (game === 'plinko') renderPlinko(controls, screen);
}

// ----------------------- MINES -----------------------
function renderMines(controls, screen) {
    controls.innerHTML += `
        <div class="input-group" style="margin-top: 15px;">
            <label>Mines Count</label>
            <div class="bet-input-wrapper" style="border: 1px solid rgba(255,255,255,0.1); background:rgba(0,0,0,0.5);">
                <i class="bi bi-bomb"></i>
                <select id="minesCount" style="width:100%; background:transparent; color:#fff; border:none; padding:12px; outline:none; cursor:pointer;" ${isPlaying ? 'disabled' : ''}>
                    <option value="1">1 Mine</option>
                    <option value="3" selected>3 Mines</option>
                    <option value="5">5 Mines</option>
                    <option value="10">10 Mines</option>
                    <option value="20">20 Mines</option>
                    <option value="24">24 Mines</option>
                </select>
            </div>
        </div>
        <button class="action-btn" id="minesBtn" onclick="toggleMines()" style="margin-top:auto;">Bet</button>
    `;

    screen.innerHTML = `<div class="mines-grid" id="mines-grid"></div>`;
    drawMinesGrid();
}

function drawMinesGrid() {
    const grid = document.getElementById('mines-grid');
    grid.innerHTML = '';
    for (let i = 0; i < 25; i++) {
        const div = document.createElement('div');
        div.className = 'mine-tile';
        div.onclick = () => revealMine(i);
        grid.appendChild(div);
    }
}

function toggleMines() {
    const btn = document.getElementById('minesBtn');
    if (!isPlaying) {
        if (balance < currentBet) { alert("Insufficient funds!"); return; }
        isPlaying = true;
        updateBalance(-currentBet);
        minesState.maxMines = parseInt(document.getElementById('minesCount').value);
        minesState.safeCount = 0;
        minesState.currentMultiplier = 1.0;
        
        // Generate backend logic safely
        minesState.grid = Array(25).fill('safe');
        let m = minesState.maxMines;
        while(m > 0) {
            let r = Math.floor(Math.random() * 25);
            if(minesState.grid[r] === 'safe') {
                minesState.grid[r] = 'bomb';
                m--;
            }
        }
        
        drawMinesGrid();
        btn.textContent = 'Cash Out (1.00x)';
        document.getElementById('minesCount').disabled = true;
        document.getElementById('betAmount').disabled = true;
    } else {
        // Cash out
        const payout = currentBet * minesState.currentMultiplier;
        updateBalance(payout);
        addToLedger('mines', currentBet, minesState.currentMultiplier, payout);
        isPlaying = false;
        btn.textContent = 'Bet';
        document.getElementById('minesCount').disabled = false;
        document.getElementById('betAmount').disabled = false;
        drawMinesGrid(); // simple reset, ideally show all
    }
}

function revealMine(index) {
    if (!isPlaying) return;
    const tile = document.getElementById('mines-grid').children[index];
    if (tile.classList.contains('revealed')) return;

    if (minesState.grid[index] === 'bomb') {
        // Lose
        tile.classList.add('revealed', 'bomb');
        tile.innerHTML = '<i class="bi bi-x-circle-fill" style="color:#ff3232; font-size:2rem; text-shadow:0 0 10px red;"></i>';
        
        addToLedger('mines', currentBet, 0, 0);
        isPlaying = false;
        document.getElementById('minesBtn').textContent = 'Bet';
        document.getElementById('minesCount').disabled = false;
        document.getElementById('betAmount').disabled = false;
        
        // Reveal all
        Array.from(document.getElementById('mines-grid').children).forEach((t, i) => {
            if (minesState.grid[i] === 'bomb') {
                t.classList.add('revealed');
                t.innerHTML = '<i class="bi bi-x-circle-fill" style="color:#ff3232; font-size:1rem; opacity:0.5;"></i>';
            }
        });
    } else {
        // Safe
        minesState.safeCount++;
        tile.classList.add('revealed', 'safe');
        tile.innerHTML = '<i class="bi bi-gem" style="color:#00E676;"></i>';
        
        // Simple multiplier calc based on combinatorial probability
        const totalSafe = 25 - minesState.maxMines;
        const mult = 1 + (minesState.safeCount * 0.1) * (minesState.maxMines * 0.2);
        minesState.currentMultiplier = mult;
        
        document.getElementById('minesBtn').textContent = `Cash Out (${mult.toFixed(2)}x)`;
    }
}

// ----------------------- DICE -----------------------
function renderDice(controls, screen) {
    controls.innerHTML += `
        <div class="input-group" style="margin-top: 15px;">
            <label>Roll Under</label>
            <div class="bet-input-wrapper">
                <i class="bi bi-dice-3"></i>
                <input type="number" id="diceTarget" value="50.00" step="1.00" style="font-size:1.5rem; text-align:center;">
            </div>
        </div>
        <button class="action-btn" id="diceBtn" onclick="rollDice()" style="margin-top:auto;">Roll Dice</button>
    `;

    screen.innerHTML = `
        <div class="dice-slider">
            <div class="dice-number" id="diceResult">50.00</div>
            <div style="color:#aaa;">Multipler: <span id="diceMult" style="color:#fff; font-weight:bold;">1.98x</span></div>
        </div>
    `;
    
    document.getElementById('diceTarget').addEventListener('input', (e) => {
        let val = parseFloat(e.target.value);
        if (val < 1) val = 1; if (val > 98) val = 98;
        const mult = 99 / val;
        document.getElementById('diceMult').innerText = mult.toFixed(2) + 'x';
    });
}

function rollDice() {
    if (isPlaying) return;
    if (balance < currentBet) { alert("Insufficient funds!"); return; }
    isPlaying = true;
    updateBalance(-currentBet);
    
    const target = parseFloat(document.getElementById('diceTarget').value);
    const btn = document.getElementById('diceBtn');
    btn.disabled = true;
    btn.textContent = 'Rolling...';
    
    let rolls = 0;
    const interval = setInterval(() => {
        document.getElementById('diceResult').innerText = (Math.random() * 100).toFixed(2);
        rolls++;
        if (rolls > 15) {
            clearInterval(interval);
            const finalRoll = (Math.random() * 100).toFixed(2);
            const resEl = document.getElementById('diceResult');
            resEl.innerText = finalRoll;
            
            const mult = 99 / target;
            if (parseFloat(finalRoll) < target) {
                // Win
                resEl.style.color = '#00E676';
                resEl.style.textShadow = '0 0 20px rgba(0,230,118,0.5)';
                const payout = currentBet * mult;
                updateBalance(payout);
                addToLedger('dice', currentBet, mult, payout);
            } else {
                // Lose
                resEl.style.color = '#FF3232';
                resEl.style.textShadow = '0 0 20px rgba(255,50,50,0.5)';
                addToLedger('dice', currentBet, 0, 0);
            }
            
            isPlaying = false;
            btn.disabled = false;
            btn.textContent = 'Roll Dice';
        }
    }, 50);
}

// ----------------------- CRASH -----------------------
function renderCrash(controls, screen) {
    controls.innerHTML += `
        <div class="input-group" style="margin-top: 15px;">
            <label>Auto Cashout</label>
            <div class="bet-input-wrapper">
                <i class="bi bi-box-arrow-up"></i>
                <input type="number" id="crashAuto" value="2.00" step="0.10">
            </div>
        </div>
        <button class="action-btn" id="crashBtn" onclick="toggleCrash()" style="margin-top:auto;">Bet (Next Round)</button>
    `;

    screen.innerHTML = `
        <div class="crash-graph">
            <canvas id="crash-canvas" class="temp-canvas"></canvas>
            <div class="crash-multiplier" id="crashMult">1.00x</div>
        </div>
    `;
    crashState.canvas = document.getElementById('crash-canvas');
}

function toggleCrash() {
    const btn = document.getElementById('crashBtn');
    if (!isPlaying) {
        if (balance < currentBet) { alert("Insufficient funds!"); return; }
        isPlaying = true;
        updateBalance(-currentBet);
        crashState.multiplier = 1.00;
        crashState.crashed = false;
        
        // Setup crash point
        const e = 2 ** 32;
        const h = crypto.getRandomValues(new Uint32Array(1))[0];
        let crashPoint = Math.max(1.00, (100 * e - h) / (e - h) / 100);
        if (Math.random() < 0.05) crashPoint = 1.00; // instant crash house edge
        
        const autoOut = parseFloat(document.getElementById('crashAuto').value) || 9999;
        
        btn.textContent = 'Cash Out';
        const multEl = document.getElementById('crashMult');
        multEl.style.color = '#fff';
        
        let t = 0;
        crashState.interval = setInterval(() => {
            t += 0.1;
            crashState.multiplier = Math.pow(1.05, t);
            
            if (crashState.multiplier >= autoOut && !crashState.crashed) {
                // Auto win
                crashState.crashed = true;
                clearInterval(crashState.interval);
                btn.textContent = 'Waiting...';
                const payout = currentBet * autoOut;
                updateBalance(payout);
                addToLedger('crash', currentBet, autoOut, payout);
            }
            
            if (crashState.multiplier >= crashPoint) {
                // Crash
                crashState.multiplier = crashPoint;
                crashState.crashed = true;
                clearInterval(crashState.interval);
                multEl.style.color = '#ff3232';
                multEl.innerText = `Busted @ ${crashState.multiplier.toFixed(2)}x`;
                if (!autoOut || crashPoint < autoOut) addToLedger('crash', currentBet, 0, 0); // only log loss if auto didnt trigger first
                
                isPlaying = false;
                btn.textContent = 'Bet (Next Round)';
            } else {
                multEl.innerText = crashState.multiplier.toFixed(2) + 'x';
            }
        }, 50);

    } else {
        // Manual Cash out
        if (crashState.crashed) return;
        const curMult = crashState.multiplier;
        const payout = currentBet * curMult;
        updateBalance(payout);
        addToLedger('crash', currentBet, curMult, payout);
        
        // Wait till it visually crashes
        btn.textContent = 'Cashed Out!';
        btn.disabled = true;
        setTimeout(() => btn.disabled = false, 1000); // let interval keep running for visuals
    }
}

// ----------------------- PLINKO -----------------------
function renderPlinko(controls, screen) {
    controls.innerHTML += `
        <div class="input-group" style="margin-top: 15px;">
            <label>Risk Level</label>
            <select style="background:rgba(0,0,0,0.5); color:#fff; border:1px solid rgba(255,255,255,0.1); padding:12px; border-radius:8px;">
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
            </select>
        </div>
        <button class="action-btn" id="plinkoBtn" onclick="dropPlinko()" style="margin-top:auto;">Drop Ball</button>
    `;

    screen.innerHTML = `
        <div style="color:#aaa; font-size:1.5rem; display:flex; flex-direction:column; align-items:center;">
             <i class="bi bi-triangle-fill" style="color:#00E676; font-size:5rem; margin-bottom: 20px;"></i>
             <span>Plinko Canvas Initializing...</span>
        </div>
    `;
}

function dropPlinko() {
    if (balance < currentBet) { alert("Insufficient funds!"); return; }
    updateBalance(-currentBet);
    
    // Simulate drop visual latency
    const btn = document.getElementById('plinkoBtn');
    btn.disabled = true;
    
    setTimeout(() => {
        // Basic probability distribution (binomial)
        const slots = [0.2, 0.5, 1, 2, 10, 50];
        // weighted slightly to middle
        const w = Math.random();
        let hit = 0.2;
        if (w > 0.8) hit = 0.5;
        if (w > 0.95) hit = 1;
        if (w > 0.98) hit = 2;
        if (w > 0.995) hit = 10;
        if (w > 0.999) hit = 50;
        
        const payout = currentBet * hit;
        updateBalance(payout);
        addToLedger('plinko', currentBet, hit, payout);
        btn.disabled = false;
    }, 1500);
}
