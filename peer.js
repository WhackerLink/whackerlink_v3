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
    constructor(username, password, srcId, dstId, metaData, rconEnable, endPoint, logger) {
        this.username = username;
        this.password = password;
        this.srcId = srcId;
        this.dstId = dstId;
        this.metaData = metaData;
        this.rconEnable = rconEnable;
        this.endPoint = endPoint;
        this.logger = logger;
    }

    /*
        Create new peer instance
     */
    create() {
        const peerSocket = io(this.endPoint);
        this.logger.info("Attempting peer authentication: " + this.endPoint)
        // TODO: Implement JWT
        peerSocket.on('connect', function (d) {
            this.logger.info("Connected to peer: " + this.endPoint);
            // TODO: Implement peering
        });
    }
}
export default Peer

