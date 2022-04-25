/*
* Utility functions that help us out a lot.
* These functions range from simple logs to permission checks.
*/

// General Requires
const Discord = require("discord.js");
const config = require("./botConfig.json");

// Basic logging. Needs the bot to reference, channel ID and a message to send.
function log(bot, id, message) {
    if (!bot.active) return;
    const channel = bot.channels.cache.get(config.logs[id]);
    message = `${message}`;
    console.log(message);
    if (!channel) {
        console.log("Unable to get channel:", config.channels.logs);
        return;
    }
    const embed = new Discord.MessageEmbed()
        .setTitle(new Date())
        .setColor(0xDD0000)
        .setDescription(message)
    return channel.send(embed);
};

// Util functions that work for messages.

function unauth(message) {
    const embed = new Discord.MessageEmbed()
        .setTitle("Unauthorized!")
        .setColor(0xDD0000)
        .setDescription("You are unauthorized to use this command.")
        .setFooter('Powered by Discord.js', 'https://i.imgur.com/wSTFkRM.png');
    return message.channel.send(embed);
};

function error(message, errorText) {
    const embed = new Discord.MessageEmbed()
        .setTitle("Uh, Oh!")
        .setColor(0xDD0000)
        .setDescription(errorText)
        .setFooter('Powered by Discord.js', 'https://i.imgur.com/wSTFkRM.png');
    return message.channel.send(embed);
};

function success(message, content) {
    const embed = new Discord.MessageEmbed()
        .setTitle("Success!")
        .setColor(0xDD0000)
        .setDescription(content)
        .setFooter('Powered by Discord.js', 'https://i.imgur.com/wSTFkRM.png');
    return message.channel.send(embed);
};

function info(message, content, fields = -1) {
    const embed = new Discord.MessageEmbed()
        .setTitle("Info:")
        .setColor(0xDD0000)
        .setDescription(content)
        .setFooter('Powered by Discord.js', 'https://i.imgur.com/wSTFkRM.png');
    if (fields !== -1) embed.addFields(...fields);
    return message.channel.send(embed);
};

// Gets the permission integer for the user who sent the message.
function checkPermissions(message) {
    let output = 0;
    for (let id in config.permissions) {
        if (id === message.author.id) {
            output = config.permissions[id];
            break;
        }
        if (message.member.roles.cache.some(role => role.id === id)) {
            output = config.permissions[id];
            break;
        }
    }
    if (output === "BLACKLISTED") output = -1;
    return +output;
};

module.exports = {
    log,
    error,
    checkPermissions,
    unauth,
    error,
    success,
    info
};
