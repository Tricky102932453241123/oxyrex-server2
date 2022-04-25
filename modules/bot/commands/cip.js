// Import everything.
const Discord = require("discord.js");
const config = require("../botConfig.json");
const util = require("../util.js");

module.exports = {
    run: function(bot, message, args) {
        if (util.checkPermissions(message) < 2) return util.unauth(message);
        if (args.length !== 2) return util.error(message, "Please list two separate user ids!");
        let ips = [];
        for (let i = 0; i < 2; i ++) {
            const id = args.shift();
            let socket = sockets.clients.find(socket => socket.id == +id);
            if (!socket) {
                let backlog = sockets.backlog.find(entry => entry.id === +id);
                if (!backlog) return util.error(message, "No sockets matched the ID " + id);
                socket = backlog;
            }
            ips.push(socket.ip);
        }
        util.info(message, `The IPs are ${ips[0] === ips[1] ? "" : "not"} the same.`);
        util.log(bot, "command", `<@!${message.author.id}> ran \`${message.content}\` in <#${message.channel.id}>`);
    },
    description: "Compares the IPs between two users.",
    usage: "cip <id> <id>"
};
