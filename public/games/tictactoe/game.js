// Copilot: Build full Tic-Tac-Toe game logic.
export let board = Array(9).fill(null);
export let currentPlayer = 'X';
export let gameActive = true;

const winConditions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
    [0, 4, 8], [2, 4, 6]             // Diagonals
];

export function initializeBoard(onCellClick) {
    const boardEl = document.getElementById('board');
    if (boardEl && boardEl.children.length === 0) {
        for (let i = 0; i < 9; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell tic-tac-cell';
            cell.dataset.index = i;
            boardEl.appendChild(cell);
        }
    }
    document.querySelectorAll('.cell').forEach(cell => {
        cell.addEventListener('click', (e) => onCellClick(e.target.dataset.index));
    });
}

export function handleClick(index) {
    if (board[index] !== null || !gameActive) return false;
    board[index] = currentPlayer;
    updateUI(index, currentPlayer);
    return true; // Move executed
}

export function checkWin(testBoard = board) {
    for (let condition of winConditions) {
        let [a, b, c] = condition;
        if (testBoard[a] && testBoard[a] === testBoard[b] && testBoard[a] === testBoard[c]) {
            return testBoard[a]; // Returns 'X' or 'O'
        }
    }
    if (!testBoard.includes(null)) return 'Draw'; // It's a draw
    return null; // Game continues
}

export function checkGameState() {
    const result = checkWin(board);
    if (result) {
        gameActive = false;
        const statusEl = document.getElementById('status');
        if (result === 'Draw') {
            statusEl.textContent = "It's a Draw!";
        } else {
            statusEl.textContent = `Player ${result} Wins!`;
        }
    }
    return result;
}

export function switchPlayer(forcePlayer = null) {
    if (forcePlayer) {
        currentPlayer = forcePlayer;
    } else {
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    }
    if (gameActive) {
        document.getElementById('status').textContent = `${currentPlayer}'s Turn`;
    }
}

function updateUI(index, value) {
    const cell = document.querySelector(`.cell[data-index='${index}']`);
    if(cell) {
        cell.textContent = value;
        cell.style.color = value === 'X' ? '#ef4444' : '#3b82f6';
    }
}

export function resetGame() {
    board.fill(null);
    currentPlayer = 'X';
    gameActive = true;
    document.getElementById('status').textContent = "X's Turn";
    document.querySelectorAll('.cell').forEach(cell => cell.textContent = '');
}
