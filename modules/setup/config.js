/*jslint node: true */
/*jshint -W061 */
/*global goog, Map, let */
"use strict";
// General requires
require('google-closure-library');
goog.require('goog.structs.PriorityQueue');
goog.require('goog.structs.QuadTree');
const defaults = require("../../config.json");
if (global.fingerPrint.digitalOcean) {
    defaults.maxPlayers = 30;
}

function getBaseShuffling(teams, max = 5) {
    const output = [];
    for (let i = 1; i < max; i++) {
        output.push(i > teams ? 0 : i);
    }
    return output.sort(function() {
        return .5 - Math.random();
    });
}

function id(i, level = true, norm = false) {
    if (i && !norm) {
        return !!level ? `bas${i}` : `bap${i}`;
    } else {
        const list = ["rock", "rock", "roid"];
        return list[Math.floor(Math.random() * list.length)];
    }
}

function oddify(number, multiplier = 1) {
    return number + ((number % 2) * multiplier);
}

function setup(options = {}) {
    if (options.width == null) options.width = defaults.X_GRID;
    if (options.height == null) options.height = defaults.Y_GRID;
    if (options.nestWidth == null) options.nestWidth = Math.floor(options.width / 4) + (options.width % 2 === 0) - (1 + (options.width % 2 === 0));
    if (options.nestHeight == null) options.nestHeight = Math.floor(options.height / 4) + (options.height % 2 === 0) - (1 + (options.width % 2 === 0));
    if (options.rockScatter == null) options.rockScatter = .175;
    options.rockScatter = 1 - options.rockScatter;
    const output = [];
    const nest = {
        sx: oddify(Math.floor(options.width / 2 - options.nestWidth / 2), -1 * ((options.width % 2 === 0) && Math.floor(options.width / 2) % 2 === 1)),
        sy: oddify(Math.floor(options.height / 2 - options.nestHeight / 2), -1 * ((options.height % 2 === 0) && Math.floor(options.height / 2) % 2 === 1)),
        ex: Math.floor(options.width / 2 - options.nestWidth / 2) + options.nestWidth,
        ey: Math.floor(options.height / 2 - options.nestHeight / 2) + options.nestHeight
    };

    function testIsNest(x, y) {
        if (x >= nest.sx && x <= nest.ex) {
            if (y >= nest.sy && y <= nest.ey) {
                return true;
            }
        }
        return false;
    }
    for (let i = 0; i < options.height; i++) {
        const row = [];
        for (let j = 0; j < options.width; j++) {
            row.push(testIsNest(j, i) ? "nest" : Math.random() > options.rockScatter ? Math.random() > .5 ? "roid" : "rock" : "norm");
        }
        output.push(row);
    }
    return output;
}

const gamemodes = {
    "FFA": (function() {
        const portals = Math.random() > .75 ? Math.round(Math.random() + 1) : 0;
        const xGrid = [16, 20, 20][portals];
        const yGrid = [16, 9, 20][portals];
        return {
            RANDOM_COLORS: Math.random() > .75,
            WIDTH: [6500, 8000, 8000][portals],
            HEIGHT: [6500, 3600, 8000][portals],
            ALLOW_MAZE: {
                width: xGrid * 2,
                height: yGrid * 2
            },
            ROOM_SETUP: (function() {
                const output = setup({
                    width: xGrid,
                    height: yGrid,
                    nestWidth: portals > 0 ? 0 : null,
                    nestHeight: portals > 0 ? 0 : null
                });
                function placeNestThing(x, y) {
                    output[y][x] = "port";
                    output[y - 1][x] = output[y + 1][x] = output[y][x - 1] = output[y][x + 1] = output[y - 1][x + 1] = output[y + 1][x + 1] = output[y - 1][x - 1] = output[y + 1][x - 1] = "nest";
                }
                switch(portals) {
                    case 1: {
                        for (let i = 0; i < output.length; i ++) {
                            output[i][9] = output[i][10] = "edge";
                        }
                        placeNestThing(4, 4);
                        placeNestThing(20 - 5, 4);
                    } break;
                    case 2: {
                        for (let i = 0; i < output.length; i ++) {
                            output[i][9] = output[i][10] = "edge";
                            output[9][i] = output[10][i] = "edge";
                        }
                        placeNestThing(4, 4);
                        placeNestThing(20 - 5, 4);
                        placeNestThing(4, 20 - 5);
                        placeNestThing(20 - 5, 20 - 5);
                    } break;
                }
                return output;
            })(),
            secondaryGameMode: "ffa",
            DIVIDER_LEFT: portals ? 3600 : null,
            DIVIDER_RIGHT: portals ? 4400 : null,
            DIVIDER_TOP: portals === 2 ? 3600 : null,
            DIVIDER_BOTTOM: portals === 2 ? 4400 : null,
        }
    })(),
    "TDM": (function() {
        const portals = Math.random() > .75 ? Math.round(Math.random() + 1) : 0;
        const teams = (Math.random() * 3 | 0) + 2;
        let xGrid = [16, 20, 20][portals],
            yGrid = [16, 9, 20][portals];
        return {
            MODE: "tdm",
            TEAMS: teams,
            WIDTH: [6500, 8000, 8000][portals],
            HEIGHT: [6500, 3600, 8000][portals],
            ALLOW_MAZE: {
                width: xGrid * 2,
                height: yGrid * 2
            },
            ROOM_SETUP: (function() {
                const output = setup({
                    width: xGrid,
                    height: yGrid,
                    nestWidth: portals > 0 ? 0 : null,
                    nestHeight: portals > 0 ? 0 : null
                });
                xGrid --;
                yGrid --;
                function placeNestThing(x, y) {
                    output[y][x] = "port";
                    output[y - 1][x] = output[y + 1][x] = output[y][x - 1] = output[y][x + 1] = output[y - 1][x + 1] = output[y + 1][x + 1] = output[y - 1][x - 1] = output[y + 1][x - 1] = "nest";
                }
                switch(portals) {
                    case 1: {
                        for (let i = 0; i < output.length; i ++) {
                            output[i][9] = output[i][10] = "edge";
                        }
                        placeNestThing(4, 4);
                        placeNestThing(xGrid - 4, 4);
                    } break;
                    case 2: {
                        for (let i = 0; i < output.length; i ++) {
                            output[i][9] = output[i][10] = "edge";
                            output[9][i] = output[10][i] = "edge";
                        }
                        placeNestThing(4, 4);
                        placeNestThing(xGrid - 4, 4);
                        placeNestThing(4, yGrid - 4);
                        placeNestThing(xGrid - 4, yGrid - 4);
                    } break;
                }
                const mapType = +(Math.random() > .25);
                const bases = getBaseShuffling(teams);
                switch (mapType) {
                    case 0: {
                        output.isOpen = true;
                    } break;
                    case 1: {
                        output[0][0] = id(bases[0], 0);
                        output[0][1] = output[1][0] = id(bases[0], 1);
                        output[0][xGrid] = id(bases[1], 0);
                        output[0][xGrid - 1] = output[1][xGrid] = id(bases[1], 1);
                        output[yGrid][xGrid] = id(bases[2], 0);
                        output[yGrid][xGrid - 1] = output[yGrid - 1][xGrid] = id(bases[2], 1);
                        output[yGrid][0] = id(bases[3], 0);
                        output[yGrid][1] = output[yGrid - 1][0] = id(bases[3], 1);
                    } break;
                }
                return output;
            })(),
            secondaryGameMode: "tdm",
            DIVIDER_LEFT: portals ? 3600 : null,
            DIVIDER_RIGHT: portals ? 4400 : null,
            DIVIDER_TOP: portals === 2 ? 3600 : null,
            DIVIDER_BOTTOM: portals === 2 ? 4400 : null,
        }
    })()/*(function() {
        const teams = (Math.random() * 3 | 0) + 2;
        let width = 16,
            height = 16;
        return {
            MODE: "tdm",
            TEAMS: teams,
            X_GRID: width,
            Y_GRID: height,
            ALLOW_MAZE: {},
            ROOM_SETUP: (function() {
                const output = setup({
                    width: width,
                    height: height
                });
                const mapType = +(Math.random() > .25);
                const bases = getBaseShuffling(teams);
                width--;
                height--;
                switch (mapType) {
                    case 0: {
                        output.isOpen = true;
                    }
                    break;
                case 1: {
                    output[0][0] = id(bases[0], 0);
                    output[0][1] = output[1][0] = id(bases[0], 1);
                    output[0][width] = id(bases[1], 0);
                    output[0][width - 1] = output[1][width] = id(bases[1], 1);
                    output[height][width] = id(bases[2], 0);
                    output[height][width - 1] = output[height - 1][width] = id(bases[2], 1);
                    output[height][0] = id(bases[3], 0);
                    output[height][1] = output[height - 1][0] = id(bases[3], 1);
                }
                break;
                }
                return output;
            })(),
            secondaryGameMode: "tdm"
        };
    })()*/,
    "Kill Race": {
        MODE: "tdm",
        TEAMS: 2 + (Math.random() * 7 | 0),
        ROOM_SETUP: setup(),
        KILL_RACE: true,
        ALLOW_MAZE: {},
        secondaryGameMode: "kr"
    },
    "Hide and Seek": {
        MODE: "tdm",
        TEAMS: 2,
        WIDTH: 7500,
        HEIGHT: 7500,
        MAZE: {},
        X_GRID: 16,
        Y_GRID: 16,
        ROOM_SETUP: setup({
            width: 16,
            height: 16,
            rockScatter: 0
        }),
        HIDE_AND_SEEK: true,
        secondaryGameMode: "hs"
    },
    "Soccer": {
        MODE: "tdm",
        TEAMS: 2,
        SOCCER: true,
        WIDTH: 6500,
        HEIGHT: 6500 * .75,
        X_GRID: 12,
        Y_GRID: 9,
        ROOM_SETUP: [
            ["norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm"],
            ["norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm"],
            ["norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm"],
            ["bas1", "norm", "norm", "norm", "norm", "nest", "nest", "norm", "norm", "norm", "norm", "bas2"],
            ["bas1", "norm", "norm", "norm", "norm", "nest", "nest", "norm", "norm", "norm", "norm", "bas2"],
            ["bas1", "norm", "norm", "norm", "norm", "nest", "nest", "norm", "norm", "norm", "norm", "bas2"],
            ["norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm"],
            ["norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm"],
            ["norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm"]
        ],
        secondaryGameMode: "sc"
    },
    "Survival": {
        SURVIVAL: true,
        BOTS: -1,
        ROOM_SETUP: setup({
            rockScatter: .3
        }),
    },
    "Mothership": {
        MODE: "tdm",
        TEAMS: (Math.random() * 7 | 0) + 2,
        ROOM_SETUP: setup(),
        MOTHERSHIP_LOOP: true,
        /*ALLOW_MAZE: {
            mapString: `
                --------------------------------
                -@@@@@@@@@@@@@##-#@@@@@@@@@@@@@-
                -@#####@@@@@@@#--#@@@@@@@#####@-
                -@#---#@@@@@@@#-##@@@@@@@#---#@-
                -@#----#@@@@@@#--#@@@@@@#----#@-
                -@#-----#@@@@@##-#@@@@@#-----#@-
                -@##-----#@@@@#--#@@@@#-----##@-
                -@@@#-----#@@@#-##@@@#-----#@@@-
                -@@@@#-----#@@#--#@@#-----#@@@@-
                -@@@@@#-----#@----@#-----#@@@@@-
                -@@@@@@#-----#-##-#-----#@@@@@@-
                -@@@@@@@#--------------#@@@@@@@-
                -@@@@@@@@#------------#@@@@@@@@-
                -@@@@@@@@@#----------#@@@@@@@@@-
                -########--------------########-
                ---#---#--#----------#----#---#-
                -#---#----#----------#--#---#---
                -########--------------########-
                -@@@@@@@@@#----------#@@@@@@@@@-
                -@@@@@@@@#------------#@@@@@@@@-
                -@@@@@@@#--------------#@@@@@@@-
                -@@@@@@#-----#-##-#-----#@@@@@@-
                -@@@@@#-----#@----@#-----#@@@@@-
                -@@@@#-----#@@#--#@@#-----#@@@@-
                -@@@#-----#@@@##-#@@@#-----#@@@-
                -@##-----#@@@@#--#@@@@#-----##@-
                -@#-----#@@@@@#-##@@@@@#-----#@-
                -@#----#@@@@@@#--#@@@@@@#----#@-
                -@#---#@@@@@@@##-#@@@@@@@#---#@-
                -@#####@@@@@@@#--#@@@@@@@#####@-
                -@@@@@@@@@@@@@#-##@@@@@@@@@@@@@-
                --------------------------------
            `      
        },*/
        secondaryGameMode: "m"
    },
    "Tag": {
        MODE: "tdm",
        TEAMS: (Math.random() * 7 | 0) + 2,
        ROOM_SETUP: setup(),
        TAG: true,
        ALLOW_MAZE: {},
        secondaryGameMode: "t"
    },
    "Domination": (function() {
        const teams = (Math.random() * 3 | 0) + 2;
        let width = 13,
            height = 13;
        return {
            MODE: "tdm",
            TEAMS: teams,
            X_GRID: width,
            Y_GRID: height,
            ALLOW_MAZE: {
                width: 26,
                height: 26
            },
            ROOM_SETUP: (function() {
                const output = setup({
                    width: width,
                    height: height
                });
                const mapType = Math.round(Math.random()); // + width % 2; // For alt map type
                const bases = getBaseShuffling(teams);
                width--;
                height--;
                const majorWidth = Math.floor(width / 2);
                const minorWidth = Math.floor(width / 6);
                const majorHeight = Math.floor(height / 2);
                const minorHeight = Math.floor(height / 6);
                switch (mapType) {
                    case 0: {
                        if (Math.random() > .5) {
                            output[majorHeight / 2 | 0][majorWidth / 2 | 0] = "dom0";
                            output[height - (majorHeight / 2 | 0)][majorWidth / 2 | 0] = "dom0";
                            output[height - (majorHeight / 2 | 0)][width - (majorWidth / 2 | 0)] = "dom0";
                            output[majorHeight / 2 | 0][width - (majorWidth / 2 | 0)] = "dom0";
                        } else {
                            output[minorHeight][majorWidth] = "dom0";
                            output[height - minorHeight][majorWidth] = "dom0";
                            output[majorHeight][minorWidth] = "dom0";
                            output[majorHeight][width - minorWidth] = "dom0";
                        }
                        if ((width + 1) % 2) {
                            output[majorHeight][majorWidth] = "dom0";
                        }
                        output.isOpen = true;
                    }
                    break;
                    case 1: {
                        output[0][0] = id(bases[0], 0);
                        output[0][1] = output[1][0] = id(bases[0], 1);
                        output[0][width] = id(bases[1], 0);
                        output[0][width - 1] = output[1][width] = id(bases[1], 1);
                        output[height][width] = id(bases[2], 0);
                        output[height][width - 1] = output[height - 1][width] = id(bases[2], 1);
                        output[height][0] = id(bases[3], 0);
                        output[height][1] = output[height - 1][0] = id(bases[3], 1);
                        if (Math.random() > .5) {
                            output[majorHeight / 2 | 0][majorWidth / 2 | 0] = "dom0";
                            output[height - (majorHeight / 2 | 0)][majorWidth / 2 | 0] = "dom0";
                            output[height - (majorHeight / 2 | 0)][width - (majorWidth / 2 | 0)] = "dom0";
                            output[majorHeight / 2 | 0][width - (majorWidth / 2 | 0)] = "dom0";
                        } else {
                            output[minorHeight][majorWidth] = "dom0";
                            output[height - minorHeight][majorWidth] = "dom0";
                            output[majorHeight][minorWidth] = "dom0";
                            output[majorHeight][width - minorWidth] = "dom0";
                        }
                        output[majorHeight][majorWidth] = "dom0";
                    }
                    break;
                } 
                return output;
            })(),
            DOMINATOR_LOOP: true,
            secondaryGameMode: "d"
        };
    })(),
    "Space": {
        MODE: "tdm",
        TEAMS: 4,
        SPACE_PHYSICS: true,
        SPACE_MODE: true,
        ARENA_TYPE: "circle",
        ROOM_SETUP: [
            ["norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm"],
            ["norm", "norm", "norm", "norm", "norm", "norm", "norm", "roid", "norm", "norm", "norm", "norm", "norm", "norm", "norm"],
            ["norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm"],
            ["norm", "norm", "norm", "bap1", "norm", "roid", "norm", "nest", "norm", "roid", "norm", "nest", "norm", "norm", "norm"],
            ["norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm"],
            ["norm", "norm", "norm", "roid", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "roid", "norm", "norm", "norm"],
            ["norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm"],
            ["norm", "roid", "norm", "nest", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "nest", "norm", "roid", "norm"],
            ["norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm"],
            ["norm", "norm", "norm", "roid", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "roid", "norm", "norm", "norm"],
            ["norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm"],
            ["norm", "norm", "norm", "nest", "norm", "roid", "norm", "nest", "norm", "roid", "norm", "bap2", "norm", "norm", "norm"],
            ["norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm"],
            ["norm", "norm", "norm", "norm", "norm", "norm", "norm", "roid", "norm", "norm", "norm", "norm", "norm", "norm", "norm"],
            ["norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm"],
        ],
        secondaryGameMode: "sp"
    },
    "Boss Rush": {
        MODE: "tdm",
        TEAMS: 1,
        SPECIAL_BOSS_SPAWNS: true,
        WIDTH: 5500,
        HEIGHT: 5500,
        X_GRID: 16,
        Y_GRID: 16,
        MAZE: {
            mapString: `
            --------------------------------
            --------------------------------
            --@@@@@@@@@@@@@@@@@@@@@@@@@@@@--
            --@@@@@@@@@@@@@@@@@@@@@@@@@@@@--
            --@@########################@@--
            --@@#@@@@@@@@@@@@@@@@@@@@@@#@@--
            --@@#@@@@@@@@@@@@@@@@@@@@@@#@@--
            --@@#@@@@@@----------@@@@@@#@@--
            --@@#@@@@@@----------@@@@@@#@@--
            --@@#@@@@@------------@@@@@#@@--
            --@@#@@@@--------------@@@@#@@--
            --@@#@@@----------------@@@#@@--
            --@@#@@------------------@@#@@--
            --@@#@@------------------@@#@@--
            --@@#@@------------------@@#@@--
            --@@#@@------------------@@#@@--
            --@@#@@------------------@@#@@--
            --@@#@@------------------@@#@@--
            --@@#@@------------------@@#@@--
            --@@#@@------------------@@#@@--
            --@@#@@------------------@@#@@--
            --@@#@@------------------@@#@@--
            --@@#@@------------------@@#@@--
            --@@#@@------------------@@#@@--
            --@@#@@------------------@@#@@--
            --@@#@@@@@@@@@@@@@@@@@@@@@@#@@--
            --@@#@@@@@@@@@@@@@@@@@@@@@@#@@--
            --@@########################@@--
            --@@@@@@@@@@@@@@@@@@@@@@@@@@@@--
            --@@@@@@@@@@@@@@@@@@@@@@@@@@@@--
            --------------------------------
            --------------------------------
            `
        },
        ROOM_SETUP: [
            ["outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb"],
            ["outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb"],
            ["outb", "outb", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "outb", "outb"],
            ["outb", "outb", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "outb", "outb"],
            ["outb", "outb", "norm", "norm", "norm", "bas1", "nest", "nest", "nest", "nest", "bas1", "norm", "norm", "norm", "outb", "outb"],
            ["outb", "outb", "norm", "norm", "norm", "nest", "nest", "nest", "nest", "nest", "nest", "norm", "norm", "norm", "outb", "outb"],
            ["outb", "outb", "norm", "norm", "norm", "nest", "nest", "nest", "nest", "nest", "nest", "norm", "norm", "norm", "outb", "outb"],
            ["outb", "outb", "norm", "norm", "norm", "bas1", "nest", "nest", "nest", "nest", "bas1", "norm", "norm", "norm", "outb", "outb"],
            ["outb", "outb", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "outb", "outb"],
            ["outb", "outb", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "outb", "outb"],
            ["outb", "outb", "norm", "norm", "boss", "boss", "boss", "boss", "boss", "boss", "boss", "boss", "norm", "norm", "outb", "outb"],
            ["outb", "outb", "norm", "norm", "boss", "boss", "boss", "boss", "boss", "boss", "boss", "boss", "norm", "norm", "outb", "outb"],
            ["outb", "outb", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "outb", "outb"],
            ["outb", "outb", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "outb", "outb"],
            ["outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb"],
            ["outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb"]
        ],
        secondaryGameMode: "br",
        DO_BASE_DAMAGE: false,
        FOOD_AMOUNT: .3
    },
    "Center Control": {
        MODE: "tdm",
        TEAMS: 2,
        WIDTH: 5000,
        HEIGHT: 5000,
        X_GRID: 7,
        Y_GRID: 7,
        ROOM_SETUP: [
            ["norm", "norm", "roid", "norm", "roid", "norm", "norm"],
            ["norm", "rock", "norm", "rock", "norm", "rock", "norm"],
            ["roid", "norm", "nest", "nest", "nest", "norm", "roid"],
            ["norm", "rock", "nest", "dom0", "nest", "rock", "norm"],
            ["roid", "norm", "nest", "nest", "nest", "norm", "roid"],
            ["norm", "rock", "norm", "rock", "norm", "rock", "norm"],
            ["norm", "norm", "roid", "norm", "roid", "norm", "norm"],
        ],
        EPICENTER: true,
        secondaryGameMode: "cc"
    },
    "Naval Battle": {
        NAVAL_SHIPS: true,
        WIDTH: 7500,
        HEIGHT: 7500,
        FOOD_AMOUNT: 0,
        MODE: "tdm",
        TEAMS: 2,
        secondaryGameMode: "nb"
    },
    "Trench Battle": {
        MODE: "tdm",
        TEAMS: 2,
        WIDTH: 5500,
        HEIGHT: 5500,
        X_GRID: 16,
        Y_GRID: 16,
        MAZE: {
            mapString: `
            --------------------------------
            -@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@-
            -@############################@-
            -@############################@-
            -@##------------------------##@-
            -@##------------------------##@-
            -@##@@@@@@@@@@@@@@@@@@@@@@@@##@-
            -@#@@@@@@@@@@@@@@@@@@@@@@@@@@#@-
            -@#@@@@@@@@@@@@@@@@@@@@@@@@@@#@-
            -@#@@@@@@@@@@@@@@@@@@@@@@@@@@#@-
            -@#@@@@@@@@@@@@@@@@@@@@@@@@@@#@-
            -@#@@@@@@@@@@@@@@@@@@@@@@@@@@#@-
            -@#@@@@@@@@@@@@@@@@@@@@@@@@@@#@-
            -@#@@@@@@@@@@@@@@@@@@@@@@@@@@#@-
            -@#@-@@@@@@@@@@@@@@@@@@@@@@-@#@-
            -@#@-@@@@@@@@@@@@@@@@@@@@@@-@#@-
            -@#@-@@@@@@@@@@@@@@@@@@@@@@-@#@-
            -@#@-@@@@@@@@@@@@@@@@@@@@@@-@#@-
            -@#@-@@@@@@@@@@@@@@@@@@@@@@-@#@-
            -@#@@@@@##@@@@@@@@@@@@##@@@@@#@-
            -@#@@@--@@#@@@@@@@@@@#@@--@@@#@-
            -@#@@@-@@@#@@@@@@@@@@#@@@-@@@#@-
            -@#----@##@@@@@@@@@@@@##@----#@-
            -@#-@@@@@@@@@@@@@@@@@@@@@@@@-#@-
            -@#-@@@@@@@@--------@@@@@@@@-#@-
            -@#-@@@@@@@@-@@@@@@-@@@@@@@@-#@-
            -@#-@@@@-----@@@@@@-----@@@@-#@-
            -@#@@@@@@@@@@@@@@@@@@@@@@@@@@#@-
            -@############################@-
            -@############################@-
            -@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@-
            --------------------------------
            `,
            erosionPattern: {
                amount: .4,
                getter: (i, max) => {
                    if (i > max * .4) {
                        return [Math.random() > .4 ? 2 : Math.random() > .5 ? 1 : 0, Math.random() > .1 ? 2 : (Math.random() * 2 | 0)];
                    } else {
                        return [+(Math.random() > .5), (Math.random() * 3 | 0)];
                    }
                }
            }
        },
        ROOM_SETUP: [
            ["outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb"],
            ["outb", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "outb"],
            ["outb", "norm", "bas1", "bas1", "bas1", "bas1", "bas1", "bas1", "bas1", "bas1", "bas1", "bas1", "bas1", "bas1", "norm", "outb"],
            ["outb", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "outb"],
            ["outb", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "outb"],
            ["outb", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "outb"],
            ["outb", "norm", "port", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "port", "norm", "outb"],
            ["outb", "norm", "norm", "norm", "norm", "norm", "norm", "nest", "nest", "norm", "norm", "norm", "norm", "norm", "norm", "outb"],
            ["outb", "norm", "norm", "norm", "norm", "norm", "norm", "nest", "nest", "norm", "norm", "norm", "norm", "norm", "norm", "outb"],
            ["outb", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "outb"],
            ["outb", "norm", "norm", "norm", "bas2", "norm", "norm", "norm", "norm", "norm", "norm", "bas2", "norm", "norm", "norm", "outb"],
            ["outb", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "outb"],
            ["outb", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "outb"],
            ["outb", "norm", "bas2", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "bas2", "norm", "outb"],
            ["outb", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "outb"],
            ["outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb", "outb"]
        ],
        secondaryGameMode: "tb",
        DO_BASE_DAMAGE: false,
        TRENCH_WARFARE: true
    },
    "Escort": {
        MODE: "tdm",
        TEAMS: 1,
        WIDTH: 24000,
        HEIGHT: 3750,
        ROOM_SETUP: (function() {
            const output = setup({
                width: 64,
                height: 10,
                rockScatter: 0
            });
            output[output.length - 3][output[0].length - 3] = output[3][output[0].length - 3] = "goal";
            return output;
        })(),
        MAZE: {
            mapString: `
            ------@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
            ------@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
            ------@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@-----@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@-@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
            ------@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@-@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
            ------@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@-@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
            -----------------------------------------@@@@@@@#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@------------------@@@@@@@@@@@@@
            @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@-@@@@@@@#@@@@@@@@@@@--------------------@@@@@@@@@@@@@@@@@-@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
            @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@-@@@@@@@#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@-@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
            @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@-@@@@@@@#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@-@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
            @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@-@@@@@@@#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@-@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
            @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@-@@@@@@@#@@@@@@@@@@@@@@@@@@###############@@@@@@@@@@@@@@@-@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
            @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@-----------------------------------------#@@@@@@@@@@@@@@@-@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
            @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@-#@@@@@@@@@@@@@@@-@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
            @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@-#@@@@@@@@@@@@@@@-@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
            @@@@---------------------------@@@@@@@@@@@@@@@@@#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@-#@@@@@@@@@@@@@@@------------------@@@@@@@@@@@@@
            @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@-################-@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
            @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@---------------@@@@@@@@@@@@@@@@@@@@------------------@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
            @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
            @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
            @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
            `,
            erosionPattern: {
                amount: .575,
                getter: (i, max) => {
                    if (i > max * .6) {
                        return [Math.random() > .4 ? 2 : Math.random() > .5 ? 1 : 0, Math.random() > .1 ? 2 : (Math.random() * 2 | 0)];
                    } else {
                        return [+(Math.random() > .5), (Math.random() * 3 | 0)];
                    }
                }
            }
        },
        secondaryGameMode: "es",
        ESCORT: true
    },
    "Infection": {
        MODE: "tdm",
        TEAMS: 1,
        WIDTH: 3500,
        HEIGHT: 3500,
        X_GRID: 75,
        Y_GRID: 75,
        INFECTION_LOOP: true,
        ROOM_SETUP: (() => {
            let output = [];
            for (let i = 0; i < 75; i++) {
                let row = [];
                for (let j = 0; j < 75; j++) {
                    row.push("norm");
                }
                output.push(row);
            }
            for (let i = 0; i < 10; i++) {
                output[Math.random() * 75 | 0][Math.random() * 75 | 0] = "nest";
            }
            return output
        })(),
        secondaryGameMode: "if"
    },
    "Sandbox": {
        WIDTH: 3500,
        HEIGHT: 3500,
        X_GRID: 3,
        Y_GRID: 3,
        ROOM_SETUP: [
            ["norm", "norm", "norm"],
            ["norm", "nest", "norm"],
            ["norm", "norm", "norm"]
        ],
        SANDBOX: true,
        secondaryGameMode: "sb"
    },
    "Duos": {
        GROUPS: 2,
        secondaryGameMode: "gp",
        ALLOW_MAZE: {}
    },
    "Trios": {
        GROUPS: 3,
        secondaryGameMode: "gp",
        ALLOW_MAZE: {}
    },
    "Closed Beta": {
        BETA: 1,
        maxPlayers: 40,
        ROOM_SETUP: (function() {
            const output = setup({
                width: 32,
                height: 32,
                rockScatter: .15
            });
            for (let i = 0; i < 8; i ++) {
                output[6 + i][6] = output[6][6 + i] = output[13 - i][13] = output[13][13 - i] = "wall";
            }
            output[9][13] = "door";
            return output;
        })(),
        secondaryGameMode: global.fingerPrint.localhost ? "ffa" : "cb"
    }
};

const choiceTable = {
    // Normal Mode servers
    "FFA": 10,
    "TDM": 7,
    "Trios": 4,
    "Duos": 4,
    // Event Mode Servers
    "Domination": 7,
    "Mothership": 6,
    "Center Control": 5,
    "Tag": 6,
    "Kill Race": 6,
    "Soccer": 4,
    "Survival": 4,
    // Cool mode servers
    "Boss Rush": 8,
    "Naval Battle": 6,
    "Sandbox": 1,
    "Trench Battle": 8,
    "Escort": 6,
    // XYZ and C
    "Closed Beta": 1 
};

const serverTable = {
    "oa": ["FFA", "TDM", "Trios"],
    "ob": ["Domination", "Mothership", "Kill Race", "Soccer"],
    "ha": ["FFA", "TDM", "Duos"],
    "hb": ["Domination", "Center Control", "Survival", "Tag"],
    "ba": ["Boss Rush", "Trench Battle", "Tag", "Center Control", "Domination", "Mothership", "Soccer"],
    "ga": ["FFA", "TDM", "Duos", "Trios", "Survival", "Tag", "Kill Race"],
    "c": ["Closed Beta"],
    "xyz": ["Closed Beta"]
}

const gamemode = (function() {
    const table = [];
    for (const key of (serverTable[global.fingerPrint.prefix] || ["Closed Beta"])) {
        if (gamemodes[key]) {
            for (let i = 0; i < choiceTable[key]; i++) {
                table.push(key);
            }
        } else {
            throw new ReferenceError(key + " isn't a valid gamemode!");
        }
    }
    return table[Math.floor(Math.random() * table.length)];
})();

const mode = gamemodes[gamemode];
let changedToMaze = false;
if (mode.ALLOW_MAZE && Math.random() > .75) {
    mode.MAZE = mode.ALLOW_MAZE;
    changedToMaze = true;
}
let output = {
    FORCE_BOTS: mode.FORCE_BOTS
};
for (let key in defaults) {
    output[key] = defaults[key];
    if (mode[key] != null) output[key] = mode[key];
}
output.gameModeName = gamemode;
if (gamemode.includes("TDM")) {
    output.gameModeName = output.gameModeName.replace("TDM", output.TEAMS + " TDM");
}
if (["Kill Race", "Mothership", "Tag", "Domination", "Center Control"].includes(gamemode)) {
    output.gameModeName = output.TEAMS + " TDM " + gamemode;
}
if (changedToMaze) {
    for (let y = 0; y < output.ROOM_SETUP.length; y++) {
        for (let x = 0; x < output.ROOM_SETUP[y].length; x++) {
            if (["rock", "roid"].includes(output.ROOM_SETUP[y][x])) {
                output.ROOM_SETUP[y][x] = "norm";
            }
        }
    }
    output.gameModeName = "Maze " + output.gameModeName;
    output.secondaryGameMode = "m_" + output.secondaryGameMode;
}
if (output.ROOM_SETUP.some(row => row.some(cell => cell === "port"))) {
    output.gameModeName = "Portal " + output.gameModeName;
    output.secondaryGameMode = "p_" + output.secondaryGameMode;
}
if (output.ROOM_SETUP.isOpen) {
    output.gameModeName = "Open " + output.gameModeName;
    output.secondaryGameMode = "o_" + output.secondaryGameMode;
}

module.exports = {
    output
};
