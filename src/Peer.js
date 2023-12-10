/**
 * This file is part of the WhackerLink project.
 *
 * (c) 2023 Caleb <ko4uyj@gmail.com>
 *
 * For the full copyright and license information, see the
 * LICENSE file that was distributed with this source code.
 */

import io from "socket.io-client";

/**
 * Create peer connection to other WhackerLink applications. The device creating the connection acts as the master
 */
export default class Peer {
    constructor(jwt, srcId, dstId, ignoreCommands, endPoint, logger) {
        this.jwt = jwt;
        this.srcId = srcId;
        this.dstId = dstId;
        this.ignoreCommands = ignoreCommands;
        this.endPoint = endPoint;
        this.logger = logger;
    }

    create() {
        this.authenticated = false;
        const peerSocket = io(this.endPoint, {
            query: { token: this.jwt }
        });
        this.logger.debug(this.jwt);
        this.logger.info("Attempting peer authentication: " + this.endPoint)
        peerSocket.on('connect', function () {
            this.authenticated = true;
            this.logger.info("Connected to peer: " + this.endPoint);
            // TODO: Implement peering
        });
        setTimeout(() => {
            if (!this.authenticated){
                this.logger.error("Peer authentication timed out");
                peerSocket.disconnect();
            }
        }, 5000);
    }
}
