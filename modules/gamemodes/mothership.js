/*jslint node: true */
/*jshint -W061 */
/*global goog, Map, let */
"use strict";
// General requires
require('google-closure-library');
goog.require('goog.structs.PriorityQueue');
goog.require('goog.structs.QuadTree');
global.defeatedTeams = [];//also ive worked on a lot of things and balanced motherships, i also added more aren closer variation, and made bots die when the arena closes, also could you add the poison gradient thingies to the client?
let mothershipLoop = (function() {
  
    let motherships = [];
    let teamWon = false;
    let choices = [Class.mothership];

    function spawn() {
        let locs = [{
            x: c.WIDTH * 0.1,
            y: c.HEIGHT * 0.1
        }, {
            x: c.WIDTH * 0.9,
            y: c.HEIGHT * 0.9
        }, {
            x: c.WIDTH * 0.9,
            y: c.HEIGHT * 0.1
        }, {
            x: c.WIDTH * 0.1,
            y: c.HEIGHT * 0.9
        }, {
            x: c.WIDTH * 0.1,
            y: c.HEIGHT * 0.5
        }, {
            x: c.WIDTH * 0.9,
            y: c.HEIGHT * 0.5
        }, {
            x: c.WIDTH * 0.5,
            y: c.HEIGHT * 0.1
        }, {
            x: c.WIDTH * 0.5,
            y: c.HEIGHT * 0.9
        }].sort(function() {
            return 0.5 - Math.random();
        });
        for (let i = 0; i < c.TEAMS; i++) {
            let o = new Entity(locs[i]);
            o.define(ran.choose(choices));
            o.define({
                ACCEPTS_SCORE: true,
                VALUE: 500000,
            });
            o.color = getTeamColor(-i - 1);
            o.team = -i - 1;
            o.name = "Mothership";
            o.isMothership = true;
            o.isBot = true
            o.controllers.push(new ioTypes.nearestDifferentMaster(o));
            o.controllers.push(new ioTypes.botMovement(o));
            o.refreshBodyAttributes();
            motherships.push([o.id, i]);
        }
    };


  
    function death(entry) {
        let team = teamNames[entry[1]];
        sockets.broadcast(team + "'s mothership has been killed!");
        global.defeatedTeams.push(-entry[1] - 1);
        for (let i = 0; i < entities.length; i++) {
            let o = entities[i];
            if (o.team === -entry[1] - 1) {
                o.sendMessage("Your team has been eliminated.");
                o.kill();
            }
        }
        return false;
    };

    function winner(teamId) {
        let team = teamNames[teamId];
        sockets.broadcast(team + " has won the game!");
        setTimeout(closeArena, 5e3);
    };

    function loop() {
        if (teamWon) return;
        let aliveNow = motherships.map(entry => [...entry, entities.find(entity => entity.id === entry[0])]);
        aliveNow = aliveNow.filter(entry => {
            if (!entry[2]) return death(entry);
            if (entry[2].isDead()) return death(entry);
            return true;
        });
        global.botScoreboard = {};
        for (let i = 0; i < aliveNow.length; i ++) {
            const entry = aliveNow[i][2];
            if (entry) {
                global.botScoreboard[teamNames[-entry.team - 1]] = `${Math.round(entry.health.amount)}/${Math.round(entry.health.max)} Health`;
            }
        }
        if (aliveNow.length === 1) {
            teamWon = true;
            setTimeout(winner, 2500, aliveNow[0][1]);
        }
        motherships = aliveNow;
    };
    if (c.MOTHERSHIP_LOOP) {
        global.botScoreboard = {};
        for (let i = 0; i < c.TEAMS; i ++) {
            global.botScoreboard[teamNames[i]] = Class.mothership.BODY.HEALTH + `/${Class.mothership.BODY.HEALTH} Health`;
        }
    }
    return {
        spawn,
        loop,
        motherships
    }
})();
module.exports = {
    mothershipLoop
};
// crazy