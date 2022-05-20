const Discord = require("discord.js");
const config = require("../botConfig.json");
const util = require("../util.js");
const moment = require("moment"); 
module.exports = {
    run: function(bot, message, args) {
        if (util.checkPermissions(message) < 3) return util.unauth(message);
        let option = args[0];
        if(!option)
        {
        return util.error(message, "Please specify whether you want to get user's data (data), to accept user (accept) or to ban user (refuse)");
        }
        let member = message.mentions.members.first();
        if(!member) {
        return util.error(message, "Please mention user.");
        }
        if(option === "data") {
        const verify_embed = new Discord.MessageEmbed()
        .setTitle("Data for user verification")
        //.setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
        .setAuthor(`${member.user.username}#${member.user.discriminator} (${member.user.id})`, member.user.displayAvatarURL({ dynamic:true }))
        .setColor(0xDD0000)
       // .setDescription("**PLACEHOLDER**")
        .setDescription(`**Created at:** 
        **>>Date<<** ${moment(member.user.createdTimestamp).format('LL')}  
        **>>Hour<<** ${moment(member.user.createdTimestamp).format('LT')} 
        **>>${moment(member.user.createdTimestamp).fromNow()}<<**
        \`\`--------------------------------------------------------\`\`
        **Joined at:**
        **>>Date<<** ${moment(member.joinedAt).format('LL')}
        **>>Hour<<** ${moment(member.joinedAt).format('LT')}
        **>>${moment(member.joinedAt).fromNow()}<<**`)
        .setFooter('Powered by Discord.js', 'https://i.imgur.com/wSTFkRM.png');
        return message.channel.send(verify_embed);
        } else if (option === "accept") {
          let role = message.guild.roles.cache.find(r => r.id ===
          "898443607487422486");
          let role2 = message.guild.roles.cache.find(r => r.id ===
          "965598486584229918");
          if(!role || !role2){
            return util.error(message, "Roles could not be found.");
          }
          member.roles.add(role);
          member.roles.remove(role2);
          return util.success(message, `Verification completed for ${member}.`)
        } else if (option === "decline") {
		      try {
          member.ban({ reason: `Verification failed. Decision by
${message.author.username}`});
		      } catch (error) {
		    	return util.error(message, `Could not ban user. Reason: ${error}`);
		      }
          return util.success(message, `Refused access to user and banned permamently.`)
        }
        util.error(message, "Option is not valid. Please choose between data, accept and decline");
    },
    description: "Used for verification",
    usage: "verify <data, accept or decline> <mention user>"
};
