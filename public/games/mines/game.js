const size = 5;
let grid = [];
let totalMines = 3;
let gameOver = false;
let revealedCount = 0;

const gridEl = document.getElementById('mines-grid');
const minesInput = document.getElementById('mines-count');
const startBtn = document.getElementById('start-btn');
const cashoutBtn = document.getElementById('cashout-btn');
const msgEl = document.getElementById('message');

function initGame() {
    gridEl.innerHTML = '';
    grid = [];
    gameOver = false;
    revealedCount = 0;
    let val = parseInt(minesInput.value);
    const errObj = document.getElementById('mines-error');
    if (isNaN(val) || val < 1 || val > 24) {
        if(errObj) {
            errObj.style.display = 'block';
            setTimeout(() => errObj.style.display = 'none', 3000);
        }
        return;
    }
    if(errObj) errObj.style.display = 'none';
    totalMines = val;
    msgEl.innerHTML = '';
    cashoutBtn.disabled = true;

    // Create logical grid
    for(let i=0; i<size*size; i++) {
        grid.push({
            isMine: false,
            revealed: false,
            element: null
        });
    }

    // Plant mines
    let planted = 0;
    while(planted < totalMines) {
        let idx = Math.floor(Math.random() * grid.length);
        if(!grid[idx].isMine) {
            grid[idx].isMine = true;
            planted++;
        }
    }

    // Render grid
    grid.forEach((cell, idx) => {
        const div = document.createElement('div');
        div.className = 'mine-cell hidden';
        
        // Inner for 3D flip
        const inner = document.createElement('div');
        inner.className = 'mine-cell-inner';
        
        const front = document.createElement('div');
        front.className = 'mine-cell-front';
        
        const back = document.createElement('div');
        back.className = 'mine-cell-back';

        inner.appendChild(front);
        inner.appendChild(back);
        div.appendChild(inner);

        div.onclick = () => reveal(idx);
        cell.element = div;
        gridEl.appendChild(div);
    });
}

function reveal(idx) {
    if(gameOver || grid[idx].revealed) return;
    
    const cell = grid[idx];
    cell.revealed = true;
    cell.element.classList.remove('hidden');
    cell.element.classList.add('revealed');

    const backEl = cell.element.querySelector('.mine-cell-back');

    if(cell.isMine) {
        // Boom!
        backEl.classList.add('bomb');
        backEl.innerHTML = '💣';
        endGame(false);
    } else {
        // Gem!
        backEl.classList.add('gem');
        backEl.innerHTML = '💎';
        revealedCount++;
        cashoutBtn.disabled = false;
        
        // Win condition
        if(revealedCount === (size*size) - totalMines) {
            endGame(true);
        }
    }
}

function endGame(win) {
    gameOver = true;
    cashoutBtn.disabled = true;
    
    
    // Reveal all remaining with a nice stagger effect
    let delay = 0;
    grid.forEach(cell => {
        if(!cell.revealed) {
            setTimeout(() => {
                cell.element.classList.remove('hidden');
                cell.element.classList.add('revealed', 'dimmed');
                const backEl = cell.element.querySelector('.mine-cell-back');
                if(cell.isMine) {
                    backEl.classList.add('bomb');
                    backEl.innerHTML = '💣';
                } else {
                    backEl.classList.add('gem');
                    backEl.innerHTML = '💎';
                }
            }, delay);
            delay += 100;
        }
    });


    
}

startBtn.onclick = initGame;
cashoutBtn.onclick = () => endGame(true);

initGame();
