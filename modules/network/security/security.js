/*jslint node: true */
/*jshint -W061 */
/*global goog, Map, let */
"use strict";
// General requires
require('google-closure-library');
goog.require('goog.structs.PriorityQueue');
goog.require('goog.structs.QuadTree');


// TODO: READD SHA256 AND STUFF

let securityDatabase = {
    bans: [{ // ||WAtcher||
        ip: "110.224.133.127",
        reason: "The decision is final."
    }],
    blackList: []
};

Object.keys(securityDatabase).forEach(key => {
    securityDatabase[key].removeItem = function(e) {
        const arr = [];
        for (let i = 0; i < this.length; i ++)
            if (this[i] !== e)
                arr.push(this[i]);
        this.length = 0;
        for (let i = 0; i < arr.length; i ++)
            this.push(arr[i]);
        return this;
    };
});

const verifySocket = (function() {
    const getIP = require("forwarded-for");
    const IPManager = require("./IPManager.js");
    const manager = new IPManager();
    // Whitelisted IPs - These IPs bypass the VPN detector - Put what they are and who whitelisted them next to the whitelist function
    manager.whitelistIP("72.10.96.30"); // My school - Oblivion
    manager.whitelistIP("104.225.189.8"); // My school - Oblivion
    function checkHeaders(headers) {
        const origin = headers.origin.replace("http://", "").replace("https://", "").replace("/", "");
        if (c.clientAddresses.indexOf(origin) === -1) {
            bot.util.log(bot, "player", "Failed header verification! Origin: " + origin);
            return [0, "You may only connect to the game from the proper client."];
        }
        if (headers.upgrade !== "websocket") {
            bot.util.log(bot, "player", "Failed header verification! Upgrade: " + headers.upgrade);
            return [0, "Proxy detected."];
        }
        let agentIndex = 0;
        for (let agent of ["Mozilla", "AppleWebKit", "Chrome", "Safari"]) {
            if (headers["user-agent"].includes(agent)) {
                agentIndex ++;
            }
        }
        if (agentIndex === 0) {
            bot.util.log(bot, "player", "Failed header verification! User-Agent: " + headers["user-agent"]);
            return [0, "Unsupported client."];
        }
        return [1];
    }
    async function checkIP(socket, request, bypassVPNBlocker) {
        let ipAddress;
        try {
            ipAddress = getIP(request, request.headers).ip.split(":").pop();
        } catch (e) {
            console.log(e);
            return [0, "Invalid IP"];
        }
        if (ipAddress == null) {
            return [0, "Attempting to spawn with a null IP adress."];
        }
        if (await manager.checkIsVPN(ipAddress) && !bypassVPNBlocker) {
            return [0, "VPN/Proxy Detected. Please disable it and try again."];
        }
        let same = 0;
        for (let socket of sockets.clients) {
            if (socket.ip === ipAddress) {
                same ++;
            }
        }
        if (same >= c.tabLimit && !bypassVPNBlocker && !manager.isWhitelisted(ipAddress)) {
            return [0, "You have too many tabs open. Please close some tabs and try again."];
        }
        for (let ban of securityDatabase.bans) {
            if (ipAddress === ban.ip) {
                return [0, "You were banned from the game for: " + ban.reason];
            }
        }
        for (let ban of securityDatabase.blackList) {
            if (ipAddress === ban.ip) {
                return [0, "Your IP has been temporarily blacklisted for: " + ban.reason];
            }
        }
        if (sockets.clients.length >= c.maxPlayers && !bypassVPNBlocker && !manager.isWhitelisted(ipAddress)) {
            return [0, `The max player limit for this server (${c.MAX_PLAYERS}) has been reached. Please try a different server or come back later.`];
        }
        return [1, ipAddress];
    }
    return async function(socket, request, bypassVPNBlocker = false) {
        const headerCheck = checkHeaders(request.headers);
        if (headerCheck[0] === 0) return headerCheck;
        return await checkIP(socket, request, bypassVPNBlocker);
    }
})();

module.exports = {
    securityDatabase,
    checkIP: verifySocket
};
