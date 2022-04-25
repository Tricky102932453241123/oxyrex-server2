/*jslint node: true */
/*jshint -W061 */
/*global goog, Map, let */
"use strict";
// General requires
require('google-closure-library');
goog.require('goog.structs.PriorityQueue');
goog.require('goog.structs.QuadTree');
const express = require("express");
const fingerprint = require("express-fingerprint");
const expressWs = require("express-ws");
const cors = require("cors");
const fs = require("fs");
const server = express();
server.use(fingerprint());
server.use(express.json());
expressWs(server);
server.use(cors());
server.get("/", function(request, response) {
    response.send(`<script>location.href = "https://${c.clientAddresses[0]}"</script>`);
});
server.get("/mockups.json", function(request, response) {
    response.send(mockupJsonData);
});
server.get("/gamemodeData.json", function(request, response) {
    response.send(JSON.stringify({
        gameMode: c.gameModeName,
        players: views.length,
        maxPlayers: c.maxPlayers,
        code: [c.MODE, c.MODE === "ffa" ? "f" : c.TEAMS, c.secondaryGameMode].join("-")
    }));
});
server.get("/edit/lib/definitions.js", function(request, response) {
    if (!c.EDITOR_ENABLED) {
        return response.send("Not active.");
    }
    if (unauths[request.fingerprint.hash] >= 3) {
        return response.send("Failed to log in");
    }
    response.send(`
<html>
<head>
    <title>Oxyrex Tank Editor</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link href="https://fonts.googleapis.com/css?family=Ubuntu:400,700" rel="stylesheet">
</head>
<style>
    body {
        text-align: center;
        margin: 0px;
        padding: 0px;
        background: linear-gradient(to right bottom, #C8C8C8, #AA0000);
        font-family: Ubuntu;
        font-size: 14px;
    }
    ::-webkit-scrollbar {
        width: 6px;
        height: 0;
    }

    ::-webkit-scrollbar-track {
        border-radius: 3px;
        background: rgba(0, 0, 0, .15);
    }

    ::-webkit-scrollbar-thumb {
        border-radius: 3px;
        background: rgba(0, 0, 0, .3);
    }
    textarea {
        width: 100%;
        float: top;
        height: 75%;
        overflow: scroll;
        margin: auto;
        display: inline-block;
        background: linear-gradient(to right bottom, #FFFFFF, #FFAAAA);
        outline: none;
        font-family: Courier, sans-serif;
        font-size: 16px;
    }
    iframe {
        bottom: 0;
        position: relative;
        width: 100%;
        height: 35em;
    }
</style>
<body>
    <div id="editor" style="display: none;">
        <textarea id="js" placeholder="Talk to a god..."></textarea>
        <button id="saveCode">Save Code</button>
        <span id="serverResponse">...</span>
    </div>
    <div id="loginForm">
        <input id="password" placeholder="Input your token"></input><br/>
        <button id="login">Login</button>
    </div>
</body>
<script>
    window.onload = function() {
        document.getElementById("login").onclick = async function() {
            document.getElementById("loginForm").style.display = "none";
            //document.getElementById("js").value = await (await fetch("/code/lib/definitions.js?key=" + document.getElementById("password").value)).text();
            document.getElementById("editor").style.display = "block";
            document.getElementById("js").value = \`// IMPORTS\nconst { g, combineStats, setBuild, baseStats, gunCalcNames, statnames } = Class;\nconst base = baseStats;\n// SETTINGS (Can be changed)\nrefresh = true;\nrefreshMockups = true;\nrefreshTanks = true;\n\n// Put your code here\`;
            document.getElementById("saveCode").onclick = async function() {
                console.log(document.getElementById("js").value);
                document.getElementById("serverResponse").textContent = await (await fetch("/patch/lib/definitions.js", {
                    method: "POST",
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        key: document.getElementById("password").value,
                        code: document.getElementById("js").value
                    })
                })).text();
            }
        }
    };
</script>
</html>`);
});
// TODO: Add worker threads for mockup loading (OR TRY ASYNC), auto refreshing mockups clientside
const unauths = {};
server.get("/code/lib/definitions.js", function(request, response) {
    if (!c.EDITOR_ENABLED) {
        return response.send("Not active.");
    }
    if (unauths[request.fingerprint.hash] >= 3) {
        return response.send("Failed to log in");
    }
    if (request.query && request.query.key) {
        if (c.TOKENS.findIndex(entry => entry[0] === request.query.key && entry[3] === 3) !== -1) {
            response.send(fs.readFileSync(__dirname + "/../../lib/definitions.js").toString());
            return;
        }
    }
    response.send("Unauthorized");
    if (!unauths[request.fingerprint.hash]) {
        unauths[request.fingerprint.hash] = 1;
    } else {
        unauths[request.fingerprint.hash] ++;
    }
});
server.post("/patch/lib/definitions.js", function(request, response) {
    if (!c.EDITOR_ENABLED) {
        return response.send("Not active.");
    }
    if (unauths[request.fingerprint.hash] >= 3) {
        return response.send("Failed to log in");
    }
    if (!request.body || !request.body.key || !request.body.code) {
        if (!unauths[request.fingerprint.hash]) {
            unauths[request.fingerprint.hash] = 1;
        } else {
            unauths[request.fingerprint.hash] ++;
        }
        return response.send("Invalid body");
    }
    if (c.TOKENS.findIndex(entry => entry[0] === request.body.key && entry[3] === 3) === -1) {
        if (!unauths[request.fingerprint.hash]) {
            unauths[request.fingerprint.hash] = 1;
        } else {
            unauths[request.fingerprint.hash] ++;
        }
        return response.send("Unauthorized");
    }
    let refresh = true, refreshMockups = true, refreshTanks = true;
    eval(request.body.code.replace(/exports./ig, "Class."));
    if (refresh) {
        if (refreshTanks) {
            let newClass = (function() {
                const def = Class;
                let i = 0;
                for (let key in def) {
                    if (!def.hasOwnProperty(key)) continue;
                    def[key].index = i++;
                }
                return def;
            })();
            global.Class = newClass;
        }
        if (refreshMockups) {
            global.mockupJsonData = loadMockupJsonData();
            for (let instance of sockets.players) {
                instance.socket.talk("H");
            }
        }
    }
    bot.channels.fetch("925062926568669185").then(channel => {
        bot.users.fetch(c.TOKENS.find(entry => entry[0] === request.body.key && entry[3] === 3)[1]).then(user => {
            const file = new bot.Discord.MessageAttachment(Buffer.from(request.body.code, "utf8"), `OXYREX_EDITOR_LOG_${global.fingerPrint.prefix}_${user.tag}_${new Date()}.txt`);
            channel.send(file);
        });
    });
    response.send("Changes saved!");
});
require("./mockupAPI.js")(server);
if (global.fingerPrint.digitalOcean) {
    const port = global.fingerPrint.digitalOceanBA ? 3000 : 3001;
    const privateKey = fs.readFileSync('/etc/letsencrypt/live/ext.oxyrex.io/privkey.pem', 'utf8');
    const certificate = fs.readFileSync('/etc/letsencrypt/live/ext.oxyrex.io/fullchain.pem', 'utf8');
    const credentials = {
        key: privateKey,
        cert: certificate
    };
    const http = require("http");
    const https = require("https");
    const WebSocket = require("ws");
    /*const httpServer = http.createServer(server);
    httpServer.listen(process.env.PORT || c.port, () => {
        console.log("[HTTP]: Express + WS server listening on port", process.env.PORT || c.port);
        console.log("[HTTP]: Tracking:", ...Object.entries(c.tracking));
        console.log("[HTTP]: Accepting requests from:", c.clientAddresses.join(", "));
    });
    const wsHTTP = new WebSocket.Server({ server: httpServer });
    wsHTTP.on("connection", sockets.connect);*/
    const httpsServer = https.createServer(credentials, server);
    httpsServer.listen(port, () => {
        console.log("[HTTPS]: Express + WS server listening on port", port);
        console.log("[HTTPS]: Tracking:", ...Object.entries(c.tracking));
        console.log("[HTTPS]: Accepting requests from:", c.clientAddresses.join(", "));
    });
    const wsHTTPs = new WebSocket.Server({ server: httpsServer });
    wsHTTPs.on("connection", sockets.connect);
} else {
    server.ws("/", sockets.connect);
    server.listen(process.env.PORT || c.port, function() {
        console.log("Express + WS server listening on port", process.env.PORT || c.port);
        console.log("Tracking:", ...Object.entries(c.tracking));
        console.log("Accepting requests from:", c.clientAddresses.join(", "));
    });
}
module.exports = {
    server
};
