const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Error opening database', err.message);
    else {
        console.log('Connected to the global SQLite database.');
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                password TEXT,
                xp INTEGER DEFAULT 0,
                level INTEGER DEFAULT 1,
                tickets INTEGER DEFAULT 0,
                avatar TEXT DEFAULT 'A',
                snake_color TEXT DEFAULT '#4CAF50',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);
            db.run(`CREATE TABLE IF NOT EXISTS stats (
                username TEXT,
                game TEXT,
                wins INTEGER DEFAULT 0,
                losses INTEGER DEFAULT 0,
                draws INTEGER DEFAULT 0,
                high_score INTEGER DEFAULT 0,
                PRIMARY KEY (username, game),
                FOREIGN KEY(username) REFERENCES users(username) ON UPDATE CASCADE
            )`);
            db.run(`CREATE TABLE IF NOT EXISTS sudoku_stats (
                username TEXT,
                difficulty TEXT,
                wins INTEGER DEFAULT 0,
                losses INTEGER DEFAULT 0,
                wins_no_hints INTEGER DEFAULT 0,
                wins_no_mistakes INTEGER DEFAULT 0,
                best_time_seconds INTEGER DEFAULT -1,
                PRIMARY KEY (username, difficulty),
                FOREIGN KEY(username) REFERENCES users(username) ON UPDATE CASCADE
            )`);
            db.run(`CREATE TABLE IF NOT EXISTS friends (
                user TEXT,
                friend TEXT,
                status TEXT DEFAULT 'online',
                PRIMARY KEY (user, friend)
            )`);
            db.run(`CREATE TABLE IF NOT EXISTS favorites (
                user TEXT,
                game TEXT,
                game_title TEXT,
                PRIMARY KEY (user, game)
            )`);
            db.run(`CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user TEXT,
                message TEXT,
                time_ago TEXT DEFAULT 'Just now',
                read INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);
        });
    }
});

module.exports = db;
