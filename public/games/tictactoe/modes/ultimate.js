export function initUltimate(game) {
    const boardEl = document.getElementById('board');
    // Change layout for ultimate
    boardEl.style.gridTemplateColumns = 'repeat(3, 1fr)';
    boardEl.style.width = 'fit-content';
    boardEl.style.gap = '8px';
    boardEl.style.padding = '10px';
    boardEl.style.background = '#1A1C2B';

    let miniBoards = Array(9).fill(null).map(() => Array(9).fill(null));
    let mainBoard = Array(9).fill(null); // 'X', 'O', 'Draw'
    let activeMiniBoard = -1; // -1 means player can choose any available mini-board

    // Render 9 mini boards
    function renderBoard() {
        boardEl.innerHTML = '';
        for (let i = 0; i < 9; i++) {
            const miniBoardEl = document.createElement('div');
            miniBoardEl.classList.add('mini-board');
            miniBoardEl.style.display = 'grid';
            miniBoardEl.style.gridTemplateColumns = 'repeat(3, 40px)';
            miniBoardEl.style.gridTemplateRows = 'repeat(3, 40px)';
            miniBoardEl.style.gap = '2px';
            miniBoardEl.style.padding = '4px';
            miniBoardEl.style.borderRadius = '8px';
            miniBoardEl.style.background = '#0F101A';
            miniBoardEl.style.position = 'relative';
            miniBoardEl.style.transition = 'all 0.3s';
            
            if (activeMiniBoard !== -1 && activeMiniBoard !== i && mainBoard[i] === null) {
                miniBoardEl.style.opacity = '0.4';
                miniBoardEl.style.filter = 'grayscale(100%)';
            } else if (mainBoard[i] !== null) {
                miniBoardEl.style.opacity = '0.7';
            } else {
                miniBoardEl.style.boxShadow = '0 0 10px rgba(59,130,246,0.5)';
                miniBoardEl.style.transform = 'scale(1.02)';
            }

            // If a mini-board is already won, display huge winner letter over it
            if (mainBoard[i] !== null) {
                const overlay = document.createElement('div');
                overlay.style.position = 'absolute';
                overlay.style.inset = '0';
                overlay.style.display = 'flex';
                overlay.style.alignItems = 'center';
                overlay.style.justifyContent = 'center';
                overlay.style.fontSize = '4rem';
                overlay.style.fontWeight = 'bold';
                overlay.style.zIndex = '10';
                overlay.style.background = 'rgba(15,16,26,0.85)';
                overlay.style.borderRadius = '8px';
                
                if (mainBoard[i] === 'X') {
                    overlay.style.color = '#ef4444';
                    overlay.innerText = 'X';
                } else if (mainBoard[i] === 'O') {
                    overlay.style.color = '#3b82f6';
                    overlay.innerText = 'O';
                } else {
                    overlay.style.color = '#aaa';
                    overlay.innerText = '-';
                }
                miniBoardEl.appendChild(overlay);
            }

            for (let j = 0; j < 9; j++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.style.background = '#2a2d43';
                cell.style.display = 'flex';
                cell.style.alignItems = 'center';
                cell.style.justifyContent = 'center';
                cell.style.fontSize = '1.5rem';
                cell.style.fontWeight = 'bold';
                cell.style.cursor = 'pointer';
                cell.style.borderRadius = '4px';

                const val = miniBoards[i][j];
                if (val) {
                    cell.innerText = val;
                    cell.style.color = val === 'X' ? '#ef4444' : '#3b82f6';
                }

                // Attach click listener bridging to our custom system
                cell.addEventListener('click', () => {
                    handleUltimateClick(i, j);
                });

                miniBoardEl.appendChild(cell);
            }
            boardEl.appendChild(miniBoardEl);
        }
    }

    const checkWinLines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    function checkSmallWin(b) {
        for (let combo of checkWinLines) {
            const [x, y, z] = combo;
            if (b[x] && b[x] === b[y] && b[x] === b[z]) return b[x];
        }
        if (!b.includes(null)) return 'Draw';
        return null;
    }

    function handleUltimateClick(m, c) {
        if (!game.gameActive) return;
        if (mainBoard[m] !== null) return; // already won mini
        if (activeMiniBoard !== -1 && activeMiniBoard !== m) return; // wrong mini
        if (miniBoards[m][c] !== null) return; // cell taken
        
        // Only run logic if human is allowed or it's networked properly
        if (typeof game.handleClickWrapper === "function") {
            game.handleClickWrapper(m, c); // callback to sync with main.js loop
        } else {
            processUltimateMove(m, c);
        }
    }

    function processUltimateMove(m, c) {
        miniBoards[m][c] = game.currentPlayer;
        
        const miniWin = checkSmallWin(miniBoards[m]);
        if (miniWin) {
            mainBoard[m] = miniWin;
        }

        // Set next active mini-board
        if (mainBoard[c] !== null) {
            activeMiniBoard = -1; // Next player can go anywhere
        } else {
            activeMiniBoard = c;
        }

        renderBoard();
        
        // Check overall winner
        const overAllWin = checkSmallWin(mainBoard);
        if (overAllWin) {
            game.gameActive = false; // It triggers main.js update in next loop
            game._fakeWinner = overAllWin;
        }
    }

    // Override the core Game object for Ultimate Mode
    game.handleClick = function() {
        return false; // Disable default clicks!
    };
    
    // We hook our click wrapper so we can reuse `main.js` score loop
    game.handleClickWrapper = function(m, c) {
        processUltimateMove(m, c);
        
        // Check manually and call window.checkGameOverState() if needed
        const winner = game.checkGameState();
        if (winner) {
            if (window.checkGameOverState) window.checkGameOverState(true);
        } else {
            game.switchPlayer();
            document.getElementById('status').textContent = "Turn: " + game.currentPlayer;
            // Let the AI have a turn if it's solo
            if (typeof window.triggerUltimateAI === "function" && game.currentPlayer === "O") {
               setTimeout(window.triggerUltimateAI, 600);
            }
        }
    };
    
    game.checkGameState = function() {
        if (game._fakeWinner) return game._fakeWinner;
        let isDraw = !mainBoard.includes(null);
        return isDraw ? 'Draw' : null;
    };

    game.resetGame = function() {
        miniBoards = Array(9).fill(null).map(() => Array(9).fill(null));
        mainBoard = Array(9).fill(null);
        activeMiniBoard = -1;
        game.gameActive = true;
        game.currentPlayer = 'X';
        game._fakeWinner = null;
        renderBoard();
        document.getElementById('status').textContent = 'Turn: X';
    };

    game.getCustomAIMove = function() {
        return -1; // disable standard AI
    };
    
    window.triggerUltimateAI = function() {
        if (!game.gameActive) return;
        
        let possibleMoves = [];
        
        if (activeMiniBoard === -1) {
            for (let i = 0; i < 9; i++) {
                if (mainBoard[i] === null) {
                    for (let j = 0; j < 9; j++) {
                        if (miniBoards[i][j] === null) possibleMoves.push({m: i, c: j});
                    }
                }
            }
        } else {
            for (let j = 0; j < 9; j++) {
                if (miniBoards[activeMiniBoard][j] === null) {
                    possibleMoves.push({m: activeMiniBoard, c: j});
                }
            }
        }
        
        if (possibleMoves.length > 0) {
            let pick = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
            game.handleClickWrapper(pick.m, pick.c);
            
            const winner = game.checkGameState();
            if (winner) {
                if (window.checkGameOverState) window.checkGameOverState(true);
            }
        }
    };

    renderBoard();
}
