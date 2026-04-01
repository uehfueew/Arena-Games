export function initArcade(game) {
    if (document.getElementById('powerups-container')) {
        document.getElementById('powerups-container').remove();
    }

    let powerUpsUI = document.createElement('div');
    powerUpsUI.id = 'powerups-container';
    powerUpsUI.innerHTML = `
        <style>
            .powerup-box { display: flex; flex-direction: column; align-items: center; background: rgba(0,0,0,0.4); padding: 15px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); margin-top: 20px; width: 100%; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
            .powerups-row { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; }
            .powerup-btn { 
                position: relative; width: 60px; height: 60px; border-radius: 14px; font-weight: bold; 
                cursor: pointer; border: 1px solid rgba(255,255,255,0.1); background: #222; color: #fff; 
                transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); display: flex; flex-direction: column; align-items: center; justify-content: center;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-size: 1.4rem;
            }
            .powerup-btn span { font-size: 0.6rem; margin-top: 4px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; color: #8b8f9c; }
            .powerup-btn .badge { 
                position: absolute; top: -8px; right: -8px; background: #ef4444; color: white; 
                border-radius: 50%; width: 22px; height: 22px; font-size: 0.75rem; 
                display: flex; align-items: center; justify-content: center; border: 3px solid #1A1C2B;
                font-weight: 900;
            }
            .powerup-btn:hover:not(:disabled) { background: #333; transform: translateY(-3px); border-color: rgba(255,255,255,0.3); }
            .powerup-btn.active { border-color: #f1c40f; background: rgba(241, 196, 15, 0.2); color: #f1c40f; box-shadow: 0 0 15px rgba(241, 196, 15, 0.5); transform: scale(1.05); }
            .powerup-btn:disabled { opacity: 0.3; cursor: not-allowed; transform: none; box-shadow: none; border-color: #333; }
            .powerup-btn:disabled .badge { background: #555; }
            .locked-cell { background: #333 !important; cursor: not-allowed; border: 2px dashed #ef4444 !important; opacity: 0.8; }
            .bomb-effect { background: #ef4444 !important; transform: scale(0.9); transition: 0.2s; }
        </style>
        <div class="powerup-box">
            <h3 style="margin-bottom:15px; font-size:0.9rem; color:#8b8f9c; text-transform:uppercase; letter-spacing:2px; font-weight: 800;">Your Power-Ups</h3>
            <div class="powerups-row">
                <button class="powerup-btn" id="btn-eraser" title="Erase an opponent's piece">
                    <i class="bi bi-eraser-fill"></i>
                    <span>Eraser</span>
                    <div class="badge" id="badge-eraser">1</div>
                </button>
                <button class="powerup-btn" id="btn-lock" title="Lock an empty cell for the rest of the game">
                    <i class="bi bi-lock-fill"></i>
                    <span>Lock</span>
                    <div class="badge" id="badge-lock">1</div>
                </button>
                <button class="powerup-btn" id="btn-bomb" title="Clear a 2x2 area">
                    <i class="bi bi-fire"></i>
                    <span>Bomb</span>
                    <div class="badge" id="badge-bomb">1</div>
                </button>
                <button class="powerup-btn" id="btn-double" title="Take an extra turn">
                    <i class="bi bi-chevron-double-right"></i>
                    <span>Double</span>
                    <div class="badge" id="badge-double">1</div>
                </button>
            </div>
        </div>
    `;
    const gameContainer = document.querySelector('#actual-game-container > div');
    if (gameContainer) {
        gameContainer.appendChild(powerUpsUI);
    }

    let activePowerUp = null;
    let playerPowerups = {
        'X': { eraser: 1, lock: 1, bomb: 1, double: 1 },
        'O': { eraser: 1, lock: 1, bomb: 1, double: 1 }
    };

    const originalHandleClick = game.handleClick;
    game.handleClick = function(index) {
        if (!game.gameActive) return false;
        const cell = document.querySelector(`.cell[data-index='${index}']`);

        if (activePowerUp) {
            // Apply Power Up
            if (activePowerUp === 'eraser') {
                if (game.board[index] && game.board[index] !== game.currentPlayer) {
                    game.board[index] = null;
                    cell.textContent = '';
                    playerPowerups[game.currentPlayer].eraser = 0;
                    endPowerUp();
                    return true; // Used turn
                }
                return false;
            }
            if (activePowerUp === 'lock') {
                if (!game.board[index]) {
                    game.board[index] = 'LOCKED';
                    cell.classList.add('locked-cell');
                    playerPowerups[game.currentPlayer].lock = 0;
                    endPowerUp();
                    return true; // Used turn
                }
                return false;
            }
            if (activePowerUp === 'bomb') {
                let row = Math.floor(index / 3);
                let col = index % 3;
                let targets = [
                    index,
                    (col < 2) ? index + 1 : -1,
                    (row < 2) ? index + 3 : -1,
                    (col < 2 && row < 2) ? index + 4 : -1
                ];
                targets.forEach(t => {
                    if (t !== -1 && game.board[t] !== 'LOCKED') {
                        game.board[t] = null;
                        let tc = document.querySelector(`.cell[data-index='${t}']`);
                        if (tc) {
                            tc.textContent = '';
                            tc.classList.add('bomb-effect');
                            setTimeout(() => tc.classList.remove('bomb-effect'), 500);
                        }
                    }
                });
                playerPowerups[game.currentPlayer].bomb = 0;
                endPowerUp();
                return true; 
            }
        }

        if (game.board[index] === 'LOCKED') return false;

        let doubleTurn = (activePowerUp === 'double');
        if (doubleTurn) {
            playerPowerups[game.currentPlayer].double = 0;
            endPowerUp();
        }

        let ret = originalHandleClick.call(game, index);

        if (ret && doubleTurn) {
            let playerWhoUsedDouble = game.currentPlayer; // Capture the player who used it
            setTimeout(() => {
                const statusEl = document.getElementById('status');
                statusEl.innerHTML += " <b>(Double Turn!)</b>";
                game.switchPlayer(playerWhoUsedDouble); // Re-assign to them
                updatePowerUpButtons();
            }, 50);
        }
        
        return ret;
    };

    function endPowerUp() {
        document.querySelectorAll('.powerup-btn').forEach(b => b.classList.remove('active'));
        activePowerUp = null;
    }

    function setupBtn(id, name) {
        let btn = document.getElementById(id);
        btn.addEventListener('click', () => {
            if (activePowerUp === name) {
                endPowerUp();
                return;
            }
            if (playerPowerups[game.currentPlayer][name] > 0) {
                endPowerUp();
                activePowerUp = name;
                btn.classList.add('active');
            }
        });
    }

    setupBtn('btn-eraser', 'eraser');
    setupBtn('btn-lock', 'lock');
    setupBtn('btn-bomb', 'bomb');
    setupBtn('btn-double', 'double');

    // Hook into global switchPlayer to update UI
    const originalSwitchPlayer = game.switchPlayer;
    game.switchPlayer = function(force) {
        originalSwitchPlayer.call(game, force);
        updatePowerUpButtons();
    };

    // Hook into global check Win to ignore "LOCKED" cells
    const oldCheckWin = game.checkWin;
    game.checkWin = function(tb) {
        const winConditions = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], 
            [0, 3, 6], [1, 4, 7], [2, 5, 8], 
            [0, 4, 8], [2, 4, 6]             
        ];
        for (let condition of winConditions) {
            let [a, b, c] = condition;
            if (tb[a] && tb[a] !== 'LOCKED' && tb[a] === tb[b] && tb[a] === tb[c]) {
                return tb[a]; 
            }
        }
        if (!tb.includes(null)) return 'Draw'; 
        return null; 
    }

    const originalReset = game.resetGame;
    game.resetGame = function() {
        playerPowerups = {
            'X': { eraser: 1, lock: 1, bomb: 1, double: 1 },
            'O': { eraser: 1, lock: 1, bomb: 1, double: 1 }
        };
        activePowerUp = null;
        document.querySelectorAll('.cell').forEach(c => c.classList.remove('locked-cell'));
        originalReset.call(game);
        updatePowerUpButtons();
    };

    function updatePowerUpButtons() {
        let pps = playerPowerups[game.currentPlayer];
        if(!pps) return;
        
        ['eraser', 'lock', 'bomb', 'double'].forEach(p => {
            const btn = document.getElementById(`btn-${p}`);
            const badge = document.getElementById(`badge-${p}`);
            if (btn && badge) {
                btn.disabled = pps[p] <= 0;
                badge.textContent = pps[p];
            }
        });
        endPowerUp();
    }

    game.getCustomAIMove = function(difficulty = 2) {
        if (!game.gameActive || game.currentPlayer !== 'O') return -1;
        
        let pps = playerPowerups['O'];
        let availablePowerups = Object.keys(pps).filter(k => pps[k] > 0);
        
        let emptyCells = [];
        let playerXCells = [];
        for (let i = 0; i < 9; i++) {
            if (game.board[i] === null) emptyCells.push(i);
            if (game.board[i] === 'X') playerXCells.push(i);
        }

        // 1. Check for immediate win
        const canWin = (player) => {
            for (let i = 0; i < 9; i++) {
                if (game.board[i] === null) {
                    let temp = [...game.board];
                    temp[i] = player;
                    if (game.checkWin(temp) === player) return i;
                }
            }
            return -1;
        };

        let winMove = canWin('O');
        if (winMove !== -1) return winMove;

        // 2. Check for immediate block
        let blockMove = canWin('X');
        if (blockMove !== -1) {
            // At higher difficulty, AI might use Eraser to remove a piece that is already part of a line
            if (difficulty >= 3 && pps.eraser > 0 && playerXCells.length > 0 && Math.random() < 0.5) {
                activePowerUp = 'eraser';
                return playerXCells[Math.floor(Math.random() * playerXCells.length)];
            }
            return blockMove;
        }

        // 3. Strategic Power-up Usage (Higher difficulties only)
        if (difficulty >= 3 && availablePowerups.length > 0) {
            // Use Double Turn if many empty cells and high chance of setting up win
            if (pps.double > 0 && emptyCells.length > 5 && Math.random() < 0.2) {
                activePowerUp = 'double';
                // Proceed to standard move
            }
            
            // Use Lock on center or corners if available and empty
            if (pps.lock > 0 && [4, 0, 2, 6, 8].some(i => game.board[i] === null) && Math.random() < 0.3) {
                activePowerUp = 'lock';
                const strategic = [4, 0, 2, 6, 8].filter(i => game.board[i] === null);
                return strategic[Math.floor(Math.random() * strategic.length)];
            }

            // Use Bomb if opponent has many pieces
            if (pps.bomb > 0 && playerXCells.length >= 3 && Math.random() < 0.2) {
                activePowerUp = 'bomb';
                return playerXCells[Math.floor(Math.random() * playerXCells.length)];
            }
        }

        // 4. Default move (Simulate some intelligence)
        if (emptyCells.includes(4)) return 4; // Center
        
        const corners = [0, 2, 6, 8].filter(i => emptyCells.includes(i));
        if (corners.length > 0 && Math.random() < 0.7) return corners[Math.floor(Math.random() * corners.length)];

        if (emptyCells.length === 0) return -1;
        return emptyCells[Math.floor(Math.random() * emptyCells.length)];
    };

    // Initialize UI
    setTimeout(updatePowerUpButtons, 100);
}
