import express from "express";
import basicAuth from "express-basic-auth";
import session from "express-session";
import http from "http";
import {Server as SocketIOServer} from "socket.io";
import axios from 'axios';
import fs from "fs";
import yaml from "js-yaml";
import {google} from 'googleapis';
import * as https from "https";

//import io2 from "socket.io-client";
//let peerSocket = io2("https://whackerlink.com");
// peerSocket.on('connect', function(d){
//    //console.log("connnnnnnnnnect");
//     //Future peering stuff
// });
const socketsStatus = {};
const grantedChannels = {};
const grantedRids = {};
const affiliations = [];
let regDenyCount = {};
let activeVoiceChannels = {};

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
    const enableDiscord = config.configuration.discordWebHookEnable;
    const discordWebHookUrl = config.configuration.discordWebHookUrl;
    const discordVoiceG = config.discord.voiceGrant;
    const discordVoiceR = config.discord.voiceRequest;
    const discordAffG = config.discord.affiliationGrant;
    const discordAffR = config.discord.affiliationRequest;
    const discordRegG = config.discord.regGrant;
    const discordRegR = config.discord.regRequest;
    const discordRegD = config.discord.regDeny;
    const discordRegRfs = config.discord.regRefuse;
    const discordPage = config.discord.page;
    const discordInhibit = config.discord.inhibit;
    const discordEmerg = config.discord.emergencyCall;
    const discordVoiceD = config.discord.emergencyCall;
    const useHttps = config.configuration.httpsEnable || false;

    const controlChannels = config.system.controlChannels;
    const voiceChannels = config.system.voiceChannels;

    // const rconUsername = config.peer.username;
    // const rconPassword = config.peer.password;
    // const rconRid = config.peer.rid;
    // const rconChannel = config.peer.channel;
    // const metaData = config.peer.metaData;
    // const rconEnable = config.peer.rconEnable;

    console.log('Network Name:', networkName);
    console.log('HTTPS Enable:', useHttps);
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

    const httpApp = express();
    const httpServer = http.createServer(httpApp);
    const httpIo = new SocketIOServer(httpServer);

    const httpsOptions = {
        key: fs.readFileSync('./ssl/server.key'),
        cert: fs.readFileSync('./ssl/server.cert')
    };

    const httpsApp = express();
    const httpsServer = https.createServer(httpsOptions, httpsApp);
    const httpsIo = new SocketIOServer(httpsServer);

    const app = useHttps ? httpsApp : httpApp;
    const server = useHttps ? httpsServer : httpServer;
    const io = useHttps ? httpsIo : httpIo;

    const googleSheetClient = await getGoogleSheetClient();

    const loginsFile = fs.readFileSync(rconLogins);
    const adminUsers = JSON.parse(loginsFile);

    const availableVoiceChannels = new Set(voiceChannels);

    app.use(session({
        secret: "super_secret_password!2",
        resave: false,
        saveUninitialized: true
    }));

    const auth = basicAuth({
        users: adminUsers,
        challenge: true,
        unauthorizedResponse: "Unauthorized",
    });

    app.set("view engine", "ejs");
    app.use("/files", express.static("public"));
    /*
        User interface routes
     */
    app.get("/" , async (req , res)=>{
        try {
            const sheetTabs = await getSheetTabs(googleSheetClient, sheetId);
            const zoneData = [];
            for (const tab of sheetTabs) {
                const tabData = await readGoogleSheet(googleSheetClient, sheetId, tab, "A:B");
                zoneData.push({ zone: tab, content: tabData });
            }
            res.render("index", {zoneData, networkName});
        } catch (error) {
            console.error("Error fetching sheet data:", error);
            res.status(500).send("Error fetching sheet data");
        }
    });
    app.get("/radio", (req, res) => {
        let radio_model = req.query.radioModel;
        switch (radio_model) {
            case "apx6000_non_xe_black":
                res.render("6k_noxe_black", {selected_channel: req.query.channel, rid: req.query.rid, mode: req.query.mode, zone: req.query.zone});
                break;
            case "apxmobile_o2_green":
                res.render("o2_radio", {selected_channel: req.query.channel, rid: req.query.rid, mode: req.query.mode, zone: req.query.zone});
                break;
            case "apx8000_xe_green":
                res.render("o2_radio", {selected_channel: req.query.channel, rid: req.query.rid, mode: req.query.mode, zone: req.query.zone});
                break;
            default:
                res.send("Invalid radio model");
        }
    });
    app.get("/unication" , (req , res)=>{
        res.render("g5", {selected_channel: req.query.channel, rid: req.query.rid, mode: req.query.mode, zone: req.query.zone, networkName: networkName});
    });
    app.get("/g5" , async (req , res)=>{
        try {
            const sheetTabs = await getSheetTabs(googleSheetClient, sheetId);
            const zoneData = [];
            for (const tab of sheetTabs) {
                const tabData = await readGoogleSheet(googleSheetClient, sheetId, tab, "A:B");
                zoneData.push({ zone: tab, content: tabData });
            }
            res.render("uniLanding", {zoneData, networkName});
        } catch (error) {
            console.error("Error fetching sheet data:", error);
            res.status(500).send("Error fetching sheet data");
        }
    });
    app.get("/console", async (req, res) => {
        try {
            let rid = "502";
            const sheetTabs = await getSheetTabs(googleSheetClient, sheetId);
            const zoneData = [];
            for (const tab of sheetTabs) {
                const tabData = await readGoogleSheet(googleSheetClient, sheetId, tab, "A:B");
                zoneData.push({ zone: tab, content: tabData });
            }
            res.render("console", {zoneData, networkName, rid});
        } catch (error) {
            console.error("Error fetching sheet data:", error);
            res.status(500).send("Error fetching sheet data");
        }
    });
    app.get("/sys_view" , (req , res)=>{
        res.render("systemView", {networkName});
    });
    app.get("/sys_view/admin",auth, (req , res)=>{
        res.render("adminView", {networkName});
    });
    app.get("/affiliations" , (req , res)=>{
        res.render("affiliations", {affiliations, networkName});
    });
    app.get("/tones" , async (req , res)=>{
        try {
            const sheetTabs = await getSheetTabs(googleSheetClient, sheetId);
            const zoneData = [];
            for (const tab of sheetTabs) {
                const tabData = await readGoogleSheet(googleSheetClient, sheetId, tab, "A:B");
                zoneData.push({ zone: tab, content: tabData });
            }
            res.render("tones", {zoneData, networkName});
        } catch (error) {
            console.error("Error fetching sheet data:", error);
            res.status(500).send("Error fetching sheet data");
        }
    });

    app.get("/sysWatch", (req, res) => {
        res.render("sysWatch", { networkName: networkName, controlChannels: controlChannels });
    });

    app.get("/auto" , auth, async (req , res)=>{
        try {
            const sheetTabs = await getSheetTabs(googleSheetClient, sheetId);
            const zoneData = [];
            for (const tab of sheetTabs) {
                const tabData = await readGoogleSheet(googleSheetClient, sheetId, tab, "A:B");
                zoneData.push({ zone: tab, content: tabData });
            }
            res.render("auto", {zoneData, networkName});
        } catch (error) {
            console.error("Error fetching sheet data:", error);
            res.status(500).send("Error fetching sheet data");
        }
    });
    /*
        API routes
     */
    app.get("/api/affs", (req, res)=>{
        const affiliationsJSON = affiliations.map((aff) => {
            return {
                rid: aff.rid,
                channel: aff.channel
            };
        });
        res.json(JSON.stringify(affiliationsJSON));
    });

    async function sendDiscord(message) {
        const webhookUrl = discordWebHookUrl;

        const embed = {
            title: 'Last Heard',
            description: message,
            color: 0x3498db,
            timestamp: new Date().toISOString()
        };

        const data = {
            embeds: [embed]
        };

        try {
            const response = await axios.post(webhookUrl, data);
            //console.log('Webhook sent successfully', response.data);
        } catch (error) {
            console.error('Error sending webhook:', error.message);
        }
    }

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

    function broadcastChannelUpdates() {
        const controlChannelMapping = controlChannels.reduce((acc, controlChannel) => {
            acc[controlChannel] = {
                controlChannel,
                voiceChannels: []
            };
            return acc;
        }, {});

        for (const [channelName, voiceChannelData] of Object.entries(activeVoiceChannels)) {
            const socketId = voiceChannelData.socketId;
            const socketInfo = socketsStatus[socketId];

            if (!socketInfo || !controlChannels.includes(socketInfo.controlChannel)) continue;

            controlChannelMapping[socketInfo.controlChannel].voiceChannels.push({
                voiceChannel: channelName,
                dstId: voiceChannelData.dstId,
                srcId: voiceChannelData.srcId
            });
        }

        const channelData = Object.values(controlChannelMapping);
        io.emit('updateChannels', channelData);
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

    function isRadioAffiliated(srcId, dstId) {
        return affiliations.some(affiliation => affiliation.rid === srcId && affiliation.channel === dstId);
    }

    function forceGrant(data){
        // TODO: Fix for new logic
        /*
            WARNING: MAY NOT WORK PROPERLY AT THIS TIME
         */
        data.stamp = getDaTime();
        io.emit("VOICE_CHANNEL_GRANT", data);
        console.log(`FORCED VOICE_CHANNEL_GRANT GIVEN TO: ${data.srcId} ON: ${data.dstId}`);
        if (enableDiscord && discordVoiceG) {
            sendDiscord(`Voice Transmission from ${data.srcId} on ${data.dstId}`);
        }
        grantedChannels[data.dstId] = true;
        grantedRids[data.srcId] = true;
    }

    function getAvailableVoiceChannel() {
        for (let channel of voiceChannels) {
            if (!activeVoiceChannels[channel]) {
                return channel;
            }
        }
        return null;
    }

    function assignVoiceChannel(dstId, socketId, srcId) {
        let availableChannel = getAvailableVoiceChannel();
        if (availableChannel) {
            activeVoiceChannels[availableChannel] = { dstId, socketId, srcId };
            return availableChannel;
        }
        return null;
    }

    io.on("connection", function (socket) {
        const socketId = socket.id;
        socketsStatus[socket.id] = {};

        broadcastChannelUpdates();

        socket.on("VOICE_CHANNEL_CONFIRMED", function (data) {
            if (data.srcId && grantedChannels[data.dstId]) {
                socketsStatus[socketId].voiceChannelActive = true;
               // console.log(`Voice channel confirmed ${data.srcId} on ${data.dstId}`);
            }
        });

        socket.on("JOIN_CONTROL_CHANNEL", (data) => {
            if (controlChannels.includes(data.channel)) {
                socket.join(data.channel);
                socket.emit("CONTROL_CHANNEL_ACK", {
                    message: "Connected to Control Channel: " + data.channel
                });
            } else {
                socket.emit("CONTROL_CHANNEL_ERROR", {
                    message: "Invalid Control Channel: " + data.channel
                });
            }
        });

        socket.on("voice", function (data) {
            var newData = data.split(";");
            newData[0] = "data:audio/wav;";
            newData = newData.join(";");
            const senderDstId = socketsStatus[socketId].dstId;
            const activeVoiceChannel = socketsStatus[socketId].voiceChannel;
            for (const id in socketsStatus) {
                const recipientDstId = socketsStatus[id].dstId;
                if (senderDstId === recipientDstId)
                    if (socketsStatus[socketId].voiceChannelActive) {
                        socket.to(activeVoiceChannel).emit("send", {
                            newData: newData,
                            srcId: socketsStatus[id].srcId,
                            dstId: socketsStatus[id].dstId,
                            voiceChannel: socketsStatus[id].voiceChannel,
                            controlChannel: socketsStatus[id].controlChannel
                        });
                    } else {
                        console.log(`srcID: ${socketsStatus[socketId].srcId} not on voice channel; stand by`);
                    }
            }
        });

        socket.on("userInformation", function (data) {
            socketsStatus[socketId] = data;
            io.sockets.emit("usersUpdate", socketsStatus);
        });

        socket.on("AFFILIATION_LIST_REQUEST", function(){
            io.emit('AFFILIATION_LOOKUP_UPDATE', affiliations);
        });

        socket.on("VOICE_CHANNEL_REQUEST", function (data) {
            console.log(`VOICE_CHANNEL_REQUEST FROM: ${data.srcId} TO: ${data.dstId}`);
            const cdtDateTime = getDaTime();
            data.stamp = cdtDateTime;

            if (enableDiscord && discordVoiceR) {
                sendDiscord(`Voice Request from ${data.srcId} on ${data.dstId} at ${data.stamp}`);
            }
            io.emit("VOICE_CHANNEL_REQUEST", data);

            setTimeout(function () {
                let integerNumber = parseInt(data.srcId);
                if (!Number.isInteger(integerNumber)) {
                    data.stamp = cdtDateTime;
                    io.emit("VOICE_CHANNEL_DENY", data);
                    console.log("Invalid RID");
                    return;
                }

                if (isRadioAffiliated(data.srcId, data.dstId)) {

                    let assignedChannel = assignVoiceChannel(data.dstId, socket.id, data.srcId);
                    if (assignedChannel) {
                        data.newChannel = assignedChannel;

                        for (const id in socketsStatus) {
                            if (socketsStatus[id].dstId === data.dstId) {
                                io.to(socketsStatus[id].controlChannel).emit("VOICE_CHANNEL_GRANT", data);
                                socket.join(assignedChannel);
                            }
                        }
                        broadcastChannelUpdates();
                        console.log(`VOICE_CHANNEL_GRANT GIVEN TO: ${data.srcId} ON: ${data.dstId} AT: ${assignedChannel}`);
                        if (enableDiscord && discordVoiceG) {
                            sendDiscord(`Voice Transmission from ${data.srcId} on ${data.dstId} at ${data.stamp}`);
                        }
                        grantedChannels[data.dstId] = true;
                        grantedRids[data.srcId] = true;

                    } else {
                        data.stamp = cdtDateTime;
                        io.emit("VOICE_CHANNEL_DENY", data);
                        console.log(`VOICE_CHANNEL_DENY GIVEN TO: ${data.srcId} ON: ${data.dstId}`);
                        if (enableDiscord && discordVoiceD) {
                            sendDiscord(`Voice Deny from ${data.srcId} on ${data.dstId} at ${data.stamp}`);
                        }
                    }
                } else {
                    io.emit("VOICE_CHANNEL_DENY", data);
                    console.log(`VOICE_CHANNEL_DENY GIVEN TO: ${data.srcId} ON: ${data.dstId}`);
                    console.log(data.srcId, "Non affiliated voice request not permitted for ", data.dstId);
                }
            }, 750);
        });

        socket.on("RELEASE_VOICE_CHANNEL", function (data){
            data.stamp = getDaTime();
            console.log(`RELEASE_VOICE_CHANNEL FROM: ${data.srcId} TO: ${data.dstId}`);
            io.emit("VOICE_CHANNEL_RELEASE", data);
            grantedRids[data.srcId] = false;
            grantedChannels[data.dstId] = false;
            let channel = data.newChannel;
            Object.keys(activeVoiceChannels).forEach(channel => {
                if (activeVoiceChannels[channel].dstId === data.dstId && activeVoiceChannels[channel].socketId === socket.id) {
                    delete activeVoiceChannels[channel];
                }
            });
            broadcastChannelUpdates();
        });

        socket.on("disconnect", function (data) {
            if (socketsStatus[socketId].srcId) {
                removeAffiliation(socketsStatus[socketId].srcId);
            }
            Object.keys(activeVoiceChannels).forEach(channel => {
                if (activeVoiceChannels[channel].socketId === socket.id) {
                    delete activeVoiceChannels[channel];
                }
            });
            delete socketsStatus[socketId];
        });

        socket.on("CHANNEL_AFFILIATION_REQUEST", function (data){
            data.stamp = getDaTime();
            io.emit("CHANNEL_AFFILIATION_REQUEST", data);
            if (enableDiscord && discordAffR) {
                sendDiscord(`Affiliation Grant to ${data.srcId} on ${data.dstId} at ${data.stamp}`);
            }
            setTimeout(function (){
                io.emit("CHANNEL_AFFILIATION_GRANTED", data);
                if (enableDiscord && discordAffG) {
                    sendDiscord(`Affiliation Grant to ${data.srcId} on ${data.dstId} at ${data.stamp}`);
                }
                if (!getAffiliation(data.srcId)){
                    console.log("AFFILIATION GRANTED TO: " + data.srcId + " ON: " + data.dstId);
                    addAffiliation(data.srcId, data.dstId, data.stamp = getDaTime());
                } else {
                    console.log("AFFILIATION GRANTED TO: " + data.srcId + " ON: " + data.dstId + " AND REMOVED OLD AFF");
                    removeAffiliation(data.srcId);
                    addAffiliation(data.srcId, data.dstId);
                }
            },1500);
        });
        socket.on("REMOVE_AFFILIATION", function (data){
            data.stamp = getDaTime();
            removeAffiliation(data.srcId);
            console.log("AFFILIATION REMOVED: " + data.srcId + " ON: " + data.dstId);
            io.emit("REMOVE_AFFILIATION_GRANTED", data);
        });

        socket.on("EMERGENCY_CALL", function (data){
            if (enableDiscord && discordEmerg) {
                sendDiscord(`Affiliation Grant to ${data.srcId} on ${data.dstId} at ${data.stamp}`);
            }
            data.stamp = getDaTime();
            console.log("EMERGENCY_CALL FROM: " + data.srcId + " ON: " + data.dstId)
            io.emit("EMERGENCY_CALL", data);
        });

        socket.on("RID_INHIBIT", async function(data) {
            if (enableDiscord && discordInhibit) {
                sendDiscord(`Inhibit sent to ${data.srcId} on ${data.dstId} at ${data.stamp}`);
            }
            data.stamp = getDaTime();
            const ridToInhibit = data.dstId;
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
            const ridToUnInhibit = data.dstId;
            const ridAcl = await readGoogleSheet(googleSheetClient, sheetId, "rid_acl", "A:B");
            io.emit("RID_UNINHIBIT", data);
            const matchingIndex = ridAcl.findIndex(entry => entry[0] === ridToUnInhibit);

            if (matchingIndex !== -1) {
                ridAcl[matchingIndex][1] = '1';
                await updateGoogleSheet(googleSheetClient, sheetId, "rid_acl", "A:B", ridAcl);
                console.log(`RID_UNINHIBIT: ${ridToUnInhibit}`);
            }
        });

        socket.on("INFORMATION_ALERT", function(data){
            io.emit("INFORMATION_ALERT", data);
            forceGrant(data);
            setTimeout(function (){
                io.emit("VOICE_CHANNEL_RELEASE", data);
            }, 1500);
        });
        socket.on("AUTO_DISPATCH_CHANNEL_BROADCAST", function(data){
            io.emit("AUTO_DISPATCH_CHANNEL_BROADCAST", data);
            forceGrant(data);
            setTimeout(function (){
                io.emit("VOICE_CHANNEL_RELEASE", data);
            }, 8000);
        });

        socket.on("CANCELLATION_ALERT", function(data){
            io.emit("CANCELLATION_ALERT", data);
            forceGrant(data);
            setTimeout(function (){
                io.emit("VOICE_CHANNEL_RELEASE", data);
            }, 1500);
        });

        socket.on("REG_REQUEST", async function (rid){
            io.emit("REG_REQUEST", rid);
            String.prototype.isNumber = function(){return /^\d+$/.test(this);}
            let ridAcl = await readGoogleSheet(googleSheetClient, sheetId, "rid_acl", "A:B");
            const matchingEntry = ridAcl.find(entry => entry[0] === rid);
            const denyCount = regDenyCount[rid] || 0;
            if (enableDiscord && discordRegR){
                sendDiscord(`Reg Request: ${rid}`);
            }
            setTimeout(function (){
                if (rid.isNumber()) {
                    if (matchingEntry) {
                        const inhibit = matchingEntry[1];
                        if (inhibit === '1') {
                            if (enableDiscord && discordRegG){
                                sendDiscord(`Reg grant: ${rid}`);
                            }
                            io.emit("REG_GRANTED", rid);
                            console.log("REG_GRANTED: " + rid);
                        } else {
                            io.emit("RID_INHIBIT", {srcId: rid, dstId: "999999999"});
                        }
                    } else {
                        if (denyCount >= 3){
                            if (enableDiscord && discordRegRfs){
                                sendDiscord(`Reg refuse: ${rid}`);
                            }
                            io.emit("REG_REFUSE", rid);
                        } else {
                            if (enableDiscord && discordRegD){
                                sendDiscord(`REG_REFUSE: ${rid}`);
                            }
                            io.emit("REG_REFUSE", rid);
                            regDenyCount[rid] = denyCount + 1;
                        }
                    }
                } else {
                    if (denyCount >= 3){
                        if (enableDiscord && discordRegRfs){
                            sendDiscord(`Reg refuse: ${rid}`);
                        }
                        io.emit("REG_REFUSE", rid);
                    } else {
                        if (enableDiscord && discordRegD){
                            sendDiscord(`Reg deny: ${rid}`);
                        }
                        io.emit("REG_DENIED", rid);
                        regDenyCount[rid] = denyCount + 1;
                    }
                }
            }, 1500);
        });
        socket.on("RID_PAGE", function(data){
            data.stamp = getDaTime();
            console.log("RID PAGE srcId: ", data.srcId, " dstId: ", data.dstId)
            setTimeout(()=>{
                io.emit("PAGE_RID", data);
            }, 1000);
        });
        socket.on("RID_PAGE_ACK", function(data){
            data.stamp = getDaTime();
            setTimeout(()=>{
                io.emit("PAGE_RID_ACK", data);
            }, 1500);
        });
        socket.on("FORCE_VOICE_CHANNEL_GRANT", function(data){
            forceGrant(data);
        });
        socket.on("PEER_LOGIN_REQUEST", function(data){
            //Future login handling for peers
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

    server.listen(networkBindPort, networkBindAddress, () => {
        const protocol = useHttps ? 'https' : 'http';
        console.log(`${networkName} is running on ${protocol}://${networkBindAddress}:${networkBindPort}`);
    });

} catch (error) {
    console.error('Error starting. Maybe config file?: ', error.message);
}