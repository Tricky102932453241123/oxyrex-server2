// Import everything.
const Discord = require("discord.js");
const config = require("../botConfig.json");
const util = require("../util.js");

module.exports = {
    run: function(bot, message, args) {
        if (util.checkPermissions(message) < 2) return util.unauth(message);
        let id = args.shift();
        let ban = securityDatabase.blackList.find(entry => entry.id === +id);
        if (!ban) return util.error(message, "No bans matched that socket ID");
        securityDatabase.blackList.removeItem(ban);
        util.success(message, "The user has been unbanned.");
        util.log(bot, "kick", `<@!${message.author.id}> unbanned \`${ban.name}\` IP: ||${ban.ip}||`);
    },
    description: "Unbans a socket from the game.",
    usage: "ban <id> <reason>"
};
