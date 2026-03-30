// Sudoku Generator & Solver

export function generateSudoku(difficulty) {
    let board = Array.from({ length: 9 }, () => Array(9).fill(0));
    fillBoard(board);
    
    let solution = JSON.parse(JSON.stringify(board));
    
    let attempts = 0;
    switch(difficulty) {
        case 'easy': attempts = 30; break;
        case 'medium': attempts = 45; break;
        case 'hard': attempts = 55; break;
        case 'extreme': attempts = 64; break;
        default: attempts = 40;
    }

    removeCells(board, attempts);

    return { puzzle: board, solution: solution };
}

function fillBoard(board) {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (board[row][col] === 0) {
                let numbers = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
                for (let num of numbers) {
                    if (isValid(board, row, col, num)) {
                        board[row][col] = num;
                        if (fillBoard(board)) {
                            return true;
                        }
                        board[row][col] = 0;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

function isValid(board, row, col, num) {
    for (let i = 0; i < 9; i++) {
        if (board[row][i] === num) return false;
        if (board[i][col] === num) return false;
    }
    let startRow = Math.floor(row / 3) * 3;
    let startCol = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (board[startRow + i][startCol + j] === num) return false;
        }
    }
    return true;
}

function removeCells(board, count) {
    let removed = 0;
    let attemptsLimit = 150;
    
    while (removed < count && attemptsLimit > 0) {
        attemptsLimit--;
        let row = Math.floor(Math.random() * 9);
        let col = Math.floor(Math.random() * 9);
        if (board[row][col] !== 0) {
            let backup = board[row][col];
            board[row][col] = 0;
            
            let solutions = 0;
            function countSolutions(b) {
                if (solutions > 1) return;
                for (let r = 0; r < 9; r++) {
                    for (let c = 0; c < 9; c++) {
                        if (b[r][c] === 0) {
                            for (let n = 1; n <= 9; n++) {
                                if (isValid(b, r, c, n)) {
                                    b[r][c] = n;
                                    countSolutions(b);
                                    b[r][c] = 0;
                                }
                            }
                            return;
                        }
                    }
                }
                solutions++;
            }
            
            let boardCopy = JSON.parse(JSON.stringify(board));
            countSolutions(boardCopy);
            
            if (solutions !== 1) {
                board[row][col] = backup;
            } else {
                removed++;
            }
        }
    }
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}