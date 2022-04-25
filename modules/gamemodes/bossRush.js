/*jslint node: true */
/*jshint -W061 */
/*global goog, Map, let */
"use strict";

const { ioTypes } = require('../live/controllers');

// General requires
require('google-closure-library');
goog.require('goog.structs.PriorityQueue');
goog.require('goog.structs.QuadTree');

const bossRush = (function() {
    const escorts = [Class.nestDefenderKrios, Class.nestDefenderTethys, Class.nestDefenderMnemosyne, Class.nestDefenderIapetus, Class.nestDefenderThemis, Class.nestDefenderNyx, Class.nestDefenderOuranos];
    let bossTypes = [Class.eliteDestroyer, Class.eliteGunner, Class.eliteSprayer, Class.eliteSprayer2, Class.eliteHunter, Class.eliteSkimmer, Class.sentryFragBoss, Class.eliteDirector, Class.eliteSkimmer, Class.palisade, Class.summoner, Class.guardian, Class.greenGuardian, Class.atrium, Class.quadriatic, Class.sterilizerBoss, Class.eggPrinceTier1, Class.eggPrinceTier2, Class.eggBossTier1, Class.eggBossTier2, Class.squareBossTier1, Class.squareBossTier2, Class.triangleBossTier1, Class.triangleBossTier2, Class.desertTemple, Class.steamrollerGod, Class.octoberRevolution, Class.careenervirus, Class.kinderbumper];
    let celestials = [Class.apolloCelestial, Class.odinCelestial, Class.artemisCelestial, Class.lokiCelestial, Class.aresCelestial, Class.rheaCelestial, Class.demeterCelestial, Class.athenaCelestial, Class.hadesCelestial, Class.pontusCelestial];
    const finalBosses = [Class.oceanusCelestial, Class.thorCelestial, Class.raCelestial, Class.nyxCelestial, Class.legendaryCrasher, Class.sacredCrasher, Class.mythicalCrasher, Class.legendaryQuadralMachine, Class.catalyst, Class.gaea];
    const waves = (function() {
        class Wave {
            constructor(bosses, message) {
                this.bosses = bosses;
                this.message = message;
            }
        }
        let output = [];
        let basicWaves = [];
        for (let i = 0; i < 19; i ++) {
            bossTypes = bossTypes.sort(() => 0.5 - Math.random());
            const bosses = [];
            for (let x = 0; x < 2 + (Math.random() * 5 | 0); x ++) {
                bosses.push(bossTypes[x]);
            }
            basicWaves.push(new Wave(bosses));
        }
        output = output.concat(basicWaves.sort((a, b) => a.bosses.length - b.bosses.length));
        for (let i = 0; i < celestials.length; i ++) {
            if (i === 0) {
                output.push(new Wave([celestials[i]], "World will fall, we are back..."));
            } else {
                output.push(new Wave([celestials[i]]));
            }
        }
        celestials = celestials.sort(() => .5 - Math.random());
        let celestialWaves = [];
        for (let i = 0; i < 5; i ++) {
            const bosses = [celestials[i]];
            bossTypes = bossTypes.sort(() => 0.5 - Math.random());
            for (let x = 0; x < 1 + (Math.random() * 3 | 0); x ++) {
                bosses.push(bossTypes[x]);
            }
            celestialWaves.push(new Wave(bosses));
        }
        output = output.concat(celestialWaves.sort((a, b) => a.bosses.length - b.bosses.length));
        output.push(new Wave([finalBosses[Math.random() * finalBosses.length | 0]], "It's time I put an end to this, once and for all!"));
        return output;
    })();
    let index = 0;
    function spawnWave() {
        const wave = waves[index];
        if (!wave) {
            sockets.broadcast("Your team has beaten the boss rush!");
            if (util.dateCheck("12/23/2021", "01/01/2022")) {
                sockets.players.forEach(({ socket }) => {
                    if (socket.discordID) {
                        bot.database.makeEntry(bot, bot.config.logs.achievementDatabase, {
                            id: socket.discordID,
                            achievement: "Winter Rush|||Win a round of Boss Rush during the holiday season."
                        });
                        socket.talk("m", "You won the winter boss rush! You can claim a reward role with the discord bot!");
                    }
                });
            }
            setTimeout(closeArena, 3000);
            return;
        }
        let bosses = wave.bosses.length;
        global.botScoreboard["Bosses Left"] = wave.bosses.length;
        for (let boss of wave.bosses) {
            let o = new Entity(room.randomType("boss"));
            o.define(boss);
            o.controllers.push(new ioTypes.bossRushAI(o));
            if (o.classSize < 35) {
                o.controllers.push(new ioTypes.pathFind(o));
            }
            o.team = -100;
            o.onDead = function() {
                bosses --;
                global.botScoreboard["Bosses Left"] = bosses;
                if (bosses <= 0) {
                    sockets.broadcast("The next wave will begin in 10 seconds.");
                    index ++;
                    setTimeout(spawnWave, 10000);
                }
            }
        }
        for (let i = 0; i < 2; i ++) {
            let n = new Entity(room.randomType("boss"));
            n.define(ran.choose(escorts));
            n.controllers.push(new ioTypes.bossRushAI(n), new ioTypes.pathFind(n));
            n.team = -100;
        }
        global.botScoreboard.Wave = (index + 1);
        if (wave.message != null) {
            sockets.broadcast(wave.message);
            setTimeout(() => sockets.broadcast("Wave " + (index + 1) + " has arrived!"), 2000);
        } else {
            sockets.broadcast("Wave " + (index + 1) + " has arrived!");
        }
    }
    let maxSanctuaries = 0;
    let sanctuaries = 0;
    let spawn = (loc, team, type = false) => {
        const realType = Class[team === -1 ? type + "Sanctuary" : "dominator"];
        let o = new Entity(loc);
        o.define(realType);
        o.team = team;
        o.color = getTeamColor(team);
        o.skill.score = 111069;
        o.name = "Dominator";
        //o.SIZE = c.WIDTH / c.X_GRID / 10;
        o.isDominator = true;
        o.controllers = [new ioTypes.nearestDifferentMaster(o), new ioTypes.spinWhenIdle(o)];
        o.onDead = function() {
            if (o.team === -100) {
                spawn(loc, -1, type);
                room.setType("bas1", loc);
                sockets.broadcast("A dominator has been captured by BLUE!");
                if (sanctuaries < 1) {
                    sockets.broadcast("Your team may now respawn.");
                    for (const socket of sockets.clients) {
                        if (socket.awaitingSpawn) {
                            socket.reallySpawn();
                        }
                    }
                }
                sanctuaries ++;
            } else {
                sanctuaries --;
                if (sanctuaries < 1) {
                    sockets.broadcast("Your team can no longer respawn. Capture a dominator to allow respawning.");
                    sockets.broadcast("Your team will lose in 90 seconds");
                    function tick(i) {
                        if (sanctuaries > 0) {
                            return;
                        }
                        if (i <= 0) {
                            sockets.broadcast("Your team has lost!");
                            setTimeout(closeArena, 2500);
                            return;
                        }
                        if (i % 15 === 0 || i <= 10) {
                            sockets.broadcast(`${i} seconds until your team loses!`);
                        }
                        setTimeout(function retick() {
                            tick(i - 1);
                        }, 1000);
                    }
                    tick(91);
                }
                spawn(loc, -100, type);
                room.setType("dom0", loc);
                sockets.broadcast("A dominator has been captured by the bosses!");
            }
        }
    }
    return function() {
        global.botScoreboard = {
            "Wave": 0,
            "Bosses Left": 0
        };
        let time = 60;
        for (let loc of room["bas1"]) {
            maxSanctuaries ++;
            sanctuaries ++;
            spawn(loc, -1, ran.choose(['destroyerDominator', 'gunnerDominator', 'trapperDominator', 'droneDominator', 'steamrollerDominator', 'autoDominator', 'crockettDominator', 'spawnerDominator']));
        }
        console.log("Boss rush initialized.");
        function recursive() {
            time -= 5;
            sockets.broadcast(time + " seconds until the first wave!");
            if (time > 0) return setTimeout(recursive, 5000);
            spawnWave();
        }
        recursive();
    }
})();

module.exports = {
    bossRush
};
