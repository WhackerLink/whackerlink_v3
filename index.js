import express from "express";
import http from "http";
import {Server as SocketIOServer} from "socket.io";
import fs from "fs";
import yaml from "js-yaml";
import {google} from 'googleapis';
const app = express();
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer);

const socketsStatus = {};
const grantedChannels = {};
const grantedRids = {};
const affiliations = [];


const configFilePathIndex = process.argv.indexOf('-c');
if (configFilePathIndex === -1 || process.argv.length <= configFilePathIndex + 1) {
    console.error('Please provide the path to the configuration file using -c argument.');
    process.exit(1);
}

const configFilePath = process.argv[configFilePathIndex + 1];

try {
    const configFile = fs.readFileSync(configFilePath, 'utf8');
    const config = yaml.load(configFile);

    const networkName = config.system.networkName;
    const networkBindAddress = config.system.networkBindAddress;
    const networkBindPort = config.system.networkBindPort;
    const fullPath = config.paths.fullPath;
    const rconLogins = config.paths.rconLogins;
    const serviceAccountKeyFile = config.paths.sheetsJson;
    const sheetId = config.configuration.sheetId;
    const externalPeerEnable = config.peer.externalPeerEnable;
    const grantDenyOccurrence = config.configuration.grantDenyOccurrence;
    // const rconUsername = config.peer.username;
    // const rconPassword = config.peer.password;
    // const rconRid = config.peer.rid;
    // const rconChannel = config.peer.channel;
    // const metaData = config.peer.metaData;
    // const rconEnable = config.peer.rconEnable;

    console.log('Network Name:', networkName);
    console.log('Network Bind Address:', networkBindAddress);
    console.log('Network Bind Port:', networkBindPort);
    console.log('Full Path:', fullPath);
    console.log('RCON Logins Path:', rconLogins);
    console.log('Sheets JSON Path:', serviceAccountKeyFile);
    console.log('Sheet ID:', sheetId);
    console.log('grantDenyOccurrence:', grantDenyOccurrence);
    console.log('External Peer Enable:', externalPeerEnable);

    if (grantDenyOccurrence < 3){
        console.log("grantDenyOccurrence can not be lower than three");
        throw Error;
    }
    // console.log('Username:', username);
    // console.log('Password:', password);
    // console.log('RID:', rid);
    // console.log('Channel:', channel);
    // console.log('Meta Data:', metaData);
    // console.log('RCON Enable:', rconEnable);

    const googleSheetClient = await getGoogleSheetClient();

    app.set("view engine", "ejs");
    app.use("/files", express.static("public"));
    app.get("/" , async (req , res)=>{
        try {
            const sheetTabs = await getSheetTabs(googleSheetClient, sheetId);
            const zoneData = [];
            for (const tab of sheetTabs) {
                const tabData = await readGoogleSheet(googleSheetClient, sheetId, tab, "A:B");
                zoneData.push({ zone: tab, content: tabData });
            }
            res.render("index", { zoneData });
        } catch (error) {
            console.error("Error fetching sheet data:", error);
            res.status(500).send("Error fetching sheet data");
        }
    });
    app.get("/radio" , (req , res)=>{
        res.render("radio", {selected_channel: req.query.channel, rid: req.query.rid, mode: req.query.mode, zone: req.query.zone});
    });
    app.get("/sys_view" , (req , res)=>{
        res.render("systemView");
    });
    app.get("/sys_view/admin" , (req , res)=>{
        res.render("adminView");
    });
    app.get("/affiliations" , (req , res)=>{
        res.render("affiliations", {affiliations});
    });
    function getDaTime(){
        const currentDate = new Date();
        const cdtOptions = {
            timeZone: 'America/Chicago',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
        };
        return currentDate.toLocaleString('en-US', cdtOptions);
    }
    function removeAffiliation(rid) {
        const index = affiliations.findIndex(affiliation => affiliation.rid === rid);
        if (index !== -1) {
            affiliations.splice(index, 1);
        }
        // affiliations.forEach(affiliation => {
        //     console.log(affiliation);
        // });
        io.emit('AFFILIATION_LOOKUP_UPDATE', affiliations);
    }
    function addAffiliation(rid, channel){
        affiliations.push({ rid: rid, channel: channel });
        io.emit('AFFILIATION_LOOKUP_UPDATE', affiliations);
    }
    function getAffiliation(rid) {
        const affiliation = affiliations.find(affiliation => affiliation.rid === rid);
        return affiliation ? affiliation.channel : false;
    }
    io.on("connection", function (socket) {
        const socketId = socket.id;
        socketsStatus[socket.id] = {};

        socket.on("voice", function (data) {
            var newData = data.split(";");
            newData[0] = "data:audio/wav;";
            newData = newData.join(";");

            const senderChannel = socketsStatus[socketId].channel;

            for (const id in socketsStatus) {
                const recipientChannel = socketsStatus[id].channel;

                if (id != socketId && !socketsStatus[id].mute && socketsStatus[id].online && senderChannel === recipientChannel)
                    socket.broadcast.to(id).emit("send", newData);
            }
        });

        socket.on("userInformation", function (data) {
            socketsStatus[socketId] = data;
            io.sockets.emit("usersUpdate", socketsStatus);
        });

        socket.on("AFFILIATION_LIST_REQUEST", function(){
            io.emit('AFFILIATION_LOOKUP_UPDATE', affiliations);
        });

        socket.on("VOICE_CHANNEL_REQUEST", function (data){
            console.log(`VOICE_CHANNEL_REQUEST FROM: ${data.rid} TO: ${data.channel}`);

            const cdtDateTime = getDaTime();
            data.stamp = cdtDateTime;
            io.emit("VOICE_CHANNEL_REQUEST", data);
            setTimeout(function (){
                let integerNumber = parseInt(data.rid);
                if (!Number.isInteger(integerNumber)) {
                    data.stamp = cdtDateTime;
                    io.emit("VOICE_CHANNEL_DENY", data);
                    console.log("Invalid RID type");
                    return;
                }
                if (grantedChannels[data.channel] === undefined) {
                    grantedChannels[data.channel] = false;
                }
                if (grantedRids[data.rid] === undefined){
                    grantedRids[data.rid] = false;
                }
                let grant = false;
                const randomNum = Math.floor(Math.random() * 5) + 1;
                grant = randomNum !== 3;
                if (grant && !grantedChannels[data.channel]) {
                    data.stamp = cdtDateTime;
                    io.emit("VOICE_CHANNEL_GRANT", data);
                    console.log(`VOICE_CHANNEL_GRANT GIVEN TO: ${data.rid} ON: ${data.channel}`);
                    grantedChannels[data.channel] = true;
                    grantedRids[data.rid] = true;
                } else {
                    data.stamp = cdtDateTime;
                    io.emit("VOICE_CHANNEL_DENY", data);
                    console.log(`VOICE_CHANNEL_DENY GIVEN TO: ${data.rid} ON: ${data.channel}`);
                    grantedChannels[data.channel] = false;
                }

            }, 500);
        });

        socket.on("RELEASE_VOICE_CHANNEL", function (data){
            data.stamp = getDaTime();
            console.log(`RELEASE_VOICE_CHANNEL FROM: ${data.rid} TO: ${data.channel}`);
            io.emit("VOICE_CHANNEL_RELEASE", data);
            grantedRids[data.rid] = false;
            grantedChannels[data.channel] = false;
        });

        socket.on("disconnect", function (data) {
            if (socketsStatus[socketId].username) {
                removeAffiliation(socketsStatus[socketId].username);
            }
            delete socketsStatus[socketId];
        });

        socket.on("CHANNEL_AFFILIATION_REQUEST", function (data){
            data.stamp = getDaTime();
            io.emit("CHANNEL_AFFILIATION_REQUEST", data);
            setTimeout(function (){
                io.emit("CHANNEL_AFFILIATION_GRANTED", data);
                if (!getAffiliation(data.rid)){
                    console.log("AFFILIATION GRANTED TO: " + data.rid + " ON: " + data.channel);
                    addAffiliation(data.rid, data.channel, data.stamp = getDaTime());
                } else {
                    console.log("AFFILIATION GRANTED TO: " + data.rid + " ON: " + data.channel + " AND REMOVED OLD AFF");
                    removeAffiliation(data.rid);
                    addAffiliation(data.rid, data.channel);
                }
            },1500);
        });
        socket.on("REMOVE_AFFILIATION", function (data){
            data.stamp = getDaTime();
            removeAffiliation(data.rid);
            console.log("AFFILIATION REMOVED: " + data.rid + " ON: " + data.channel);
            io.emit("REMOVE_AFFILIATION_GRANTED", data);
        });

        socket.on("EMERGENCY_CALL", function (data){
            data.stamp = getDaTime();
            console.log("EMERGENCY_CALL FROM: " + data.rid + " ON: " + data.channel)
            io.emit("EMERGENCY_CALL", data);
        });

        socket.on("RID_INHIBIT", async function(data) {
            data.stamp = getDaTime();
            const ridToInhibit = data.channel;
            const ridAcl = await readGoogleSheet(googleSheetClient, sheetId, "rid_acl", "A:B");
            io.emit("RID_INHIBIT", data);
            const matchingIndex = ridAcl.findIndex(entry => entry[0] === ridToInhibit);

            if (matchingIndex !== -1) {
                ridAcl[matchingIndex][1] = '0';
                await updateGoogleSheet(googleSheetClient, sheetId, "rid_acl", "A:B", ridAcl);
                console.log(`RID_INHIBIT: ${ridToInhibit}`);
            }
        });

        socket.on("RID_INHIBIT_ACK", function (data){
           io.emit("RID_INHIBIT_ACK", data);
        });

        socket.on("RID_UNINHIBIT_ACK", function (data){
            io.emit("RID_UNINHIBIT_ACK", data);
        });

        socket.on("RID_UNINHIBIT", async function (data){
            data.stamp = getDaTime();
            const ridToUnInhibit = data.channel;
            const ridAcl = await readGoogleSheet(googleSheetClient, sheetId, "rid_acl", "A:B");
            io.emit("RID_UNINHIBIT", data);
            const matchingIndex = ridAcl.findIndex(entry => entry[0] === ridToUnInhibit);

            if (matchingIndex !== -1) {
                ridAcl[matchingIndex][1] = '1';
                await updateGoogleSheet(googleSheetClient, sheetId, "rid_acl", "A:B", ridAcl);
                console.log(`RID_UNINHIBIT: ${ridToUnInhibit}`);
            }
        });

        socket.on("REG_REQUEST", async function (rid){
            io.emit("REG_REQUEST", rid);
            String.prototype.isNumber = function(){return /^\d+$/.test(this);}
            let ridAcl = await readGoogleSheet(googleSheetClient, sheetId, "rid_acl", "A:B");
            const matchingEntry = ridAcl.find(entry => entry[0] === rid);
            setTimeout(function (){
                if (rid.isNumber()) {
                    if (matchingEntry) {
                        const inhibit = matchingEntry[1];
                        if (inhibit === '1') {
                            io.emit("REG_GRANTED", rid);
                            console.log("REG_GRANTED: " + rid);
                        } else {
                            io.emit("RID_INHIBIT", {channel: rid, rid: "999999999"});
                        }
                    } else {
                        io.emit("REG_DENIED", rid);
                        console.log("REG_DENIED: " + rid);
                    }
                } else {
                    io.emit("REG_DENIED", rid);
                    console.log("REG_DENIED: " + rid);
                }
            }, 1500);
        });
    });

    async function getGoogleSheetClient() {
        const auth = new google.auth.GoogleAuth({
            keyFile: serviceAccountKeyFile,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const authClient = await auth.getClient();
        return google.sheets({
            version: 'v4',
            auth: authClient,
        });
    }
    async function getSheetTabs(googleSheetClient, sheetId) {
        const res = await googleSheetClient.spreadsheets.get({
            spreadsheetId: sheetId,
            ranges: [],
            includeGridData: false,
        });

        const sheets = res.data.sheets;
        const tabs = sheets.map(sheet => sheet.properties.title);

        const tabsToRemove = ["rid_acl"];
        return tabs.filter(tab => !tabsToRemove.includes(tab));
    }

    async function readGoogleSheet(googleSheetClient, sheetId, tabName, range) {
        const res = await googleSheetClient.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `${tabName}!${range}`,
        });
        return res.data.values;
    }

    async function writeGoogleSheet(googleSheetClient, sheetId, tabName, range, data) {
        await googleSheetClient.spreadsheets.values.append({
            spreadsheetId: sheetId,
            range: `${tabName}!${range}`,
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                "majorDimension": "ROWS",
                "values": data
            },
        })
    }
    async function updateGoogleSheet(googleSheetClient, sheetId, tabName, range, data) {
        await googleSheetClient.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: `${tabName}!${range}`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                "majorDimension": "ROWS",
                "values": data
            },
        });
    }

    httpServer.listen(networkBindPort, networkBindAddress, () => {
        console.log(`${networkName} is running on ${networkBindAddress}:${networkBindPort}`);
    });

} catch (error) {
    console.error('Error starting. Maybe config file?: ', error.message);
}