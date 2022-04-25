/*jslint node: true */
/*jshint -W061 */
/*global goog, Map, let */
"use strict";

// General requires
require('google-closure-library');
goog.require('goog.structs.PriorityQueue');
goog.require('goog.structs.QuadTree');

const gamemodeLoop = (function() {
  if (c.MOTHERSHIP_LOOP) mothershipLoop.spawn();
  if (c.SPECIAL_BOSS_SPAWNS) bossRush();
  if (c.TRENCH_WARFARE) trenchWarefare();
  if (c.ESCORT) escort();
  if (c.MAZE && typeof c.MAZE !== "boolean") generateMaze(c.MAZE);
  if (c.DOMINATOR_LOOP) for (let loc of room.dom0) dominatorLoop.spawn(loc, -100);
  if (c.INFECTION_LOOP) initInfectionLoop();
  if (c.SURVIVAL) survival.init();
  if (c.SOCCER) soccer.init();
  let logger = new LagLogger();
  return function() {
    logger.set();
    if (c.MOTHERSHIP_LOOP) mothershipLoop.loop();
    if (c.EPICENTER) epicenter.update();
    logger.mark();
    if (logger.totalTime > 100) {
      console.log("Gamemode loop is taking a long time!");
      console.log(`Gamemode loop took ${logger.totalTime}ms to complete!`);
      console.log(`Gamemode loop log history: (Last ${logger.sum.length} entries)`);
      console.log(logger.sum.map(entry => `Run at: ${entry.at}. Time: ${entry.time}.`).join("\n"));
    }
  };
})();

module.exports = { gamemodeLoop };
