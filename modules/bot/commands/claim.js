// Import everything.
const Discord = require("discord.js");
const config = require("../botConfig.json");
const util = require("../util.js");

module.exports = {
    run: function(bot, message, args) {
        let token;
        if (args.length === 1 && args[0] === "token") {
            let betaTester = c.TOKENS.find(entry => entry[1] === message.member.id);
            if (betaTester) token = betaTester[0];
            else return util.error(message, "You are not a Beta-Tester!");
        } else {
            let perms = util.checkPermissions(message) || +(message.member.roles.cache.some(role => role.id === "912447317880209458"));
            if (perms < 1 || args.length !== 1) args = ["#FFFFFF"];
            let nameColor = args[0];
            nameColor = nameColor.split("");
            for (let i = 0; i < nameColor.length; i ++) {
                let char = nameColor[i];
                if (char === "#") continue;
                let all = "1234567890ABCDEFabcdef".split("");
                if (!all.includes(char)) return util.error(message, "That is not a valid name color!");
            }
            nameColor = nameColor.join("").replace("#", "");
            if (nameColor.length !== 6) return util.error(message, "Your name color must be made up of 6 valid characters! The `#` at the start is optional. Valid characters are `a b c d e f A B C D E F 0 1 2 3 4 5 6 7 8 9`");
            token = accountEncryption.encode(`PASSWORD_${message.member.id}-${nameColor}_PASSWORD`);
        }
        let channel = bot.users.cache.get(message.member.id);
        util.info({ channel }, `Your token for Woomy.io is ||${token}||.\nWarning: **Do not give your token to anyone else. If they break any of the ingame rules while using your token, you will be punished as a result because your discord account is on the token.**`).then(() => util.info(message, "Please check your DMs from me.")).catch(() => util.error(message, "I am unable to DM you. Please check that your settings allow me to DM you."));
    },
    description: "Creates a custom token for the game. Sent in DMs.",
    usage: "claim"
};
