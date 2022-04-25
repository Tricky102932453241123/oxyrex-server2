/*jslint node: true */
/*jshint -W061 */
/*global goog, Map, let */
"use strict";
// General requires
require('google-closure-library');
goog.require('goog.structs.PriorityQueue');
goog.require('goog.structs.QuadTree');

const hideAndSeek = (function() {
    const teamNames = ["The Hiders", "The Seekers"];
    const data = [0, 0];
    let gameWon = false;
    function getKillData(instance) {
        for (let i = 0; i < instance.collisionArray.length; i ++) {
            const killer = instance.collisionArray[i];
            if (killer.team === -1 && killer.team !== instance.team) {
                data[0] ++;
                sockets.broadcast("The Seekers gained a point!");
                if (data[0] >= 25 && !gameWon) {
                    sockets.broadcast("The Seekers have won!");
                    setTimeout(closeArena, 2500);
                    gameWon = true;
                }
            }
        }
    }
    function interval() {
        if (gameWon) return;
        sockets.broadcast("The Hiders gained a point.");
        data[1] ++;
        if (data[1] >= 25) {
            sockets.broadcast("The Hiders have won!");
            setTimeout(closeArena, 2500);
            gameWon = true;
            return;
        }
        setTimeout(interval, 30000);
    }
    if (c.HIDE_AND_SEEK) setTimeout(interval, 30000);
    return {
        getKillData,
        data
    };
})();

module.exports = {
    hideAndSeek
};
