// Import everything.
const Discord = require("discord.js");
const config = require("../botConfig.json");
const util = require("../util.js");
module.exports = {
    run: function(bot, message, args) {
        let messages = [
            []
        ];
        for (let socket of sockets.clients) {
            let data = [
                `- Socket ID: **${socket.id}**`,
                `- Discord Account: **${socket.discordID == null ? "N/A" : `<@!${socket.discordID}>`}**`
            ];
            if (socket.player.body != null) {
                let body = socket.player.body;
                data.push(`- Tank ID: **${body.id}**`, `- Tank Class: **${body.label}**`, `- Score: **${body.skill.score}**`);
            } else {
                data.push(`- Not spawned in.`);
            }
            messages[messages.length - 1].push({
                name: socket.name ? socket.name : "Unnamed",
                value: data.join("\n")
            });
        }
        if (!messages[0].length) return util.error(message, "There are no players online.");
        let i = 0;
        for (let m of messages) {
            i++;
            util.info(message, "Players:", m);
        }
    },
    description: "Lists the active players on the server.",
    usage: "players"
};
