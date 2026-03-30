// Copilot: Create multiplayer logic using Socket.IO.
import { config } from '../../config.js';

let socket;
let currentRoom = null;
let playerSymbol = 'X'; // Creator is X, Joiner is O

export function initSocket(onJoined, onStart, onMoveReceived, onRestart) {
    socket = io(config.serverUrl);

    socket.on('roomCreated', (roomCode) => {
        currentRoom = roomCode;
        playerSymbol = 'X';
        onJoined(`Room Created: ${roomCode}. Waiting...`, playerSymbol);
    });

    socket.on('roomJoined', (roomCode) => {
        currentRoom = roomCode;
        playerSymbol = 'O';
        onJoined(`Joined Room: ${roomCode}. Starting...`, playerSymbol);
    });

    socket.on('startGame', (data) => {
        onStart();
    });

    socket.on('receiveMove', (data) => {
        onMoveReceived(data);
    });

    socket.on('roomError', (msg) => {
        alert(msg);
    });

    socket.on('restartGame', () => {
        onRestart();
    });
}

export function createRoom() {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    if(socket) socket.emit('createRoom', roomCode);
}

export function joinRoom(roomCode) {
    if(socket) socket.emit('joinRoom', roomCode);
}

export function sendMove(index) {
    if(socket && currentRoom) {
        socket.emit('sendMove', { roomCode: currentRoom, move: index });
    }
}

export function sendRestart() {
    if(socket && currentRoom) {
        socket.emit('restartGame', currentRoom);
    }
}

export function getPlayerSymbol() {
    return playerSymbol;
}
