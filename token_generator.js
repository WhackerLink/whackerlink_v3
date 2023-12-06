/**
 * This file is part of the WhackerLink project.
 *
 * (c) 2023 Caleb <ko4uyj@gmail.com>
 *
 * For the full copyright and license information, see the
 * LICENSE file that was distributed with this source code.
 */

import * as fs from "fs";
import * as path from 'path';
import createDebug from 'debug';
import configLoader from './src/components/ConfigLoader.js';
import jwt from 'jsonwebtoken';
import yaml from "js-yaml";

const debug = createDebug('WhackerLink:token_generator');
const configIndex = process.argv.indexOf('-c');

let configPath = path.join('config', 'config.yaml'); // Default config file
if (configIndex > -1) {
    configPath = process.argv[configIndex + 1];
}

const configFilePath = new URL(configPath, import.meta.url);
const config = configLoader.loadYaml(configFilePath);

function generateSocketIOToken(payload, secret) {
    try {
        return jwt.sign(payload, secret);
    } catch (error) {
        console.error('Error generating token:', error);

        return null;
    }
}

const payload = { user: "Whacker Key" };
const token = generateSocketIOToken(payload, config.configuration.apiToken);

console.log('Generated JWT Token:', token);

config.configuration.socketAuthToken = token;

let newYml = yaml.dump(config);

fs.writeFileSync(configFilePath, newYml)
