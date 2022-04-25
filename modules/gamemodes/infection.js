/*jslint node: true */
/*jshint -W061 */
/*global goog, Map, let */
"use strict";
// General requires
require('google-closure-library');
goog.require('goog.structs.PriorityQueue');
goog.require('goog.structs.QuadTree');

let stats = {
    bosses: 0,
    reverseTime: 0,
    id: -1
};

function spawnBoss() {
    stats.bosses ++;
    const o = new Entity(room.randomType("nest"));
    o.define(ran.choose([Class.nestDefenderKrios, Class.nestDefenderTethys, Class.nestDefenderMnemosyne, Class.nestDefenderIapetus, Class.nestDefenderThemis, Class.nestDefenderNyx]));
    o.team = -100;
    o.onDead = function() {
        stats.bosses --;
        sockets.broadcast("The infection has been temporarily reversed!");
        if (stats.reverseTime < 0) stats.reverseTime = 0;
        stats.reverseTime += Math.floor(Math.random() * 115 + 10);
    }
}

function infectionLoop() {
    stats.reverseTime --;
    if (stats.reverseTime === 0) sockets.broadcast("The infection has been renewed!");
    const nestLocations = [];
    for (let i = 0; i < room.setup.length; i ++) {
        for (let j = 0; j < room.setup[0].length; j ++) {
            if (room.setup[i][j] === "nest") {
                nestLocations.push({
                    x: i,
                    y: j
                });
            }
        }
    }
    if (!nestLocations.length) return;
    if (nestLocations.length >= room.setup.length * room.setup[0].length) {
        clearInterval(stats.id);
        sockets.broadcast("The infection has taken over the map!");
        setTimeout(closeArena, 2500);
        return;
    }
    let changed = false;
    const { x, y } = ran.choose(nestLocations);
    if (stats.reverseTime > 0) {
        if (nestLocations.length > 1) {
            room.setup[x][y] = "norm";
            changed = true;
        } else {
            clearInterval(stats.id);
            sockets.broadcast("Your team has stopped the infection!");
            setTimeout(closeArena, 2500);
        }
    } else {
        switch (Math.random() * 4 | 0) {
            case 0: {
                if (x > 0 && room.setup[x - 1][y] !== "nest") {
                    room.setup[x - 1][y] = "nest";
                    changed = true;
                }
            } break;
            case 1: {
                if (y > 0 && room.setup[x][y - 1] !== "nest") {
                    room.setup[x][y - 1] = "nest";
                    changed = true;
                }
            } break;
            case 2: {
                if (x < room.setup.length - 1 && room.setup[x + 1][y] !== "nest") {
                    room.setup[x + 1][y] = "nest";
                    changed = true;
                }
            } break;
            case 3: {
                if (y < room.setup[0].length && room.setup[x][y + 1] !== "nest") {
                    room.setup[x][y + 1] = "nest";
                    changed = true;
                }
            } break;
        }
        if (changed && nestLocations.length % 50 === 0 && stats.bosses < 5) {
            let spawned = 0;
            for (let i = 0; i < 5 - stats.bosses; i ++) {
                if (Math.random() > 0.2) {
                    spawnBoss();
                    spawned ++;
                }
            }
            if (spawned > 0) sockets.broadcast((spawned > 1 ? "Nest Defenders have" : "A Nest Defender has") + " spawned! Kill it to reverse the infection!");
        }
    }
    if (changed) {
        room.findType("norm");
        room.findType("nest");
        sockets.broadcastRoom();
    }
}

module.exports = {
    initInfectionLoop: function() {
        stats.id = setInterval(infectionLoop, 100);
    }
};
