/*
 * This file is part of the WhackerLink project.
 *
 * (c) 2023 Caleb <ko4uyj@gmail.com>
 *
 * For the full copyright and license information, see the
 * LICENSE file that was distributed with this source code.
 */

import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';

class DatabaseManager {

    /*
     *  @param {string} dbPath - Path to the database file
     *  @param {Logger} logger - Logger object
     */
    constructor(dbPath, logger) {
        this.logger = logger;
        this.db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                this.logger.error(err.message);
            } else {
                this.logger.info('Connected to the WhackerLink database');
                this.initializeDatabase();
            }
        });
    }

    /*
     *  Initialize the database if it doesn't exist
     */
    initializeDatabase() {
        this.logger.info("Initializing database");
        this.db.serialize(() => {
            this.db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                password TEXT NOT NULL,
                mainRid TEXT NOT NULL,
                level TEXT NOT NULL,
                last_login_ip TEXT
            )`);

            this.db.get("SELECT COUNT(*) AS count FROM users", (err, row) => {
                if (err) {
                    this.logger.error(err.message);
                    return;
                }

                if (row.count === 0) {
                    this.logger.info("No users found, creating default admin user")
                    this.createDefaultAdmin();
                }
            });
        });
    }

    /*
     *  Create the default admin user
     */
    createDefaultAdmin() {
        let saltRounds = 10;
        bcrypt.hash("passw0rd", saltRounds, (err, hash) => {
            if (err) {
                this.logger.error(err.message);
                return;
            }

            this.db.run(`INSERT INTO users (username, password, mainRid, level) VALUES (?, ?, ?, ?)`,
                ["admin", hash, "1", "admin"], (err) => {
                    if (err) {
                        this.logger.error(err.message);
                    } else {
                        this.logger.info("Default admin user created");
                    }
                });
        });
    }
}

export default DatabaseManager;
