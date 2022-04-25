/*jslint node: true */
/*jshint -W061 */
/*global goog, Map, let */
"use strict";
// General requires
require('google-closure-library');
goog.require('goog.structs.PriorityQueue');
goog.require('goog.structs.QuadTree');
let logs = (function() {
    let logger = (function() {
        // The two basic functions
        function set(obj) {
            obj.time = util.time();
        }

        function mark(obj) {
            obj.data.push(util.time() - obj.time);
        }

        function record(obj) {
            let o = util.averageArray(obj.data);
            obj.data = [];
            return o;
        }

        function sum(obj) {
            let o = util.sumArray(obj.data);
            obj.data = [];
            return o;
        }

        function tally(obj) {
            obj.count++;
        }

        function count(obj) {
            let o = obj.count;
            obj.count = 0;
            return o;
        }
        // Return the logger creator
        return function() {
            let internal = {
                data: [],
                time: util.time(),
                count: 0,
            };
            // Return the new logger
            return {
                set: () => set(internal),
                mark: () => mark(internal),
                record: () => record(internal),
                sum: () => sum(internal),
                count: () => count(internal),
                tally: () => tally(internal),
            };
        };
    })();
    // Return our loggers
    return {
        entities: logger(),
        collide: logger(),
        network: logger(),
        minimap: logger(),
        misc2: logger(),
        misc3: logger(),
        physics: logger(),
        life: logger(),
        selfie: logger(),
        master: logger(),
        activation: logger(),
        loops: logger(),
    };
})();
class LagLogger {
    constructor() {
        this.startTime = 0;
        this.endTime = 0;
        this.totalTime = 0;
        this.history = [];
    }
    set() {
        this.startTime = new Date().getTime();
    }
    mark() {
        this.endTime = new Date().getTime();
        this.totalTime = this.endTime - this.startTime;
        this.history.push({
            at: new Date(),
            time: this.totalTime
        });
        if (this.history.length > 10) this.history.shift();
    }
    get sum() {
        return this.history;
    }
}
module.exports = {
    logs,
    LagLogger
};
