const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');
let cols, rows;
let cellSize;
let grid = [];
let player = { x: 0, y: 0 };
let exit = { x: 0, y: 0 };
let mazeReady = false;
let timeElapsed = 0;
let timerInt = null;

class Cell {
    constructor(i, j) {
        this.i = i;
        this.j = j;
        this.walls = [true, true, true, true]; // top, right, bottom, left
        this.visited = false;
    }
    show() {
        let x = this.i * cellSize;
        let y = this.j * cellSize;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";

        if (this.walls[0]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + cellSize, y); ctx.stroke(); }
        if (this.walls[1]) { ctx.beginPath(); ctx.moveTo(x + cellSize, y); ctx.lineTo(x + cellSize, y + cellSize); ctx.stroke(); }
        if (this.walls[2]) { ctx.beginPath(); ctx.moveTo(x + cellSize, y + cellSize); ctx.lineTo(x, y + cellSize); ctx.stroke(); }
        if (this.walls[3]) { ctx.beginPath(); ctx.moveTo(x, y + cellSize); ctx.lineTo(x, y); ctx.stroke(); }
    }
}

function index(i, j) {
    if (i < 0 || j < 0 || i > cols - 1 || j > rows - 1) return -1;
    return i + j * cols;
}

window.startGame = function(size) {
    document.getElementById('setupScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';
    document.getElementById('levelDisplay').textContent = size === 10 ? '1' : size === 20 ? '2' : '3';
    
    cols = size;
    rows = size;
    cellSize = canvas.width / cols;
    grid = [];
    
    for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
            grid.push(new Cell(i, j));
        }
    }
    generateMaze();
    
    player.x = 0;
    player.y = 0;
    exit.x = cols - 1;
    exit.y = rows - 1;
    mazeReady = true;

    timeElapsed = 0;
    clearInterval(timerInt);
    timerInt = setInterval(() => {
        timeElapsed++;
        let m = Math.floor(timeElapsed / 60).toString().padStart(2, '0');
        let s = (timeElapsed % 60).toString().padStart(2, '0');
        document.getElementById('timerDisplay').textContent = `${m}:${s}`;
    }, 1000);

    draw();
};

function generateMaze() {
    let current = grid[0];
    current.visited = true;
    let stack = [];
    
    // Recursive Backtracker algorithm synchronously for instant generation
    while (true) {
        let neighbors = [];
        let r, c;
        
        // top
        c = current.i; r = current.j - 1;
        if(r >= 0 && !grid[index(c,r)].visited) neighbors.push({cell: grid[index(c,r)], dir: 0});
        // right
        c = current.i + 1; r = current.j;
        if(c < cols && !grid[index(c,r)].visited) neighbors.push({cell: grid[index(c,r)], dir: 1});
        // bottom
        c = current.i; r = current.j + 1;
        if(r < rows && !grid[index(c,r)].visited) neighbors.push({cell: grid[index(c,r)], dir: 2});
        // left
        c = current.i - 1; r = current.j;
        if(c >= 0 && !grid[index(c,r)].visited) neighbors.push({cell: grid[index(c,r)], dir: 3});

        if (neighbors.length > 0) {
            let next = neighbors[Math.floor(Math.random() * neighbors.length)];
            stack.push(current);
            // remove walls
            current.walls[next.dir] = false;
            next.cell.walls[(next.dir + 2) % 4] = false;
            
            current = next.cell;
            current.visited = true;
        } else if (stack.length > 0) {
            current = stack.pop();
        } else {
            break;
        }
    }
}

function draw() {
    if (!mazeReady) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw cells (walls)
    for (let i = 0; i < grid.length; i++) {
        grid[i].show();
    }
    
    // Draw Exit
    ctx.fillStyle = "rgba(0, 255, 0, 0.6)";
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#0f0";
    ctx.fillRect(exit.x * cellSize + 2, exit.y * cellSize + 2, cellSize - 4, cellSize - 4);
    
    // Draw Player
    ctx.fillStyle = "rgba(0, 150, 255, 0.9)";
    ctx.shadowColor = "#0096ff";
    ctx.beginPath();
    ctx.arc(player.x * cellSize + cellSize/2, player.y * cellSize + cellSize/2, cellSize/3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
}

window.addEventListener('keydown', (e) => {
    if (!mazeReady) return;
    let moved = false;
    let currCell = grid[index(player.x, player.y)];
    
    if ((e.key === 'ArrowUp' || e.key === 'w') && !currCell.walls[0]) {
        player.y--; moved = true;
    } else if ((e.key === 'ArrowRight' || e.key === 'd') && !currCell.walls[1]) {
        player.x++; moved = true;
    } else if ((e.key === 'ArrowDown' || e.key === 's') && !currCell.walls[2]) {
        player.y++; moved = true;
    } else if ((e.key === 'ArrowLeft' || e.key === 'a') && !currCell.walls[3]) {
        player.x--; moved = true;
    }

    if (moved) {
        e.preventDefault();
        draw();
        if (player.x === exit.x && player.y === exit.y) {
            mazeReady = false;
            clearInterval(timerInt);
            document.getElementById('gameOverText').textContent = "Escaped in " + document.getElementById('timerDisplay').textContent;
            document.getElementById('overlay').style.display = 'flex';
        }
    }
});