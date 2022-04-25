// Import everything.
const Discord = require("discord.js");
const config = require("../botConfig.json");
const botUtil = require("../util.js");
module.exports = {
    run: function(bot, message, args) {
        return botUtil.info(message, c.gameModeName, [{
            name: "Server Speed:",
            value: global.mspt + "mspt"
        }, {
            name: "Players:",
            value: views.length
        }, {
            name: "Uptime:",
            value: util.formatTime(util.time())
        }]);
    },
    description: "Broadcasts a message to everyone.",
    usage: "ping"
};
