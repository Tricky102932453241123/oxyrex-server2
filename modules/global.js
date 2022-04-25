/*jslint node: true */
/*jshint -W061 */
/*global goog, Map, let */
"use strict";
// General requires
require('google-closure-library');
goog.require('goog.structs.PriorityQueue');
goog.require('goog.structs.QuadTree');
// Global Utilities Requires

global.fingerPrint = (function() {
    const herokuOA = process.argv.some(arg => arg.includes("heroku")) && (process.env.HASH === "oa");
    const herokuOB = process.argv.some(arg => arg.includes("heroku")) && (process.env.HASH === "ob");
    const herokuHA = process.argv.some(arg => arg.includes("heroku")) && (process.env.HASH === "ha");
    const herokuHB = process.argv.some(arg => arg.includes("heroku")) && (process.env.HASH === "hb");
    const herokuC = process.argv.some(arg => arg.includes("heroku")) && (process.env.HASH === "c");
    const DogatorixDOGA = process.argv.some(arg => arg.includes("Dogatorix")) && (process.env.HASH === "doga");
    const digitalOcean = process.argv.some(arg => arg.includes("digital"));
    const digitalOceanBA = digitalOcean && process.argv.some(arg => arg.includes("ba"));
    const digitalOceanGA = digitalOcean && process.argv.some(arg => arg.includes("ga"));
    const localhost = !herokuOA && !herokuOB && !herokuHA && !herokuHB && !herokuC && !digitalOcean && !DogatorixDOGA;
    return {
        herokuOA,
        herokuOB,
        herokuHA,
        herokuHB,
        herokuC,
        DogatorixDOGA,
        digitalOcean,
        digitalOceanBA,
        digitalOceanGA,
        localhost,
        prefix: ["oa", "ob", "ha", "hb", "c", "ba", "ga", "doga", "xyz"][herokuOA ? 0 : herokuOB ? 1 : herokuHA ? 2 : herokuHB ? 3 : herokuC ? 4 : digitalOceanBA ? 5 : digitalOceanGA ? 6 : DogatorixDOGA ? 7 : 8]
    }
})();

global.sandboxRooms = [];

global.c = require("./setup/config.js").output;
global.ran = require(".././lib/random.js");
global.util = require(".././lib/util.js");
global.hshg = require(".././lib/hshg.js");
//global.QuadTree = require("./physics/quadTree.js");
global.protocol = require(".././lib/fasttalk.js");
// Global Variables (These must come before we import from the modules folder.)
global.roomSpeed = c.gameSpeed;
global.fps = "Unknown";
global.minimap = [];
global.entities = [];
global.squadronPoints = {};
global.activeEntities = [];
global.views = [];
global.entitiesToAvoid = [];
global.grid = new hshg.HSHG();
global.arenaClosed = false;
global.mockupsLoaded = false;
global.nextTagBotTeam = [];
global.getTeam = () => {
    const teamData = {};
    for (let i = 0; i < c.TEAMS; i ++) teamData[i + 1] = 0;
    for (const o of entities) {
        if ((o.isBot) && (-o.team > 0 && -o.team <= c.TEAMS)) {
            teamData[-o.team] ++;
        }
    }
    for (const socket of sockets.clients) {
        if (socket.rememberedTeam > 0 && socket.rememberedTeam <= c.TEAMS) {
            teamData[socket.rememberedTeam] ++;
        }
    }
    const toSort = Object.keys(teamData).map(key => [key, teamData[key]]).filter(e => !global.defeatedTeams.includes(-e[0])).sort((a, b) => a[1] - b[1]);
    return toSort.length === 0 ? ((Math.random() * c.TEAMS | 0) + 1) : toSort[0][0];
};
global.teamNames = ["BLUE", "RED", "GREEN", "PURPLE", "TEAL", "LIME", "ORANGE", "GREY"];
global.teamColors = [10, 11, 12, 15, 0, 1, 2, 6];
global.getTeamColor = function(team) {
    if (Math.abs(team) - 1 >= teamNames.length) {
        return 3;
    }
    return teamColors[Math.abs(team) - 1];
}
global.loopThrough = function(array, callback = () => {}) {
    for (let index = 0, length = array.length; index < length; index ++) callback(array[index], index);
};
global.isEven = function isEven(number) {
    return number % 2 === 0;
};
global.rotatePoint = function rotatePoint({
    x,
    y
}, angle) {
    const dist = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
    const rad = Math.atan2(y, x) + angle;
    return {
        x: Math.cos(rad) * dist,
        y: Math.sin(rad) * dist,
    };
};
// Now that we've set up the global variables, we import all the modules, then put them into global varialbles and then export something just so this file is run.
const requires = [
    "./setup/room.js", // These are the basic room functions, set up by config.json
    "./physics/relative.js", // Some basic physics functions that are used across the game.
    "./live/entitySubFunctions.js", // Skill, HealthType and other functions related to entities are here.
    "./live/controllers.js", // The AI of the game.
    "./live/entity.js", // The actual Entity constructor.
    "./setup/newMockups.js", // This file loads the mockups.
    "./physics/collisionFunctions.js", // The actual collision functions that make the game work.
    "./network/security/security.js", // Ava i STG I WILLL STOPPP UUUUUUUUUUUU
    "./network/tokenGenerator.js", // Public token generator
    "./gamemodes/groups.js", // Duos/Trios/Squads
    "./gamemodes/soccer.js", // Soccer
    "./network/sockets.js", // The networking that helps players interact with the game.
    "./network/webServer.js", // The networking that actually hosts the server.
    "./debug/logs.js", // The logging pattern for the game. Useful for pinpointing lag.
    "./debug/speedLoop.js", // The speed check loop lmao.
    "./gamemodes/killRace.js", // Kill Race
    "./gamemodes/hideAndSeek.js", // Kill Race
    "./gamemodes/bossRush.js", // Boss Rush
    "./gamemodes/trenchWarfare.js", // Trench Warfare
    "./gamemodes/escort.js", // Escort
    "./gamemodes/maze.js", // Maze
    "./gamemodes/mothership.js", // The mothership mode
    "./gamemodes/domination.js", // The Domination mode
    "./gamemodes/infection.js", // Infection mode
    "./gamemodes/survival.js", // Survival mode
    "./gamemodes/epicenter.js", // Epicenter mode
    "./gamemodes/gamemodeLoop.js", // The gamemode loop.
    "./gamemodes/tag.js", // Tag
    "./gamemodes/closeArena.js", // Arena Closing mechanics
    "./debug/antibot.js", // Antibot :DDD
    "./bot/main.js" // Discord Bot
];
for (let file of requires) {
    const start = Date.now();
    const module = require(file);
    for (let key in module) {
        if (module.hasOwnProperty(key)) {
            global[key] = module[key];
        }
    }
    console.log(`Loaded ${file} in ${Date.now() - start}ms`);
}
module.exports = {
    creationDate: new Date(),
    creationTime: new Date().getTime()
};
