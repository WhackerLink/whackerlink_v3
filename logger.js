/*
    Written by Caleb, KO4UYJ
    Discord: _php_
    Email: ko4uyj@gmail.com

    Simple logging module
 */

import fs from 'fs';
function writeLog(path, message){
    fs.appendFileSync(`${path}whackerlink.log`, `${message}\n`);
}
class Logger{
    constructor(level, path, debug) {
        this.level = level;
        this.path = path;
        this.consoleDebug = debug;
    }
    info(message){
        let logMessage = `[INFO] [${Date.now()}] ${message}`;
        if (this.level >= 1) {
            writeLog(this.path, logMessage);
        }
        if (this.consoleDebug || this.level >= 1){
            console.log(logMessage);
        }
    }
    warn(message){
        let logMessage = `[WARN] [${Date.now()}] ${message}`;
        if (this.level >= 1) {
            writeLog(this.path, logMessage);
        }
        if (this.consoleDebug || this.level >= 1){
            console.log(logMessage);
        }
    }
    error(message){
        let logMessage = `[ERROR] [${Date.now()}] ${message}`;
        if (this.level >= 1) {
            writeLog(this.path, logMessage);
        }
        if (this.consoleDebug || this.level >= 1){
            console.log(logMessage);
        }
    }
    debug(message){
        let logMessage = `[DEBUG] [${Date.now()}] ${message}`;
        if (this.level >= 2) {
            writeLog(this.path, logMessage);
        }
        if (this.consoleDebug && this.level >= 2){
            console.log(logMessage);
        }
    }
}
export default Logger;