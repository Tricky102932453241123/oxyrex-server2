/*jslint node: true */
/*jshint -W061 */
/*global goog, Map, let */
"use strict";

// General requires
require('google-closure-library');
goog.require('goog.structs.PriorityQueue');
goog.require('goog.structs.QuadTree');

let motherships = [];
const escort = (function() {
    let loopInterval;
    function spawnMothership() {
        let spot, i = 25;
        do {
            spot = { x: Math.random() * 300, y: Math.random() * 300 };
            i --;
            if (!i) return 0;
        } while (dirtyCheck(spot, 250));
        const o = new Entity(spot);
        o.team = -1;
        o.color = 10;
        o.define(Class.mothership);
        o.skill.set([9, 9, 9, 9, 9, 9, 9, 9, 9, 9]);
        o.name = ["Liberty", "Transylvania"][motherships.length] || "Escort Ship";
        o.color = [140, 145][motherships.length] || 10;
        o.controllers = [new ioTypes.escortMothershipAI(o), new ioTypes.pathFind(o)];
        o.onDead = function() {
            motherships = motherships.filter(r => r !== o);
            sockets.broadcast("BLUE has lost a Mothership!");
            if (!motherships.length) {
                clearInterval(loopInterval);
                sockets.broadcast("All Motherships have been lost!");
                setTimeout(() => {
                    sockets.broadcast("The Nest enemies have won the game!");
                    setTimeout(closeArena, 2500);
                }, 2500);
            }
        }
        motherships.push(o);
    }
    const enemies = {
        nestDefenders: [0, 3],
        sentries: [0, 7],
        crashers: [0, 25]
    };
    function spawnEnemy() {
        let o = new Entity(room.randomType("nest"));
        if (Math.random() > .975 && enemies.nestDefenders[0] < enemies.nestDefenders[1]) {
            sockets.broadcast("A Nest Defender has spawned!");
            o.define(ran.choose([Class.nestDefenderKrios, Class.nestDefenderTethys, Class.nestDefenderMnemosyne, Class.nestDefenderIapetus, Class.nestDefenderThemis, Class.nestDefenderNyx, Class.nestDefenderOuranos]));
            o.onDead = function() {
                enemies.nestDefenders[0] --;
            }
            enemies.nestDefenders[0] ++;
        } else if (Math.random() > .7 && enemies.sentries[0] < enemies.sentries[1]) {
            o.define(ran.choose([Class.sentryGun, Class.sentrySwarm, Class.sentryTrap, Class.sentryOmission, Class.sentryRho, Class.miniSummoner]));
            o.onDead = function() {
                enemies.sentries[0] --;
            }
            enemies.sentries[0] ++;
        } else if (enemies.crashers[0] < enemies.crashers[1]) {
            o.define(ran.choose([Class.crasher, Class.fragment, Class.dartCrasher, Class.teslaCrasher]));
            o.onDead = function() {
                enemies.crashers[0] --;
            }
            enemies.crashers[0] ++;
        } else {
            o.kill();
            return;
        }
        o.define({ BODY: { FOV: 50 }});
        o.controllers.push(new ioTypes.pathFind(o));
        o.team = -100;
    }
    function loop() {
        spawnEnemy();
        if (motherships.some(mothership => room.isIn("goal", mothership))) {
            clearInterval(loopInterval);
            sockets.broadcast("BLUE's Mothership has reached the safe area!");
            setTimeout(() => {
                sockets.broadcast("BLUE has won the game!");
                setTimeout(closeArena, 2500);
            }, 2500);
        }
    }
    loopInterval = setInterval(loop, 250);
    for (let i = 0; i < 2; i ++) {
        spawnMothership();
    }
});

module.exports = {
    escort,
    escortMotherships: motherships
};
