import { config } from '../../main.js';
import { handleRemoteInput } from './main.js'; // to pass input to host

let socket;
let currentRoom = null;
let role = 'p1'; // p1 is host
let host = false;

export function initSocket(onJoined, onStart, onStateReceived, onRestart) {
    socket = io(config.serverUrl);

    socket.on('roomCreated', (roomCode) => {
        currentRoom = roomCode;
        role = 'p1';
        host = true;
        onJoined(`Room: ${roomCode}`, role);
    });

    socket.on('roomJoined', (roomCode) => {
        currentRoom = roomCode;
        role = 'p2';
        host = false;
        onJoined(`Joined: ${roomCode}`, role);
    });

    socket.on('startGame', () => onStart());

    socket.on('receiveState', (data) => {
        if (host && data.type === 'dir') {
            // Host receiving input from client
            handleRemoteInput(data);
        } else if (!host) {
            // Client receiving full state from host
            onStateReceived(data);
        }
    });

    socket.on('restartGame', () => onRestart());
}

export function createRoom() {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    if(socket) socket.emit('createRoom', { roomCode, gameType: 'snake' });
}

export function joinRoom(roomCode) {
    if(socket) socket.emit('joinRoom', { roomCode, gameType: 'snake' });
}

export function sendState(data) {
    if(socket && currentRoom) {
        socket.emit('sendState', { roomCode: currentRoom, state: data });
    }
}

export function sendRestart() {
    if(socket && currentRoom) {
        socket.emit('restartGame', currentRoom);
    }
}

export function getPlayerRole() { return role; }
export function isHost() { return host; }
