// Import everything.
const Discord = require("discord.js");
const config = require("../botConfig.json");
const util = require("../util.js");

module.exports = {
    run: function(bot, message, args) {
        if (util.checkPermissions(message) < 2) return util.unauth(message);
        let id = args.shift();
        let socket = sockets.clients.find(socket => socket.id == id);
        if (!socket) return util.error(message, "No sockets matched that ID");
        if (socket.player == null || socket.player.body == null) {
            return util.error(message, "User not spawned in.");
        }
        const score = +args.shift();
        if (!Number.isFinite(score)) {
            return util.error(message, "You must specify a valid score");
        }
        socket.player.body.skill.score = score;
        util.success(message, "The user's score has been restored.");
        util.log(bot, "command", `<@!${message.author.id}> ran \`${message.content}\` in <#${message.channel.id}>`);
    },
    description: "Restores a player's score.",
    usage: "restore <id> <score>"
};
