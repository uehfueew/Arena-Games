import { board, currentPlayer, gameActive, dropDisc, checkGameState, switchPlayer, resetGame, initializeBoard } from './game.js';
import { makeAIMove } from './ai.js';
import { initSocket, createRoom, joinRoom, sendMove, sendRestart } from './multiplayer.js';

const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get('mode') || 'solo';

let networkPlay = false;
let myColor = 'red';
let gameStarted = true;

function init() {
    const overlay = document.getElementById('game-start-overlay');
    const container = document.getElementById('actual-game-container');
    
    if (urlParams.has('mode')) {
        if (overlay) overlay.style.display = 'none';
        if (container) {
            container.style.display = 'flex';
            container.style.filter = 'none';
        }
    } else {
        if (overlay) overlay.style.display = 'flex';
        if (container) {
            container.style.display = 'none';
            container.style.filter = 'blur(5px)';
        }
    }

    initializeBoard(onColClick);

    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            handleRestartLocal();
            if (networkPlay) sendRestart();
        });
    }

    const setupPanel = document.getElementById('setup-panel');
    if (mode === 'multi') {
        if (setupPanel) setupPanel.style.display = 'block';
        networkPlay = true;
        gameStarted = false;
        const statusEl = document.getElementById('status');
        if (statusEl) statusEl.textContent = 'Create or Join a Room...';

        initSocket(
            (msg, color) => {
                myColor = color;
                const roomDisplay = document.getElementById('roomDisplay');
                if (roomDisplay) roomDisplay.textContent = msg;
            },
            () => {
                const roomDisplay = document.getElementById('roomDisplay');
                if (roomDisplay) roomDisplay.textContent = 'Game Started! ' + (myColor === 'red' ? 'Your Turn' : "Opponent's Turn");
                gameStarted = true;
                handleRestartLocal();
            },
            (colIndex) => {
                if (gameActive) {
                    const r = dropDisc(colIndex, currentPlayer);
                    if (r !== null) checkGameOverState();
                }
            },
            () => handleRestartLocal()
        );

        const createBtn = document.getElementById('createBtn');
        if (createBtn) createBtn.addEventListener('click', () => createRoom());
        
        const joinBtn = document.getElementById('joinBtn');
        if (joinBtn) {
            joinBtn.addEventListener('click', () => {
                const roomInput = document.getElementById('roomInput');
                if (roomInput && roomInput.value) joinRoom(roomInput.value);
            });
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

const isAIMode = mode.endsWith('_ai') || mode.startsWith('ranked_');
let p1Score = 0;
let p2Score = 0;

function updateScoreDisplay() {
    const p1El = document.getElementById('score-p1');
    const p2El = document.getElementById('score-p2');
    if (p1El) p1El.textContent = p1Score;
    if (p2El) p2El.textContent = p2Score;
}

function showPlayAgainButton() {
    const btn = document.getElementById('play-again-btn');
    if (btn) {
        btn.style.display = 'flex';
        btn.onclick = () => {
            btn.style.display = 'none';
            handleRestartLocal();
            if (networkPlay) sendRestart();
        };
    }
}

function recordResult(winnerColor) {
    let result = 'loss';
    
    if (!networkPlay && !isAIMode) {
        // Pass and play scoring (no result sent to db for both playing local)
        if (winnerColor === 'red') p1Score++;
        else if (winnerColor === 'yellow') p2Score++;
        else result = 'draw';
    } else {
        if (winnerColor === 'Draw') {
            result = 'draw';
        } else if (winnerColor === myColor) {
            result = 'win';
            p1Score++;
        } else {
            result = 'loss';
            p2Score++;
        }
        
        const username = localStorage.getItem('username');
        if (username) {
            fetch('/api/record-match', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, game: 'connect4', result, score: 0 })
            }).catch(e => console.error('Failed to save score'));
        }
    }

    updateScoreDisplay();
    showPlayAgainButton();
}

function checkGameOverState() {
    const winner = checkGameState();
    if (winner) {
        recordResult(winner);
    } else {
        switchPlayer();
    }
}

function onColClick(col) {
    if (!gameActive || !gameStarted) return;

    if (networkPlay) {
        if (currentPlayer !== myColor) return;
        const rowLanded = dropDisc(col, myColor);
        if (rowLanded !== null) {
            sendMove(col);
            checkGameOverState();
        }
    } else {
        if (isAIMode && currentPlayer === 'yellow') return; // AI's turn
        const rowLanded = dropDisc(col, currentPlayer);
        if (rowLanded !== null) {
            const winner = checkGameState();
            if (winner) {
                recordResult(winner);
            } else {
                switchPlayer();
                if (isAIMode && currentPlayer === 'yellow') {
                    setTimeout(() => aiTurn(), 500);
                }
            }
        }
    }
}

function aiTurn() {
    if (!gameActive) return;
    const aiChoiceCol = makeAIMove(board, 'yellow');
    if (aiChoiceCol !== null) {
        dropDisc(aiChoiceCol, 'yellow');
        checkGameOverState();
    }
}

function handleRestartLocal() {
    resetGame();
    if (networkPlay) {
        document.getElementById('status').textContent = myColor === 'red' ? "Your Turn (Red)" : "Waiting for (Red)";
        // In network play, Red always starts
    }
}
