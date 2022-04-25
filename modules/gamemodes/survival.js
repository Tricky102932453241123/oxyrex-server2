/*jslint node: true */
/*jshint -W061 */
/*global goog, Map, let */
"use strict";
// General requires
require('google-closure-library');
goog.require('goog.structs.PriorityQueue');
goog.require('goog.structs.QuadTree');
let survival = {
    players: [],
    time: 60 * 3,
    i: null,
    started: false,
    startGame: function() {
        clearInterval(survival.i);
        survival.started = true;
        sockets.broadcast("The game has begun!");
        for (let player of survival.players) {
            player.godmode = false;
            player.sendMessage("Your godmode has been disabled...");
        }
        for (let i = survival.players.length; i < 15; i++) survival.spawnBot();
    },
    init: function() {
        survival.i = setInterval(() => {
            if (survival.players.length >= 5 || survival.time <= 0) return survival.startGame();
            if (survival.players.length) {
                survival.time--;
                if (survival.time % 5 === 0) {
                    sockets.broadcast(survival.time + " seconds until the game starts!");
                    sockets.broadcast("Invite more players to start the game now!");
                }
            }
        }, 1000);
    },
    spawnBot: function() {
        let set = ran.choose(botSets);
        let o = new Entity(room.random());
        o.define(Class[set.ai]);
        o.define(Class[set.startClass]);
        o.skill.set(set.build);
        o.name += ran.chooseBotName();
        o.skill.score = 59212;
        o.refreshBodyAttributes();
        o.isBot = true;
        o.color = 11;
        o.onDead = () => survival.removePlayer(o);
        survival.players.push(o);
        global.bots.push(o);
    },
    removePlayer: function(player) {
        survival.players = survival.players.filter(r => r !== player);
        if (!survival.started) return;
        sockets.broadcast(player.name + " has been eliminated!");
        if (survival.players.length === 1) {
            sockets.broadcast(survival.players[0].name + " has won!");
            if (survival.players[0].socket != null && survival.players[0].discordID != null) {
                bot.database.makeEntry(bot, bot.config.logs.achievementDatabase, {
                    id: survival.players[0].socket.discordID,
                    achievement: "Survivor|||Win a game of Survival."
                });
                instance.sendMessage("Achievement get: " + "Survivor");
            }
            setTimeout(closeArena, 1500);
        }
    }
};

module.exports = {
    survival
};
