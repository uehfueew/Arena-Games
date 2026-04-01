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

export function makeAIMove(board, aiPlayer, difficulty = 2) {
    const best = getBestMove([...board], aiPlayer);
    
    // Difficulty logic:
    // 1 (Easy): 30% best move, 70% random
    // 2 (Medium): 60% best move, 40% random
    // 3 (Hard): 85% best move, 15% random
    // 4 (Expert): 95% best move, 5% random
    // 5 (Grandmaster): 100% perfect play
    
    let threshold = 1.0;
    if (difficulty === 1) threshold = 0.3;
    else if (difficulty === 2) threshold = 0.6;
    else if (difficulty === 3) threshold = 0.85;
    else if (difficulty === 4) threshold = 0.95;
    else if (difficulty === 5) threshold = 1.0;
    
    if (Math.random() < threshold) {
        return best;
    } else {
        const empty = [];
        for(let i=0; i<9; i++) if(board[i] === null) empty.push(i);
        if (empty.length === 0) return -1;
        return empty[Math.floor(Math.random() * empty.length)];
    }
}
