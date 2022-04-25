// Import everything.
const Discord = require("discord.js");
const config = require("../botConfig.json");
const util = require("../util.js");
module.exports = {
    run: function(bot, message, args) {
        sockets.broadcast(`${message.author.tag}: ${args.join(" ")}`);
        util.log(bot, "chat", `<@!${message.author.id}> said \`${args.join(" ")}\``);
        return util.info(message, "Message broadcasted.");
    },
    description: "Broadcasts a message to everyone.",
    usage: "say"
};
