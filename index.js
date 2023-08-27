const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);

const socketsStatus = {};
const grantedChannels = {};
const grantedRids = {};
const affiliations = [];

app.set("view engine", "ejs");
app.use("/files", express.static("public"));
app.get("/" , (req , res)=>{
    res.render("index");
});
app.get("/radio" , (req , res)=>{
    res.render("radio", {selected_channel: req.query.channel, rid: req.query.rid});
});
app.get("/sys_view" , (req , res)=>{
    res.render("systemView");
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
    affiliations.forEach(affiliation => {
        console.log(affiliation);
    });
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
        newData[0] = "data:audio/ogg;";
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

    socket.on("VOICE_CHANNEL_REQUEST", function (data){

        console.log(`VOICE_CHANNEL_REQUEST FROM: ${data.rid} TO: ${data.channel}`);

        const cdtDateTime = getDaTime();

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
            console.log("DEBUG1 " + grantedChannels[data.channel])
            grantedChannels[data.channel] = true;
            grantedRids[data.rid] = true;
        } else {
            data.stamp = cdtDateTime;
            io.emit("VOICE_CHANNEL_DENY", data);
            console.log(`VOICE_CHANNEL_DENY GIVEN TO: ${data.rid} ON: ${data.channel}`);
            console.log("DEBUG2 " + grantedChannels[data.channel])
            grantedChannels[data.channel] = false;
        }
    });

    socket.on("RELEASE_VOICE_CHANNEL", function (data){
        data.stamp = getDaTime();
        console.log(`RELEASE_VOICE_CHANNEL FROM: ${data.rid} TO: ${data.channel}`);
        io.emit("VOICE_CHANNEL_RELEASE", data);
        console.log("DEBUG3 " + grantedChannels[data.channel])
        grantedRids[data.rid] = false;
        grantedChannels[data.channel] = false;
    });

    socket.on("disconnect", function () {
        delete socketsStatus[socketId];
    });

    socket.on("CHANNEL_AFFILIATION_REQUEST", function (data){
        data.stamp = getDaTime();
        io.emit("CHANNEL_AFFILIATION_GRANTED", data)
        if (!getAffiliation(data.rid)){
            console.log("AFFILIATION GRANTED TO: " + data.rid + " ON: " + data.channel);
            addAffiliation(data.rid, data.channel, data.stamp = getDaTime());
        } else {
            console.log("AFFILIATION GRANTED TO: " + data.rid + " ON: " + data.channel + " AND REMOVED OLD AFF");
            removeAffiliation(data.rid);
            addAffiliation(data.rid, data.channel);
        }
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

    socket.on("REG_REQUEST", function (rid){
        String.prototype.isNumber = function(){return /^\d+$/.test(this);}
        if (rid.isNumber()) {
            io.emit("REG_GRANTED", rid);
            console.log("REG_GRANTED: " + rid);
        } else {
            io.emit("REG_DENIED", rid);
            console.log("REG_DENIED: " + rid);
        }
    });
});

http.listen(5000, () => {
    console.log("the app is run in port 5000!");
});