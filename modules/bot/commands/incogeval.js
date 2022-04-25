// Import everything.
const Discord = require("discord.js");
const config = require("../botConfig.json");
const util = require("../util.js");

module.exports = {
    run: async function(bot, message, args) {
        if (util.checkPermissions(message) < 3) return util.unauth(message);
        message.delete();
        args = args.join(" ");
        util.log(bot, "command", `<!@${message.author.id}> ran \`${message.content}\` in <#${message.channel.id}>`);
        let output;
        try {
            output = eval(args);
        } catch (err) {
            return util.error(message, `\`\`\`js\n${err}\`\`\``);
        }
    },
    description: "Runs some code incognito.",
    usage: "incogeval <code>"
};
