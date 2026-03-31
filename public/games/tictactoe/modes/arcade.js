export function initArcade(game) {
    let powerUpsUI = document.createElement('div');
    powerUpsUI.id = 'powerups-container';
    powerUpsUI.innerHTML = `
        <style>
            .powerup-box { display: flex; flex-direction: column; align-items: center; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); margin-top: 15px; width: 100%; }
            .powerups-row { display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; }
            .powerup-btn { 
                position: relative; width: 60px; height: 60px; border-radius: 12px; font-weight: bold; 
                cursor: pointer; border: 2px solid #555; background: #222; color: #fff; 
                transition: all 0.2s; display: flex; flex-direction: column; align-items: center; justify-content: center;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-size: 1.5rem;
            }
            .powerup-btn span { font-size: 0.6rem; margin-top: 5px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; }
            .powerup-btn .badge { 
                position: absolute; top: -8px; right: -8px; background: #e74c3c; color: white; 
                border-radius: 50%; width: 22px; height: 22px; font-size: 0.75rem; 
                display: flex; align-items: center; justify-content: center; border: 2px solid #1A1C2B;
            }
            .powerup-btn:hover { background: #333; transform: translateY(-2px); }
            .powerup-btn.active { border-color: #f1c40f; background: rgba(241, 196, 15, 0.2); color: #f1c40f; box-shadow: 0 0 15px rgba(241, 196, 15, 0.5); }
            .powerup-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; border-color: #333; }
            .powerup-btn:disabled .badge { background: #555; }
            .locked-cell { background: #333 !important; cursor: not-allowed; border: 2px dashed #e74c3c !important; opacity: 0.8; }
            .bomb-effect { background: #e74c3c !important; transform: scale(0.9); transition: 0.3s; }
        </style>
        <div class="powerup-box">
            <h3 style="margin-bottom:10px; font-size:1rem; color:#ccc; text-transform:uppercase; letter-spacing:1px;">Your Power-Ups</h3>
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
    document.querySelector('.tic-tac-grid').after(powerUpsUI);

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

    game.getCustomAIMove = function() {
        if (!game.gameActive || game.currentPlayer !== 'O') return -1;
        
        let pps = playerPowerups['O'];
        let availablePowerups = Object.keys(pps).filter(k => pps[k] > 0);
        
        let emptyCells = [];
        let playerXCells = [];
        for (let i = 0; i < 9; i++) {
            if (game.board[i] === null) emptyCells.push(i);
            if (game.board[i] === 'X') playerXCells.push(i);
        }

        // 30% chance AI uses a random available power-up
        if (availablePowerups.length > 0 && Math.random() < 0.3) {
            let power = availablePowerups[Math.floor(Math.random() * availablePowerups.length)];
            
            if (power === 'eraser' && playerXCells.length > 0) {
                activePowerUp = 'eraser';
                return playerXCells[Math.floor(Math.random() * playerXCells.length)];
            }
            if (power === 'lock' && emptyCells.length > 0) {
                activePowerUp = 'lock';
                return emptyCells[Math.floor(Math.random() * emptyCells.length)];
            }
            if (power === 'bomb') {
                activePowerUp = 'bomb';
                return Math.floor(Math.random() * 9); 
            }
            if (power === 'double') {
                activePowerUp = 'double';
                // Proceed to standard move, but with double active
            }
        }

        // Standard AI fallback
        if (emptyCells.length === 0) return -1;
        
        // Simple strategic check (or fallback to basic minimax if we had it cleanly exposed) 
        // For Arcade, board might have 'LOCKED' so minimax might break if not handled well. 
        // Let's do a simple win/block or random
        let isWinningMove = (board, player, move) => {
            let temp = [...board];
            temp[move] = player;
            return game.checkWin(temp) === player;
        };

        for (let move of emptyCells) {
            if (isWinningMove(game.board, 'O', move)) return move;
        }
        for (let move of emptyCells) {
            if (isWinningMove(game.board, 'X', move)) return move;
        }

        return emptyCells[Math.floor(Math.random() * emptyCells.length)];
    };

    // Initialize UI
    setTimeout(updatePowerUpButtons, 100);
}
