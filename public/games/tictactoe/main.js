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
let currentWager = 0;
let userCosmetics = { token: 'default', theme: 'default', anim: 'default' };
window.checkGameOverState = (didMove) => checkGameOverState(didMove);
window.checkGameOverState = checkGameOverState; // Export for special modes like Ultimate

// Mode Architecture:
// We define a strategy for each mode that handles custom logic.
const RANKS = [
    { name: 'Bronze', min: 0, max: 1199, color: '#cd7f32' },
    { name: 'Silver', min: 1200, max: 1499, color: '#bdc3c7' },
    { name: 'Gold', min: 1500, max: 1799, color: '#f1c40f' },
    { name: 'Platinum', min: 1800, max: 2199, color: '#00d2d3' },
    { name: 'Grandmaster', min: 2200, max: Infinity, color: '#ff4757' }
];

function getRank(elo) {
    return RANKS.find(r => elo >= r.min && elo <= r.max) || RANKS[0];
}

const gameModes = {
    solo: {
        init: () => { mySymbol = 'X'; gameStarted = true; hideRankedUI(); },
        onTurnEnd: () => { if (Game.currentPlayer === 'O') setTimeout(() => aiTurn(false, 2), 500); }
    },
    local: {
        init: () => { gameStarted = true; hideRankedUI(); },
        onTurnEnd: () => { }
    },
    multi: {
        init: setupMultiplayer,
        onTurnEnd: () => { },
        onGameOver: (winner) => { handleRankedEnd(winner); },
        isRanked: true
    },
    endless_ai: {
        init: () => { gameStarted = true; initEndless(Game); hideRankedUI(); },
        onTurnEnd: () => { if (Game.currentPlayer === 'O') setTimeout(() => aiTurn(false, 2), 500); },
        onGameOver: () => { 
            // In endless, auto-restart is required for "flow"
            setTimeout(() => handleRestartLocal(), 1500); 
        }
    },
    endless: {
        init: () => { gameStarted = true; initEndless(Game); hideRankedUI(); },
        onTurnEnd: () => { },
        onGameOver: () => { 
            setTimeout(() => handleRestartLocal(), 1500); 
        }
    },
    ultimate_ai: {
        init: () => { gameStarted = true; initUltimate(Game); hideRankedUI(); },
        onTurnEnd: () => { }
    },
    ultimate: {
        init: () => { gameStarted = true; initUltimate(Game); hideRankedUI(); },
        onTurnEnd: () => { }
    },
    arcade_ai: {
        init: () => { gameStarted = true; initArcade(Game); hideRankedUI(); },
        onTurnEnd: () => { if (Game.currentPlayer === 'O') setTimeout(() => aiTurn(true, 2), 600); }
    },
    arcade: {
        init: () => { gameStarted = true; initArcade(Game); hideRankedUI(); },
        onTurnEnd: () => { }
    },
    ranked_solo: {
        init: () => { mySymbol = 'X'; gameStarted = true; showRankedUI(); },
        onTurnEnd: () => { if (Game.currentPlayer === 'O') {
            const elo = parseInt(document.getElementById('ranked-mini-elo')?.textContent.replace('ELO: ', '')) || 1000;
            const diff = getDifficultyByElo(elo);
            setTimeout(() => aiTurn(false, diff), 500); 
        }},
        onGameOver: (winner) => { handleRankedEnd(winner); },
        isRanked: true
    },
    ranked_endless: {
        init: () => { mySymbol = 'X'; gameStarted = true; initEndless(Game); showRankedUI(); },
        onTurnEnd: () => { if (Game.currentPlayer === 'O') {
            const elo = parseInt(document.getElementById('ranked-mini-elo')?.textContent.replace('ELO: ', '')) || 1000;
            const diff = getDifficultyByElo(elo);
            setTimeout(() => aiTurn(false, diff), 500);
        }},
        onGameOver: (winner) => { 
            handleRankedEnd(winner);
            setTimeout(() => handleRestartLocal(), 2000); 
        },
        isRanked: true
    },
    ranked_arcade: {
        init: () => { mySymbol = 'X'; gameStarted = true; initArcade(Game); showRankedUI(); },
        onTurnEnd: () => { if (Game.currentPlayer === 'O') {
            const elo = parseInt(document.getElementById('ranked-mini-elo')?.textContent.replace('ELO: ', '')) || 1000;
            const diff = getDifficultyByElo(elo);
            setTimeout(() => aiTurn(true, diff), 800);
        }},
        onGameOver: (winner) => { handleRankedEnd(winner); },
        isRanked: true
    },
    ranked_ultimate: {
        init: () => { mySymbol = 'X'; gameStarted = true; initUltimate(Game); showRankedUI(); },
        onTurnEnd: () => { /* Logic inside ultimate.js or similar */ },
        onGameOver: (winner) => { handleRankedEnd(winner); },
        isRanked: true
    }
};

function getDifficultyByElo(elo) {
    if (elo >= 2200) return 5; // Grandmaster (Impossible)
    if (elo >= 1800) return 4; // Platinum
    if (elo >= 1500) return 3; // Gold
    if (elo >= 1200) return 2; // Silver
    return 1; // Bronze
}

function showRankedUI() {
    const hub = document.getElementById('ranked-ui-hub');
    if(hub) hub.style.display = 'flex';
    const username = localStorage.getItem('username');
    if (username) {
        fetch(`/api/profile/${username}`).then(r => r.json()).then(data => {
            if (data.user) updateRankedUI(data.user.elo || 1000);
        });
    }
}

function hideRankedUI() {
    const hub = document.getElementById('ranked-ui-hub');
    if(hub) hub.style.display = 'none';
}

function updateRankedUI(elo) {
    const eloEl = document.getElementById('ranked-mini-elo');
    const badge = document.getElementById('ranked-mini-badge');
    const label = document.getElementById('ranked-mini-label');
    
    const rank = getRank(elo);

    if (eloEl) eloEl.textContent = `ELO: ${elo}`;
    if (label) {
        label.textContent = rank.name;
        label.style.color = rank.color;
    }
    if (badge) {
        badge.style.background = rank.color;
        badge.style.boxShadow = `0 0 15px ${rank.color}66`;
    }
    
    // Also update parent border if ranked
    const hub = document.getElementById('ranked-ui-hub');
    if (hub) hub.style.borderColor = rank.color;
}

function getRankInfo(elo) {
    if (elo >= 2200) return { name: 'Grandmaster', color: '#ff4757' };
    if (elo >= 1800) return { name: 'Platinum', color: '#00d2d3' };
    if (elo >= 1500) return { name: 'Gold', color: '#f1c40f' };
    if (elo >= 1200) return { name: 'Silver', color: '#bdc3c7' };
    return { name: 'Bronze', color: '#cd7f32' };
}

const activeMode = gameModes[mode] || gameModes['solo'];


document.addEventListener('DOMContentLoaded', () => {
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
    
    // Load cosmetics
    loadCosmetics();
});

function loadCosmetics() {
    const user = localStorage.getItem('username');
    if(!user) return;
    
    fetch(`/api/profile/${user}`)
        .then(res => res.json())
        .then(data => {
            if(data && data.user) {
                userCosmetics.token = data.user.tictactoe_token || 'default';
                userCosmetics.theme = data.user.tictactoe_theme || 'default';
                userCosmetics.anim = data.user.tictactoe_animation || 'default';
                applyCosmetics();
            }
        }).catch(err => console.error(err));
}

function applyCosmetics() {
    const board = document.getElementById('board');
    if(!board) return;
    
    if(userCosmetics.theme === 'Cyberpunk') {
        board.style.background = '#0d0221';
        board.style.boxShadow = '0 0 20px #0ff';
        board.style.border = '2px solid #0ff';
    } else if(userCosmetics.theme === 'Medieval wood') {
        board.style.background = '#3e2723';
        board.style.boxShadow = 'inset 0 0 20px #000';
        board.style.border = '4px solid #5d4037';
    }
    
    // Override cell render if custom token (this will need cell update hooks, but we'll do simple CSS)
    if(userCosmetics.token === 'Neon Swords') {
        document.documentElement.style.setProperty('--token-x-color', '#39ff14');
        document.documentElement.style.setProperty('--token-x-shadow', '0 0 10px #39ff14');
    } else if(userCosmetics.token === 'Animated Skulls') {
        document.documentElement.style.setProperty('--token-x-color', '#ff00ff');
        document.documentElement.style.setProperty('--token-x-shadow', '0 0 10px #ff00ff');
    }
}

function handleWagerEnd(winner) {
    const username = localStorage.getItem('username');
    if (!username || currentWager <= 0) return;
    
    let result = 'draw';
    if(winner === mySymbol) result = 'win';
    else if(winner === 'O') result = 'loss';
    
    fetch('/api/record-wager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, result, wagerAmount: currentWager })
    }).then(r=>r.json()).then(data => {
        if(data.success) {
            setTimeout(() => {
                let msg = result === 'win' ? `You won ${data.ticketsChange} tickets!` : (result === 'loss' ? `You lost ${Math.abs(data.ticketsChange)} tickets.` : 'Draw! No tickets lost.');
                // Re-trigger game over modal with wager text
                if(window.showGameOver) window.showGameOver('Wager Match', msg, result === 'win');
            }, 500);
        }
    });
}

function handleRankedEnd(winner) {
    const username = localStorage.getItem('username');
    if (!username) return;
    
    let result = 'draw';
    if(winner === mySymbol) result = 'win';
    else if(winner === 'O') result = 'loss';
    
    // 1. Get current ELO to compare later
    fetch(`/api/profile/${username}`)
        .then(res => res.json())
        .then(initialData => {
            const oldElo = initialData.user.elo || 1000;
            const oldRank = getRankInfo(oldElo);

            // Set opponent ELO slightly above or at user's ELO to ensure gain/loss is meaningful
            const aiElo = oldElo; 

            // 2. Record the match result
            fetch('/api/record-ranked', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, result, opponentElo: aiElo })
            }).then(r=>r.json()).then(recordData => {
                if(recordData.success) {
                    const newElo = recordData.newElo;
                    const newRank = getRankInfo(newElo);
                    
                    updateRankedUI(newElo);

                    // 3. Trigger Rank Change Modal
                    if (newRank.name !== oldRank.name) {
                        const isUp = newElo > oldElo;
                        if (window.showRankPromotion) window.showRankPromotion(newRank, isUp);
                    }

                    setTimeout(() => {
                        let changeStr = recordData.eloChange >= 0 ? `+${recordData.eloChange}` : `${recordData.eloChange}`;
                        let msg = `New ELO: ${newElo} (${changeStr}) | Rank: ${newRank.name}`;
                        if(window.showGameOver) window.showGameOver(result==='win'?'Victory!':(result==='loss'?'Defeat!':'Draw!'), msg, result === 'win');
                        fetchInGameStats(); 
                    }, 1000);
                }
            });
        });
}

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

    const roomParam = urlParams.get('room');
    if (roomParam) {
        document.getElementById('status').textContent = 'Joining specific room...';
        // Hide panel when auto-joining
        setupPanel.style.display = 'none';
        
        // Let the socket connection settle, then join
        setTimeout(() => joinRoom(roomParam), 300);
    }
}

function fetchInGameStats() {
    const username = localStorage.getItem('username');
    if (!username) return;

    fetch(`/api/profile/${username}`)
        .then(res => res.json())
        .then(data => {
            const stats = (data.stats || []).find(s => s.game === 'tictactoe') || { wins: 0, losses: 0, draws: 0 };
            const total = (stats.wins || 0) + (stats.losses || 0) + (stats.draws || 0);
            const winrate = total > 0 ? Math.round((stats.wins / total) * 100) : 0;
            const currentElo = data.user ? (data.user.elo || 1000) : 1000;
            
            // DOM Updates
            if(document.getElementById('ttt-stat-winrate')) document.getElementById('ttt-stat-winrate').textContent = `${winrate}%`;
            if(document.getElementById('ttt-stat-elo')) document.getElementById('ttt-stat-elo').textContent = currentElo;
            if(document.getElementById('ttt-stat-total')) document.getElementById('ttt-stat-total').textContent = total;
            if(document.getElementById('ttt-stat-wins')) document.getElementById('ttt-stat-wins').textContent = stats.wins;
            if(document.getElementById('ttt-stat-losses')) document.getElementById('ttt-stat-losses').textContent = stats.losses;
            if(document.getElementById('ttt-stat-draws')) document.getElementById('ttt-stat-draws').textContent = stats.draws;
            
            // Update Card ELOs if they exist
            document.querySelectorAll('.elo-display').forEach(el => el.textContent = `ELO: ${currentElo}`);

            // Mode specific stats if we had them saved by mode (for now we group as tictactoe)
            // But we can show breakdown of types from match_history
            const historyContainer = document.getElementById('ttt-recent-history');
            if (historyContainer && data.history) {
                historyContainer.innerHTML = '';
                const tttHistory = data.history.filter(h => h.game === 'tictactoe').slice(0, 5);
                
                if (tttHistory.length === 0) {
                    historyContainer.innerHTML = '<p style="color: #666; font-style: italic; text-align: center;">No match history yet.</p>';
                } else {
                    tttHistory.forEach(h => {
                        const div = document.createElement('div');
                        div.style.background = 'rgba(255,255,255,0.03)';
                        div.style.padding = '12px 18px';
                        div.style.borderRadius = '12px';
                        div.style.display = 'flex';
                        div.style.justifyContent = 'space-between';
                        div.style.alignItems = 'center';
                        div.style.border = '1px solid rgba(255,255,255,0.05)';
                        
                        const resultColor = h.result === 'win' ? '#00e676' : (h.result === 'loss' ? '#ff4757' : '#8b8f9c');
                        const date = new Date(h.date).toLocaleDateString();
                        
                        div.innerHTML = `
                            <div style="display: flex; flex-direction: column;">
                                <span style="font-weight: 800; color: ${resultColor}; text-transform: uppercase; font-size: 0.8rem;">${h.result}</span>
                                <span style="font-size: 0.75rem; color: #8b8f9c;">vs ${h.opponent || 'AI Arena'}</span>
                            </div>
                            <span style="font-size: 0.8rem; color: #666;">${date}</span>
                        `;
                        historyContainer.appendChild(div);
                    });
                }
            }
        });
}

// Open modal helper
window.openModal = function(id) {
    if (id === 'inGameStatsModal') fetchInGameStats();
    const m = document.getElementById(id);
    if (m) {
        m.style.display = 'flex';
        m.classList.remove('hidden');
    }
};

window.closeModal = function(id) {
    const m = document.getElementById(id);
    if (m) {
        m.style.display = 'none';
        m.classList.add('hidden');
    }
};

function updateStatsUI() {
    // Session stats logic
}

function recordResult(winnerSymbol) {
    let result = 'loss';
    if (winnerSymbol === 'Draw') result = 'draw';
    else if (winnerSymbol === mySymbol) result = 'win';

    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) restartBtn.style.display = 'block';

    const username = localStorage.getItem('username');
    if (!username) return;

    fetch('/api/record-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            username, 
            game: 'tictactoe', 
            result, 
            score: 0,
            opponent: mode.includes('ai') ? 'AI Arena' : 'Opponent'
        })
    }).then(r => r.json()).then(() => {
        fetchInGameStats(); 
    }).catch(e => console.error('Failed to save score'));
}

function checkGameOverState(didMove = false) {
    const winner = Game.checkGameState();
    if (winner) {
        gameStarted = false;
        updateSessionScore(winner);
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
        if (mode === 'solo' && Game.currentPlayer === 'O') return; 
        if (Game.handleClick(index)) {
            const winner = Game.checkGameState();
            if (winner) {
                gameStarted = false; // Prevent further moves
                updateSessionScore(winner);
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

function updateSessionScore(winner) {
    sessionScore.Total++;
    if (winner === 'X' || winner === 'O') {
        sessionScore[winner]++;
        const scoreEl = document.getElementById(`score-${winner}`);
        if (scoreEl) scoreEl.textContent = sessionScore[winner];
    } else if (winner === 'Draw') {
        sessionScore.Draws++;
    }
    updateStatsUI();
}

function aiTurn(isArcade = false, difficulty = 2) {
    if (!Game.gameActive) return;

    let aiMoveIdx = -1;
    if (isArcade && Game.getCustomAIMove) {
        aiMoveIdx = Game.getCustomAIMove(difficulty);
    } else {
        aiMoveIdx = makeAIMove(Game.board, 'O', difficulty);
    }
    
    if (aiMoveIdx !== -1) {
        Game.handleClick(aiMoveIdx);
        const winner = Game.checkGameState();
        if(winner) {
           gameStarted = false;
           updateSessionScore(winner);
           recordResult(winner);
           if (activeMode && activeMode.onGameOver) {
               activeMode.onGameOver(winner);
           }
        } else {
           Game.switchPlayer();
           if (isArcade && Game.currentPlayer === 'O') {
               setTimeout(() => aiTurn(true), 800);
           }
        }
    }
}

function handleRestartLocal() {
    Game.resetGame();
    if (activeMode && activeMode.init) activeMode.init(); 
    gameStarted = true;
    
    document.querySelectorAll('.cell').forEach(c => c.textContent = '');
    
    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) restartBtn.style.display = 'none';

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (networkPlay) {
        document.getElementById('status').textContent = mySymbol === 'X' ? "Your Turn (X)" : "Waiting for (X)";
    }
}
