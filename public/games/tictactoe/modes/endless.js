export function initEndless(game) {
    let xPieces = [];
    let oPieces = [];

    const originalHandleClick = game.handleClick;
    game.handleClick = function(index) {
        if (game.board[index] !== null || !game.gameActive) return false;
        
        let pieces = game.currentPlayer === 'X' ? xPieces : oPieces;
        pieces.push(index);

        if (pieces.length > 3) {
            let removed = pieces.shift();
            game.board[removed] = null;
            let cell = document.querySelector(`.cell[data-index='${removed}']`);
            if (cell) {
                cell.textContent = '';
                cell.classList.remove('fading');
            }
        }

        if (pieces.length === 3) {
            let fadingPiece = pieces[0];
            let cell = document.querySelector(`.cell[data-index='${fadingPiece}']`);
            if (cell) cell.classList.add('fading');
        }

        return originalHandleClick.call(game, index);
    };

    game.getCustomAIMove = function() {
        if (!game.gameActive) return -1;

        // Custom Endless AI Heuristic
        const aiPlayer = 'O';
        const humanPlayer = 'X';
        let availableMoves = [];
        for (let i = 0; i < 9; i++) {
            if (game.board[i] === null) availableMoves.push(i);
        }

        if (availableMoves.length === 0) return -1;

        // Helper to check what the board looks like after X more moves
        // Since it's Endless, the oldest piece disappears when the 4th is placed.
        function simulatesWin(move, player, pieces) {
            let simBoard = [...game.board];
            let simPieces = [...pieces];
            
            simBoard[move] = player;
            simPieces.push(move);
            if (simPieces.length > 3) {
                let removed = simPieces.shift();
                simBoard[removed] = null;
            }

            return game.checkWin(simBoard) === player;
        }

        let chosenMove = -1;

        // 1. Can AI win right now?
        for (let move of availableMoves) {
            if (simulatesWin(move, aiPlayer, oPieces)) {
                return move;
            }
        }

        // 2. Can Human win on next turn? Block them.
        for (let move of availableMoves) {
            if (simulatesWin(move, humanPlayer, xPieces)) {
                return move;
            }
        }

        // 3. Otherwise pick center if available, or a random corner, or random
        if (availableMoves.includes(4)) {
            return 4;
        } else {
            let corners = [0, 2, 6, 8].filter(c => availableMoves.includes(c));
            if (corners.length > 0) {
                return corners[Math.floor(Math.random() * corners.length)];
            } else {
                return availableMoves[Math.floor(Math.random() * availableMoves.length)];
            }
        }
    };

    const originalReset = game.resetGame;
    game.resetGame = function() {
        xPieces = [];
        oPieces = [];
        document.querySelectorAll('.cell').forEach(c => c.classList.remove('fading'));
        originalReset.call(game);
    };
}