// Import everything.
const Discord = require("discord.js");
const config = require("../botConfig.json");
const util = require("../util.js");
module.exports = {
    run: function(bot, message, args) {
        let messages = [
            []
        ];
        for (let o of entities) {
            if (!o.isBot) continue;
            if (messages[messages.length - 1].length >= 15) messages.push([]);
            messages[messages.length - 1].push({
                name: o.name,
                value: `ID: *${o.id}*  |  Class: *${o.label}*  |  Score: *${o.skill.score}*`
            });
        }
        if (!messages[0].length) return util.error(message, "There are no bots on the server.");
        let i = 0;
        for (let m of messages) {
            i++;
            util.info(message, "Bots:", m);
        }
    },
    description: "Lists the bots on the server.",
    usage: "bots"
};
