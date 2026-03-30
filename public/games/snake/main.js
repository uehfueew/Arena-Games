import { state, initState, updateEngine, changeDirection, GRID_SIZE, TILE_COUNT } from './game.js';
import { initSocket, createRoom, joinRoom, sendState, sendRestart, getPlayerRole, isHost } from './multiplayer.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get('mode') || 'solo'; 

let gameInterval;
let myRole = 'p1';
let networkPlay = mode === 'multi';

document.addEventListener('DOMContentLoaded', () => {
    if (networkPlay) {
        document.getElementById('setup-panel').style.display = 'block';
        
        initSocket(
            (msg, role) => {
                myRole = role;
                document.getElementById('roomDisplay').textContent = msg;
            },
            () => {
                document.getElementById('roomDisplay').textContent = 'Game Started!';
                startGame(true);
            },
            (newState) => {
                // If not host, just accept state from host to prevent desync
                if (!isHost()) {
                    Object.assign(state, newState); // sync state
                    draw();
                }
            },
            () => startGame(true) // restart
        );

        document.getElementById('createBtn').addEventListener('click', () => createRoom());
        document.getElementById('joinBtn').addEventListener('click', () => {
            const r = document.getElementById('roomInput').value;
            if (r) joinRoom(r);
        };

    } else {
        if (mode === 'solo') { startGame(false); }
    }

    window.resetGame = () => {
        if(networkPlay && isHost()) sendRestart();
        startGame(networkPlay);
    };

    document.addEventListener('keydown', (e) => {
        // Prevent page scrolling on arrow keys
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
        }

        // Send moves (or buffer them) 
        let dx=0, dy=0;
        if (e.key === 'ArrowUp' || e.key === 'w') { dx=0; dy=-1; }
        if (e.key === 'ArrowDown' || e.key === 's') { dx=0; dy=1; }
        if (e.key === 'ArrowLeft' || e.key === 'a') { dx=-1; dy=0; }
        if (e.key === 'ArrowRight' || e.key === 'd') { dx=1; dy=0; }
        
        if (dx!==0 || dy!==0) {
            changeDirection(myRole, dx, dy);
        }
    };
});

function startGame(multi) {
    clearInterval(gameInterval);
    initState(multi);
    if(document.getElementById('overlay')) if(document.getElementById('overlay')) document.getElementById('overlay').style.display = 'none';

    // Apply custom player color if logged in
    const uname = localStorage.getItem('username');
    if (uname && !multi) {
        // Solo play: Apply color instantly
        fetch(`/api/profile/${uname}`).then(r=>r.json()).then(d => {
            if(d.user && d.user.snake_color) {
                state.p1.color = d.user.snake_color;
            }
        }).catch(e=>console.error(e));
    }
    
    gameInterval = setInterval(gameLoop, 100);
}

function gameLoop() {
    if(!state.active) return gameOver();

    if (!networkPlay) {
        updateEngine();
        draw();
    } else {
        if (isHost()) {
            // Host drives the game state and sends it
            updateEngine();
            sendState(state);
            draw();
        } else {
            // Client receives via socket, but we send our direction to host indirectly? 
            // Wait, for instant feel, the client should send their dx/dy to Host, Host updates engine. 
            // We use sendMove for client inputs.
            const p = state[myRole];
            sendState({ type: 'dir', dx: p.dx, dy: p.dy, role: myRole }); 
        }
    }
}

function gameOver() {
    clearInterval(gameInterval);
    
    let endText = "Game Over";
    if (networkPlay) {
        if (!state.p1.alive && !state.p2.alive) endText = "It's a Draw!";
        else endText = state.p1.alive ? "Left Player Wins!" : "Right Player Wins!";
    } else {
        endText = `Score: ${state.p1.score}`;
    }

    if (window.showGameOver) {
        let isWin = false;
        if(networkPlay) {
            isWin = state.p1.alive && !state.p2.alive && myRole === 'p1' ? true : (!state.p1.alive && !state.p2.alive ? null : false);
        }
        window.showGameOver(endText, `Final Score: ${state.p1.score}`, isWin);
    }

    // Record Stats
    if (!networkPlay || isHost()) {
        const username = localStorage.getItem('username');
        if (username) {
            let res = 'loss';
            if (networkPlay && state.p1.alive && !state.p2.alive) res = 'win';
            if (!networkPlay) res = 'score_only'; // solo tracks high score, not wins
            
            fetch('/api/record-match', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username, 
                    game: 'snake', 
                    result: res, 
                    score: state.p1.score 
                })
            }).catch(e => console.error(e));
        }
    }
}

function draw() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines logic optional, let's just make it neon.
    ctx.shadowBlur = 15;

    // Draw Food
    ctx.fillStyle = '#39ff14';
    ctx.shadowColor = '#39ff14';
    ctx.fillRect(state.food.x * GRID_SIZE, state.food.y * GRID_SIZE, GRID_SIZE - 1, GRID_SIZE - 1);

    // Draw P1
    if (state.p1.alive) renderSnake(state.p1);
    
    // Draw P2
    if (state.multiplayer && state.p2.alive) renderSnake(state.p2);

    ctx.shadowBlur = 0; // reset
    
    document.getElementById('score1').textContent = state.p1.score;
    if(state.multiplayer) {
        let p2w = document.getElementById('p2ScoreWrap');
        if(p2w) p2w.style.display = 'block';
        let s2 = document.getElementById('score2');
        if(s2) s2.textContent = state.p2.score;
    }
}

function renderSnake(player) {
    ctx.fillStyle = player.color;
    ctx.shadowColor = player.color;
    ctx.fillRect(player.x * GRID_SIZE, player.y * GRID_SIZE, GRID_SIZE - 1, GRID_SIZE - 1);
    player.tail.forEach(seg => {
        ctx.fillRect(seg.x * GRID_SIZE, seg.y * GRID_SIZE, GRID_SIZE - 1, GRID_SIZE - 1);
    };
}

// For client sending input to host
export function handleRemoteInput(data) {
    if (data.type === 'dir') {
        changeDirection(data.role, data.dx, data.dy);
    }
}
