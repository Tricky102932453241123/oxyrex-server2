/*jslint node: true */
/*jshint -W061 */
/*global goog, Map, let */
"use strict";
// General requires
require('google-closure-library');
goog.require('goog.structs.PriorityQueue');
goog.require('goog.structs.QuadTree');

const trenchWarefare = (function() {
    let sanctuaries = 0;
    let spawn = (loc, team, type = false) => {
        const realType = Class[team === -2 ? type + "Sanctuary" : "dominator"];
        let o = new Entity(loc);
        o.define(realType);
        o.team = team;
        o.color = getTeamColor(team);
        o.skill.score = 111069;
        o.name = "Dominator";
        o.isDominator = true;
        o.controllers = [new ioTypes.nearestDifferentMaster(o), new ioTypes.spinWhenIdle(o)];
        o.onDead = function() {
            if (arenaClosed) {
                room.setType("dom0", loc);
                return;
            }
            if (o.team === -1) {
                spawn(loc, -2, type);
                room.setType("bas2", loc);
                sockets.broadcast("A dominator has been captured by RED!");
                sanctuaries ++;
            } else {
                sanctuaries --;
                spawn(loc, -1, type);
                room.setType("dom1", loc);
                sockets.broadcast("A dominator has been captured by the bosses!");
                if (sanctuaries < 1) {
                    sockets.broadcast("RED has lost!");
                    setTimeout(closeArena, 2500);
                    clearInterval(timer);
                }
            }
        }
    };
    let timer = setInterval((function() {
        let time = 60 * 30;
        return function() {
            time --;
            if (time <= 0) {
                clearInterval(timer);
                sockets.broadcast("Red has won the game!");
                setTimeout(closeArena, 2500);
            } else if (time <= 15) {
                sockets.broadcast(time + " seconds until RED wins!");
            } else if (time < 60 && time % 5 === 0) {
                sockets.broadcast(time + " seconds until RED wins!");
            } else if (time % 60 === 0) {
                sockets.broadcast(time / 60 + " minutes until RED wins!");
            }
        }
    })(), 1000);
    room["bas2"].forEach(loc => {
        sanctuaries ++;
        spawn(loc, -2, ran.choose(['destroyerDominator', 'gunnerDominator', 'trapperDominator', 'droneDominator', 'steamrollerDominator', 'autoDominator', 'crockettDominator', 'spawnerDominator']));
    });
});

module.exports = {
    trenchWarefare
};
