/**
 * This file is part of the WhackerLink project.
 *
 * (c) 2023 Caleb <ko4uyj@gmail.com>
 *
 * For the full copyright and license information, see the
 * LICENSE file that was distributed with this source code.
 */

import jwt from 'jsonwebtoken';
import fs from "fs";
import yaml from "js-yaml";

function generateSocketIOToken(payload, secret) {
    try {
        return jwt.sign(payload, secret);
    } catch (error) {
        console.error('Error generating token:', error);

        return null;
    }
}

const configFilePathIndex = process.argv.indexOf('-c');

if (configFilePathIndex === -1 || process.argv.length <= configFilePathIndex + 1) {
    console.error('Please provide the path to the configuration file using -c argument.');
    process.exit(1);
}

const configFilePath = process.argv[configFilePathIndex + 1];

try {
    const configFile = fs.readFileSync(configFilePath, 'utf8');
    const config = yaml.load(configFile);
    const payload = {user: "Whacker Key"};
    const token = generateSocketIOToken(payload, config.configuration.apiToken);

    console.log('Generated JWT Token:', token);

    config.configuration.socketAuthToken = token;

    let newYml = yaml.dump(config);

    fs.writeFileSync(configFilePath, newYml)
} catch (err){
    console.log(err);
}
