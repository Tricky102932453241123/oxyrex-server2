// External modules to be imported
const net = require("net");
const dns = require("dns").promises;

const Socket = net.Socket;

// The thing with all its methods
class IPManager {
    constructor() {
        this.bannedIPs = [];
        this.knownVPNIPs = [];
        this.whitelist = [];
        this.blockList = [];//new net.BlockList();
    }
    whitelistIP(ip) { // whitelistIP("127.0.0.1") or whitelistIP({ foo: 1, bar: 2, ip: "127.0.0.1" })
        if (typeof ip === "string") {
            this.whitelist.push(ip);
        } else if (typeof ip === "object" && typeof ip.ip === "string") {
            this.whitelist.push(ip);
        } else {
            throw new Error("Invalid IP specified, IP must be a string or an object with the 'ip' property as a string.");
        }
    }
    ban(ip) { // ban("127.0.0.1") or ban({ foo: 1, bar: 2, ip: "127.0.0.1" })
        if (typeof ip === "string") {
            this.bannedIPs.push(ip);
            this.blockList.push(ip);
        } else if (typeof ip === "object" && typeof ip.ip === "string") {
            this.bannedIPs.push(ip);
            this.blockList.push(ip);
        } else {
            throw new Error("Invalid IP specified, IP must be a string or an object with the 'ip' property as a string.");
        }
    }
    parseIPv4(ip) { // parseIPv4("127.0.0.1") TODO: Possibly add secondary method to it?
        if (typeof ip !== "string") {
            throw new Error("Invalid IP specified, IP must be a string.");
        }
        if (!ip.includes(".") || ip.split(".").length !== 4) {
            throw new Error("Invalid IP specified. IP must follow IPv4 format: '127.0.0.1'");
        }
        const [a, b, c, d] = ip.split(".").map(part => parseInt(part, 10));
        return (a << 24) | (b << 16) | (c << 8) | d;
    }
    ping(ip, port = 80, timeout = 2000) { // ping("127.0.0.1", 80, 5000) timeout is in milliseconds
        return new Promise((resolve, reject) => {
            const socket = new Socket();
            const timeoutID = setTimeout(function() {
                socket.destroy();
                resolve(false);
            }, timeout);
            socket.connect(port, ip, function() {
                console.log("Connected");
                resolve(true);
                clearTimeout(timeoutID);
            });
            socket.on("error", function(error) {
                resolve(false);
                clearTimeout(timeoutID);
            });
        });
    }
    isWhitelisted(ip) {
        return this.whitelist.includes(ip);
    }
    checkIsVPN(ip, options = { // checkIsVPN("127.0.0.1", { port: 80, timeout: 5000, saveToLog: true }) Checks if an IP is a possible VPN
        port: 80,
        timeout: 2000,
        saveToLog: true
    }) {
        return new Promise((resolve, reject) => {
            if (this.whitelist.includes(ip)) {
                resolve(false);
                return;
            }
            if (this.blockList.includes(ip) || this.knownVPNIPs.includes(ip)) {
                resolve(true);
                return;
            }
            this.ping(ip, options.port, options.timeout).then(open => {
                if (open && options.saveToLog) {
                    this.blockList.push(ip);
                    this.knownVPNIPs.push(ip);
                }
                resolve(open);
            });
        });
    }
    checkIsBanned(ip) { // checkIsBanned("127.0.0.1") Checks if an IP is in the banned database (or a VPN)
        return this.blockList.includes(ip) || this.bannedIPs.includes(ip);
    }
    async getHostnamesFromIP(ip) { // getHostnamesFromIP("127.0.0.1").then(console.log) or console.log(await getHostnamesFromIP("127.0.0.1")) Gets the hostnames (like google.com) from an IP (142.251.45.110)
        let hostnames = [];
        try {
            hostnames = await dns.reverse(ip);
        } catch(error) {
            if (!ip.includes(":80")) return this.getHostnamesFromIP(ip + ":80");
        }
        return hostnames;
    }
}

module.exports = IPManager;
