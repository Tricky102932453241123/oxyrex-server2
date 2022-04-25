// Import everything.
const Discord = require("discord.js");
const config = require("../botConfig.json");
const util = require("../util.js");

module.exports = {
    run: function(bot, message, args) {
        let id = message.mentions.users.first();
        if (id) {
            id = id.id;
        } else if (args.length) {
            id = args[0];
        } else {
            id = message.author.id;
        }
        bot.database.load(bot, config.logs.achievementDatabase).then(data => {
            data = data.filter(function filter(entry) {
                return entry.content.id === id;
            }).map(entry => entry.content.achievement);
            const lol = [];
            for (let thing of data) if (!lol.includes(thing)) lol.push(thing);
            if (!lol.length) return util.info(message, "The user has no achievements.");
            return util.info(message, "The user has the following achievements:", lol.map(entry => {
                return {
                    name: entry.split("|||")[0],
                    value: entry.split("|||")[1]
                };
            }));
        });
    },
    description: "Lists the achievements a user has, if any.",
    usage: "achievements <id or ping>"
};
