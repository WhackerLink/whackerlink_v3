import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';

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

    db.get("SELECT COUNT(*) AS count FROM users", (err, row) => {
        if (err) {
            console.error(err.message);
            return;
        }

        if (row.count === 0) {
            let saltRounds = 10;
            bcrypt.hash("passw0rd", saltRounds, function(err, hash) {
                if (err) {
                    console.error(err.message);
                    return;
                }
                db.run(`INSERT INTO users (username, password, mainRid, level) VALUES (?, ?, ?, ?)`, 
                ["admin", hash, "1", "admin"], (err) => {
                    if (err) {
                        console.error(err.message);
                    } else {
                        console.log("Default admin user created");
                    }
                });
            });
        }
    });
});

export default db;
