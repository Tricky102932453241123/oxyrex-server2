/*jslint node: true */
/*jshint -W061 */
/*global goog, Map, let */
"use strict";
// General requires
require('google-closure-library');
goog.require('goog.structs.PriorityQueue');
goog.require('goog.structs.QuadTree');
const dominatorLoop = (function() {
    let config = {
        types: [Class.destroyerDominator, Class.gunnerDominator, Class.trapperDominator, Class.droneDominator, Class.steamrollerDominator, Class.crockettDominator, Class.spawnerDominator, Class.autoDominator],
        neededToWin: 4
    };
    let gameWon = false;
    let spawn = (loc, team, type = false) => {
        type = type ? type : ran.choose(config.types);
        let o = new Entity(loc);
        o.define(type);
        o.team = team;
        o.color = getTeamColor(team);
        o.skill.score = 111069;
        o.name = "Dominator";
        o.isDominator = true;
        o.controllers = [new ioTypes.nearestDifferentMaster(o), new ioTypes.spinWhenIdle(o)];
        o.onDead = function() {
            if (o.team === -100 && o.collisionArray.length) {
                let killers = [];
                for (let instance of o.collisionArray)
                    if (instance.team > -9 && instance.team < 0 && o.team !== instance.team) killers.push(instance);
                let killer = ran.choose(killers) || { team: o.team };
                let newTeam = killer.team;
                spawn(loc, newTeam, type);
                room.setType("dom" + -killer.team, loc);
                sockets.broadcast("A dominator is now controlled by " + teamNames[-newTeam - 1] + "!");
                for (let player of sockets.players)
                    if (player.body)
                        if (player.body.team === newTeam) player.body.sendMessage("Press H to take control of the dominator.");
            } else {
                spawn(loc, -100, type);
                room.setType("dom0", loc);
                sockets.broadcast("A dominator is being contested!");
            }
            tally();
        };
    };

    function winner(teamId) {
        gameWon = true;
        setTimeout(function() {
            let team = teamNames[teamId];
            sockets.broadcast(team + " has won the game!");
            setTimeout(closeArena, 3e3);
        }, 1500);
    };

    function tally() {
        if (gameWon == true) return;
        let dominators = {};
        for (let i = 0; i < 4; i++) dominators[-(i + 1)] = 0;
        loopThrough(entities, function(o) {
            if (o.isDominator && o.team !== -101 && dominators[o.team] != null) dominators[o.team]++;
        });
        global.botScoreboard = {};
        for (let i = 0; i < c.TEAMS; i ++) {
            global.botScoreboard[teamNames[[i]]] = (dominators[-i - 1]) + " Dominator" + (dominators[-i - 1] == 1 ? "" : "s");
        }
        for (const key in dominators) {
            if (dominators[key] === config.neededToWin) {
                winner(-(+key) - 1);
            }
        }
        /*if (dominators["-1"] === config.neededToWin) winner(0);
        if (dominators["-2"] === config.neededToWin) winner(1);
        if (dominators["-3"] === config.neededToWin) winner(2);
        if (dominators["-4"] === config.neededToWin) winner(3);
        if (dominators["-5"] === config.neededToWin) winner(4);
        if (dominators["-6"] === config.neededToWin) winner(5);
        if (dominators["-7"] === config.neededToWin) winner(6);
        if (dominators["-8"] === config.neededToWin) winner(7);*/
    };

    if (c.DOMINATOR_LOOP) {
        global.botScoreboard = {};
        for (let i = 0; i < c.TEAMS; i ++) {
            global.botScoreboard[teamNames[[i]]] = "0 Dominators";
        }
    }

    return {
        spawn,
        tally
    };
})();
module.exports = {
    dominatorLoop
};
