const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const bcrypt = require('bcrypt');
const db = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.json());

// API: Register
app.post('/api/signup', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    try {
        const hash = await bcrypt.hash(password, 10);
        db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, hash], function(err) {
            if (err) return res.status(400).json({ error: 'Username already exists' });
            res.json({ success: true, username });
        });
    } catch (e) {
        res.status(500).json({ error: 'Server error' });
    }
});

// API: Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
        if (err || !user) return res.status(400).json({ error: 'Invalid credentials' });
        
        const match = await bcrypt.compare(password, user.password);
        if (match) res.json({ success: true, username: user.username });
        else res.status(400).json({ error: 'Invalid credentials' });
    });
});

// API: Profile Stats
app.get('/api/profile/:username', (req, res) => {
    db.get(`SELECT username, xp, level, tickets, avatar, snake_color FROM users WHERE username = ?`, [req.params.username], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'User not found' });
        
        db.all(`SELECT game, wins, losses, draws, high_score FROM stats WHERE username = ?`, [req.params.username], (err, stats) => {
            if (err) return res.status(500).json({ error: err.message });
            
            db.all(`SELECT opponent, game, result, date FROM match_history WHERE username = ? ORDER BY date DESC LIMIT 10`, [req.params.username], (err, history) => {
                res.json({
                    user,
                    stats,
                    history: history || []
                });
            });
        });
    });
});


// API: Friends
app.get('/api/friends/:username', (req, res) => {
    db.all(`SELECT friend, status FROM friends WHERE user = ?`, [req.params.username], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// API: Favorites
app.get('/api/favorites/:username', (req, res) => {
    db.all(`SELECT game, game_title FROM favorites WHERE user = ?`, [req.params.username], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// API: Notifications
app.get('/api/notifications/:username', (req, res) => {
    db.all(`SELECT message, time_ago, read FROM notifications WHERE user = ? ORDER BY id DESC LIMIT 5`, [req.params.username], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// API: Buy Avatar / Skin
app.post('/api/shop/buy', (req, res) => {
    const { username, type, item, cost } = req.body;
    db.get(`SELECT tickets FROM users WHERE username = ?`, [username], (err, user) => {
        if (err || !user) return res.status(404).json({ error: 'User not found' });
        if (user.tickets < cost) return res.status(400).json({ error: 'Not enough tickets' });
        
        let query = `UPDATE users SET tickets = tickets - ?`;
        if (type === 'avatar') query += `, avatar = ?`;
        if (type === 'snake_color') query += `, snake_color = ?`;
        query += ` WHERE username = ?`;

        db.run(query, [cost, item, username], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, new_tickets: user.tickets - cost });
        });
    });
});

// API: Record Sudoku Detailed Stats
app.post('/api/record-sudoku-stats', (req, res) => {
    const { username, difficulty, result, usedHints, mistakes, timeFinished } = req.body;
    if (!username || !difficulty || !result) return res.status(400).json({ error: 'Missing data' });

    db.get(`SELECT * FROM sudoku_stats WHERE username = ? AND difficulty = ?`, [username, difficulty], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        
        if (row) {
            let winInc = result === 'win' ? 1 : 0;
            let lossInc = result === 'loss' ? 1 : 0;
            let noHintInc = (result === 'win' && usedHints === 0) ? 1 : 0;
            let noMistakeInc = (result === 'win' && mistakes === 0) ? 1 : 0;
            let newBestTime = row.best_time_seconds;
            if (result === 'win') {
                if (newBestTime === -1 || timeFinished < newBestTime) newBestTime = timeFinished;
            }
            
            db.run(`UPDATE sudoku_stats SET 
                wins = wins + ?, 
                losses = losses + ?, 
                wins_no_hints = wins_no_hints + ?, 
                wins_no_mistakes = wins_no_mistakes + ?, 
                best_time_seconds = ? 
                WHERE username = ? AND difficulty = ?`,
                [winInc, lossInc, noHintInc, noMistakeInc, newBestTime, username, difficulty]
            );
        } else {
            let winInc = result === 'win' ? 1 : 0;
            let lossInc = result === 'loss' ? 1 : 0;
            let noHintInc = (result === 'win' && usedHints === 0) ? 1 : 0;
            let noMistakeInc = (result === 'win' && mistakes === 0) ? 1 : 0;
            let newBestTime = result === 'win' ? timeFinished : -1;
            
            db.run(`INSERT INTO sudoku_stats (username, difficulty, wins, losses, wins_no_hints, wins_no_mistakes, best_time_seconds) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [username, difficulty, winInc, lossInc, noHintInc, noMistakeInc, newBestTime]
            );
        }
        res.json({ success: true });
    });
});

// API: Record Match
app.post('/api/record-match', (req, res) => {
    const { username, game, result, score, opponent } = req.body; // result: 'win', 'loss', 'draw'
    if (!username || !game || !result) return res.status(400).json({ error: 'Missing data' });
    
    // Process Match History
    if (opponent) {
        db.run(`INSERT INTO match_history (username, opponent, game, result) VALUES (?, ?, ?, ?)`, [username, opponent, game, result]);
    }

    // Process XP and Tickets
    let xpGain = 0;
    let ticketGain = 0;
    if (result === 'win') { xpGain = 50; ticketGain = 10; }
    else if (result === 'draw') { xpGain = 20; ticketGain = 2; }
    else if (result === 'loss') { xpGain = 10; ticketGain = 1; }
    else if (result === 'score_only') { xpGain = 5; ticketGain = 5; } // Default participation

    db.get(`SELECT xp, level FROM users WHERE username = ?`, [username], (err, user) => {
        if (user) {
            let newXp = user.xp + xpGain;
            let newLevel = user.level;
            const xpNeeded = newLevel * 100;
            if (newXp >= xpNeeded) {
                newXp -= xpNeeded;
                newLevel++;
            }
            db.run(`UPDATE users SET xp = ?, level = ?, tickets = tickets + ? WHERE username = ?`, [newXp, newLevel, ticketGain, username]);
        }
    });

    db.run(`INSERT OR IGNORE INTO stats (username, game) VALUES (?, ?)`, [username, game], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        let query = 'UPDATE stats SET ';
        if (result === 'win') query += `wins = wins + 1`;
        else if (result === 'loss') query += `losses = losses + 1`;
        else if (result === 'draw') query += `draws = draws + 1`;
        else if (result === 'score_only') query += `wins = wins`; // Dummy update to allow comma appending safely

        if (score) {
            query += `, high_score = MAX(COALESCE(high_score, 0), ${score})`;
        }
        query += ` WHERE username = ? AND game = ?`;

        db.run(query, [username, game], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            
            // Broadcast new aggregated leaderboard
            broadcastLeaderboard();
            res.json({ success: true });
        });
    });
});

function broadcastLeaderboard() {
    db.all(`SELECT u.username, u.level, u.avatar, SUM(s.wins) as total_wins, SUM(s.high_score) as max_score 
            FROM users u
            LEFT JOIN stats s ON u.username = s.username 
            GROUP BY u.username ORDER BY u.level DESC, total_wins DESC LIMIT 10`, [], (err, rows) => {
        if (!err) io.emit('leaderboardUpdate', rows);
    });
}
app.get('/api/leaderboard', (req, res) => {
    db.all(`SELECT u.username, u.level, u.avatar, SUM(s.wins) as total_wins, SUM(s.high_score) as max_score 
            FROM users u
            LEFT JOIN stats s ON u.username = s.username 
            GROUP BY u.username ORDER BY u.level DESC, total_wins DESC LIMIT 10`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Global Chat History
const chatHistory = [];

// Socket.IO Logic
io.on('connection', (socket) => {
    // Send existing history to the newly connected socket
    socket.emit('globalChatHistory', chatHistory);

    socket.on('globalChat', (messageObj) => {
        chatHistory.push(messageObj);
        if (chatHistory.length > 50) chatHistory.shift(); // keep last 50
        
        // messageObj: { username, text, avatar }
        io.emit('globalChatReceive', messageObj);
    });

    socket.on('createRoom', ({ roomCode, gameType }) => {
        socket.join(roomCode);
        io.sockets.adapter.rooms.get(roomCode).gameType = gameType; 
        socket.emit('roomCreated', roomCode);
    });

    socket.on('joinRoom', ({ roomCode }) => {
        const room = io.sockets.adapter.rooms.get(roomCode);
        if (room && room.size === 1) {
            socket.join(roomCode);
            socket.to(roomCode).emit('playerJoined', socket.id);
            socket.emit('roomJoined', roomCode);
            io.to(roomCode).emit('startGame', { players: Array.from(room) });
        } else {
            socket.emit('roomError', 'Room is full or does not exist');
        }
    });

    socket.on('sendMove', (data) => {
        socket.to(data.roomCode).emit('receiveMove', data.move);
    });
    
    // Custom events for dynamic real-time games like Snake
    socket.on('sendState', (data) => {
        socket.to(data.roomCode).emit('receiveState', data.state);
    });

    socket.on('restartGame', (roomCode) => {
        socket.to(roomCode).emit('restartGame');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
