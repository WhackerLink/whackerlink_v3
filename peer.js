/*
    Written by Caleb, KO4UYJ
    Discord: _php_
    Email: ko4uyj@gmail.com

    Create peer connection to other WhackerLink applications. The device creating the connection acts as the master
 */

import io from "socket.io-client";

class Peer {
    /*
        Constructor
     */
    constructor(jwt, srcId, dstId, ignoreCommands, endPoint, logger) {
        this.jwt = jwt;
        this.srcId = srcId;
        this.dstId = dstId;
        this.ignoreCommands = ignoreCommands;
        this.endPoint = endPoint;
        this.logger = logger;
    }

    /*
        Create new peer instance
     */
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
export default Peer

