import { board, currentPlayer, gameActive, dropDisc, checkGameState, switchPlayer, resetGame, initializeBoard } from './game.js';
import { makeAIMove } from './ai.js';
import { initSocket, createRoom, joinRoom, sendMove, sendRestart } from './multiplayer.js';

const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get('mode') || 'solo'; 

let networkPlay = false;
let myColor = 'red';
let gameStarted = true;

document.addEventListener('DOMContentLoaded', () => {
    initializeBoard(onColClick);

    const restartBtn = document.getElementById('restartBtn');
    restartBtn.addEventListener('click', () => {
        handleRestartLocal();
        if (networkPlay) sendRestart();
    });

    const setupPanel = document.getElementById('setup-panel');
    if (mode === 'multi') {
        setupPanel.style.display = 'block';
        networkPlay = true;
        gameStarted = false;
        document.getElementById('status').textContent = 'Create or Join a Room...';

        initSocket(
            (msg, color) => {
                myColor = color;
                document.getElementById('roomDisplay').textContent = msg;
            },
            () => {
                document.getElementById('roomDisplay').textContent = 'Game Started! ' + (myColor === 'red' ? 'Your Turn' : "Opponent's Turn");
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

        document.getElementById('createBtn').addEventListener('click', () => createRoom());
        document.getElementById('joinBtn').addEventListener('click', () => {
            const room = document.getElementById('roomInput').value;
            if (room) joinRoom(room);
        });
    }
});

function recordResult(winnerColor) {
    let result = 'loss';
    if (winnerColor === 'Draw') result = 'draw';
    else if (winnerColor === myColor) result = 'win';

    if (window.showGameOver) {
        if (result === 'win') {
            window.showGameOver('You Won!', 'Congratulations on your victory!', true);
        } else if (result === 'draw') {
            window.showGameOver('Draw!', 'It\'s a stalemate.', null);
        } else {
            window.showGameOver('You Lost!', 'Better luck next time.', false);
        }
    }

    const username = localStorage.getItem('username');
    if (!username) return;

    fetch('/api/record-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, game: 'connect4', result, score: 0 })
    }).catch(e => console.error('Failed to save score'));
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
        if (currentPlayer === 'yellow') return; // AI's turn
        const rowLanded = dropDisc(col, 'red');
        if (rowLanded !== null) {
            const winner = checkGameState();
            if (winner) {
                recordResult(winner);
            } else {
                switchPlayer();
                setTimeout(() => aiTurn(), 500);
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
