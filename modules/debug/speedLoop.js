/*jslint node: true */
/*jshint -W061 */
/*global goog, Map, let */
"use strict";
// General requires
require('google-closure-library');
goog.require('goog.structs.PriorityQueue');
goog.require('goog.structs.QuadTree');
const speedcheckloop = (() => {
    let fails = 0;
    // Return the function
    return async () => {
        if (global.mspt > 30) {
            fails ++;
        } else {
            fails --;
        }
        if (Math.ceil(fails) > 60 && !arenaClosed) {
            arenaClosed = true;
            sockets.broadcast("Server overloaded, restarting...");
            await bot.util.log(bot, "error", "Server overloaded, restarting...");
            process.exit();
        }
        let activationtime = logs.activation.sum(),
            collidetime = logs.collide.sum(),
            movetime = logs.entities.sum(),
            playertime = logs.network.sum(),
            maptime = logs.minimap.sum(),
            physicstime = logs.physics.sum(),
            lifetime = logs.life.sum(),
            selfietime = logs.selfie.sum();
        let sum = logs.master.record();
        let loops = logs.loops.count(),
            active = logs.entities.count();
        if (global.mspt > 100) {
            util.warn('~~ LOOPS: ' + loops + '. ENTITY #: ' + entities.length + '//' + Math.round(active / loops) + '. VIEW #: ' + views.length + '. BACKLOGGED :: ' + (sum * roomSpeed * 3).toFixed(3) + '%! ~~');
            util.warn('Total activation time: ' + activationtime);
            util.warn('Total collision time: ' + collidetime);
            util.warn('Total cycle time: ' + movetime);
            util.warn('Total player update time: ' + playertime);
            util.warn('Total lb+minimap processing time: ' + maptime);
            util.warn('Total entity physics calculation time: ' + physicstime);
            util.warn('Total entity life+thought cycle time: ' + lifetime);
            util.warn('Total entity selfie-taking time: ' + selfietime);
            util.warn('Total time: ' + (activationtime + collidetime + movetime + playertime + maptime + physicstime + lifetime + selfietime));
        }
    }
})();
module.exports = {
    speedcheckloop
};
