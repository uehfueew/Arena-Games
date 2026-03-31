// Copilot: Implement a minimax algorithm for Tic-Tac-Toe.
import { Game } from './game.js';
const checkWin = Game.checkWin.bind(Game);

export function getBestMove(board, player) {
    const opponent = player === 'X' ? 'O' : 'X';
    
    // Evaluate function
    function minimax(testBoard, isMaximizing) {
        let result = checkWin(testBoard);
        if (result === player) return 10;
        if (result === opponent) return -10;
        if (result === 'Draw') return 0;

        if (isMaximizing) {
            let bestScore = -Infinity;
            for (let i = 0; i < 9; i++) {
                if (testBoard[i] === null) {
                    testBoard[i] = player;
                    let score = minimax(testBoard, false);
                    testBoard[i] = null;
                    bestScore = Math.max(score, bestScore);
                }
            }
            return bestScore;
        } else {
            let bestScore = Infinity;
            for (let i = 0; i < 9; i++) {
                if (testBoard[i] === null) {
                    testBoard[i] = opponent;
                    let score = minimax(testBoard, true);
                    testBoard[i] = null;
                    bestScore = Math.min(score, bestScore);
                }
            }
            return bestScore;
        }
    }

    let bestScore = -Infinity;
    let move = -1;

    for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
            board[i] = player;
            let score = minimax(board, false);
            board[i] = null;
            if (score > bestScore) {
                bestScore = score;
                move = i;
            }
        }
    }
    return move;
}

export function makeAIMove(board, aiPlayer) {
    return getBestMove([...board], aiPlayer);
}
