/*
    Written by Caleb, KO4UYJ
    Discord: _php_
    Email: ko4uyj@gmail.com

    Create whackerlink master server
 */

import express from "express";
import session from "express-session";
import http from "http";
import {Server as SocketIOServer} from "socket.io";
import axios from 'axios';
import fs from "fs";
import yaml from "js-yaml";
import {google} from 'googleapis';
import * as https from "https";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import db from './db.js';
import path from 'path';
import Peer from './peer.js';
import io from "socket.io-client";

class Master {
    /*
        Constructor
     */
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
    }

    /*
        Create new master instance
     */
    create() {
        //TODO: Implement
        this.logger.debug("not implemented");
    }
}
export default Master