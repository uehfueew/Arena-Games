const canvas = document.getElementById('maze-canvas');
const ctx = canvas.getContext('2d');
const username = localStorage.getItem('username');
if (username) document.getElementById('nav-username').innerHTML = `<i class="bi bi-person-circle"></i> ${username}`;

let currentLevel = 1;
let maxUnlockedLevel = 1;
const TOTAL_LEVELS = 30;

let maze = [];
let cols, rows;
let cellSize;
let player = { x: 0, y: 0 };
let goal = { x: 0, y: 0 };
let teleporters = [];
let levelData = {};

let animating = false;
let frameCount = 0;

// Initialize directly to the roadmap
async function initApp() {
    if (username) {
        try {
            const res = await fetch(`/api/maze/progress?username=${username}`);
            const data = await res.json();
            if (data.max_level) maxUnlockedLevel = data.max_level;
        } catch(e) {}
    }
    generateRoadmap(); // Draw the roadmap overlay UI
    startLevel(maxUnlockedLevel); // Load the level underneath quietly
}

function getLevelParams(level) {
    let size = 5 + level; // Level 1 is 6x6, level 30 is 35x35
    if (size > 40) size = 40;
    
    let isFog = level >= 6 && level <= 10;
    let isIce = level >= 11 && level <= 15;
    let hasTeleporters = level >= 16 && level <= 20;
    let isMixed = level > 20;
    
    if (isMixed) {
        isFog = level % 2 === 0;
        hasTeleporters = level % 3 === 0;
        isIce = level % 4 === 0;
    }
    
    let title = "Maze Walker";
    if (isFog) title = "Foggy Depths";
    if (isIce) title = "Ice Caverns";
    if (hasTeleporters) title = "Portal Dimensions";
    if (isMixed) title = "Chaos Chambers";
    if (level === 1) title = "The Beginning";
    if (level === 30) title = "The Final Trial";

    return { size, isFog, isIce, hasTeleporters, title };
}

function startLevel(level) {
    currentLevel = level;
    levelData = getLevelParams(level);
    document.getElementById('level-indicator').innerText = `Level ${level}: ${levelData.title}`;
    document.getElementById('win-screen').classList.remove('visible');
    
    cols = levelData.size;
    rows = levelData.size;
    cellSize = Math.floor(canvas.width / cols);
    
    generateMaze();
    
    player = { x: 0, y: 0 };
    goal = { x: cols - 1, y: rows - 1 };
    
    teleporters = [];
    if (levelData.hasTeleporters) {
        let portalCount = Math.min(4, Math.floor(level / 4));
        for(let i=0; i<portalCount; i++) {
            let t1 = { x: Math.floor(Math.random()*(cols-2))+1, y: Math.floor(Math.random()*(rows-2))+1 };
            let t2 = { x: Math.floor(Math.random()*(cols-2))+1, y: Math.floor(Math.random()*(rows-2))+1 };
            let c = `hsl(${Math.random()*360}, 100%, 60%)`;
            teleporters.push({ x: t1.x, y: t1.y, tx: t2.x, ty: t2.y, color: c });
            teleporters.push({ x: t2.x, y: t2.y, tx: t1.x, ty: t1.y, color: c });
        }
    }
    
    if (!animating) {
        animating = true;
        requestAnimationFrame(gameLoop);
    }
}

// Generate a heavily branched, multi-path maze
function generateMaze() {
    maze = [];
    for (let y = 0; y < rows; y++) {
        let row = [];
        for (let x = 0; x < cols; x++) {
            row.push({ x, y, walls: [true, true, true, true], visited: false });
        }
        maze.push(row);
    }
    
    let active = [maze[0][0]];
    maze[0][0].visited = true;
    
    let branchFactor = currentLevel / TOTAL_LEVELS; // Scales from ~0 to 1
    
    // Early levels easier (long paths). Later levels harder (many short confusing dead-ends).
    while(active.length > 0) {
        let useDFS = Math.random() > (branchFactor * 0.85); 
        let idx = useDFS ? active.length - 1 : Math.floor(Math.random() * active.length);
        let current = active[idx];
        
        let neighbors = [];
        let {x, y} = current;
        if (y > 0 && !maze[y-1][x].visited) neighbors.push({cell: maze[y-1][x], dir: 0, opp: 2});
        if (x < cols-1 && !maze[y][x+1].visited) neighbors.push({cell: maze[y][x+1], dir: 1, opp: 3});
        if (y < rows-1 && !maze[y+1][x].visited) neighbors.push({cell: maze[y+1][x], dir: 2, opp: 0});
        if (x > 0 && !maze[y][x-1].visited) neighbors.push({cell: maze[y][x-1], dir: 3, opp: 1});
        
        if (neighbors.length > 0) {
            let next = neighbors[Math.floor(Math.random() * neighbors.length)];
            current.walls[next.dir] = false;
            next.cell.walls[next.opp] = false;
            next.cell.visited = true;
            active.push(next.cell);
        } else {
            active.splice(idx, 1);
        }
    }
    
    // Create extra routes (loops) making it a true unpredictable maze
    let loops = Math.floor(cols * rows * (0.01 + branchFactor * 0.05)); 
    for(let i=0; i<loops; i++) {
        let x = Math.floor(Math.random() * (cols-2)) + 1;
        let y = Math.floor(Math.random() * (rows-2)) + 1;
        let dir = Math.floor(Math.random() * 4);
        let cell = maze[y][x];
        if (dir === 0 && y > 0) { cell.walls[0] = false; maze[y-1][x].walls[2] = false; }
        if (dir === 1 && x < cols-1) { cell.walls[1] = false; maze[y][x+1].walls[3] = false; }
        if (dir === 2 && y < rows-1) { cell.walls[2] = false; maze[y+1][x].walls[0] = false; }
        if (dir === 3 && x > 0) { cell.walls[3] = false; maze[y][x-1].walls[1] = false; }
    }
}

function draw() {
    frameCount++;
    ctx.fillStyle = '#070a14'; // Dark stylized bg
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Grid Lines for sleek layout
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for(let i=0; i<=cols; i++) {
        ctx.beginPath(); ctx.moveTo(i*cellSize, 0); ctx.lineTo(i*cellSize, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i*cellSize); ctx.lineTo(canvas.width, i*cellSize); ctx.stroke();
    }
    
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    let wallColor = levelData.isIce ? '#00e5ff' : (levelData.isFog ? '#a78bfa' : '#3b82f6');
    
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            let dx = x - player.x;
            let dy = y - player.y;
            if (levelData.isFog && Math.sqrt(dx*dx + dy*dy) > 4) continue; // Hard culling for huge fog maps
            
            let cell = maze[y][x];
            let px = x * cellSize;
            let py = y * cellSize;
            
            ctx.strokeStyle = wallColor;
            ctx.shadowBlur = 10;
            ctx.shadowColor = wallColor;
            
            ctx.beginPath();
            if (cell.walls[0]) { ctx.moveTo(px, py); ctx.lineTo(px + cellSize, py); }
            if (cell.walls[1]) { ctx.moveTo(px + cellSize, py); ctx.lineTo(px + cellSize, py + cellSize); }
            if (cell.walls[2]) { ctx.moveTo(px, py + cellSize); ctx.lineTo(px + cellSize, py + cellSize); }
            if (cell.walls[3]) { ctx.moveTo(px, py); ctx.lineTo(px, py + cellSize); }
            ctx.stroke();
        }
    }
    
    // Draw teleporters (pulsing visuals)
    let pulse = Math.sin(frameCount * 0.1) * 2;
    for (let t of teleporters) {
        let dx = t.x - player.x; let dy = t.y - player.y;
        if (levelData.isFog && Math.sqrt(dx*dx + dy*dy) > 4) continue;
        ctx.fillStyle = t.color;
        ctx.shadowBlur = 20; ctx.shadowColor = t.color;
        ctx.beginPath(); 
        ctx.arc(t.x*cellSize + cellSize/2, t.y*cellSize + cellSize/2, cellSize/3 + pulse, 0, Math.PI*2); 
        ctx.fill();
    }
    
    // Glowing Goal
    ctx.fillStyle = '#10b981';
    ctx.shadowBlur = 25; ctx.shadowColor = '#10b981';
    ctx.fillRect(goal.x * cellSize + 6 - pulse, goal.y * cellSize + 6 - pulse, cellSize - 12 + pulse*2, cellSize - 12 + pulse*2);
    
    // Glowing Player
    ctx.fillStyle = '#facc15';
    ctx.shadowBlur = 20; ctx.shadowColor = '#facc15';
    ctx.beginPath();
    ctx.arc(player.x * cellSize + cellSize/2, player.y * cellSize + cellSize/2, cellSize/2.5, 0, Math.PI*2);
    ctx.fill();
    
    ctx.shadowBlur = 0; // reset
    
    // Draw Fog Overlay Shader
    if (levelData.isFog) {
        let visionRadius = cellSize * 3;
        let px = player.x * cellSize + cellSize/2;
        let py = player.y * cellSize + cellSize/2;
        let grad = ctx.createRadialGradient(px, py, cellSize, px, py, visionRadius);
        grad.addColorStop(0, 'rgba(7, 10, 20, 0)');
        grad.addColorStop(0.7, 'rgba(7, 10, 20, 0.95)');
        grad.addColorStop(1, 'rgba(7, 10, 20, 1)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function gameLoop() {
    if(animating) draw();
    requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', (e) => {
    // Prevent default scrolling for arrow keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
    
    let cell = maze[player.y][player.x];
    let prevX = player.x, prevY = player.y;
    
    if ((e.key === 'ArrowUp' || e.key === 'w') && !cell.walls[0]) { player.y--; }
    else if ((e.key === 'ArrowRight' || e.key === 'd') && !cell.walls[1]) { player.x++; }
    else if ((e.key === 'ArrowDown' || e.key === 's') && !cell.walls[2]) { player.y++; }
    else if ((e.key === 'ArrowLeft' || e.key === 'a') && !cell.walls[3]) { player.x--; }
    
    if (prevX !== player.x || prevY !== player.y) {
        for(let t of teleporters) {
            if (player.x === t.x && player.y === t.y) { player.x = t.tx; player.y = t.ty; break; }
        }
        checkWin();
    }
});

function checkWin() {
    if (player.x === goal.x && player.y === goal.y) {
        document.getElementById('win-screen').classList.add('visible');
        if (currentLevel === maxUnlockedLevel && currentLevel < TOTAL_LEVELS) {
            maxUnlockedLevel++;
            if (username) {
                fetch('/api/maze/progress', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({username, level: maxUnlockedLevel})
                });
            }
        }
    }
}

function nextLevel() {
    if (currentLevel < TOTAL_LEVELS) {
        startLevel(currentLevel + 1);
    } else {
        alert("You have conquered Maze Quest!");
        showRoadmap();
    }
}

function initLevel(lvl) {
    if (lvl <= maxUnlockedLevel) {
        startLevel(lvl);
        hideRoadmap();
    }
}

function showRoadmap() {
    generateRoadmap();
    document.getElementById('roadmap-overlay').classList.remove('hidden');
}

function hideRoadmap() {
    document.getElementById('roadmap-overlay').classList.add('hidden');
}

function generateRoadmap() {
    const grid = document.getElementById('roadmap-grid');
    grid.innerHTML = '';
    
    for (let i = 1; i <= TOTAL_LEVELS; i++) {
        let btn = document.createElement('div');
        let classes = ['level-btn'];
        if (i > maxUnlockedLevel) classes.push('locked');
        else if (i < currentLevel) classes.push('completed');
        else if (i === currentLevel) classes.push('current');
        
        btn.className = classes.join(' ');
        btn.innerHTML = `<div style="font-size:1.4rem;">Lvl ${i}</div>`;
        
        let p = getLevelParams(i);
        let mech = '';
        if (p.isFog) mech += '🌪️ ';
        if (p.isIce) mech += '🧊 ';
        if (p.hasTeleporters) mech += '🌀 ';
        
        if (mech) {
            btn.innerHTML += `<div class="mech-icon">${mech}</div>`;
        }
        
        if (i <= maxUnlockedLevel) {
            btn.onclick = () => initLevel(i);
        }
        grid.appendChild(btn);
    }
}

// Show hint toast
setTimeout(() => {
    let t = document.getElementById('instruction-toast');
    t.style.opacity = '1';
    setTimeout(() => { t.style.opacity = '0'; }, 5000);
}, 500);

initApp();
