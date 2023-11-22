import sqlite3 from 'sqlite3';

let db = new sqlite3.Database('./db/whackerlink_users.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the WhackerLink database');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        mainRid TEXT NOT NULL,
        level TEXT NOT NULL,
        last_login_ip TEXT
    )`);
});

export default db;