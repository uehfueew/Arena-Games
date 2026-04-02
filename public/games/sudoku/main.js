import { generateSudoku } from './generator.js';
import { generateSudoku as generateKillerSudoku } from './killer_generator.js';
import { config } from '../../main.js';

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
let isPaused = false;
let currentDifficulty = 'medium';
let hintsLeft = 3;
let history = []; // for undo


function getCellElement(r, c) {
    return document.querySelector(`.sudoku-cell[data-row="${r}"][data-col="${c}"]`);
}
function drawCages() {
    if (!cages || cages.length === 0) return;
    
    document.querySelectorAll('.cageDiv').forEach(el => el.remove());
    document.querySelectorAll('.cage-sum').forEach(el => el.remove());
    
    // Clear old hacky border styles, keeping layout clean
    document.querySelectorAll('.sudoku-cell').forEach(c => {
        if(c.dataset.origBorderTop !== undefined) {
            c.style.removeProperty('border-top');
            delete c.dataset.origBorderTop;
        }
        if(c.dataset.origBorderBottom !== undefined) {
            c.style.removeProperty('border-bottom');
            delete c.dataset.origBorderBottom;
        }
        if(c.dataset.origBorderLeft !== undefined) {
            c.style.removeProperty('border-left');
            delete c.dataset.origBorderLeft;
        }
        if(c.dataset.origBorderRight !== undefined) {
            c.style.removeProperty('border-right');
            delete c.dataset.origBorderRight;
        }
    });

    const BORDER = '2px dashed rgba(255, 255, 255, 0.6)';
    
    cages.forEach(cage => {
        let minR = 9, minC = 9;
        cage.cells.forEach(([r, c]) => {
            if (r < minR || (r === minR && c < minC)) { minR = r; minC = c; }
            let cell = getCellElement(r, c);
            if(!cell) return;
            
            let cageDiv = document.createElement('div');
            cageDiv.className = 'cageDiv';
            cageDiv.style.position = 'absolute';
            cageDiv.style.top = '3px';
            cageDiv.style.left = '3px';
            cageDiv.style.right = '3px';
            cageDiv.style.bottom = '3px';
            cageDiv.style.pointerEvents = 'none';
            cageDiv.style.zIndex = '1';
            cageDiv.style.boxSizing = 'border-box';
            
            cageDiv.style.borderTop = '2px solid transparent';
            cageDiv.style.borderBottom = '2px solid transparent';
            cageDiv.style.borderLeft = '2px solid transparent';
            cageDiv.style.borderRight = '2px solid transparent';
            
            if (!cage.cells.find(([rr, cc]) => rr === r - 1 && cc === c)) cageDiv.style.borderTop = BORDER;
            if (!cage.cells.find(([rr, cc]) => rr === r + 1 && cc === c)) cageDiv.style.borderBottom = BORDER;
            if (!cage.cells.find(([rr, cc]) => rr === r && cc === c - 1)) cageDiv.style.borderLeft = BORDER;
            if (!cage.cells.find(([rr, cc]) => rr === r && cc === c + 1)) cageDiv.style.borderRight = BORDER;
            
            cell.appendChild(cageDiv);
        });
        
        let topCell = getCellElement(minR, minC);
        if (topCell) {
            let sumDiv = document.createElement('div');
            sumDiv.className = 'cage-sum';
            sumDiv.textContent = cage.sum;
            sumDiv.style.position = 'absolute';
            sumDiv.style.top = '3px';
            sumDiv.style.left = '4px';
            sumDiv.style.fontSize = '0.65rem';
            sumDiv.style.color = 'rgba(255, 255, 255, 0.8)';
            sumDiv.style.fontWeight = 'bold';
            sumDiv.style.pointerEvents = 'none';
            sumDiv.style.zIndex = '2';
            sumDiv.style.lineHeight = '1';
            topCell.appendChild(sumDiv);
        }
    });
}
    
window.switchMode = function(mode) {
    if (!window.currentSudokuMode) window.currentSudokuMode = 'classic';
    window.currentSudokuMode = mode;
    
    document.querySelectorAll('.mode-btn').forEach(btn => {
        if(btn.id === 'mode-' + mode) {
            btn.classList.add('active');
            btn.style.background = '';
            btn.style.border = '';
            btn.style.boxShadow = '';
        } else {
            btn.classList.remove('active');
            btn.style.background = '';
            btn.style.border = '';
            btn.style.boxShadow = '';
        }
    });

    let diffExtreme = document.getElementById('diff-extreme');
    if (mode === 'killer') {
        if (diffExtreme) diffExtreme.style.display = 'none';
        if (currentDifficulty === 'extreme') currentDifficulty = 'hard';
    } else {
        if (diffExtreme) diffExtreme.style.display = 'inline-block';
    }
    
    window.startGame(currentDifficulty);
};

window.startGame = function(difficulty) {
    if (!difficulty) difficulty = currentDifficulty;
    currentDifficulty = difficulty;
    let mode = window.currentSudokuMode || 'classic';
    
    // Highlight active difficulty
    document.querySelectorAll('.diff-btn').forEach(btn => {
        if(btn.textContent.toLowerCase() === difficulty) {
            btn.classList.add('active');
            btn.style.boxShadow = '';
            btn.style.border = '';
            btn.style.background = '';
        } else {
            btn.classList.remove('active');
            btn.style.boxShadow = '';
            btn.style.border = '';
            btn.style.background = '';
        }
    });

    let puzzleData;
    if (mode === 'killer') {
        puzzleData = generateKillerSudoku(difficulty === 'extreme' ? 'master' : difficulty);
        board = Array.from({length: 9}, () => Array(9).fill(0));
        initialBoard = Array.from({length: 9}, () => Array(9).fill(0));
        solution = puzzleData.solution.map(row => [...row]);
        cages = puzzleData.cages;
        
        let targetGivens = 0;
        if (difficulty === 'easy') targetGivens = 15;
        else if (difficulty === 'medium') targetGivens = 7;
        else if (difficulty === 'hard') targetGivens = 2;
        else targetGivens = 0; // master/extreme = 0 givens
        
        let given = 0;
        let maxTries = 1000;
        while(given < targetGivens && maxTries > 0) {
            maxTries--;
            let r = Math.floor(Math.random() * 9);
            let c = Math.floor(Math.random() * 9);
            if (board[r][c] === 0) {
                board[r][c] = solution[r][c];
                initialBoard[r][c] = solution[r][c];
                given++;
            }
        }
    } else {
        puzzleData = generateSudoku(difficulty);
        board = puzzleData.puzzle.map(row => [...row]);
        initialBoard = puzzleData.puzzle.map(row => [...row]);
        solution = puzzleData.solution.map(row => [...row]);
        cages = [];
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
        if(!isPaused) {
            secondsElapsed++;
            time = secondsElapsed;
            let m = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
            let s = (secondsElapsed % 60).toString().padStart(2, '0');
            document.getElementById('timer').textContent = `${m}:${s}`;
        }
    }, 1000);

    renderBoard();
    if (cages && cages.length > 0) {
        drawCages();
    }
    updateNumpad();
}

window.toggleNotes = function() {
    notesMode = !notesMode;
    const badge = document.getElementById('notesBadge');
    const btn = document.getElementById('notesBtn');
    if (notesMode) {
        if(badge) {
            badge.textContent = 'ON';
            badge.classList.remove('bg-secondary', 'n-badge');
            badge.style.background = '#6c5ce7';
            badge.style.color = '#fff';
        }
        if(btn) btn.style.borderColor = '#a29bfe';
    } else {
        if(badge) {
            badge.textContent = 'OFF';
            badge.style.background = '';
            badge.classList.add('n-badge');
        }
        if(btn) btn.style.borderColor = 'rgba(255,255,255,0.1)';
    }
}

window.undoMove = function() {
    if (isPaused) return;
    if (history.length === 0) return;
    const lastMove = history.pop();
    board[lastMove.r][lastMove.c] = lastMove.prevVal;
    notes[lastMove.r][lastMove.c] = new Set(lastMove.prevNotes);
    updateCellsDisplay();
    refreshHighlights();
    updateNumpad();
}

window.eraseCell = function() {
    if (isPaused) return;
    if (!selectedCell) return;
    const { r, c } = selectedCell;
    if (initialBoard[r][c] !== 0) return; // Cant erase givens
    
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
    if (isPaused) return;
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

            if (c === 2 || c === 5) cell.classList.add('border-r');
            if (r === 2 || r === 5) cell.classList.add('border-b');

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
            cell.innerHTML = '';
            
            if (initialBoard[r][c] !== 0) {
                cell.textContent = val;
                cell.classList.add('fixed');
            } else if (val !== 0) {
                cell.textContent = val;
                cell.classList.remove('fixed');
                cell.style.color = '#88D49E'; 
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
        }
    }
    refreshHighlights();
    if (cages && cages.length > 0) {
        drawCages();
    }
}

function selectCell(r, c) {
    if (isPaused) return;
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
}

window.inputNumber = function(num) {
    if (isPaused) return;
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
            updateCellsDisplay();
            refreshHighlights();
            updateNumpad();
            checkWinCondition();
        } else {
            errorCount++;
            mistakes++;
            document.getElementById('errorCount').textContent = errorCount;
            const cellEl = document.querySelector(`.sudoku-cell[data-row="${r}"][data-col="${c}"]`);
            cellEl.textContent = num;
            cellEl.style.color = 'var(--text-error)';
            cellEl.classList.add('error-anim');

            setTimeout(() => {
                cellEl.style.color = '';
                cellEl.classList.remove('error-anim');
                updateCellsDisplay(); 
                if (errorCount >= MAX_ERRORS) {
                    endGame('Game Over! Too many mistakes.', 'loss', 0);
                }
            }, 600);
        }
    }
}

document.addEventListener('keydown', (e) => {
    if (isPaused) return;
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
    
    const overlayBtn = document.getElementById('overlayBtn');
    if(overlayBtn) {
        overlayBtn.textContent = 'Play Again';
        overlayBtn.onclick = window.restartGameMode;
    }

    const overlay = document.getElementById('overlay');
    if(overlay) overlay.style.display = 'flex';

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
        
        fetch('/api/record-match', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, game: 'sudoku', result, score: result === 'win' ? (9999 - time) : 0 })
        }).catch(e => console.error(e));
    }
}

window.returnHome = function() {
    window.location.href = '../index.html';
}

window.togglePause = function() {
    isPaused = !isPaused;
    const overlay = document.getElementById('overlay');
    const scoreText = document.getElementById('gameOverText');
    const pauseIcon = document.getElementById('pauseIcon');
    const overlayBtn = document.getElementById('overlayBtn');
    
    if (isPaused) {
        if(scoreText) scoreText.textContent = 'Game Paused';
        if(overlayBtn) {
            overlayBtn.textContent = 'Resume';
            overlayBtn.onclick = window.togglePause;
        }
        if(overlay) overlay.style.display = 'flex';
        if(pauseIcon) pauseIcon.className = 'bi bi-play-fill';
    } else {
        if(overlay) overlay.style.display = 'none';
        if(pauseIcon) pauseIcon.className = 'bi bi-pause-fill';
    }
}

window.restartGameMode = function() {
    const overlay = document.getElementById('overlay');
    if(overlay) overlay.style.display = 'none';
    isPaused = false;
    const pauseIcon = document.getElementById('pauseIcon');
    if(pauseIcon) pauseIcon.className = 'bi bi-pause-fill';
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

document.addEventListener('DOMContentLoaded', () => {
    window.switchMode('classic');
});
