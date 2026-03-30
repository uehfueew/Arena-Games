import { generateSudoku } from './generator.js';

let board = [];
let initialBoard = [];
let solution = [];
let cages = [];
let notes = []; 
let selectedCell = null;
let errorCount = 0;
let mistakes = 0;
const MAX_ERRORS = 3;
let timerInterval = null;
let secondsElapsed = 0;
let time = 0;
let notesMode = false;
let currentDifficulty = 'medium';
let hintsLeft = 3;
let history = []; // for undo

window.startGame = function(difficulty) {
    if (!difficulty) difficulty = currentDifficulty;
    currentDifficulty = difficulty;
    
    // Highlight active difficulty
    document.querySelectorAll('.diff-btn').forEach(btn => {
        if(btn.textContent.toLowerCase() === difficulty) {
            btn.style.boxShadow = '0 0 10px #558B6E';
            btn.style.border = '2px solid #558B6E';
        } else {
            btn.style.boxShadow = 'none';
            btn.style.border = '2px solid transparent';
        }
    });

    const puzzleData = generateSudoku(difficulty);
    // In killer sudoku, initially the board is empty!
    board = Array.from({length: 9}, () => Array(9).fill(0));
    initialBoard = Array.from({length: 9}, () => Array(9).fill(0));
    solution = puzzleData.solution.map(row => [...row]);
    
    // Give some hints based on difficulty
    const hintsCount = difficulty === 'easy' ? 8 : difficulty === 'medium' ? 4 : 2;
    let given = 0;
    while(given < hintsCount) {
        let r = Math.floor(Math.random() * 9);
        let c = Math.floor(Math.random() * 9);
        if(initialBoard[r][c] === 0) {
            initialBoard[r][c] = solution[r][c];
            board[r][c] = solution[r][c];
            given++;
        }
    }

    notes = Array.from({length: 9}, () => Array.from({length: 9}, () => new Set()));
    errorCount = 0;
    mistakes = 0;
    secondsElapsed = 0;
    time = 0;
    hintsLeft = 3;
    history = [];
    
    document.getElementById('errorCount').textContent = '0';
    document.getElementById('timer').textContent = '00:00';
    
    let hintB = document.getElementById('hintBadge');
    if (hintB) hintB.textContent = hintsLeft;

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        secondsElapsed++;
        time = secondsElapsed;
        let m = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
        let s = (secondsElapsed % 60).toString().padStart(2, '0');
        document.getElementById('timer').textContent = `${m}:${s}`;
    }, 1000);

    generateCages();
    renderBoard();
    updateNumpad();
};

window.toggleNotes = function() {
    notesMode = !notesMode;
    const badge = document.getElementById('notesBadge');
    if (notesMode) {
        if(badge) {
            badge.textContent = 'ON';
            badge.classList.remove('bg-secondary', 'n-badge');
            badge.style.background = '#558B6E';
            badge.style.color = '#fff';
        }
    } else {
        if(badge) {
            badge.textContent = 'OFF';
            badge.style.background = '';
            badge.classList.add('n-badge');
        }
    }
}

window.undoMove = function() {
    if (history.length === 0) return;
    const lastMove = history.pop();
    board[lastMove.r][lastMove.c] = lastMove.prevVal;
    notes[lastMove.r][lastMove.c] = new Set(lastMove.prevNotes);
    updateCellsDisplay();
    refreshHighlights();
    updateNumpad();
}

window.eraseCell = function() {
    if (!selectedCell) return;
    const { r, c } = selectedCell;
    if (initialBoard[r][c] !== 0) return;
    
    history.push({ r, c, prevVal: board[r][c], prevNotes: new Set(notes[r][c]) });
    if (board[r][c] !== 0) {
        board[r][c] = 0;
    } else {
        notes[r][c].clear();
    }
    updateCellsDisplay();
    refreshHighlights();
    updateNumpad();
}

window.useHint = function() {
    if (hintsLeft <= 0 || !selectedCell) return;
    const { r, c } = selectedCell;
    if (board[r][c] !== 0) return;
    
    hintsLeft--;
    let hintB = document.getElementById('hintBadge');
    if (hintB) hintB.textContent = hintsLeft;
    
    history.push({ r, c, prevVal: board[r][c], prevNotes: new Set(notes[r][c]) });
    board[r][c] = solution[r][c];
    
    updateCellsDisplay();
    refreshHighlights();
    updateNumpad();
    checkWinCondition();
}

function renderBoard() {
    const boardEl = document.getElementById('sudokuBoard');
    boardEl.innerHTML = '';
    
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const cell = document.createElement('div');
            cell.className = 'sudoku-cell';
            cell.dataset.row = r;
            cell.dataset.col = c;

            // 3x3 Block borders
            if (c === 2 || c === 5) cell.classList.add('border-r');
            if (r === 2 || r === 5) cell.classList.add('border-b');
            
            // Cage borders & colors
            let { borders, cage } = getCageBorders(r, c);
            if(cage) {
                cell.style.backgroundColor = cage.color + '40'; // semi transparent tint
                
                if(borders.top) cell.style.borderTop = '2px dashed ' + cage.color;
                if(borders.bottom) cell.style.borderBottom = '2px dashed ' + cage.color;
                if(borders.left) cell.style.borderLeft = '2px dashed ' + cage.color;
                if(borders.right) cell.style.borderRight = '2px dashed ' + cage.color;
                
                // Cage Sum text (only top leftmost cell of the cage)
                let isTopLeft = true;
                for(let caCell of cage.cells) {
                    if(caCell[0] < r || (caCell[0] === r && caCell[1] < c)) {
                        isTopLeft = false; break;
                    }
                }
                if(isTopLeft) {
                    const sumSpan = document.createElement('div');
                    sumSpan.className = 'cage-sum';
                    sumSpan.textContent = cage.sum;
                    sumSpan.style.color = '#fff';
                    sumSpan.style.textShadow = '0 0 2px #000, 0 0 2px #000';
                    sumSpan.style.position = 'absolute';
                    sumSpan.style.top = '2px';
                    sumSpan.style.left = '2px';
                    sumSpan.style.fontSize = '0.7rem';
                    sumSpan.style.lineHeight = '1';
                    sumSpan.style.zIndex = '1';
                    cell.appendChild(sumSpan);
                }
            }

            cell.addEventListener('mousedown', () => selectCell(r, c));
            boardEl.appendChild(cell);
        }
    }
    updateCellsDisplay();
}

function updateCellsDisplay() {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const cell = document.querySelector(`.sudoku-cell[data-row="${r}"][data-col="${c}"]`);
            if (!cell) continue;

            const val = board[r][c];
            // Clear existing main value / notes
            Array.from(cell.childNodes).forEach(child => {
                if (child.className !== 'cage-sum') {
                    cell.removeChild(child);
                }
            });
            
            const cellContent = document.createElement('span');
            cellContent.className = 'cell-content';
            
            if (initialBoard[r][c] !== 0) {
                cellContent.textContent = val;
                cell.classList.add('fixed');
            } else if (val !== 0) {
                cellContent.textContent = val;
                cell.classList.remove('fixed');
                cellContent.style.color = '#88D49E'; 
            } else {
                cell.classList.remove('fixed');
                if (notes[r][c].size > 0) {
                    const notesGrid = document.createElement('div');
                    notesGrid.className = 'notes-grid';
                    for (let n = 1; n <= 9; n++) {
                        const noteDiv = document.createElement('div');
                        noteDiv.className = 'note-num';
                        if (notes[r][c].has(n)) {
                            noteDiv.textContent = n;
                        }
                        notesGrid.appendChild(noteDiv);
                    }
                    cell.appendChild(notesGrid);
                }
            }
            if(cellContent.textContent) cell.appendChild(cellContent);
        }
    }
    refreshHighlights();
}

function selectCell(r, c) {
    selectedCell = { r, c };
    refreshHighlights();
}

function refreshHighlights() {
    const cells = document.querySelectorAll('.sudoku-cell');
    cells.forEach(el => el.classList.remove('selected', 'highlight', 'highlight-match'));

    if (!selectedCell) return;
    const { r, c } = selectedCell;
    const selectedVal = board[r][c];

    cells.forEach(el => {
        let elR = parseInt(el.dataset.row);
        let elC = parseInt(el.dataset.col);

        if (selectedVal !== 0 && board[elR][elC] === selectedVal) {
            el.classList.add('highlight-match');
        }
        let inRow = (elR === r);
        let inCol = (elC === c);
        let inBox = (Math.floor(elR/3) === Math.floor(r/3) && Math.floor(elC/3) === Math.floor(c/3));

        if (inRow || inCol || inBox) el.classList.add('highlight');
        if (elR === r && elC === c) {
            el.classList.remove('highlight');
            el.classList.add('selected');
        }
    });

    let { cage } = getCageBorders(r, c);
    if(cage) {
        cells.forEach(el => {
            let elR = parseInt(el.dataset.row);
            let elC = parseInt(el.dataset.col);
            if(cage.cells.some(cell => cell[0] === elR && cell[1] === elC)) {
                 el.classList.add('highlight');     
            }
        });
    }
}

window.inputNumber = function(num) {
    if (!selectedCell) return;
    const { r, c } = selectedCell;
    if (initialBoard[r][c] !== 0) return;
    if (board[r][c] !== 0 && num !== 0) return; 

    if (num === 0) {
        window.eraseCell();
        return;
    }

    if (notesMode) {
        history.push({ r, c, prevVal: board[r][c], prevNotes: new Set(notes[r][c]) });
        if (notes[r][c].has(num)) {
            notes[r][c].delete(num);
        } else {
            notes[r][c].add(num);
        }
        updateCellsDisplay();
    } else {
        history.push({ r, c, prevVal: board[r][c], prevNotes: new Set(notes[r][c]) });
        if (num === solution[r][c]) {
            board[r][c] = num;
            for (let i = 0; i < 9; i++) {
                notes[r][i].delete(num);
                notes[i][c].delete(num);
            }
            let br = Math.floor(r/3)*3;
            let bc = Math.floor(c/3)*3;
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    notes[br+i][bc+j].delete(num);
                }
            }
            
            // clear notes inside same cage
            let { cage } = getCageBorders(r, c);
            if(cage) {
                cage.cells.forEach(cell => {
                    notes[cell[0]][cell[1]].delete(num);
                });
            }
            
            updateCellsDisplay();
            refreshHighlights();
            updateNumpad();
            checkWinCondition();
        } else {
            errorCount++;
            mistakes++;
            document.getElementById('errorCount').textContent = errorCount;
            const cellEl = document.querySelector(`.sudoku-cell[data-row="${r}"][data-col="${c}"]`);
            // temporarily show error
            const errSpan = document.createElement('span');
            errSpan.textContent = num;
            errSpan.style.color = 'var(--text-error, #FF6B6B)';
            errSpan.className = 'error-anim cell-content';
            cellEl.appendChild(errSpan);

            setTimeout(() => {
                if(cellEl.contains(errSpan)) cellEl.removeChild(errSpan);
                updateCellsDisplay(); 
                if (errorCount >= MAX_ERRORS) {
                    endGame('Game Over! Too many mistakes.', 'loss', 0);
                }
            }, 600);
        }
    }
}

document.addEventListener('keydown', (e) => {
    if (e.key >= '1' && e.key <= '9') {
        window.inputNumber(parseInt(e.key));
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
        window.inputNumber(0);
    } else if (e.key.toLowerCase() === 'n') {
        window.toggleNotes();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (!selectedCell) return;
        let {r, c} = selectedCell;
        if (e.key === 'ArrowUp') r = Math.max(0, r-1);
        if (e.key === 'ArrowDown') r = Math.min(8, r+1);
        if (e.key === 'ArrowLeft') c = Math.max(0, c-1);
        if (e.key === 'ArrowRight') c = Math.min(8, c+1);
        selectCell(r, c);
    }
});

function checkWinCondition() {
    let won = true;
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r][c] !== solution[r][c]) {
                won = false; break;
            }
        }
    }
    if (won) {
        endGame('Puzzle Solved!', 'win', secondsElapsed);
    }
}

function endGame(msg, result, score = 0) {
    clearInterval(timerInterval);
    const scoreText = document.getElementById('gameOverText');
    if(scoreText) scoreText.textContent = msg;
    
    const overlay = document.getElementById('overlay');
    if(overlay) overlay.style.display = 'flex';

    // Submit the win logic
    const username = localStorage.getItem('username');
    if (username) {
        fetch('/api/record-sudoku-stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username, 
                difficulty: currentDifficulty,
                result: result, 
                usedHints: 3 - hintsLeft,
                mistakes: mistakes,
                timeFinished: time
            })
        }).catch(e => console.error(e));
        
        // Also update the global match history
        fetch('/api/record-match', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, game: 'killersudoku', result, score: result === 'win' ? (9999 - time) : 0 })
        }).catch(e => console.error(e));
    }
}

window.returnHome = function() {
    window.location.href = '../index.html';
}

window.restartGameMode = function() {
    const overlay = document.getElementById('overlay');
    if(overlay) overlay.style.display = 'none';
    window.startGame();
}

function updateNumpad() {
    let counts = {1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0};
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r][c] !== 0) {
                counts[board[r][c]]++;
            }
        }
    }
    for (let i = 1; i <= 9; i++) {
        let btn = document.getElementById('btn-' + i);
        if (btn) {
            if (counts[i] === 9) {
                btn.classList.add('done');
                btn.innerHTML = '<i class="bi bi-check2"></i>';
                btn.disabled = true;
            } else {
                btn.classList.remove('done');
                btn.innerHTML = i;
                btn.disabled = false;
            }
        }
    }
}

function generateCages() {
    cages = [];
    let visited = Array.from({length:9}, () => Array(9).fill(false));
    
    // Using 9 distinct colors for cages, making sure neighbors are different
    const colors = [
        '#FF595E', '#FFCA3A', '#8AC926', '#1982C4', '#6A4C93',
        '#F15BB5', '#00BBF9', '#00F5D4', '#FEE440', '#E56B6F'
    ];
    let colorIdx = 0;

    for(let r=0; r<9; r++) {
        for(let c=0; c<9; c++) {
            if(!visited[r][c]) {
                let cageCells = [];
                let cageSum = 0;
                let size = Math.floor(Math.random() * 4) + 2; 
                let q = [[r,c]];
                while(q.length > 0 && cageCells.length < size) {
                    let [cr, cc] = q.shift();
                    if(!visited[cr][cc]) {
                        visited[cr][cc] = true;
                        cageCells.push([cr, cc]);
                        cageSum += solution[cr][cc];
                        
                        let neighbors = [];
                        if(cr>0) neighbors.push([cr-1, cc]);
                        if(cr<8) neighbors.push([cr+1, cc]);
                        if(cc>0) neighbors.push([cr, cc-1]);
                        if(cc<8) neighbors.push([cr, cc+1]);
                        
                        neighbors.sort(() => Math.random() - 0.5);
                        for(let n of neighbors) {
                            if(!visited[n[0]][n[1]]) q.push(n);
                        }
                    }
                }

                // If less than 2 cells, merge it somehow later or skip
                if(cageCells.length === 0) continue;

                cages.push({
                    cells: cageCells,
                    sum: cageSum,
                    color: colors[colorIdx % colors.length]
                });
                colorIdx++;
            }
        }
    }
}

function getCageBorders(r, c) {
    let cage = cages.find(ca => ca.cells.some(cell => cell[0] === r && cell[1] === c));
    if(!cage) return {borders: {top:true, bottom:true, left:true, right:true}, cage: null};
    
    let cageCells = cage.cells;
    let borders = { top:true, bottom:true, left:true, right:true };
    if(cageCells.some(cell => cell[0] === r-1 && cell[1] === c)) borders.top = false;
    if(cageCells.some(cell => cell[0] === r+1 && cell[1] === c)) borders.bottom = false;
    if(cageCells.some(cell => cell[0] === r && cell[1] === c-1)) borders.left = false;
    if(cageCells.some(cell => cell[0] === r && cell[1] === c+1)) borders.right = false;
    return { borders, cage };
}

// In case startGame wasn't called manually
if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.startGame());
} else {
    window.startGame();
}
