// Import everything.
const Discord = require("discord.js");
const config = require("../botConfig.json");
const util = require("../util.js");

const credentials = {
    username: "Jiankun-Huang",
    token: "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"
};

// Function provided by Sopur
async function main() {
    const cp = require("child_process");
    async function awaitCommand(command) {
        return new Promise((res) => {
            cp.exec(command).on("close", res).on("error", console.log);
        });
    }
    //await awaitCommand("git pull origin main");
    await awaitCommand(`git config --global core.excludesFile ~/.gitignore && git remote set-url origin "https://Jiankun-Huang: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@github.com/JH-Jack/oxyrex-server" && git pull origin master`);
    console.log("Done!");
    closeArena();
};

module.exports = {
    run: async function(bot, message, args) {
        if (util.checkPermissions(message) < 3) return util.unauth(message);
        util.log(bot, "command", `<@!${message.author.id}> ran \`${message.content}\` in <#${message.channel.id}>`);
        await main();
        return util.info(message, "Server updated. Restarting.");
    },
    description: "Restarts the server.",
    usage: "update"
};
