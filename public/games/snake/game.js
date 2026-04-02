const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreVal = document.getElementById('scoreVal');
const highScoreVal = document.getElementById('highScoreVal');
let highScore = 0;
const currentUser = localStorage.getItem('username');
if(currentUser) {
  fetch('/api/profile/' + currentUser).then(r=>r.json()).then(d=> {
    if(d.stats) {
      const s = d.stats.find(g => g.game === 'snake');
      if(s && s.high_score) { highScore = s.high_score; highScoreVal.innerText = highScore; }
    }
  });
}
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg = document.getElementById('overlay-msg');
const comboBar = document.getElementById('combo-bar');
const multiplierVal = document.getElementById('multiplierVal');

// Game Settings
const TILE_SIZE = 30; // 20x20 grid (600x600)
const GRID_WIDTH = canvas.width / TILE_SIZE;
const GRID_HEIGHT = canvas.height / TILE_SIZE;
const INITIAL_FPS = 8; 
const MAX_FPS = 25;

// Colors
const COLOR_GRASS_1 = '#689f38'; // Light grass
const COLOR_GRASS_2 = '#558b2f'; // Dark grass
const COLOR_SNAKE_HEAD = '#1b5e20'; // Dark green
const COLOR_SNAKE_BODY = '#8bc34a'; // Light green body
const COLOR_APPLE = '#f44336'; // Red apple
const COLOR_APPLE_LEAF = '#4caf50'; // Leaf on apple

// Game State
let snake = [];
let dir = { x: 1, y: 0 };
let nextDir = { x: 1, y: 0 };
let food = { x: 0, y: 0 };
let score = 0;
let gameState = 'START'; // START, PLAYING, GAMEOVER
let lastLogicTime = 0;
let fps = INITIAL_FPS;

// Particles
let particles = [];

// Combo System
let comboTimeLeft = 0;
const COMBO_MAX_TIME = 5000; // 5 seconds
let comboMultiplier = 1;
let lastFrameTime = performance.now();

// Track combo visually
function resetCombo() {
    comboTimeLeft = 0;
    comboMultiplier = 1;
    updateComboUI();
}

function eatFood() {
    // Increase combo
    if (comboTimeLeft > 0) {
        comboMultiplier++;
    } else {
        comboMultiplier = 1;
    }
    
    // Add Score
    let points = 10 * comboMultiplier;
    score += points;
    scoreVal.innerText = score;
    if(score > highScore) { highScore = score; highScoreVal.innerText = highScore; }
    
    // Speed Ramp
    if (fps < MAX_FPS) {
        fps += 0.2; // Slight increase
    }

    // Reset Combo Timer
    comboTimeLeft = COMBO_MAX_TIME;
    updateComboUI();

    // Spawn particles
    createParticles(food.x * TILE_SIZE + TILE_SIZE/2, food.y * TILE_SIZE + TILE_SIZE/2, COLOR_APPLE);

    // New Food
    spawnFood();
    
}

function updateComboUI() {
    let pct = Math.max(0, (comboTimeLeft / COMBO_MAX_TIME) * 100);
    comboBar.style.width = pct + '%';
    
    if (comboMultiplier > 1) {
        multiplierVal.innerText = `x${comboMultiplier}`;
        multiplierVal.classList.add('active');
        setTimeout(() => multiplierVal.classList.remove('active'), 100);
    } else {
        multiplierVal.innerText = '';
    }
}

function spawnFood() {
    let valid = false;
    while (!valid) {
        valid = true;
        food.x = Math.floor(Math.random() * GRID_WIDTH);
        food.y = Math.floor(Math.random() * GRID_HEIGHT);
        for (let segment of snake) {
            if (segment.x === food.x && segment.y === food.y) {
                valid = false;
                break;
            }
        }
    }
}

function initGame() {
    snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
    ];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    scoreVal.innerText = score;
    fps = INITIAL_FPS;
    particles = [];
    resetCombo();
    spawnFood();
    gameState = 'PLAYING';
    overlay.classList.add('hidden');
    lastLogicTime = performance.now();
    lastFrameTime = performance.now();
    window.requestAnimationFrame(loop);
}

function gameOver() {
    gameState = 'GAMEOVER';
    overlay.classList.remove('hidden');
    overlayTitle.innerHTML = `GAME OVER<br><span style="font-size:32px;color:white;">SCORE: ${score}</span>`;
    overlayMsg.innerText = "PRESS SPACE TO RETRY";
    
    // Save Score
    fetch('/api/record-match', {
        method: 'POST',
        headers:{'Content-Type': 'application/json'},
        body: JSON.stringify({
            username: currentUser || 'Guest',
            game: 'snake',
            result: 'win',
            score: score
        })
    }).catch(()=>console.log("Not logged in / record failed"));
}

window.addEventListener('keydown', e => {
    if (e.code === 'Space') {
        if (gameState === 'START' || gameState === 'GAMEOVER') {
            initGame();
        }
        e.preventDefault();
        return;
    }
    
    if (gameState !== 'PLAYING') return;

    if ((e.code === 'ArrowUp' || e.code === 'KeyW') && dir.y === 0) {
        nextDir = { x: 0, y: -1 };
        e.preventDefault();
    }
    if ((e.code === 'ArrowDown' || e.code === 'KeyS') && dir.y === 0) {
        nextDir = { x: 0, y: 1 };
        e.preventDefault();
    }
    if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && dir.x === 0) {
        nextDir = { x: -1, y: 0 };
        e.preventDefault();
    }
    if ((e.code === 'ArrowRight' || e.code === 'KeyD') && dir.x === 0) {
        nextDir = { x: 1, y: 0 };
        e.preventDefault();
    }
});

function drawGrass() {
    for (let i = 0; i < Math.ceil(GRID_WIDTH); i++) {
        for (let j = 0; j < Math.ceil(GRID_HEIGHT); j++) {
            ctx.fillStyle = (i + j) % 2 === 0 ? COLOR_GRASS_1 : COLOR_GRASS_2;
            ctx.fillRect(i * TILE_SIZE, j * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }
}

function createParticles(x, y, color) {
    for(let i=0; i<15; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 1,
            color: color
        });
    }
}

function updateParticles(dt) {
    for(let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= dt * 0.002;
        if(p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, TILE_SIZE*0.15, 0, Math.PI*2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;
}

function render() {
    drawGrass();

    // Apple
    let cx = food.x * TILE_SIZE + TILE_SIZE/2;
    let cy = food.y * TILE_SIZE + TILE_SIZE/2;
    let bounce = Math.sin(performance.now() / 200) * 2;
    cy += bounce;

    ctx.fillStyle = COLOR_APPLE;
    ctx.beginPath();
    ctx.arc(cx, cy, TILE_SIZE/2.2, 0, Math.PI*2);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(cx - TILE_SIZE/6, cy - TILE_SIZE/6, TILE_SIZE/6, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = COLOR_APPLE_LEAF;
    ctx.beginPath();
    ctx.ellipse(cx + TILE_SIZE/8, cy - TILE_SIZE/2.5, TILE_SIZE/6, TILE_SIZE/12, Math.PI/4, 0, Math.PI*2);
    ctx.fill();

    // Snake
    for (let i = snake.length - 1; i >= 0; i--) {
        let seg = snake[i];
        let isHead = i === 0;

        ctx.fillStyle = isHead ? COLOR_SNAKE_HEAD : COLOR_SNAKE_BODY;
        let shx = seg.x * TILE_SIZE;
        let shy = seg.y * TILE_SIZE;

        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(shx + 2, shy + 2, TILE_SIZE - 4, TILE_SIZE - 4, 6);
        else ctx.rect(shx + 2, shy + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        ctx.fill();
    }

    drawParticles();
}

function updateGameLogic() {
    dir = nextDir;
    let head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    if (head.x < 0) head.x = GRID_WIDTH - 1;
    if (head.x >= GRID_WIDTH) head.x = 0;
    if (head.y < 0) head.y = GRID_HEIGHT - 1;
    if (head.y >= GRID_HEIGHT) head.y = 0;

    for (let i = 0; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            gameOver();
            return;
        }
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
        eatFood();
    } else {
        snake.pop();
    }
}

function loop(currentTime) {
    if (gameState !== 'PLAYING') return;
    
    window.requestAnimationFrame(loop);

    let dt = currentTime - lastFrameTime;
    lastFrameTime = currentTime;

    if (comboTimeLeft > 0) {
        comboTimeLeft -= dt;
        if (comboTimeLeft <= 0) {
            comboTimeLeft = 0;
            comboMultiplier = 1;
        }
        updateComboUI();
    }
    
    updateParticles(dt);

    const secondsSinceLastLogic = (currentTime - lastLogicTime) / 1000;
        
    if (secondsSinceLastLogic >= 1 / fps) {
        lastLogicTime = currentTime;
        updateGameLogic();
    }
    
    // Always render (60fps) for smooth particles and bobbing apple
    if(gameState === 'PLAYING') {
        render();
    }
}

// Initial draw of the start screen
drawGrass();
