

export const ROWS = 6;
export const COLS = 7;
export let board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
export let currentPlayer = 'red';
export let gameActive = true;

export function initializeBoard(onColClick) {
    const boardEl = document.getElementById('board');
    boardEl.innerHTML = '';
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const slot = document.createElement('div');
            slot.classList.add('slot');
            slot.dataset.row = r;
            slot.dataset.col = c;
            slot.addEventListener('click', () => onColClick(c));
            boardEl.appendChild(slot);
        }
    }
}

export function dropDisc(col, player = currentPlayer) {
    if (!gameActive) return null;

    // Find bottom-most empty row in col
    for (let r = ROWS - 1; r >= 0; r--) {
        if (!board[r][col]) {
            board[r][col] = player;
            updateUI(r, col, player);
            return r; // Returns the row it landed in
        }
    }
    return null; // Col is full
}

export function checkWin(testBoard = board) {
    // Check horizontal, vertical, and diagonals
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            let player = testBoard[r][c];
            if (!player) continue;

            if (c + 3 < COLS && player === testBoard[r][c + 1] && player === testBoard[r][c + 2] && player === testBoard[r][c + 3]) return player;
            if (r + 3 < ROWS && player === testBoard[r + 1][c] && player === testBoard[r + 2][c] && player === testBoard[r + 3][c]) return player;
            if (r + 3 < ROWS && c + 3 < COLS && player === testBoard[r + 1][c + 1] && player === testBoard[r + 2][c + 2] && player === testBoard[r + 3][c + 3]) return player;
            if (r - 3 >= 0 && c + 3 < COLS && player === testBoard[r - 1][c + 1] && player === testBoard[r - 2][c + 2] && player === testBoard[r - 3][c + 3]) return player;
        }
    }

    // Check draw
    let isDraw = true;
    for (let c = 0; c < COLS; c++) {
        if (testBoard[0][c] === null) {
            isDraw = false;
            break;
        }
    }
    return isDraw ? 'Draw' : null;
}

export function checkGameState() {
    const result = checkWin(board);
    if (result) {
        gameActive = false;
        const statusEl = document.getElementById('status');
        if (result === 'Draw') statusEl.textContent = "It's a Draw!";
        else {
            statusEl.textContent = `${result === 'red' ? 'Solar Flare' : 'Void Pulse'} Wins!`;
            statusEl.style.color = result === 'red' ? 'var(--solar-flare)' : 'var(--void-pulse)';
            statusEl.style.textShadow = result === 'red' ? '0 0 15px var(--solar-flare)' : '0 0 15px var(--void-pulse)';
            updateProbabilityBar(result); // Pass winner to force 100%
        }
    }
    return result;
}

export function switchPlayer(forcePlayer = null) {
    if (forcePlayer) currentPlayer = forcePlayer;
    else currentPlayer = currentPlayer === 'red' ? 'yellow' : 'red';

    if (gameActive) {
        const isRed = currentPlayer === 'red';
        document.getElementById('status').textContent = `${isRed ? 'Solar Flare' : 'Void Pulse'} Turn`;
        document.getElementById('status').style.color = isRed ? 'var(--solar-flare)' : 'var(--void-pulse)';
        document.getElementById('status').style.textShadow = isRed ? '0 0 10px var(--solar-flare)' : '0 0 10px var(--void-pulse)';
    }
}

function updateUI(row, col, player) {
    const slot = document.querySelector(`.slot[data-row='${row}'][data-col='${col}']`);
    if (slot) {
        slot.classList.add(player);
        const orb = document.createElement('div');
        orb.classList.add('orb', player);
        slot.appendChild(orb);

        const boardEl = document.getElementById('board');
        boardEl.classList.remove('shake');
        void boardEl.offsetWidth; /* trigger reflow */
        boardEl.classList.add('shake');
        updateProbabilityBar();
    }
}

function updateProbabilityBar(winner = null) {
    let redScore = 0; let yellowScore = 0;
    for(let r=0; r<ROWS; r++) {
        for(let c=0; c<COLS; c++) {
            if(board[r][c] === 'red') redScore += (3 - Math.abs(3-c)) + 1;
            if(board[r][c] === 'yellow') yellowScore += (3 - Math.abs(3-c)) + 1;
        }
    }
    const total = redScore + yellowScore || 1;
    let redProb = Math.max(10, Math.min(90, (redScore / total) * 100));
    
    if (winner === 'red') redProb = 100;
    else if (winner === 'yellow') redProb = 0;
    
    const probRedEl = document.getElementById('prob-red');
    const probYellowEl = document.getElementById('prob-yellow');
    if(probRedEl && probYellowEl) {
        probRedEl.style.width = `${redProb}%`;
        probYellowEl.style.width = `${100 - redProb}%`;
    }
}

export function resetGame() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    currentPlayer = 'red';
    gameActive = true;
    const statusEl = document.getElementById('status');
    statusEl.textContent = "Solar Flare Turn";
    statusEl.style.color = 'var(--solar-flare)';
    statusEl.style.textShadow = '0 0 10px var(--solar-flare)';
    document.querySelectorAll('.slot').forEach(slot => {
        slot.classList.remove('red', 'yellow');
        slot.innerHTML = '';
    });
    updateProbabilityBar();
}
