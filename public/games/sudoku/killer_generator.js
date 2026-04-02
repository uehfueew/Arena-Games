export function generateSudoku(difficulty) {
    let solution = Array.from({ length: 9 }, () => Array(9).fill(0));
    fillBoard(solution);

    let maxCageSize = 5;
    if (difficulty === 'easy') maxCageSize = 2;
    else if (difficulty === 'medium') maxCageSize = 3;
    else if (difficulty === 'hard') maxCageSize = 4;
    else if (difficulty === 'master' || difficulty === 'extreme') maxCageSize = 5;

    // Group cells into cages
    let cages = generateCages(solution, maxCageSize);

    // Provide an empty puzzle board (since the player starts completely empty)
    let puzzle = Array.from({ length: 9 }, () => Array(9).fill(0));

    return { puzzle, solution, cages };
}

function fillBoard(board) {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (board[row][col] === 0) {
                let nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
                for (let num of nums) {
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
        if (board[row][i] === num || board[i][col] === num) return false;
    }
    
    let startRow = Math.floor(row / 3) * 3;
    let startCol = Math.floor(col / 3) * 3;
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            if (board[startRow + r][startCol + c] === num) return false;
        }
    }
    return true;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function generateCages(solution, maxCageSize = 5) {
    let visited = Array.from({ length: 9 }, () => Array(9).fill(false));
    let cages = [];

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (!visited[r][c]) {
                let size = Math.floor(Math.random() * (maxCageSize - 1)) + 2; 
                let cells = [[r, c]];
                let sum = solution[r][c];
                visited[r][c] = true;

                let curR = r, curC = c;
                for (let i = 1; i < size; i++) {
                    const neighbors = [];
                    if (curR > 0 && !visited[curR - 1][curC]) neighbors.push([curR - 1, curC]);
                    if (curR < 8 && !visited[curR + 1][curC]) neighbors.push([curR + 1, curC]);
                    if (curC > 0 && !visited[curR][curC - 1]) neighbors.push([curR, curC - 1]);
                    if (curC < 8 && !visited[curR][curC + 1]) neighbors.push([curR, curC + 1]);

                    if (neighbors.length > 0) {
                        const [nextR, nextC] = neighbors[Math.floor(Math.random() * neighbors.length)];
                        // check if number already in cage to respect standard Killer rules
                        let hasNum = cells.some(([cr, cc]) => solution[cr][cc] === solution[nextR][nextC]);
                        if (!hasNum) {
                            cells.push([nextR, nextC]);
                            sum += solution[nextR][nextC];
                            visited[nextR][nextC] = true;
                            curR = nextR;
                            curC = nextC;
                        } else {
                            break;
                        }
                    } else {
                        break;
                    }
                }
                cages.push({ sum, cells });
            }
        }
    }
    return cages;
}
