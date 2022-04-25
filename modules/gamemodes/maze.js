/*jslint node: true */
/*jshint -W061 */
/*global goog, Map, let */
"use strict";
// General requires
require('google-closure-library');
goog.require('goog.structs.PriorityQueue');
goog.require('goog.structs.QuadTree');
let locsToAvoid = ["nest", "port", "dom0", "edge", "goal"];
for (let i = 1; i < 5; i++) locsToAvoid.push("bas" + i), locsToAvoid.push("bap" + i), locsToAvoid.push("dom" + i);

class MazeRemap {
    constructor(maze) {
        this._ref = JSON.parse(JSON.stringify(maze));
        this.maze = maze;
        this.blocks = [];
    }
    get width() {
        return this.maze.length;
    }
    get height() {
        return this.maze.length === 0 ? 0 : this.maze[0].length;
    }
    findBiggest() {
        let best = {
            x: 0,
            y: 0,
            size: 0
        };
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                if (!this.maze[x][y]) {
                    continue;
                }
                let size = 1;
                loop: while (x + size < this.width && y + size < this.height) {
                    for (let i = 0; i <= size; i++) {
                        if (!this.maze[x + size][y + i] || !this.maze[x + i][y + size]) {
                            break loop
                        }
                    }
                    size++
                }
                if (size > best.size) {
                    best = {
                        x: x,
                        y: y,
                        size: size
                    };
                }
            }
        }
        for (let x = 0; x < best.size; x++) {
            for (let y = 0; y < best.size; y++) {
                this.maze[best.x + x][best.y + y] = false;
            }
        }
        return {
            x: best.x,
            y: best.y,
            size: best.size,
            width: 1,
            height: 1
        };
    }
    lookup(x, y, size, width, height) {
        return this.blocks.find(cell => (cell.x === x && cell.y === y && cell.size === size && cell.width === width && cell.height === height));
    }
    remove(id) {
        this.blocks = this.blocks.filter(entry => entry.id != id);
        return this.blocks;
    }
    remap() {
        this.blocks = [];
        let biggest;
        while ((biggest = this.findBiggest()) && !this.blocks.includes(biggest) && biggest.size > 0) {
            this.blocks.push(biggest);
        }
        this.blocks.forEach((block, i) => {
            block.id = i;
        });
        let i = 0;
        while (i < this.blocks.length) {
            const my = this.blocks[i];
            if ( /*my.size === 1 && my.width === 1 && my.height === 1*/ true) {
                let width = 1;
                for (let x = my.x + my.size; x <= this.width - my.size; x += my.size) {
                    const other = this.lookup(x, my.y, my.size, my.width, my.height);
                    if (!other) {
                        break;
                    }
                    this.remove(other.id);
                    width++;
                }
                my.width = width;
            }
            i++;
        }
        i = 0;
        while (i < this.blocks.length) {
            const my = this.blocks[i];
            if ( /*my.size === 1 && my.width === 1 && my.height === 1*/ true) {
                let height = 1;
                for (let y = my.y + my.size; y <= this.height - my.size; y += my.size) {
                    const other = this.lookup(my.x, y, my.size, my.width, my.height);
                    if (!other) {
                        break;
                    }
                    this.remove(other.id);
                    height++;
                }
                my.height = height;
            }
            i++;
        }
        return this.blocks;
    }
}
class MazeGenerator {
    constructor(options = {}) {
        if (options.erosionPattern == null) {
            options.erosionPattern = {
                amount: .5,
                getter: (i, max) => {
                    if (i > max * .6) {
                        return [Math.random() > .3 ? 2 : Math.random() > .5 ? 1 : 0, Math.random() > .1 ? 2 : (Math.random() * 2 | 0)];
                    } else {
                        return [+(Math.random() > .8), (Math.random() * 3 | 0)];
                    }
                }
            };
        } else {
            if (options.erosionPattern.amount == null) {
                options.erosionPattern.amount = .5;
            }
            if (options.erosionPattern.getter == null) {
                options.erosionPattern.getter = (i, max) => {
                    if (i > max * .5) {
                        return [(Math.random() * 3 | 0), 2];
                    } else {
                        return [(Math.random() * 2 | 0), (Math.random() * 2 | 0) * 2];
                    }
                };
            }
        }
        this.options = options;
        this.maze = options.mapString != null ? this.parseMapString(options.mapString) : JSON.parse(JSON.stringify(Array(options.width || 32).fill(Array(options.height || 32).fill(true))));
        const scale = room.width / this.width;
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                for (let loc of locsToAvoid) {
                    if (room.isIn(loc, {
                        x: (x * scale) + (scale * 0.5),
                        y: (y * scale) + (scale * 0.5)
                    })) {
                        this.maze[x][y] = false;
                    }
                }
            }
        }
        if (options.mapString == null) {
            this.clearRing(0);
            this.clearRing(5);
        }
        const max = this.maze.flat().length * options.erosionPattern.amount;
        for (let i = 0; i < max; i++) {
            this.randomErosion(...options.erosionPattern.getter(i, max));
        }
    }
    get width() {
        return this.maze.length;
    }
    get height() {
        return this.maze[0].length;
    }
    parseMapString(mapString) {
        const map = mapString.trim().split('\n').map(r => r.trim().split('').map(r => r === '#' ? 1 : r === '@'));
        return Array(map[0].length).fill().map((_, y) => Array(map.length).fill().map((_, x) => map[x][y]));
    }
    randomPosition(typeSearch) {
        let x = Math.floor(Math.random() * this.width),
            y = Math.floor(Math.random() * this.height);
        while (this.maze[x][y] != typeSearch) {
            x = Math.floor(Math.random() * this.width);
            y = Math.floor(Math.random() * this.height);
        }
        return [x, y];
    }
    clearRing(dist) {
        for (let i = dist; i < this.width - dist; i++) {
            this.maze[i][dist] = false;
            this.maze[i][this.height - 1 - dist] = false;
        }
        for (let i = dist; i < this.height - dist; i++) {
            this.maze[dist][i] = false;
            this.maze[this.width - 1 - dist][i] = false;
        }
    }
    randomErosion(side, corner) {
        for (let i = 0; i < 750; i++) {
            const [x, y] = this.randomPosition(false);
            if ((x === 0 || x === this.width - 1) && (y === 0 || y === this.height - 1)) {
                continue;
            }
            let dir = Math.random() * 4 | 0;
            if (x === 0) {
                dir = 0;
            } else if (y === 0) {
                dir = 1;
            } else if (x === this.width - 1) {
                dir = 2;
            } else if (y === this.height - 1) {
                dir = 3;
            }
            let tx = dir === 0 ? x + 1 : dir === 2 ? x - 1 : x,
                ty = dir === 1 ? y + 1 : dir === 3 ? y - 1 : y;
            if (this.test(tx, ty) !== true) {
                continue;
            }
            if (corner !== null) {
                let left = this.maze[dir === 2 || dir === 3 ? x - 1 : x + 1][dir === 0 || dir === 3 ? y - 1 : y + 1],
                    right = this.maze[dir === 1 || dir === 2 ? x - 1 : x + 1][dir === 2 || dir === 3 ? y - 1 : y + 1];
                if ((corner === true && (left || right)) || (corner === +left + +right)) {} else {
                    continue;
                }
            }
            if (side !== null) {
                let left = this.maze[dir === 3 ? x + 1 : dir === 1 ? x - 1 : x][dir === 0 ? y + 1 : dir === 2 ? y - 1 : y],
                    right = this.maze[dir === 1 ? x + 1 : dir === 3 ? x - 1 : x][dir === 2 ? y + 1 : dir === 0 ? y - 1 : y];
                if ((side === true && (left || right)) || (side === +left + +right)) {} else {
                    continue;
                }
            }
            this.maze[tx][ty] = false;
            return;
        }
    }
    test(x, y) {
        return this.maze[x][y];
    }
    toMapString() {
        let output = ``;
        for (let y = 0; y < this.height; y ++) {
            for (let x = 0; x < this.width; x ++) {
                output += this.maze[x][y] === 1 ? "#" : this.maze[x][y] ? "@" : "-";
            }
            output += "\n";
        }
        return output;
    }
}

class Pathfinder {
    constructor(maze) {
        this._ref = maze;
    }
    reset() {
        this.grid = this._ref.map(row => row.map(entry => !!entry ? "Obstacle" : "Empty"));
    }
    findPath(start, goal) {
        this.reset();
        this.grid[start.x][start.y] = "Start";
        this.grid[goal.x][goal.y] = "Goal";
        const queue = [{
            x: start.x,
            y: start.y,
            path: [],
            status: "Start"
        }];
        while (queue.length) {
            const location = queue.shift();
            for (let i = 0; i < 4; i++) {
                const newLocation = this.explore(location, ["North", "East", "South", "West"][i]);
                switch (newLocation.status) {
                    case "Goal":
                        return this.construct(newLocation.path, start);
                    case "Valid":
                        queue.push(newLocation);
                        break;
                }
            }
        }
        return this.construct(false, start);
    }
    construct(foundPath, position) {
        let path = [];
        if (foundPath === false) {
            return [[position.x, position.y]];
        }
        for (let dir of foundPath) {
            switch (dir) {
                case "North":
                    position.y --;
                    break;
                case "South":
                    position.y ++;
                    break;
                case "West":
                    position.x ++;
                    break;
                case "East":
                    position.x --;
                    break;
            }
            path.push([position.x, position.y]);
        }
        return path;
    }
    explore(location, direction) {
        const newPath = location.path.slice();
        newPath.push(direction);
        let { x, y } = location;
        switch (direction) {
            case "North":
                y --;
                break;
            case "East":
                x --;
                break;
            case "South":
                y ++;
                break;
            case "West":
                x ++;
                break;
            default:
                break;
        }
        const newLocation = {
            x: x,
            y: y,
            path: newPath,
            status: this.status({ x: x, y: y })
        };
        if (newLocation.status === "Valid") {
            this.grid[newLocation.x][newLocation.y] = "Visited";
        }
        return newLocation;
    }
    status(location) {
        switch (true) {
            case location.x < 0: case location.x >= this.grid.length: case location.y < 0: case location.y >= this.grid[0].length:
                return "Invalid";
            case this.grid[location.x][location.y] === "Goal":
                return "Goal";
            case this.grid[location.x][location.y] !== "Empty":
                return "Blocked";
            default:
                return "Valid";
        }
    }
}

function generateMaze(options) {
    const maze = new MazeGenerator(options);
    const remapper = new MazeRemap(maze.maze);
    const remapped = remapper.remap();
    global.mazeGridData = remapper._ref.map(r => r.map(e => !!e));
    const scale = room.width / maze.width;
    for (const placement of remapped) {
        const width = placement.width || 1;
        const height = placement.height || 1;
        let o = new Entity({
            x: placement.x * scale + (scale / 2 * placement.size * width),
            y: placement.y * scale + (scale / 2 * placement.size * height)
        });
        o.define(Class.mazeWall);
        o.SIZE = placement.size * scale / 2 + placement.size * 2;
        o.width = width - (width > 1 ? ((width - (width / 1.1)) * .1) : 0);
        o.height = height - (height > 1 ? ((height - (height / 1.1)) * .1) : 0);
        o.team = -101;
        o.alwaysActive = true;
        o.settings.canGoOutsideRoom = true;
        o.protect();
        o.life();
    }
    global.findPath = (function() {
        const finder = new Pathfinder(remapper._ref);
        function getIndexes(position) {
            return {
                x: Math.floor((position.x / room.width) * remapper._ref.length), 
                y: Math.floor((position.y / room.height) * remapper._ref[0].length)
            }
        }
        return function(start, goal) {
            if (!room.isInRoom(start) || !room.isInRoom(goal)) {
                return [];
            }
            start = getIndexes(start);
            goal = getIndexes(goal);
            if (start.x < 0 || start.x >= remapper._ref.length || start.y < 0 || start.y >= remapper._ref[0].length || goal.x < 0 || goal.x >= remapper._ref.length || goal.y < 0 || goal.y >= remapper._ref[0].length) {
                return [];
            }
            return finder.findPath(start, goal).map(entry => {
                return { // Top left corner of cell + cell half width
                    x: (entry[0] / remapper._ref.length * room.width) + ((room.width / remapper._ref.length) / 2),
                    y: (entry[1] / remapper._ref[0].length * room.height) + ((room.height / remapper._ref[0].length) / 2)
                }
            });
        }
    })();
    global.checkIfNearWalls = function(body) {
        for (let i = 0; i < remapper._ref.length; i ++) {
            for (let j = 0; j < remapper._ref[0].length; j ++) {
                if (remapper._ref[i][j] && util.getDistance(body, {
                    x: (i / remapper._ref.length * room.width) + ((room.width / remapper._ref.length) / 2),
                    y: (j / remapper._ref[0].length * room.height) + ((room.height / remapper._ref[0].length) / 2)
                }) < global.mazeCellSize.x * 1.5) {
                    return true;
                }
            }
        }
        return false;
    }
    global.mazeCellSize = {
        x: room.width / remapper._ref.length,
        y: room.height / remapper._ref[0].length
    };
}

module.exports = {
    generateMaze,
    MazeGenerator,
    MazeRemap,
    Pathfinder
};