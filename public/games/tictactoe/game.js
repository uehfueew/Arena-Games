// Copilot: Build full Tic-Tac-Toe game logic.
export const Game = {
    board: Array(9).fill(null),
    currentPlayer: 'X',
    gameActive: true,
    winConditions: [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ],

    initializeBoard: function(onCellClick) {
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
            const newCell = cell.cloneNode(true);
            cell.parentNode.replaceChild(newCell, cell);
            newCell.addEventListener('click', (e) => onCellClick(e.target.dataset.index));
        });
    },

    handleClick: function(index) {
        if (this.board[index] !== null || ! this.gameActive) return false;
        this.board[index] = this.currentPlayer;
        this.updateUI(index, this.currentPlayer);
        return true; 
    },

    checkWin: function(testBoard = this.board) {
        for (let condition of this.winConditions) {
            let [a, b, c] = condition;
            if (testBoard[a] && testBoard[a] !== 'LOCKED' && testBoard[a] === testBoard[b] && testBoard[a] === testBoard[c]) {
                return testBoard[a]; 
            }
        }
        if (!testBoard.includes(null)) return 'Draw'; 
        return null; 
    },

    checkGameState: function() {
        const result = this.checkWin(this.board);
        if (result) {
            this.gameActive = false;
            const statusEl = document.getElementById('status');
            if (result === 'Draw') {
                statusEl.textContent = "It's a Draw!";
            } else {
                statusEl.textContent = `Player ${result} Wins!`;
            }
        }
        return result;
    },

    switchPlayer: function(forcePlayer = null) {
        if (forcePlayer) {
            this.currentPlayer = forcePlayer;
        } else {
            this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
        }
        if (this.gameActive) {
            document.getElementById('status').textContent = `${this.currentPlayer}'s Turn`;
        }
    },

    updateUI: function(index, value) {
        const cell = document.querySelector(`.cell[data-index='${index}']`);
        if(cell) {
            cell.textContent = value;
            cell.setAttribute('data-value', value);
            cell.style.color = value === 'X' ? '#ef4444' : '#3b82f6';
        }
    },

    resetGame: function() {
        this.board.fill(null);
        this.currentPlayer = 'X';
        this.gameActive = true;
        document.getElementById('status').textContent = "X's Turn";
        document.querySelectorAll('.cell').forEach(cell => {
            cell.textContent = '';
            cell.classList.remove('locked-cell', 'bomb-effect', 'fading');
        });
    }
};

