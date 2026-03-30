// Main entry for the Tic-Tac-Toe Game
import { board, currentPlayer, gameActive, handleClick, checkGameState, switchPlayer, resetGame, initializeBoard } from './game.js';
import { makeAIMove } from './ai.js';
import { initSocket, createRoom, joinRoom, sendMove, sendRestart, getPlayerSymbol } from './multiplayer.js';

const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get('mode') || 'solo'; 

let networkPlay = false;
let mySymbol = 'X';
let gameStarted = true;

document.addEventListener('DOMContentLoaded', () => {
    initializeBoard(onCellClick);

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
                if (gameActive) {
                    handleClick(moveIndex);
                    const uiCell = document.querySelector(`.cell[data-index='${moveIndex}']`);
                    if (uiCell) uiCell.textContent = currentPlayer;
                    checkGameOverState();
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

function recordResult(winnerSymbol) {
    let result = 'loss';
    if (winnerSymbol === 'Draw') result = 'draw';
    else if (winnerSymbol === mySymbol) result = 'win';

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
        body: JSON.stringify({ username, game: 'tictactoe', result, score: 0 })
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

function onCellClick(index) {
    if (!gameActive || !gameStarted) return;

    if (networkPlay) {
        if (currentPlayer !== mySymbol) return;
        if (handleClick(index)) {
            sendMove(index);
            checkGameOverState();
        }
    } else {
        if (currentPlayer === 'O') return; // AI is playing
        if (handleClick(index)) {
            const winner = checkGameState();
            if (winner) {
                recordResult(winner);
            } else {
                switchPlayer();
                setTimeout(() => aiTurn(), 500); // 500ms delay
            }
        }
    }
}

function aiTurn() {
    if (!gameActive) return;
    const aiMoveIdx = makeAIMove(board, 'O');
    if (aiMoveIdx !== -1) {
        handleClick(aiMoveIdx);
        checkGameOverState();
    }
}

function handleRestartLocal() {
    resetGame();
    if (networkPlay) {
        document.getElementById('status').textContent = mySymbol === 'X' ? "Your Turn (X)" : "Waiting for (X)";
        currentPlayer = 'X'; 
    }
}
