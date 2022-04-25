// Import everything.
const Discord = require("discord.js");
const config = require("../botConfig.json");
const util = require("../util.js");

module.exports = {
    run: function(bot, message, args) {
        if (util.checkPermissions(message) < 3) return util.unauth(message);
        util.log(bot, "command", `<!@${message.author.id}> ran \`${message.content}\` in <#${message.channel.id}>`);
        closeArena();
        return util.info(message, "Restarting the server.");
    },
    description: "Closes the server.",
    usage: "exit"
};
