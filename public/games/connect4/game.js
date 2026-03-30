export const ROWS = 6;
export const COLS = 7;
export let board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
export let currentPlayer = 'red'; // 'red' or 'yellow'
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

            if (c + 3 < COLS && player === testBoard[r][c+1] && player === testBoard[r][c+2] && player === testBoard[r][c+3]) return player;
            if (r + 3 < ROWS && player === testBoard[r+1][c] && player === testBoard[r+2][c] && player === testBoard[r+3][c]) return player;
            if (r + 3 < ROWS && c + 3 < COLS && player === testBoard[r+1][c+1] && player === testBoard[r+2][c+2] && player === testBoard[r+3][c+3]) return player;
            if (r - 3 >= 0 && c + 3 < COLS && player === testBoard[r-1][c+1] && player === testBoard[r-2][c+2] && player === testBoard[r-3][c+3]) return player;
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
        else statusEl.textContent = `${result.charAt(0).toUpperCase() + result.slice(1)} Wins!`;
    }
    return result;
}

export function switchPlayer(forcePlayer = null) {
    if (forcePlayer) currentPlayer = forcePlayer;
    else currentPlayer = currentPlayer === 'red' ? 'yellow' : 'red';
    
    if (gameActive) {
        document.getElementById('status').textContent = `${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)}'s Turn`;
        document.getElementById('status').style.color = currentPlayer === 'red' ? '#ef4444' : '#eab308';
    }
}

function updateUI(row, col, player) {
    const slot = document.querySelector(`.slot[data-row='${row}'][data-col='${col}']`);
    if(slot) slot.classList.add(player);
}

export function resetGame() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    currentPlayer = 'red';
    gameActive = true;
    const statusEl = document.getElementById('status');
    statusEl.textContent = "Red's Turn";
    statusEl.style.color = '#ef4444';
    document.querySelectorAll('.slot').forEach(slot => {
        slot.classList.remove('red', 'yellow');
    });
}
