import { ROWS, COLS, checkWin } from './game.js';

function getDropRow(board, col) {
    for (let r = ROWS - 1; r >= 0; r--) {
        if (!board[r][col]) return r;
    }
    return null;
}

function evaluateLine(line, player, opponent) {
    let score = 0;
    let playerCount = 0;
    let emptyCount = 0;
    let oppCount = 0;

    for (let i = 0; i < 4; i++) {
        if (line[i] === player) playerCount++;
        else if (line[i] === opponent) oppCount++;
        else emptyCount++;
    }

    if (playerCount === 4) score += 100;
    else if (playerCount === 3 && emptyCount === 1) score += 5;
    else if (playerCount === 2 && emptyCount === 2) score += 2;

    if (oppCount === 3 && emptyCount === 1) score -= 4;

    return score;
}

function scorePosition(board, player) {
    let score = 0;
    const opponent = player === 'red' ? 'yellow' : 'red';

    // Center column preference
    let centerArray = [];
    for (let r = 0; r < ROWS; r++) {
        centerArray.push(board[r][Math.floor(COLS / 2)]);
    }
    score += centerArray.filter(v => v === player).length * 3;

    // Horizontal
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS - 3; c++) {
            let rowArray = [board[r][c], board[r][c+1], board[r][c+2], board[r][c+3]];
            score += evaluateLine(rowArray, player, opponent);
        }
    }

    // Vertical
    for (let r = 0; r < ROWS - 3; r++) {
        for (let c = 0; c < COLS; c++) {
            let colArray = [board[r][c], board[r+1][c], board[r+2][c], board[r+3][c]];
            score += evaluateLine(colArray, player, opponent);
        }
    }

    // Positive Sloped Diagonal
    for (let r = 0; r < ROWS - 3; r++) {
        for (let c = 0; c < COLS - 3; c++) {
            let diagArray = [board[r][c], board[r+1][c+1], board[r+2][c+2], board[r+3][c+3]];
            score += evaluateLine(diagArray, player, opponent);
        }
    }

    // Negative Sloped Diagonal
    for (let r = 0; r < ROWS - 3; r++) {
        for (let c = 0; c < COLS - 3; c++) {
            let diagArray = [board[r+3][c], board[r+2][c+1], board[r+1][c+2], board[r][c+3]];
            score += evaluateLine(diagArray, player, opponent);
        }
    }

    return score;
}

function getValidLocations(board) {
    let validLocations = [];
    for (let col = 0; col < COLS; col++) {
        if (board[0][col] === null) {
            validLocations.push(col);
        }
    }
    return validLocations;
}

function isTerminalNode(board) {
    return checkWin(board) !== null || getValidLocations(board).length === 0;
}

function minimax(board, depth, alpha, beta, maximizingPlayer, aiColor, humanColor) {
    const validLocations = getValidLocations(board);
    let isTerminal = isTerminalNode(board);

    if (depth === 0 || isTerminal) {
        if (isTerminal) {
            if (checkWin(board) === aiColor) {
                return { column: null, score: 100000000000 };
            } else if (checkWin(board) === humanColor) {
                return { column: null, score: -100000000000 };
            } else {
                return { column: null, score: 0 }; 
            }
        } else {
            return { column: null, score: scorePosition(board, aiColor) };
        }
    }

    if (maximizingPlayer) {
        let value = -Infinity;
        let column = validLocations[Math.floor(Math.random() * validLocations.length)];
        for (let col of validLocations) {
            let row = getDropRow(board, col);
            let bCopy = board.map(arr => [...arr]);
            bCopy[row][col] = aiColor;
            let newScore = minimax(bCopy, depth - 1, alpha, beta, false, aiColor, humanColor).score;
            if (newScore > value) {
                value = newScore;
                column = col;
            }
            alpha = Math.max(alpha, value);
            if (alpha >= beta) break;
        }
        return { column: column, score: value };
    } else {
        let value = Infinity;
        let column = validLocations[Math.floor(Math.random() * validLocations.length)];
        for (let col of validLocations) {
            let row = getDropRow(board, col);
            let bCopy = board.map(arr => [...arr]);
            bCopy[row][col] = humanColor;
            let newScore = minimax(bCopy, depth - 1, alpha, beta, true, aiColor, humanColor).score;
            if (newScore < value) {
                value = newScore;
                column = col;
            }
            beta = Math.min(beta, value);
            if (alpha >= beta) break;
        }
        return { column: column, score: value };
    }
}

export function makeAIMove(board, aiPlayer) {
    const humanPlayer = aiPlayer === 'red' ? 'yellow' : 'red';
    let fakeBoard = board.map(arr => [...arr]);
    
    // Depth 5 provides a strong challenge without lagging
    let result = minimax(fakeBoard, 5, -Infinity, Infinity, true, aiPlayer, humanPlayer);
    
    if (result.column === null) {
        const valid = getValidLocations(fakeBoard);
        return valid[Math.floor(Math.random() * valid.length)];
    }
    
    return result.column;
}
