import { config } from '../../config.js';

let socket;
let currentRoom = null;
let playerColor = 'red'; // Creator is red, joiner is yellow

export function initSocket(onJoined, onStart, onMoveReceived, onRestart) {
    socket = io(config.serverUrl);

    socket.on('roomCreated', (roomCode) => {
        currentRoom = roomCode;
        playerColor = 'red';
        onJoined(`Room Created: ${roomCode}. Waiting...`, playerColor);
    });

    socket.on('roomJoined', (roomCode) => {
        currentRoom = roomCode;
        playerColor = 'yellow';
        onJoined(`Joined Room: ${roomCode}. Starting...`, playerColor);
    });

    socket.on('startGame', () => {
        onStart();
    });

    socket.on('receiveMove', (data) => {
        onMoveReceived(data); // data is the column index
    });

    socket.on('roomError', (msg) => { alert(msg); });
    socket.on('restartGame', () => { onRestart(); });
}

export function createRoom() {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    if(socket) socket.emit('createRoom', { roomCode, gameType: 'connect4' });
}

export function joinRoom(roomCode) {
    if(socket) socket.emit('joinRoom', { roomCode, gameType: 'connect4' });
}

export function sendMove(colIndex) {
    if(socket && currentRoom) {
        socket.emit('sendMove', { roomCode: currentRoom, move: colIndex });
    }
}

export function sendRestart() {
    if(socket && currentRoom) socket.emit('restartGame', currentRoom);
}

export function getPlayerColor() { return playerColor; }
