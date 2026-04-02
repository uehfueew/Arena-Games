let activeGame = 'mines';
let balance = 1000.00;
let isPlaying = false;
let currentBet = 10.00;
const currentUser = localStorage.getItem('username');

// Game States
let minesState = { grid: [], safeCount: 0, currentMultiplier: 1.0, maxMines: 3 };
let diceState = { condition: 'under', speed: 'fast', targetMult: 2.00, winChance: 49.50 };
let crashState = { multiplier: 1.0, crashed: false, interval: null };

document.addEventListener('DOMContentLoaded', () => {
    fetchLedger();
    setInterval(fetchLedger, 3000);
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

function fetchLedger() {
    fetch('/api/stakes/ledger')
        .then(res => res.json())
        .then(data => {
            const tbody = document.getElementById('ledger-body');
            tbody.innerHTML = '';
            if (!data.ledger) return;
            data.ledger.forEach(entry => {
                const tr = document.createElement('tr');
                const isWin = entry.payout > 0;
                let multiplier = entry.multiplier;
                if (typeof multiplier !== 'number') multiplier = parseFloat(multiplier);
                tr.innerHTML = `
                    <td style="color:#fff;">${entry.username}</td>
                    <td><i class="bi bi-${entry.game === 'mines' ? 'grid-3x3-gap-fill' : entry.game === 'dice' ? 'dice-5-fill' : entry.game === 'crash' ? 'graph-up-arrow' : 'triangle'}"></i> ${entry.game.toUpperCase()}</td>
                    <td style="color:#aaa;">$${entry.bet.toFixed(2)}</td>
                    <td class="${isWin ? 'win-text' : 'lose-text'}">${multiplier.toFixed(2)}x</td>
                    <td class="${isWin ? 'win-text' : 'lose-text'}">${isWin ? '+' : '-'}$${isWin ? (entry.payout - entry.bet).toFixed(2) : entry.bet.toFixed(2)}</td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(err => console.error(err));
}

function addToLedger(game, bet, multiplier, payout) {
    const isWin = payout > 0;
    
    // Optimistic UI update
    const tbody = document.getElementById('ledger-body');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td style="color:#fff;">${currentUser || 'Guest'}</td>
        <td><i class="bi bi-${game === 'mines' ? 'grid-3x3-gap-fill' : game === 'dice' ? 'dice-5-fill' : game === 'crash' ? 'graph-up-arrow' : 'triangle'}"></i> ${game.toUpperCase()}</td>
        <td style="color:#aaa;">$${bet.toFixed(2)}</td>
        <td class="${isWin ? 'win-text' : 'lose-text'}">${multiplier.toFixed(2)}x</td>
        <td class="${isWin ? 'win-text' : 'lose-text'}">${isWin ? '+' : '-'}$${isWin ? (payout - bet).toFixed(2) : bet.toFixed(2)}</td>
    `;
    tbody.prepend(tr);
    if (tbody.children.length > 100) tbody.removeChild(tbody.lastChild);

    // Post to backend
    fetch('/api/stakes/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: currentUser || 'Guest',
            game: game,
            bet: bet,
            multiplier: multiplier,
            payout: payout
        })
    }).catch(err => console.error(err));
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

// ======================= MINES =======================
function getMinesMultiplier(minesCount, safeClicks) {
    if (safeClicks === 0) return 1.00;
    let n = 25;
    let x = 25 - minesCount;
    let probability = 1.0;
    for (let i = 0; i < safeClicks; i++) {
        probability *= (x - i) / (n - i);
    }
    return (1 / probability) * 0.99; // 1% house edge
}

function setMinesPreset(val) {
    if(isPlaying) return;
    document.getElementById('minesCountInput').value = val;
    document.querySelectorAll('#controls-panel .preset-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
}

function renderMines(controls, screen) {
    controls.innerHTML += `
        <div class="input-group" style="margin-top: 15px;">
            <label>Mines Count</label>
            <div class="bet-input-wrapper">
                <i class="bi bi-gear-fill"></i>
                <input type="number" id="minesCountInput" value="3" min="1" max="24" ${isPlaying ? 'disabled' : ''}>
            </div>
            <div class="presets-row">
                <button class="preset-btn active" onclick="setMinesPreset(3)">3</button>
                <button class="preset-btn" onclick="setMinesPreset(5)">5</button>
                <button class="preset-btn" onclick="setMinesPreset(10)">10</button>
                <button class="preset-btn" onclick="setMinesPreset(15)">15</button>
            </div>
        </div>
        <button class="action-btn" id="minesBtn" onclick="toggleMines()">Bet</button>
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
    const minesInput = document.getElementById('minesCountInput');
    if (!isPlaying) {
        if (balance < currentBet) { alert("Insufficient funds!"); return; }
        isPlaying = true;
        updateBalance(-currentBet);
        minesState.maxMines = Math.min(24, Math.max(1, parseInt(minesInput.value) || 3));
        minesInput.value = minesState.maxMines;
        minesState.safeCount = 0;
        minesState.currentMultiplier = 1.0;
        
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
        minesInput.disabled = true;
        document.getElementById('betAmount').disabled = true;
    } else {
        if(minesState.safeCount === 0) return;
        const payout = currentBet * minesState.currentMultiplier;
        updateBalance(payout);
        addToLedger('mines', currentBet, minesState.currentMultiplier, payout);
        isPlaying = false;
        btn.textContent = 'Bet';
        minesInput.disabled = false;
        document.getElementById('betAmount').disabled = false;
        revealAllMines(false);
    }
}

function revealMine(index) {
    if (!isPlaying) return;
    const tile = document.getElementById('mines-grid').children[index];
    if (tile.classList.contains('revealed')) return;

    if (minesState.grid[index] === 'bomb') {
        tile.classList.add('revealed', 'bomb');
        tile.innerHTML = '<span style="font-size: 2.2rem; transform: scale(1.2);">💣</span>';
        
        addToLedger('mines', currentBet, 0, 0);
        isPlaying = false;
        document.getElementById('minesBtn').textContent = 'Bet';
        document.getElementById('minesCountInput').disabled = false;
        document.getElementById('betAmount').disabled = false;
        revealAllMines(true);
    } else {
        minesState.safeCount++;
        tile.classList.add('revealed', 'safe');
        tile.innerHTML = '<i class="bi bi-gem"></i>';
        
        minesState.currentMultiplier = getMinesMultiplier(minesState.maxMines, minesState.safeCount);
        document.getElementById('minesBtn').textContent = `Cash Out (${minesState.currentMultiplier.toFixed(2)}x)`;
        
        if (minesState.safeCount === 25 - minesState.maxMines) { // Max win auto cashout
             toggleMines();
        }
    }
}

function revealAllMines(isLoss) {
    const tiles = document.getElementById('mines-grid').children;
    for (let i = 0; i < 25; i++) {
        const tile = tiles[i];
        if (!tile.classList.contains('revealed')) {
            tile.classList.add('revealed', 'dim');
            if (minesState.grid[i] === 'bomb') {
                tile.classList.add('bomb');
                tile.innerHTML = '<span style="font-size: 2.2rem; transform: scale(1.2);">💣</span>';
            } else {
                tile.classList.add('safe');
                tile.innerHTML = '<i class="bi bi-gem"></i>';
            }
        }
    }
}

// ======================= DICE =======================
function renderDice(controls, screen) {
    controls.innerHTML += `
        <div class="input-group" style="margin-top: 15px;">
            <label>Multiplier / Win Chance</label>
            <div class="bet-input-wrapper">
                <i class="bi bi-x"></i>
                <input type="number" id="diceMultInput" value="${diceState.targetMult.toFixed(2)}" step="0.01" max="9900" min="1.01">
            </div>
        </div>
        <div class="toggle-group" style="margin-top:10px;">
             <button class="toggle-btn green ${diceState.condition==='under'?'active':''}" onclick="setDiceCond('under')">Roll Under</button>
             <button class="toggle-btn red ${diceState.condition==='over'?'active':''}" onclick="setDiceCond('over')">Roll Over</button>
        </div>
        <div class="toggle-group" style="margin-top:10px;">
             <button class="toggle-btn ${diceState.speed==='fast'?'active':''}" onclick="setDiceSpeed('fast')">⚡ Fast</button>
             <button class="toggle-btn ${diceState.speed==='slow'?'active':''}" onclick="setDiceSpeed('slow')">🐢 Slow</button>
        </div>
        <button class="action-btn" id="diceBtn" onclick="rollDice()" style="margin-top:auto;">Roll Dice</button>
    `;

    screen.innerHTML = `
        <div class="dice-container">
            <div class="dice-number-wrap">
                <div class="dice-number" id="diceResult">5000</div>
            </div>
            <div class="dice-slider-container">
                <div class="dice-slider-info">
                   <span>Win Chance: <span class="hilight" id="diceChanceVal">${diceState.winChance.toFixed(2)}%</span></span>
                   <span>Target: <span class="hilight" id="diceTargetVal">${getDiceTargetString()}</span></span>
                </div>
                <input type="range" id="diceChanceRange" min="0.01" max="98.00" step="0.01" value="${diceState.winChance}">
            </div>
        </div>
    `;
    
    bindDiceEvents();
}

function getDiceTargetString() {
    let limit = Math.floor(diceState.winChance * 100);
    if (diceState.condition === 'over') limit = 10000 - limit - 1;
    return diceState.condition === 'over' ? `> ${String(limit).padStart(4,'0')}` : `< ${String(limit).padStart(4,'0')}`;
}

function updateDiceUI() {
    document.getElementById('diceChanceVal').innerText = diceState.winChance.toFixed(2) + '%';
    document.getElementById('diceMultInput').value = diceState.targetMult.toFixed(2);
    document.getElementById('diceTargetVal').innerText = getDiceTargetString();
    document.getElementById('diceChanceRange').value = diceState.winChance;
}

function bindDiceEvents() {
    document.getElementById('diceMultInput').addEventListener('input', (e) => {
        let mult = parseFloat(e.target.value);
        if (mult < 1.01) mult = 1.01; if (mult > 9900) mult = 9900;
        diceState.targetMult = mult;
        diceState.winChance = 99 / mult;
        updateDiceUI();
    });
    document.getElementById('diceChanceRange').addEventListener('input', (e) => {
        let chance = parseFloat(e.target.value);
        diceState.winChance = chance;
        diceState.targetMult = 99 / chance;
        updateDiceUI();
    });
}

function setDiceCond(cond) { diceState.condition = cond; renderGame('dice'); }
function setDiceSpeed(spd) { diceState.speed = spd; renderGame('dice'); }

function rollDice() {
    if (isPlaying) return;
    if (balance < currentBet) { alert("Insufficient funds!"); return; }
    isPlaying = true;
    updateBalance(-currentBet);
    
    const btn = document.getElementById('diceBtn');
    btn.disabled = true;
    const resEl = document.getElementById('diceResult');
    resEl.classList.remove('win', 'lose');
    resEl.classList.add('rolling');
    
    const duration = diceState.speed === 'fast' ? 300 : 1200;
    const start = performance.now();
    
    function anim(time) {
        if (time - start < duration) {
            resEl.innerText = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
            requestAnimationFrame(anim);
        } else {
            resEl.classList.remove('rolling');
            const finalRoll = Math.floor(Math.random() * 10000);
            resEl.innerText = finalRoll.toString().padStart(4, '0');
            
            let isWin = false;
            let limit = Math.floor(diceState.winChance * 100);
            if (diceState.condition === 'over') {
                limit = 10000 - limit - 1;
                isWin = finalRoll > limit;
            } else {
                isWin = finalRoll < limit;
            }
            
            if (isWin) {
                resEl.classList.add('win');
                const payout = currentBet * diceState.targetMult;
                updateBalance(payout);
                addToLedger('dice', currentBet, diceState.targetMult, payout);
            } else {
                resEl.classList.add('lose');
                addToLedger('dice', currentBet, 0, 0);
            }
            
            isPlaying = false;
            btn.disabled = false;
        }
    }
    requestAnimationFrame(anim);
}

// ======================= CRASH =======================
function renderCrash(controls, screen) {
    controls.innerHTML += `
        <div class="input-group" style="margin-top: 15px;">
            <label>Auto Cashout</label>
            <div class="bet-input-wrapper">
                <i class="bi bi-box-arrow-up"></i>
                <input type="number" id="crashAuto" value="2.00" step="0.10">
            </div>
        </div>
        <button class="action-btn" id="crashBtn" onclick="toggleCrash()">Bet</button>
    `;

    screen.innerHTML = `
        <div class="crash-container">
            <canvas id="crash-canvas"></canvas>
            <div class="crash-overlay">
                <div class="crash-mult" id="crashMult">1.00x</div>
            </div>
        </div>
    `;
    
    drawCrashIdle();
}

function drawCrashIdle() {
    const canvas = document.getElementById('crash-canvas');
    if(!canvas) return;
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = canvas.parentElement.offsetHeight;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0, canvas.width, canvas.height);
    
    // Draw grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for(let i=0; i<10; i++) {
        ctx.beginPath();
        ctx.moveTo(0, canvas.height/10 * i);
        ctx.lineTo(canvas.width, canvas.height/10 * i);
        ctx.stroke();
    }
}

function toggleCrash() {
    const btn = document.getElementById('crashBtn');
    if (!isPlaying) {
        if (balance < currentBet) { alert("Insufficient funds!"); return; }
        isPlaying = true;
        updateBalance(-currentBet);
        crashState.multiplier = 1.00;
        crashState.crashed = false;
        crashState.playerCashedOut = false;
        
        // Setup crash point
        const e = 2 ** 32;
        const h = crypto.getRandomValues(new Uint32Array(1))[0];
        let crashPoint = Math.max(1.00, (100 * e - h) / (e - h) / 100);
        if (Math.random() < 0.04) crashPoint = 1.00; 
        
        const autoOut = parseFloat(document.getElementById('crashAuto').value) || 9999;
        btn.textContent = 'Cash Out';
        
        const multEl = document.getElementById('crashMult');
        multEl.classList.remove('busted');
        
        const canvas = document.getElementById('crash-canvas');
        canvas.width = canvas.parentElement.offsetWidth;
        canvas.height = canvas.parentElement.offsetHeight;
        const ctx = canvas.getContext('2d');
        
        let t = 0;
        crashState.interval = setInterval(() => {
            t += 0.05;
            crashState.multiplier = 1 + (t * 0.01) + (Math.pow(1.05, t) - 1);
            
            // Draw math curve
            drawCrashCurve(ctx, canvas, crashState.multiplier);
            
            if (crashState.multiplier >= autoOut && !crashState.playerCashedOut) {
                crashState.playerCashedOut = true;
                btn.textContent = 'Waiting...';
                btn.disabled = true;
                const payout = currentBet * autoOut;
                updateBalance(payout);
                addToLedger('crash', currentBet, autoOut, payout);
            }
            
            if (crashState.multiplier >= crashPoint) {
                crashState.multiplier = crashPoint;
                crashState.crashed = true;
                clearInterval(crashState.interval);
                multEl.classList.add('busted');
                multEl.innerText = `Crashed @ ${crashState.multiplier.toFixed(2)}x`;
                if (!crashState.playerCashedOut) addToLedger('crash', currentBet, 0, 0); 
                
                isPlaying = false;
                btn.disabled = false;
                btn.textContent = 'Bet';
            } else {
                multEl.innerText = crashState.multiplier.toFixed(2) + 'x';
            }
        }, 30);

    } else {
        if (crashState.crashed || crashState.playerCashedOut) return;
        crashState.playerCashedOut = true;
        btn.disabled = true;
        setTimeout(() => btn.disabled = false, 1000);
        const curMult = crashState.multiplier;
        const payout = currentBet * curMult;
        updateBalance(payout);
        addToLedger('crash', currentBet, curMult, payout);
        
        btn.textContent = 'Cashed Out!';
        btn.disabled = true;
        setTimeout(() => btn.disabled = false, 1000); 
    }
}

function drawCrashCurve(ctx, canvas, mult) {
    ctx.clearRect(0,0, canvas.width, canvas.height);
    
    let time = Date.now() / 1000;
    let speed = Math.max(1, Math.log(mult) * 2);
    let offset = (time * speed * 20) % 40;
    
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for(let i=0; i<20; i++) {
        let y = canvas.height - ((i * 40 - offset) % canvas.height);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        
        let x = (i * 40 - offset) % canvas.width;
        if(x < 0) x += canvas.width;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    
    let maxVisualMult = Math.max(2.0, mult * 1.2);
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    
    let endX = canvas.width * 0.9;
    let steps = 50;
    let pointX = 0, pointY = canvas.height;
    
    for(let i=0; i<=steps; i++) {
        let p = i/steps;
        let cMult = 1 + (mult - 1) * p; 
        let cx = p * endX; 
        let cy = canvas.height - (Math.log(cMult) / Math.log(maxVisualMult)) * (canvas.height * 0.8);
        ctx.lineTo(cx, cy);
        if (i === steps) { pointX = cx; pointY = cy; }
    }
    
    let grad = ctx.createLinearGradient(0, 0, pointX, 0);
    grad.addColorStop(0, 'rgba(0, 230, 118, 0.2)');
    grad.addColorStop(1, '#00E676');
    
    ctx.strokeStyle = grad;
    ctx.lineWidth = 5;
    ctx.stroke();
    
    ctx.lineTo(pointX, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.fillStyle = 'rgba(0, 230, 118, 0.1)';
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(pointX, pointY, 6, 0, Math.PI*2);
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00E676';
    ctx.fill();
    ctx.shadowBlur = 0;
}

// ======================= PLINKO =======================
let plinkoBalls = [];
let plinkoRiskLevel = 'med';

function setPlinkoRisk(level) {
    if (isPlaying && activeGame === 'plinko') return;
    plinkoRiskLevel = level;
    document.querySelectorAll('.risk-toggles .toggle-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('risk-' + level).classList.add('active');
}

function renderPlinko(controls, screen) {
    controls.innerHTML += `
        <div class="input-group" style="margin-top: 15px;">
            <label>Risk Level</label>
            <div class="toggle-group risk-toggles" style="margin-top: 5px;">
                <button class="toggle-btn ${plinkoRiskLevel==='low'?'active':''}" onclick="setPlinkoRisk('low')" id="risk-low">Low</button>
                <button class="toggle-btn ${plinkoRiskLevel==='med'?'active':''}" onclick="setPlinkoRisk('med')" id="risk-med">Medium</button>
                <button class="toggle-btn ${plinkoRiskLevel==='high'?'active':''}" onclick="setPlinkoRisk('high')" id="risk-high">High</button>
            </div>
        </div>
        <button class="action-btn" id="plinkoBtn" style="margin-top: 25px;" onclick="dropPlinko()">Drop Ball</button>
    `;

    screen.innerHTML = `
        <div class="plinko-container" style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
            <canvas id="plinko-canvas" width="600" height="550"></canvas>
        </div>
    `;
    plinkoBalls = [];
    if (!window.plinkoAnimating) {
        window.plinkoAnimating = true;
        requestAnimationFrame(plinkoLoop);
    }
}

const plinkoRows = 12;
const pegSpacing = 35;
const startY = 40;
const multsPlinko = {
    'low': [5.6, 2.1, 1.1, 1, 0.5, 0.4, 0.2, 0.4, 0.5, 1, 1.1, 2.1, 5.6],
    'med': [30, 9, 3, 1.6, 0.5, 0.2, 0.2, 0.2, 0.5, 1.6, 3, 9, 30],
    'high': [110, 22, 5, 2, 0.3, 0, 0, 0, 0.3, 2, 5, 22, 110]
};

function plinkoLoop() {
    if (activeGame !== 'plinko') { window.plinkoAnimating = false; return; }
    const canvas = document.getElementById('plinko-canvas');
    if (!canvas) { window.plinkoAnimating = false; return; }
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0, canvas.width, canvas.height);
    
    // Draw Pegs target
    ctx.fillStyle = '#4A4D5C';
    for(let r=0; r<plinkoRows; r++) {
        let cols = r + 3;
        let y = startY + r * pegSpacing;
        let startX = canvas.width/2 - (cols-1) * (pegSpacing/2);
        for(let c=0; c<cols; c++) {
            ctx.beginPath();
            ctx.arc(startX + c*pegSpacing, y, 4, 0, Math.PI*2);
            ctx.fill();
        }
    }
    
    // Draw Buckets
    let bucketCols = 13; 
    let bucketY = startY + plinkoRows * pegSpacing + 10;
    let startXBucket = canvas.width/2 - (bucketCols-1) * (pegSpacing/2);
    
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    let mList = multsPlinko[plinkoRiskLevel];
    
    for (let i = 0; i < bucketCols; i++) {
        let hit = mList[i];
        let bx = startXBucket + i*pegSpacing;
        
        ctx.fillStyle = hit > 2 ? '#00E676' : (hit >= 1 ? '#FFA100' : '#FF3232');
        ctx.shadowBlur = 10;
        ctx.shadowColor = hit < 1 ? 'transparent' : ctx.fillStyle;
        ctx.fillRect(bx - 14, bucketY, 28, 25);
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = hit < 1 ? '#fff' : '#000';
        ctx.fillText(hit, bx, bucketY + 17);
    }
    
    // Draw and Animate Balls
    for (let i = plinkoBalls.length-1; i >= 0; i--) {
        let b = plinkoBalls[i];
        
        let p1 = b.path[b.step];
        let p2 = b.path[b.step + 1];
        
        b.progress += 0.045; // Control speed here
        if (b.progress >= 1) {
            b.progress = 0;
            b.step++;
            if (b.step >= b.path.length - 1) {
                // Finished
                let hit = mList[b.slot];
                const payout = b.bet * hit;
                updateBalance(payout);
                addToLedger('plinko', b.bet, hit, payout);
                plinkoBalls.splice(i, 1);
                continue;
            }
            p1 = b.path[b.step];
            p2 = b.path[b.step + 1];
        }
        
        let px = p1.x + (p2.x - p1.x) * b.progress;
        let py = p1.y + (p2.y - p1.y) * b.progress;
        
        // Bounce Arc
        if (b.step > 0 && b.step < b.path.length - 1) {
            let arc = Math.sin(b.progress * Math.PI) * (pegSpacing * 0.4);
            py -= arc;
        }

        ctx.beginPath();
        ctx.arc(px, py, 7, 0, Math.PI*2);
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00E676';
        ctx.fill();
        ctx.shadowBlur = 0;
    }
    
    requestAnimationFrame(plinkoLoop);
}

function dropPlinko() {
    if (balance < currentBet) { alert("Insufficient funds!"); return; }
    updateBalance(-currentBet);
    
    let slot = 0;
    let r = Math.random();
    // Fatter tails distribution
    if (r < 0.003) slot = 0;
    else if (r < 0.006) slot = 12;
    else if (r < 0.02) slot = 1;
    else if (r < 0.034) slot = 11;
    else if (r < 0.08) slot = 2;
    else if (r < 0.126) slot = 10;
    else if (r < 0.20) slot = 3;
    else if (r < 0.274) slot = 9;
    else if (r < 0.40) slot = 4;
    else if (r < 0.526) slot = 8;
    else if (r < 0.65) slot = 5;
    else if (r < 0.774) slot = 7;
    else slot = 6;
    
    const canvas = document.getElementById('plinko-canvas');
    let path = [];
    let curSlot = 0;
    let curY = startY - pegSpacing;
    let curX = canvas.width/2;
    path.push({x: curX, y: curY});
    path.push({x: curX, y: startY}); // Drop to first peg
    
    for (let r=0; r<12; r++) {
        let rightNeeded = slot - curSlot;
        let leftNeeded = (12 - r) - rightNeeded;
        let rightProb = rightNeeded / (12 - r);
        let goRight = Math.random() < rightProb;
        if (goRight) curSlot++;
        
        let nextY = startY + (r+1) * pegSpacing;
        let pIndex = curSlot + 1; 
        let R = r + 1;
        let cCols = R + 3;
        let cStartX = (canvas.width/2) - (cCols-1)*(pegSpacing/2);
        let nextX = cStartX + pIndex * pegSpacing;
        
        path.push({x: nextX, y: nextY});
    }
    
    let bucketX = (canvas.width/2) - (12)*(pegSpacing/2) + slot * pegSpacing;
    path.push({x: bucketX, y: startY + 12*pegSpacing + 10});

    plinkoBalls.push({
        path: path,
        step: 0,
        progress: 0,
        bet: currentBet,
        slot: slot
    });
}
