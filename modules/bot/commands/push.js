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
    await awaitCommand('git config credential.helper store && git config --global user.email "j.huang35@share.epsb.ca" && git config --global user.name "Jiankun-Huang" && git config --global core.excludesFile ~/.gitignore && git add . && git commit -m "Push Changes from discord" && git remote set-url origin "https://Jiankun-Huang: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@github.com/JH-Jack/oxyrex-server" && git push origin --all')
    console.log("Changes Pushed to Github!");
    // closeArena();
};

module.exports = {
    run: async function(bot, message, args) {
        if (util.checkPermissions(message) < 3) return util.unauth(message);  
        util.log(bot, "command", `<@!${message.author.id}> ran \`${message.content}\` in <#${message.channel.id}>`);
        await main();
        return util.info(message, "Server changes pushed. Restarting.");
    },
    description: "Push changes to github",
    usage: "push"
};
