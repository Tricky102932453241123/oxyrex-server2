/*jslint node: true */
/*jshint -W061 */
/*global goog, Map, let */
"use strict";
// General requires
require('google-closure-library');
goog.require('goog.structs.PriorityQueue');
goog.require('goog.structs.QuadTree');

class Room {
    constructor(config) {
        this.config = config;
        this.width = config.WIDTH;
        this.height = config.HEIGHT;
        this.setup = config.ROOM_SETUP;
        this.xgrid = this.setup[0].length;
        this.ygrid = this.setup.length;
        this.xgridWidth = this.width / this.xgrid;
        this.ygridHeight = this.height / this.ygrid;
        this.lastCycle = undefined;
        this.cycleSpeed = 1000 / roomSpeed / 30;
        this.gameMode = config.MODE;
        this.supportsRecords = ["ffa", "tdm", "d", "t", "m", "cc", "gp"].some(entry => entry === this.config.secondaryGameMode.split("_").pop());
		this.skillBoost = config.SKILL_BOOST;
        this.topPlayerID = -1;
        this.botAmount = this.config.FORCE_BOTS;
        this.cellTypes = (() => {
            const output = ["nest", "norm", "rock", "roid", "port", "wall", "door", "edge"];
            for (let i = 1; i <= 8; i++) {
                output.push("bas" + i);
                output.push("bap" + i);
            }
            for (let i = 0; i < this.ygrid; i ++) {
                for (let j = 0; j < this.xgrid; j ++) {
                    if (!output.includes(this.setup[i][j])) {
                        output.push(this.setup[i][j]);
                    }
                }
            }
            return output;
        })();
        for (let type of this.cellTypes) {
            this.findType(type);
        }
        this.maxFood = this.width * this.height / 100000 * config.FOOD_AMOUNT;
        this.nestFoodAmount = 7.5 * Math.sqrt(this.nest.length) / this.xgrid / this.ygrid;
        this.partyHash = Number(((Math.random() * 1000 | 0) + 1000).toString().replace("0.", ""));
        this.blackHoles = [];
        this.scale = {
            square: this.width * this.height / 100000000,
            linear: Math.sqrt(c.WIDTH * c.HEIGHT / 100000000)
        };
    }
    isInRoom(location) {
        if (this.config.ARENA_TYPE === "cirlce")  {
            const x = (this.width / 2) - location.x;
            const y = (this.height / 2) - location.y;
            return Math.sqrt(x ** x + y ** y) < this.width / 2;
        }
        return location.x >= 0 && location.x <= this.width && location.y >= 0 && location.y <= this.height;
    }
    findType(type) {
        const output = [];
        for (let i = 0; i < this.setup.length; i ++) {
            for (let j = 0; j < this.setup[i].length; j ++) {
                if (this.setup[i][j] === type) {
                    output.push({
                        x: (j + 0.5) * this.width / this.xgrid,
                        y: (i + 0.5) * this.height / this.ygrid,
                        id: j * this.xgrid + i
                    });
                }
            }
        }
        this[type] = output;
    }
    setType(type, location) {
        if (!this.isInRoom(location)) {
            return false;
        }
        const a = ((location.y * this.ygrid) / this.height) | 0;
        const b = ((location.x * this.xgrid) / this.width) | 0;
        const oldType = this.setup[a][b];
        this.setup[a][b] = type;
        this.findType(type);
        this.findType(oldType);
        sockets.broadcastRoom();
    }
    random() {
        if (this.config.ARENA_TYPE === "circle") {
            const dist = ran.irandom(this.width / 2.667);
            const angle = Math.random() * Math.PI * 2;
            return {
                x: (this.width / 2) + Math.cos(angle) * dist,
                y: (this.height / 2) + Math.sin(angle) * dist
            }
        }
        return {
            x: ran.irandom(this.width),
            y: ran.irandom(this.height)
        }
    }
    near(position, radius) {
        return {
            x: position.x + ((Math.random() * (radius * 2) | 0) - radius),
            y: position.y + ((Math.random() * (radius * 2) | 0) - radius)
        }
    }
    randomType(type) {
        if (!this[type] || !this[type].length) {
            return this.random();
        }
        const selection = this[type][Math.random() * this[type].length | 0];
        if (this.config.ARENA_TYPE === "circle") {
            const dist = ran.irandom(.5 * this.width / this.xgrid);
            const angle = Math.random() * Math.PI * 2;
            return {
                x: selection.x + Math.cos(angle) * dist,
                y: selection.y + Math.sin(angle) * dist
            }
        }
        return {
            x: ran.irandom(this.width / this.xgrid) + selection.x - (.5 * this.width / this.xgrid),
            y: ran.irandom(this.height / this.ygrid) + selection.y - (.5 * this.width / this.xgrid),
        }
    }
    isIn(type, location) {
        if (!this.isInRoom(location)) {
            return false;
        }
        const a = (location.y * this.ygrid / this.height) | 0;
        const b = (location.x * this.xgrid / this.width) | 0;
        if (!this.setup[a] || !this.setup[a][b]) {
            return false;
        }
        if (this.config.ARENA_TYPE === "circle") {
            const me = this.isAt(location);
            return (Math.sqrt((location.x - me.x) ** 2 + (location.y - me.y) ** 2) < (this.xgridWidth / 2)) && type === this.setup[a][b];
        }
        return type === this.setup[a][b];
    }
    isAt(location) {
        if (!this.isInRoom(location)) {
            return false;
        }
        const x = (location.x * this.xgrid / this.width) | 0;
        const y = (location.y * this.ygrid / this.height) | 0;
        return {
            x: (x + .5) / this.xgrid * this.width,
            y: (y + .5) / this.ygrid * this.height,
            id: x * this.xgrid + y
        }
    }
    isInNorm(location) {
        if (!this.isInRoom(location)) {
            return false;
        }
        const a = (location.y * this.ygrid / this.height) | 0;
        const b = (location.x * this.xgrid / this.width) | 0;
        if (!this.setup[a] || !this.setup[a][b]) {
            return false;
        }
        const v = this.setup[a][b];
        return v !== 'norm' && v !== 'roid' && v !== 'rock' && v !== 'wall' && v !== 'edge';
    }
    gauss(clustering) {
        let output,
            i = 5;
        do {
            output = {
                x: ran.gauss(this.width / 2, this.height / clustering),
                y: ran.gauss(this.width / 2, this.height / clustering),
            };
            i --;
        } while (!this.isInRoom(output) && i > 0);
        return output;
    }
    gaussInverse(clustering) {
        let output,
            i = 5;
        do {
            output = {
                x: ran.gaussInverse(0, this.width, clustering),
                y: ran.gaussInverse(0, this.height, clustering),
            };
            i --;
        } while (!this.isInRoom(output), i > 0);
        return output;
    }
    gaussRing(radius, clustering) {
        let output,
            i = 5;
        do {
            output = ran.gaussRing(this.width * radius, clustering);
            output = {
                x: output.x + this.width / 2,
                y: output.y + this.height / 2,
            };
            i --;
        } while (!this.isInRoom(output) && i > 0);
        return output;
    }
    gaussType(type, clustering) {
        if (!this[type] || !this[type].length) {
            return this.random();
        }
        const selection = this[type][Math.random() * this[type].length | 0];
        let location = {},
            i = 5;
        do {
            location = {
                x: ran.gauss(selection.x, this.width / this.xgrid / clustering),
                y: ran.gauss(selection.y, this.height / this.ygrid / clustering),
            };
            i --;
        } while (!this.isIn(type, location) && i > 0);
        return location;
    }
    resize(width, height, resetObstacles = true) {
        this.width = width;
        this.height = height;
        for (let type of this.cellTypes) {
            this[type] = [];
            this.findType(type);
        }
        sockets.broadcastRoom();
        if (resetObstacles) {
            this.regenerateObstacles();
        }
    }
    regenerateObstacles() {
        entities.forEach(entity => entity.type === "wall" && entity.kill());
        if (this.config.MAZE && typeof this.config.MAZE !== "boolean") {
            generateMaze(c.MAZE);
        } else {
            placeRoids();
        }
    }
}
module.exports = {
    room: new Room(c),
    roomSpeed
};
