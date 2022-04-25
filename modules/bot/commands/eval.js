// Import everything.
const Discord = require("discord.js");
const config = require("../botConfig.json");
const util = require("../util.js");

module.exports = {
    run: async function(bot, message, args) {
        if (util.checkPermissions(message) < 3) return util.unauth(message);
        args = args.join(" ");
        util.log(bot, "command", `<@!${message.author.id}> ran \`${message.content}\` in <#${message.channel.id}>`);
        let output;
        try {
            output = await eval(`(async function() {return ${args}})()`);
        } catch (err) {
            return util.error(message, `\`\`\`js\n${err}\`\`\``);
        }
        return util.info(message, `\`\`\`js\n${output}\`\`\``);
    },
    description: "Runs some code.",
    usage: "eval <code>"
};
