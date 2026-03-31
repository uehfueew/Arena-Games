// Main entry for the Tic-Tac-Toe Game
import { Game } from './game.js';
import { makeAIMove } from './ai.js';
import { initSocket, createRoom, joinRoom, sendMove, sendRestart , getPlayerSymbol } from './multiplayer.js';

import { initEndless } from './modes/endless.js';
import { initArcade } from './modes/arcade.js';
import { initUltimate } from './modes/ultimate.js';

const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get('mode') || 'solo'; 

let networkPlay = false;
let mySymbol = 'X';
let gameStarted = true;
let sessionScore = { X: 0, O: 0, Draws: 0, Total: 0 };
window.checkGameOverState = (didMove) => checkGameOverState(didMove);
window.checkGameOverState = checkGameOverState; // Export for special modes like Ultimate

// Mode Architecture:
// We define a strategy for each mode that handles custom logic.
const gameModes = {
    solo: {
        init: () => { mySymbol = 'X'; gameStarted = true; },
        onTurnEnd: () => { if (Game.currentPlayer === 'O') setTimeout(() => aiTurn(), 500); }
    },
    local: {
        init: () => { gameStarted = true; },
        onTurnEnd: () => { /* Local pass-and-play, nothing to automate */ }
    },
    multi: {
        init: setupMultiplayer,
        onTurnEnd: () => { /* Server and socket events dictate turns */ }
    },
    endless: {
        init: () => { gameStarted = true; initEndless(Game); },
        onTurnEnd: () => { if (Game.currentPlayer === 'O') setTimeout(() => aiTurn(), 500); },
        onGameOver: () => { setTimeout(() => handleRestartLocal(), 1500); }
    },
    ultimate: {
        init: () => { gameStarted = true; initUltimate(Game); },
        onTurnEnd: () => { /* AI handled inside ultimate.js */ }
    },
    arcade: {
        init: () => { gameStarted = true; initArcade(Game); },
        onTurnEnd: () => { if (Game.currentPlayer === 'O') setTimeout(() => aiTurn(true), 1000); } // Slightly slower AI for arcade
    },
    campaign: {
        init: () => { gameStarted = false; alert("Campaign mode architecture goes here."); }
    },
    wager: {
        init: () => { gameStarted = false; alert("Wager mode architecture goes here."); }
    }
};

const activeMode = gameModes[mode] || gameModes['solo'];


document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('game-start-overlay');
    const container = document.getElementById('actual-game-container');
    if (urlParams.has('mode')) {
        if (overlay) overlay.style.display = 'none';
        if (container) container.style.filter = 'none';
    } else {
        if (overlay) overlay.style.display = 'flex';
        if (container) container.style.filter = 'blur(5px)';
    }

    Game.initializeBoard(onCellClick);

    const restartBtn = document.getElementById('restartBtn');
    if(restartBtn) {
        restartBtn.addEventListener('click', () => {
            handleRestartLocal();
            if (networkPlay) sendRestart();
        });
    }

    // Initialize specific mode
    if (activeMode.init) {
        activeMode.init();
    }
});

function setupMultiplayer() {
    const setupPanel = document.getElementById('setup-panel');
    setupPanel.style.display = 'block';
    networkPlay = true;
    gameStarted = false; 
    document.getElementById('status').textContent = 'Create or Join a Room...';

    initSocket(
        (msg, symbol) => {
            mySymbol = symbol;
            document.getElementById('roomDisplay').textContent = msg;
        },
        () => {
            document.getElementById('roomDisplay').textContent = 'Game Started! ' + (mySymbol === 'X' ? 'Your Turn' : "Opponent's Turn");
            gameStarted = true;
            handleRestartLocal();
        },
        (moveIndex) => {
            if (Game.gameActive) {
                Game.handleClick(moveIndex);
                checkGameOverState(true);
            }
        },
        () => handleRestartLocal()
    );

    document.getElementById('createBtn').addEventListener('click', () => createRoom());
    document.getElementById('joinBtn').addEventListener('click', () => {
        const room = document.getElementById('roomInput').value;
        if (room) joinRoom(room);
    });
}

function updateStatsUI() {
    const totalEl = document.getElementById('stat-total');
    const xEl = document.getElementById('stat-x');
    const oEl = document.getElementById('stat-o');
    const drawsEl = document.getElementById('stat-draws');
    
    if (totalEl) totalEl.textContent = sessionScore.Total;
    if (xEl) xEl.textContent = sessionScore.X;
    if (oEl) oEl.textContent = sessionScore.O;
    if (drawsEl) drawsEl.textContent = sessionScore.Draws;
}

function recordResult(winnerSymbol) {
    let result = 'loss';
    if (winnerSymbol === 'Draw') result = 'draw';
    else if (winnerSymbol === mySymbol) result = 'win';

    // Removed the alert/pop-up logic entirely.
    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) restartBtn.style.display = 'block';

    const username = localStorage.getItem('username');
    if (!username) return;

    fetch('/api/record-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, game: 'tictactoe', result, score: 0 })
    }).catch(e => console.error('Failed to save score'));
}

function checkGameOverState(didMove = false) {
    // game.checkGameState will update UI automatically
    const winner = Game.checkGameState();
    if (winner) {
        gameStarted = false;
        
        sessionScore.Total++;
        if (winner === 'X' || winner === 'O') {
            sessionScore[winner]++;
            const scoreEl = document.getElementById(`score-${winner}`);
            if (scoreEl) scoreEl.textContent = sessionScore[winner];
        } else if (winner === 'Draw') {
            sessionScore.Draws++;
        }
        updateStatsUI();

        recordResult(winner);
        if (activeMode && activeMode.onGameOver) {
            activeMode.onGameOver(winner);
        }
    } else if (didMove) {
        Game.switchPlayer();
    }
}

function onCellClick(index) {
    if (!Game.gameActive || !gameStarted) return;

    if (networkPlay) {
        if (Game.currentPlayer !== mySymbol) return;
        if (Game.handleClick(index)) {
            sendMove(index);
            checkGameOverState(true);
        }
    } else {
        if (mode === 'solo' && Game.currentPlayer === 'O') return; // AI is playing
        if (Game.handleClick(index)) {
            const winner = Game.checkGameState();
            if (winner) {
                sessionScore.Total++;
                if (winner === 'X' || winner === 'O') {
                    sessionScore[winner]++;
                    const scoreEl = document.getElementById(`score-${winner}`);
                    if (scoreEl) scoreEl.textContent = sessionScore[winner];
                } else if (winner === 'Draw') {
                    sessionScore.Draws++;
                }
                updateStatsUI();
                recordResult(winner);
                if (activeMode && activeMode.onGameOver) {
                    activeMode.onGameOver(winner);
                }
            } else {
                Game.switchPlayer();
                if (activeMode && activeMode.onTurnEnd) {
                    activeMode.onTurnEnd();
                }
            }
        }
    }
}

function aiTurn() {
    if (!Game.gameActive) return;

    let aiMoveIdx = -1;
    if (Game.getCustomAIMove) {
        aiMoveIdx = Game.getCustomAIMove();
    } else {
        aiMoveIdx = makeAIMove(Game.board, 'O');
    }
    
    if (aiMoveIdx !== -1) {
        Game.handleClick(aiMoveIdx);
        const winner = Game.checkGameState();
        if(winner) {
           sessionScore.Total++;
           if (winner === 'X' || winner === 'O') {
               sessionScore[winner]++;
               const scoreEl = document.getElementById(`score-${winner}`);
               if (scoreEl) scoreEl.textContent = sessionScore[winner];
           } else if (winner === 'Draw') {
               sessionScore.Draws++;
           }
           updateStatsUI();
           recordResult(winner);
           if (activeMode && activeMode.onGameOver) {
               activeMode.onGameOver(winner);
           }
        } else {
           Game.switchPlayer();
           if (Game.currentPlayer === 'O') {
               // Must be an AI double turn override
               setTimeout(aiTurn, 800);
           }
        }
    }
}

function handleRestartLocal() {
    Game.resetGame();
    if (activeMode && activeMode.init) activeMode.init(); // Give the mode a chance to reset rules/UI
    gameStarted = true;
    
    document.querySelectorAll('.cell').forEach(c => c.textContent = '');
    
    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) restartBtn.style.display = 'none';
        
    if (networkPlay) {
        document.getElementById('status').textContent = mySymbol === 'X' ? "Your Turn (X)" : "Waiting for (X)";
        // Game.currentPlayer = 'X'; // already done by resetGame
    }
}
