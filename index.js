/*jslint node: true */
/*jshint -W061 */
/*global goog, Map, let */
"use strict";
// General requires
require('google-closure-library');
goog.require('goog.structs.PriorityQueue');
goog.require('goog.structs.QuadTree');
const GLOBAL = require("./modules/global.js");
const { ioTypes } = require('./modules/live/controllers.js');
console.log(`[${GLOBAL.creationDate}]: Server initialized.\nRoom Info:\nDimensions: ${room.width} x ${room.height}\nMax Food / Nest Food: ${room.maxFood} / ${room.maxFood * room.nestFoodAmount}`);
// Let's get a cheaper array removal thing
Array.prototype.remove = function(index) {
    if (index === this.length - 1) return this.pop();
    let r = this[index];
    this[index] = this.pop();
    return r;
};
util.log(room.width + ' x ' + room.height + ' room initalized.  Max food: ' + room.maxFood + ', max nest food: ' + (room.maxFood * room.nestFoodAmount) + '.');
// The most important loop. Fast looping.
const gameloop = (() => {
    // Collision stuff
    function collide(collision) {
        // Pull the two objects from the collision grid
        let instance = collision[0],
            other = collision[1];
        // Check for ghosts...
        if (instance.isGhost || other.isGhost) {
            const ghost = instance.isGhost ? instance : other;
            if (ghost.settings.hitsOwnType !== "everything") {
                util.error("A ghost has been found!");
                util.error("Type: " + ghost.label);
                util.error("Position: (" + ghost.x + ", " + ghost.y + ")");
                util.error("Collision Array: " + ghost.collisionArray);
                util.error("Health: " + ghost.health.amount);
                util.warn("Ghost removed successfully.");
            }
            if (grid.checkIfInHSHG(ghost)) {
                grid.removeObject(ghost);
            }
            ghost.isInGrid = false;
            purgeEntities();
            return 0;
        }
        if (!instance.activation.check() && !other.activation.check()) {
            return 0;
        }
        if (instance.settings.hitsOwnType === "everything" && other.settings.hitsOwnType === "everything") {
            return 0;
        }
        if (c.SANDBOX && instance.sandboxId !== other.sandboxId) {
            return 0;
        }
        if (instance.submarine.submerged !== other.submarine.submerged) {
            return 0;
        }
        if ((instance.isPlane && other.type !== "bullet" && other.type !== "drone") || (other.isPlane && instance.type !== "bullet" && instance.type !== "drone")) {
            return 0;
        }
        if (instance.master.passive || other.master.passive) return;
        switch (true) {
            case (instance.type === "wall" || other.type === "wall"):
                if (instance.type === "wall" && other.type === "wall") return instance.facing = other.facing = 0;
                if (instance.label.includes("Collision") || other.label.includes("Collision")) return;
                if (instance.settings.goThroughWalls || other.settings.goThroughWalls || instance.master.settings.goThroughWalls || other.master.settings.goThroughWalls || instance.master.godmode || other.master.godmode) return;
                let wall = instance.type === "wall" ? instance : other;
                let entity = instance.type === "wall" ? other : instance;
                switch (wall.shape) {
                    case 4:
                        reflectCollide(wall, entity)
                        break;
                    case 0:
                        mooncollide(wall, entity);
                        break;
                    default:
                        let a = ((entity.type === "bullet") ? 1 + 10 / (entity.velocity.length + 10) : 1);
                        advancedcollide(wall, entity, false, false, a);
                        break;
                };
                break;
            case ((instance.label.includes("Collision") || other.label.includes("Collision")) && (instance.settings.hitsOwnType === "everything" || other.settings.hitsOwnType === "everything") && instance.team !== other.team): {
                if (instance.passive || other.passive) return;
                if (instance.invuln || other.invuln) return;
                const flail = instance.label.includes("Collision") ? instance : other;
                const entity = instance.label.includes("Collision") ? other : instance;
                if (entity.label.includes("Collision")) return;
                advancedcollide(flail, entity, true, false, null);
            } break;
            case (instance.settings.hitsOwnType === "everything" || other.settings.hitsOwnType === "everything"): {
                if (instance.label === "Collision" || other.label === "Collision") return;
                if (instance.team === other.team || instance.master.id === other.master.id) return;
                if (instance.isDominator || other.isDominator || instance.isMothership || other.isMothership || instance.type === "miniboss" || other.type === "miniboss") return;
                if (instance.settings.goThroughWalls || other.settings.goThroughWalls || instance.master.settings.goThroughWalls || other.master.settings.goThroughWalls || instance.master.godmode || other.master.godmode) return;
                let shield = instance.settings.hitsOwnType === "everything" ? instance : other,
                    entity = instance.settings.hitsOwnType === "everything" ? other : instance;
                firmcollide(shield, entity);
            } break;
            case (instance.team === other.team && (instance.settings.hitsOwnType === "pushOnlyTeam" || other.settings.hitsOwnType === "pushOnlyTeam")): { // Dominator / collisions
                if (instance.settings.hitsOwnType === other.settings.hitsOwnType) return;
                let pusher = instance.settings.hitsOwnType === "pushOnlyTeam" ? instance : other;
                let entity = instance.settings.hitsOwnType === "pushOnlyTeam" ? other : instance;
                if (entity.type !== "tank" || entity.settings.hitsOwnType === "never") return;
                let a = 1 + 10 / (Math.max(entity.velocity.length, pusher.velocity.length) + 10);
                advancedcollide(pusher, entity, false, false, a);
            }
            break;
        case ((instance.type === 'crasher' && other.type === 'food') || (other.type === 'crasher' && instance.type === 'food')):
            firmcollide(instance, other);
            break;
        case (instance.team !== other.team && !instance.hitsOwnTeam && !other.hitsOwnTeam):
            advancedcollide(instance, other, true, true);
            break;
        case (instance.team === other.team && (instance.hitsOwnTeam || other.hitsOwnTeam) && instance.master.master.id !== other.master.master.id && other.master.master.id !== instance.master.master.id):
            advancedcollide(instance, other, true, true);
            break;
        case (instance.settings.hitsOwnType == 'never' || other.settings.hitsOwnType == 'never'):
            break;
        case (instance.settings.hitsOwnType === other.settings.hitsOwnType):
            switch (instance.settings.hitsOwnType) {
                case 'push':
                    advancedcollide(instance, other, false, false);
                    break;
                case 'hard':
                    firmcollide(instance, other);
                    break;
                case 'hardWithBuffer':
                    firmcollide(instance, other, 30);
                    break;
                case "hardOnlyTanks":
                    if (instance.type === "tank" && other.type === "tank" && !instance.isDominator && !other.isDominator) firmcollide(instance, other);
                case "hardOnlyBosses":
                    if (instance.type === other.type && instance.type === "miniboss") firmcollide(instance, other);
                case 'repel':
                    simplecollide(instance, other);
                    break;
            };
            break;
        };
    };
    // Living stuff
 function botkillloop(my) {
   if (global.arenaClosed) {
   if (my.isBot) {
     my.kill()
   }
   }
 }
    function entitiesactivationloop(my) {
        // Update collisions.
        my.collisionArray = [];
        // Activation
        my.activation.update();
        my.updateAABB(my.activation.check());
    }

    function entitiesliveloop(my) {
        // Consider death.
        if (my.contemplationOfMortality()) my.destroy();
        else {
            if (my.bond == null) {
                // Resolve the physical behavior from the last collision cycle.
                logs.physics.set();
                my.physics();
                logs.physics.mark();
            }
            if (my.activation.check() || my.isPlayer) {
                logs.entities.tally();
                // Think about my actions.
                logs.life.set();
                my.life();
                logs.life.mark();
                // Apply friction.
                my.friction();
                my.confinementToTheseEarthlyShackles();
                logs.selfie.set();
                my.takeSelfie();
                logs.selfie.mark();
            }
            entitiesactivationloop(my);
        }
        // Update collisions.
        my.collisionArray = [];
    }
    let time;
    // Return the loop function
    let ticks = 0;
    return () => {
        const start = Date.now();
        logs.loops.tally();
        logs.master.set();
        logs.activation.set();
        global.sandboxRooms.forEach(({ id }) => {
            if (!sockets.clients.find(entry => entry.sandboxId === id)) {
                global.sandboxRooms = global.sandboxRooms.filter(entry => entry.id !== id);
                for (let i = 0; i < entities.length; i ++) {
                    if (entities[i].sandboxId === id) {
                        entities[i].kill();
                    }
                }
            }
        });
        //loopThrough(entities, entitiesactivationloop);
        //for (let entity of entities) entitiesactivationloop(entity);
        logs.activation.mark();
        // Do collisions
        logs.collide.set();
        if (entities.length > 1) {
            // Load the grid
            grid.update();
            // Run collisions in each grid
            const pairs = grid.queryForCollisionPairs();
            //loopThrough(pairs, collide);
            for (let pair of pairs) collide(pair);
        }
        logs.collide.mark();
        // Do entities life
        logs.entities.set();
        //loopThrough(entities, entitiesliveloop);
        for (let entity of entities) {
            entitiesliveloop(entity);
          botkillloop(entity) 
        }
        logs.entities.mark();
        logs.master.mark();
        // Remove dead entities
        purgeEntities();
        room.lastCycle = util.time();
        ticks++;
        if (ticks % 25 === 0 && global.mspt > 30) {
            antiLagbot();
        }
        global.mspt = Date.now() - start;
    };
})();
setTimeout(closeArena, 60000 * 300); // Restart every 5 hours
// A less important loop. Runs at an actual 5Hz regardless of game speed.
const maintainloop = (() => {
    // Place obstacles
    global.placeRoids = function placeRoids() {
        function placeRoid(type, entityClass) {
            let x = 0;
            let position;
            do {
                position = room.randomType(type);
                x++;
                if (x > 200) {
                    util.warn("Could not place some roids.");
                    return 0;
                }
            } while (dirtyCheck(position, 10 + entityClass.SIZE));
            let o = new Entity(position);
            o.define(entityClass);
            o.team = -101;
            o.facing = ran.randomAngle();
            o.protect();
            o.life();
        }
        // Start placing them
        let roidcount = room.roid.length * room.width * room.height / room.xgrid / room.ygrid / 40000 / 1.5;
        let rockcount = room.rock.length * room.width * room.height / room.xgrid / room.ygrid / 80000 / 1.5;
        let count = 0;
        for (let i = Math.ceil(roidcount); i; i--) {
            count++;
            placeRoid('roid', Class.obstacle);
        }
        for (let i = Math.ceil(roidcount * 0.3); i; i--) {
            count++;
            placeRoid('roid', Class.babyObstacle);
        }
        for (let i = Math.ceil(rockcount * 0.8); i; i--) {
            count++;
            placeRoid('rock', Class.obstacle);
        }
        for (let i = Math.ceil(rockcount * 0.5); i; i--) {
            count++;
            placeRoid('rock', Class.babyObstacle);
        }
        for (let i = Math.ceil(rockcount * 0.5); i; i--) {
            count++;
            placeRoid('rock', Class.pebbleObstacle);
        }
        util.log('Placing ' + count + ' obstacles!');
    }
    placeRoids();

    function spawnWall(loc) {
        let o = new Entity(loc);
        o.define(Class.mazeWall);
        o.team = -101;
        o.SIZE = (room.width / room.xgrid) / 2;
        o.protect();
        o.life();
    };
    const doors = [];
    const buttons = [];
    function makeDoor(loc, team = -101) {
        const door = new Entity(loc);
        door.define(Class.mazeWall);
        door.team = -101;
        door.SIZE = (room.width / room.xgrid) / 2;
        door.protect();
        door.life();
        doors.push(door);
        const doorID = doors.indexOf(door);
        door.onDead = function() {
            for (const button of buttons) {
                if (button.doorID === doorID) {
                    button.ignoreButtonKill = 2;
                    button.kill();
                }
            }
        }
    }
    function makeButton(loc, open, doorID) {
        const button = new Entity(loc);
        button.define(Class.button);
        button.pushability = button.PUSHABILITY = 0;
        button.team = -101;
        button.doorID = doorID;
        button.color = open ? 12 : 11;
        button.onDead = function() {
            if (!button.ignoreButtonKill) {
                const door = doors[button.doorID];
                if (open) {
                    door.alpha = 0.2;
                    door.passive = true;
                } else {
                    door.alpha = 1;
                    door.passive = false;
                }
                for (const other of buttons) {
                    if (button !== other && button.doorID === other.doorID) {
                        other.ignoreButtonKill = true;
                        other.kill();
                    }
                }
            }
            if (button.ignoreButtonKill !== 2) {
                makeButton(loc, !open, doorID);
            }
        }
        buttons.push(button);
    }
    for (const loc of room.door) {
        makeDoor(loc);
        let buttonLocs = [{
            x: loc.x + (room.width / room.xgrid),
            y: loc.y
        }, {
            x: loc.x - (room.width / room.xgrid),
            y: loc.y
        }, {
            x: loc.x,
            y: loc.y + (room.height / room.ygrid)
        }, {
            x: loc.x,
            y: loc.y - (room.height / room.ygrid)
        }];
        buttonLocs = buttonLocs.filter(function(entry) {
            return ["norm", "nest"].includes(room.setup[Math.floor((entry.y * room.ygrid) / room.height)][Math.floor((entry.x * room.xgrid) / room.width)]);
        });
        for (const loc of buttonLocs) {
            makeButton(loc, 1, doors.length - 1);
        }
    }
    for (let loc of room["wall"]) spawnWall(loc);
    // Spawning functions
    let spawnBosses = (() => {
        let timer = 0;
        let boss = (() => {
            let i = 0,
                names = [],
                bois = [Class.egg],
                n = 0,
                begin = 'yo some shit is about to move to a lower position',
                arrival = 'Something happened lol u should probably let Neph know this broke',
                loc = 'norm';
            let spawn = () => {
                let spot, m = 0;
                do {
                    spot = room.randomType(loc);
                    m++;
                } while (dirtyCheck(spot, 500) && m < 30);
                let o = new Entity(spot);
                o.name = ran.chooseBossName("all", 1)[0];
                o.define(ran.choose(bois));
                o.team = -100;
            };
            return {
                prepareToSpawn: (classArray, number, nameClass, typeOfLocation = 'norm') => {
                    n = number;
                    bois = classArray;
                    loc = typeOfLocation;
                    names = ran.chooseBossName("all", number + 3);
                    i = 0;
                    if (n === 1) {
                        begin = 'A visitor is coming.';
                        arrival = names[0] + ' has arrived.';
                    } else {
                        begin = 'Visitors are coming.';
                        arrival = '';
                        for (let i = 0; i < n - 2; i++) arrival += names[i] + ', ';
                        arrival += names[n - 2] + ' and ' + names[n - 1] + ' have arrived.';
                    }
                },
                spawn: () => {
                    sockets.broadcast(begin);
                    for (let i = 0; i < n; i++) {
                        setTimeout(spawn, ran.randomRange(3500, 5000));
                    }
                    // Wrap things up.
                    setTimeout(() => sockets.broadcast(arrival), 5000);
                    util.log('[SPAWN] ' + arrival);
                },
            };
        })();
        let timerThing = 60 * 5;
        return census => {
            if (timer > timerThing && ran.dice(timerThing - timer)) {
                util.log('[SPAWN] Preparing to spawn...');
                timer = 0;
                let choice = [];
                switch (ran.chooseChance(1, 1, 1)) {
                    case 0:
                        choice = [
                            [Class.eliteDestroyer, Class.eliteGunner, Class.eliteSprayer, Class.eliteSprayer2, Class.eliteHunter, Class.eliteSkimmer, Class.sentryFragBoss], 1 + (Math.random() * 2 | 0), 'a', 'nest'
                        ];
                        sockets.broadcast("A stirring in the distance...");
                        break;
                    case 1:
                        choice = [
                            [Class.summoner, Class.eliteSkimmer, Class.palisade, Class.atrium, Class.guardian, Class.quadriatic, Class.defender], 1 + (Math.random() * 2 | 0), 'a', 'norm'
                        ];
                        sockets.broadcast("A strange trembling...");
                        break;
                    case 2:
                        choice = [
                            [Class.fallenOverlord, Class.fallenBooster, Class.fallenHybrid, Class.fallenPentaquark], 1 + (Math.random() * 2 | 0), 'a', 'norm'
                        ];
                        sockets.broadcast("Many sought the day they'd return, but not in this way...");
                        break;
                }
                boss.prepareToSpawn(...choice);
                setTimeout(boss.spawn, 3000);
                // Set the timeout for the spawn functions
            } else if (!census.miniboss) timer++;
        };
    })();
    let spawnSanctuaries = (() => {
        let timer = 0;
        let boss = (() => {
            let i = 0,
                names = [],
                bois = [Class.egg],
                n = 0,
                begin = 'yo some shit is about to move to a lower position',
                arrival = 'Something happened lol u should probably let Neph know this broke';
            let spawn = () => {
                let o = new Entity(room.randomType("norm"));
                o.name = names[i++];
                o.define(ran.choose(bois));
                o.team = -100;
                o.isSanctuary = true;
                o.onDead = () => {
                    setTimeout(() => {
                        let n = new Entity(o);
                      switch(ran.chooseChance(1, 1)) {
                        case 0:
                        n.define(Class[o.spawnOnDeath]);
                          break
                        case 1:
                          n.define(Class[o.secondarySpawnOnDeath]);
                          break
                      }
                        n.team = o.team;
                        n.name = ran.chooseBossName("all", 1)[0];
                        sockets.broadcast(util.addArticle(n.label, true) + " has spawned to avenge the " + o.label + "!");
                    }, 5000);
                };
            };
            return {
                prepareToSpawn: (classArray, number, nameClass) => {
                    n = number;
                    bois = classArray;
                    names = ran.chooseBossName(nameClass, number);
                    i = 0;
                    if (n === 1) {
                        begin = 'A sanctuary is coming.';
                        arrival = names[0] + ' has arrived.';
                    } else {
                        begin = 'Sanctuaries are coming.';
                        arrival = '';
                        for (let i = 0; i < n - 2; i++) arrival += names[i] + ', ';
                        arrival += names[n - 2] + ' and ' + names[n - 1] + ' have arrived.';
                    }
                },
                spawn: () => {
                    sockets.broadcast(begin);
                    for (let i = 0; i < n; i++) {
                        setTimeout(spawn, ran.randomRange(3500, 5000));
                    }
                    // Wrap things up.
                    setTimeout(() => sockets.broadcast(arrival), 5000);
                    util.log('[SPAWN] ' + arrival);
                },
            };
        })();
        return census => {
            let timerThing = 60 * 4;
            if (timer > timerThing && ran.dice(timerThing - timer)) {
                util.log('[SPAWN] Preparing to spawn...');
                timer = 0;
                let choice = [
                    [[Class.eggSanctuary, Class.squareSanctuary, Class.triangleSanctuary][ran.chooseChance(5000, 2, 0.5)]],
                    1 + Math.floor(Math.random()) | 0, "a"
                ];
                boss.prepareToSpawn(...choice);
                setTimeout(boss.spawn, 3000);
                // Set the timeout for the spawn functions
            } else if (!census.sanctuary && !census.miniboss) timer++;
        };
    })();
    let spawnCrasher = (() => {
        const config = {
            max: 10,
            chance: .9,
            sentryChance: 0.95,
            crashers: [Class.crasher, Class.fragment, Class.dartCrasher],
            sentries: [Class.sentryGun, Class.sentrySwarm, Class.sentryTrap, Class.sentryOmission, Class.sentryRho, Class.miniSummoner]
        };
        function getType() {
            const seed = Math.random();
            if (seed > config.sentryChance) return ran.choose(config.sentries);
            return ran.choose(config.crashers);
        }
        return census => {
            if (c.SANDBOX && global.sandboxRooms.length < 1) {
                return;
            }
            if (census.crasher < config.max) {
                for (let i = 0; i < config.max - census.crasher; i ++) {
                    if (Math.random() > config.chance) {
                        let spot, i = 25;
                        do {
                            spot = room.randomType('nest');
                            i --;
                            if (!i) return 0;
                        } while (dirtyCheck(spot, 250));
                        let o = new Entity(spot);
                        o.define(getType());
                        o.controllers.push(new ioTypes.nestNPC(o));
                        o.team = -100;
                        if (c.SANDBOX) {
                            o.sandboxId = ran.choose(global.sandboxRooms).id;
                        }
                    }
                }
            }
        }
    })();
    function getBuild() {
        const output = [];
        for (let i = 0; i < 10; i ++) {
            output.push(Math.random() * 10 | 0);
        }
        return output;
    }
    function spawnBot(TEAM = null) {
        let team = TEAM ? TEAM : getTeam();
        let set = (c.NAVAL_SHIPS ? {
            startClass: Math.random() > .25 ? "aircraftCarriers" : ran.choose(["alexanderNevsky", "yamato", "petropavlovsk"]),
            build: getBuild(),
            ai: "bot"
        } : (c.HIDE_AND_SEEK && team == 2) ? {
            startClass: "landmine",
            build: [12, 0, 0, 0, 0, 12, 12, 12, 12, 12],
            ai: "hideBot"
        } : ran.choose(botSets));
        const botName = ran.chooseBotName();
        let color = getTeamColor(team);
        if (room.gameMode === "ffa") color = (c.RANDOM_COLORS ? Math.floor(Math.random() * 20) : 11);
        let loc = c.SPECIAL_BOSS_SPAWNS ? ((room["bas1"] && room["bas1"].length) ? room.randomType("bas1") : room.randomType("nest")) : room.randomType("norm");
        if (global.escortMotherships && global.escortMotherships.length) {
            let mothership, angle, i = 15;
            do {
                mothership = global.escortMotherships[Math.random() * global.escortMotherships.length | 0];
                angle = Math.PI * 2 * Math.random();
                loc = {
                    x: mothership.x + mothership.SIZE * 1.5 * Math.cos(angle),
                    y: mothership.y + mothership.SIZE * 1.5 * Math.sin(angle)
                };
                i --;
            } while (dirtyCheck(loc, Class.genericTank.SIZE * 5) && i);
        }
        let o = new Entity(loc);
        o.color = color;
        o.invuln = true;
        o.define(Class[set.startClass]);
        o.botSet = set;
        
        o.name += botName;
        o.refreshBodyAttributes();
        o.color = color;
        if (room.gameMode === "tdm") o.team = -team;
        o.skill.score = 59210;
        o.isBot = true;
        o.nameColor = "#7289DA";
        /*if (c.GROUPS) {
            let master = {
                isBot: true,
                player: {
                    body: o
                }
            };
            groups.addMember(master);
            o.team = -master.rememberedTeam;
            o.color = master.group.color;
            o.ondead = function() {
                groups.removeMember(master);
            }
        }*/
    
        setTimeout(function() {
            if (!o || o.isDead()) return;
            const index = o.index;
            let className = set.startClass;
            for (let key in Class)
                if (Class[key].index === index) className = key;
            o.define(Class[set.ai]);
            o.define(Class[className]);
            if (c.NAVAL_SHIPS && set.startClass == "aircraftCarriers") {
                o.controllers = [new ioTypes.carrierThinking(o), new ioTypes.carrierAI(o)];
            } else if (c.TRENCH_WARFARE || c.ESCORT) {
                o.controllers.push(new ioTypes.pathFind(o));
            }
            o.refreshBodyAttributes();
            o.name += botName;
            o.invuln = false;
            o.skill.set(set.build);
        }, 3000 + (Math.floor(Math.random() * 7000)));
        return o;
    }; /*
    if (c.C_Day) {
    let placeDom = 0 = > {let count = 5 for(let loc of room['dom69'])} {let o = new Entity(loc) o.define(ran.choose[Class.destroyerDominator, Class.gunnerDominator, Class.trapperDominator, Class.droneDominator, Class.steamrollerDominator, Class.autoDominator, Class.crockettDominator, Class.spawnerDominator]) o.team = 12 o.ondeath {sockets.broadcast('omgomg the blue team got baldom get rekt red team')o.define(Class.baldom) o.team = 10}}
      }} */
    if (c.SPACE_MODE) {
        let placeMoon = () => {
            let o = new Entity({
                x: room.width / 2,
                y: room.height / 2
            })
            o.define(Class.moon);
            o.team = -101;
            o.facing = ran.randomAngle();
            o.protect();
            o.life();
            util.log('Placing moon!');
        }
        placeMoon();
    }
    // The NPC function
    let makenpcs = (() => {
        // Make base protectors if needed.
        let f = (loc, team) => {
            let o = new Entity(loc);
            o.define(Class.baseDroneSpawner); // Class.baseProtector
            o.team = -team;
            o.color = getTeamColor(team);
        };
        for (let i = 1; i <= c.TEAMS; i++) {
            room['bap' + i].forEach((loc) => {
                f(loc, i);
            });
        }
        // Return the spawning function
        global.bots = [];
        return () => {
            let census = {
                crasher: 0,
                miniboss: 0,
                tank: 0,
                mothership: 0,
                sanctuary: 0
            };
            let npcs = entities.map(function npcCensus(instance) {
                if (instance.isSanctuary) {
                    census.sanctuary++;
                    return instance;
                }
                if (census[instance.type] != null) {
                    census[instance.type]++;
                    return instance;
                }
                if (instance.isMothership) {
                    census.mothership++;
                    return instance;
                }
            }).filter(e => {
                return e;
            });
            // Spawning
            spawnCrasher(census);
            if (!c.SANDBOX) {
                spawnBosses(census);
                spawnSanctuaries(census);
                // Bots
                const maxBots = (room.botAmount != null ? room.botAmount : (Math.ceil(c.maxPlayers / 2) - views.length));
                if (bots.length < maxBots && !global.arenaClosed) {
                    if (c.SPECIAL_BOSS_SPAWNS && (!(room["bas1"] || []).length)) {} else {
                        bots.push(spawnBot(global.nextTagBotTeam.shift() || null));
                    }
                }
            } else {
                for (let i = 0; i < global.sandboxRooms.length; i ++) {
                    let room = global.sandboxRooms[i];
                    // Remove dead ones
                    room.bots = room.bots.filter(e => {
                        return !e.isDead();
                    });
                    if (room.bots.length < room.botCap && !global.arenaClosed) {
                        for (let j = room.bots.length; j < room.botCap; j ++) {
                            if (Math.random() > .5) {
                                const bot = spawnBot(null);
                                bot.sandboxId = room.id;
                                room.bots.push(bot);
                            }
                        }
                    }
                    for (let o of room.bots) {
                        if (o.skill.level < 60) {
                            o.skill.score += 35;
                            o.skill.maintain();
                        }
                        if (o.upgrades.length && Math.random() > 0.5 && !o.botDoneUpgrading) {
                            o.upgrade(Math.floor(Math.random() * o.upgrades.length));
                            if (Math.random() > .9) {
                                o.botDoneUpgrading = true;
                            }
                        }
                    }
                }
            }
            // Remove dead ones
            bots = bots.filter(e => {
                return !e.isDead();
            });
            for (let o of bots) {
                if (o.skill.level < 60) {
                    o.skill.score += 35;
                    o.skill.maintain();
                }
                if (o.upgrades.length && Math.random() > 0.5 && !o.botDoneUpgrading) {
                    let index = Math.floor(Math.random() * o.upgrades.length), i = 10;
                    if (o.botSet && o.botSet.ignore != null) {
                        while (o.botSet.ignore.includes(o.upgrades[index].class.LABEL) && i > 0) {
                            index = Math.floor(Math.random() * o.upgrades.length);
                            i --;
                        }
                    }
                    if (i <= 0) {
                        o.botDoneUpgrading = true;
                    } else {
                        o.upgrade(index);
                        if (Math.random() > .9) {
                            o.botDoneUpgrading = true;
                        }
                    }
                }
            }
        };
    })();
    const createFood = (() => {
        class FoodType {
            constructor(groupName, types, chances, chance, isNestFood = false) {
                if (chances[0] === "scale") {
                    const scale = chances[1];
                    chances = [];
                    for (let i = types.length; i > 0; i --) {
                        chances.push(i ** scale);
                    }
                }
                this.name = groupName;
                if (types.length !== chances.length) {
                    throw new RangeError(groupName + ": error with group. Please make sure there is the same number of types as chances.");
                }
                this.types = types;
                this.chances = chances;
                this.chance = chance;
                this.isNestFood = isNestFood;
            }
            choose() {
                return this.types[ran.chooseChance(...this.chances)];
            }
        }
        const types = [
            new FoodType("Normal Food", [
                Class.egg, Class.square, Class.triangle,
                Class.pentagon, Class.bigPentagon
            ], ["scale", 4], 50000),
            new FoodType("Rare Food", [
                Class.gem, Class.greensquare, Class.greentriangle,
                Class.greenpentagon
            ], ["scale", 4], 1),
            new FoodType("Splitting Food", [
                Class.splitterSquare, Class.splitterTriangle, /*Class.splitterPentagon*/  
                Class.splitterSplitterSquare
            ], ["scale", 2], 1000),
            new FoodType("Super Rare Food", [
                Class.jewel, Class.legendarysquare, Class.legendarytriangle,
                Class.legendarypentagon
            ], ["scale", 4], 0.05),
            new FoodType("Nest Food", [
               Class.pentagon, Class.scaleneTriangle, Class.rhombus, Class.bigPentagon, Class.hugePentagon,
              /*  Class.alphaHexagon, Class.alphaHeptagon, Class.alphaOctogon,
                Class.alphaNonagon, Class.alphaDecagon, Class.icosagon*/ // Commented out because stats aren't done yet.
            ], ["scale", 4], 50000, true),
           new FoodType("Rare Nest Food", [
               Class.greenpentagon, Class.greenscaleneTriangle, Class.greenrhombus, Class.greenbigPentagon, Class.greenhugePentagon,
              /*  Class.alphaHexagon, Class.alphaHeptagon, Class.alphaOctogon,
                Class.alphaNonagon, Class.alphaDecagon, Class.icosagon*/ // Commented out because stats aren't done yet.
            ], ["scale", 4], 1, true),
   new FoodType("Super Rare Nest Food", [
               Class.legendarypentagon, Class.legendaryscaleneTriangle, Class.legendaryrhombus, Class.legendarybigPentagon, Class.legendaryhugePentagon,
              /*  Class.alphaHexagon, Class.alphaHeptagon, Class.alphaOctogon,
                Class.alphaNonagon, Class.alphaDecagon, Class.icosagon*/ // Commented out because stats aren't done yet.
            ], ["scale", 4], 0.05, true)
        ];
        function getFoodType(isNestFood = false) {
            const possible = [[], []];
            for (let i = 0; i < types.length; i ++) {
                if (types[i].isNestFood == isNestFood) {
                    possible[0].push(i);
                    possible[1].push(types[i].chance);
                }
            }
            return possible[0][ran.chooseChance(...possible[1])];
        }
        function spawnShape(location, type = 0) {
            if (c.SANDBOX && global.sandboxRooms.length < 1) {
                return {};
            }
            let o = new Entity(location);
            type = types[type].choose();
            o.define(type);
            o.define({
                BODY: {
                    ACCELERATION: 0.015 / (type.FOOD.LEVEL + 1)
                }
            })
            o.facing = ran.randomAngle();
            o.team = -100;
            if (c.SANDBOX) {
                o.sandboxId = ran.choose(global.sandboxRooms).id;
            }
            return o;
        };
        function spawnGroupedFood() {
            let location, i = 5;
            do {
                location = room.random();
                i --;
                if (i <= 0) {
                    return;
                }
            } while (room.isIn("nest", location));
            for (let i = 0, amount = (Math.random() * 20) | 0; i < amount; i ++) {
                const angle = Math.random() * Math.PI * 2;
                spawnShape({
                    x: location.x + Math.cos(angle) * (Math.random() * 50),
                    y: location.y + Math.sin(angle) * (Math.random() * 50)
                }, getFoodType());
            }
        }
        function spawnDistributedFood() {
            let location, i = 5;
            do {
                location = room.random();
                i --;
                if (i <= 0) {
                    return;
                }
            } while (room.isIn("nest", location));
            spawnShape(location, getFoodType());
        }
        function spawnNestFood() {
            let shape = spawnShape(room.randomType("nest"), getFoodType(true));
            shape.isNestFood = true;
        }
        return () => {
            const maxFood = 1 + room.maxFood + 1 * views.length;
            const maxNestFood = 1 + room.maxFood * room.nestFoodAmount;
            const census = (() => {
                let food = 0;
                let nestFood = 0;
                for (let instance of entities) {
                    if (instance.type === "food") {
                        if (instance.isNestFood) nestFood ++;
                        else food ++;
                    }
                }
                return {
                    food,
                    nestFood
                };
            })();
            if (census.food < maxFood) [spawnGroupedFood, spawnDistributedFood][+(Math.random() > .8)]();
            if (census.nestFood < maxNestFood) spawnNestFood();
        };
    })();
    return () => {
        // Do stuff
        makenpcs();
        createFood();
    };
})();
// Bring it to life
setInterval(gameloop, room.cycleSpeed);
setInterval(maintainloop, 1000);
setInterval(speedcheckloop, 1000);
setInterval(gamemodeLoop, 1000);
setInterval(function() {
   for (let instance of sockets.players) {
       instance.socket.view.gazeUpon();
       instance.socket.lastUptime = Infinity;
   }
}, 1000 / 30);
