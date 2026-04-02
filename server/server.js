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
    db.get(`SELECT username, xp, level, tickets, avatar, snake_color, elo, tictactoe_token, tictactoe_theme, tictactoe_animation FROM users WHERE username = ?`, [req.params.username], (err, user) => {
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


// --- FRIENDS & INVITES API ---
app.post('/api/friends/add', (req, res) => {
    const { username, friend } = req.body;
    if(!username || !friend) return res.status(400).json({error: 'Missing info'});
    
    // check if friend exists
    db.get('SELECT username FROM users WHERE username = ?', [friend], (err, row) => {
        if(err) return res.status(500).json({error: err.message});
        if(!row) return res.status(404).json({error: 'User not found'});
        
        db.get('SELECT * FROM friends WHERE user = ? AND friend = ?', [username, friend], (err, ex) => {
            if(ex) return res.status(400).json({error: 'Already friends'});
            
            db.run('INSERT INTO friends (user, friend, status) VALUES (?, ?, ?)', [username, friend, 'offline'], (err) => {
                if(err) return res.status(500).json({error: err.message});
                // bi-directional
                db.run('INSERT INTO friends (user, friend, status) VALUES (?, ?, ?)', [friend, username, 'offline']);
                res.json({success: true, message: 'Friend added!'});
            });
        });
    });
});

app.post('/api/friends/invite', (req, res) => {
    const { from, to, game, link } = req.body;
    if(!from || !to || !game) return res.status(400).json({error: 'Missing info'});
    
    const message = `${from} invited you to play ${game}!`;
    db.run('INSERT INTO notifications (user, message, type, link) VALUES (?, ?, ?, ?)', [to, message, 'invite', link], (err) => {
        if(err) return res.status(500).json({error: err.message});
        res.json({success: true});
    });
});
// -----------------------------

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
        if (type === 'tictactoe_token') query += `, tictactoe_token = ?`;
        if (type === 'tictactoe_theme') query += `, tictactoe_theme = ?`;
        if (type === 'tictactoe_animation') query += `, tictactoe_animation = ?`;
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

// API: Wager Match Result
app.post('/api/record-wager', (req, res) => {
    const { username, result, wagerAmount } = req.body;
    if (!username || !result || !wagerAmount) return res.status(400).json({ error: 'Missing data' });
    
    db.get(`SELECT tickets FROM users WHERE username = ?`, [username], (err, user) => {
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        let ticketsChange = 0;
        if (result === 'win') ticketsChange = parseInt(wagerAmount); // Winner gets their money + opponent's money (net +wagerAmount)
        else if (result === 'loss') ticketsChange = -parseInt(wagerAmount); // Loser loses wagerAmount
        
        if (ticketsChange < 0 && user.tickets + ticketsChange < 0) {
            ticketsChange = -user.tickets;
        }

        db.run(`UPDATE users SET tickets = tickets + ? WHERE username = ?`, [ticketsChange, username], (err) => {
            if(err) return res.status(500).json({error: err.message});
            res.json({ success: true, ticketsChange });
        });
    });
});

// API: Ranked Match Result
app.post('/api/record-ranked', (req, res) => {
    const { username, result, opponentElo } = req.body; // Result: 'win', 'loss', 'draw'
    if (!username || !result) return res.status(400).json({ error: 'Missing data' });
    
    db.get(`SELECT elo FROM users WHERE username = ?`, [username], (err, user) => {
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        let currentElo = user.elo || 1000;
        let oppElo = opponentElo || 1000;
        let K = 32;
        let expectedScore = 1 / (1 + Math.pow(10, (oppElo - currentElo) / 400));
        let actualScore = result === 'win' ? 1 : (result === 'draw' ? 0.5 : 0);
        
        let newElo = Math.round(currentElo + K * (actualScore - expectedScore));
        if(newElo < 0) newElo = 0;
        
        db.run(`UPDATE users SET elo = ? WHERE username = ?`, [newElo, username], (err) => {
            if(err) return res.status(500).json({error: err.message});
            res.json({ success: true, newElo, eloChange: newElo - currentElo });
        });
    });
});

// API: Record Match

// --- PLAYTIME XP SYSTEM ---
app.post('/api/record-playtime', (req, res) => {
    let { username, game, minutes } = req.body;
    if (!username || !game || !minutes) return res.status(400).json({ error: 'Missing data' });
    
    // Reward: 10 XP and 2 Tickets per minute played
    const xpGain = minutes * 10;
    const ticketGain = minutes * 2;

    db.get(`SELECT xp, level, tickets FROM users WHERE username = ?`, [username], (err, user) => {
        if (err || !user) return res.status(500).json({ error: 'Database err' });

        let newXp = user.xp + xpGain;
        let newLevel = user.level;
        let nextLevelXp = newLevel * 100;

        while (newXp >= nextLevelXp) {
            newLevel++;
            newXp -= nextLevelXp;
            nextLevelXp = newLevel * 100;
        }

        db.run(`UPDATE users SET xp = ?, level = ?, tickets = tickets + ? WHERE username = ?`, 
            [newXp, newLevel, ticketGain, username], 
            function(err) {
                if(err) console.error(err);
                res.json({ message: 'Playtime rewarded!', xpAdded: xpGain, level: newLevel, ticketsAdded: ticketGain });
            }
        );
    });
});
// --------------------------

app.post('/api/record-playtime', (req, res) => {
    let { username, game, minutes } = req.body;
    if (!username || !game || !minutes) return res.status(400).json({ error: 'Missing data' });
    
    // Reward: 10 XP and 2 Tickets per minute played
    const xpGain = minutes * 10;
    const ticketGain = minutes * 2;

    db.get(`SELECT xp, level, tickets FROM users WHERE username = ?`, [username], (err, user) => {
        if (err || !user) return res.status(500).json({ error: 'Database err' });

        let newXp = user.xp + xpGain;
        let newLevel = user.level;
        let nextLevelXp = newLevel * 100;

        while (newXp >= nextLevelXp) {
            newLevel++;
            newXp -= nextLevelXp;
            nextLevelXp = newLevel * 100;
        }

        db.run(`UPDATE users SET xp = ?, level = ?, tickets = tickets + ? WHERE username = ?`, 
            [newXp, newLevel, ticketGain, username], 
            function(err) {
                if(err) console.error(err);
                res.json({ message: 'Playtime rewarded!', xpAdded: xpGain, level: newLevel, ticketsAdded: ticketGain });
            }
        );
    });
});

app.post('/api/record-match', (req, res) => {
    let { username, game, result, score, opponent } = req.body; // result: 'win', 'loss', 'draw'
    if (!username || !game || !result) return res.status(400).json({ error: 'Missing data' });
    
    // Process Match History
    if (!opponent) opponent = 'Singleplayer';
    
    db.run(`INSERT INTO match_history (username, opponent, game, result) VALUES (?, ?, ?, ?)`, [username, opponent, game, result]);

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

// Socket.IO Logic
io.on('connection', (socket) => {
    // Send existing history to the newly connected socket

    // Registration for real-time notifications/invites
    socket.on('registerUser', (username) => {
        if (username) {
            socket.join('user_' + username);
            console.log(username + " registered for real-time events");
        }
    });

    socket.on('sendGameInvite', (data) => {
        // data: { from: 'username', to: 'friend', game: 'tictactoe', link: '...' }
        db.get(`SELECT username FROM users WHERE username = ?`, [data.to], (err, user) => {
            if (user) {
                // Send real-time
                io.to('user_' + data.to).emit('receiveGameInvite', data);
                // Also save to notifications
                db.run(`INSERT INTO notifications (user, message, time_ago, read) VALUES (?, ?, ?, 0)`, 
                    [data.to, `${data.from} invited you to play ${data.game}!`, 'Just now']);
            }
        });
    });

    socket.on('globalChat', (messageObj) => {
        
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

app.get('/api/stakes/balance', (req, res) => {
    let { username } = req.query;
    if (!username) return res.status(400).json({ error: 'Username required' });
    db.get("SELECT tokens FROM users WHERE username = ?", [username], (err, row) => {
        if (err) return res.status(500).json({ error: 'Server error' });
        res.json({ tokens: row && row.tokens !== null ? row.tokens : 1000.0 });
    });
});


app.get('/api/maze/progress', (req, res) => {
    let { username } = req.query;
    if (!username) return res.status(400).json({ error: 'Username required' });
    db.get("SELECT max_level FROM maze_progress WHERE username = ?", [username], (err, row) => {
        if (err) return res.status(500).json({ error: 'Server error' });
        res.json({ max_level: row ? row.max_level : 1 });
    });
});

app.post('/api/maze/progress', (req, res) => {
    let { username, level } = req.body;
    if (!username || !level) return res.status(400).json({ error: 'Invalid data' });
    db.get("SELECT max_level FROM maze_progress WHERE username = ?", [username], (err, row) => {
        if (row) {
            if (level > row.max_level) {
                db.run("UPDATE maze_progress SET max_level = ? WHERE username = ?", [level, username]);
            }
        } else {
            db.run("INSERT INTO maze_progress (username, max_level) VALUES (?, ?)", [username, level]);
        }
        res.json({ success: true });
    });
});

app.post('/api/stakes/update', (req, res) => {
    let { username, amount } = req.body;
    if (!username) return res.status(400).json({ error: 'Username required' });
    db.get("SELECT tokens FROM users WHERE username = ?", [username], (err, row) => {
        if (err || !row) return res.status(500).json({ error: 'Server error' });
        let currentTokens = row.tokens !== null ? row.tokens : 1000.0;
        let newTokens = currentTokens + amount;
        db.run("UPDATE users SET tokens = ? WHERE username = ?", [newTokens, username], (err2) => {
            if (err2) return res.status(500).json({ error: 'Update failed' });
            res.json({ success: true, tokens: newTokens });
        });
    });
});


app.get('/api/stakes/ledger', (req, res) => {
    db.all("SELECT username, game, bet, multiplier, payout FROM stakes_ledger ORDER BY id DESC LIMIT 100", [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Server error' });
        res.json({ ledger: rows });
    });
});

app.post('/api/stakes/ledger', (req, res) => {
    const { username, game, bet, multiplier, payout } = req.body;
    db.run("INSERT INTO stakes_ledger (username, game, bet, multiplier, payout) VALUES (?, ?, ?, ?, ?)", 
        [username || 'Guest', game, bet, multiplier, payout], function(err) {
        if (err) return res.status(500).json({ error: 'Server error' });
        res.json({ success: true, id: this.lastID });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
