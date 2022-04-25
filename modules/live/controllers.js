/*jslint node: true */
/*jshint -W061 */
/*global goog, Map, let */
"use strict";
// General requires
require('google-closure-library');
goog.require('goog.structs.PriorityQueue');
goog.require('goog.structs.QuadTree');
// Define IOs (AI)
class IO {
    constructor(body) {
        this.body = body;
        this.acceptsFromTop = true;
    }
    think() {
        return {
            target: null,
            goal: null,
            fire: null,
            main: null,
            alt: null,
            power: null,
        };
    }
}
const ioTypes = {};
ioTypes.doNothing = class extends IO {
    constructor(body) {
        super(body);
        this.acceptsFromTop = false;
    }
    think() {
        return {
            goal: {
                x: this.body.x,
                y: this.body.y
            },
            main: false,
            alt: false,
            fire: false
        };
    }
}
ioTypes.moveInCircles = class extends IO {
    constructor(body) {
        super(body);
        this.acceptsFromTop = false;
        this.timer = ran.irandom(10) + 3;
        this.goal = {
            x: this.body.x + 10 * Math.cos(-this.body.facing),
            y: this.body.y + 10 * Math.sin(-this.body.facing)
        };
    }
    think() {
        if (!(this.timer--)) {
            this.timer = 10;
            this.goal = {
                x: this.body.x + 10 * Math.cos(-this.body.facing),
                y: this.body.y + 10 * Math.sin(-this.body.facing)
            };
        }
        return {
            goal: this.goal
        };
    }
}
ioTypes.listenToPlayer = class extends IO {
    constructor(b, p) {
        super(b);
        this.player = p;
        this.acceptsFromTop = false;
    }
    // THE PLAYER MUST HAVE A VALID COMMAND AND TARGET OBJECT
    think() {
        let targ = {
            x: this.player.target.x,
            y: this.player.target.y
        };
        if (this.player.command.autospin) {
            let kk = Math.atan2(this.body.control.target.y, this.body.control.target.x) + 0.02;
            targ = {
                x: 100 * Math.cos(kk),
                y: 100 * Math.sin(kk)
            };
        }
        if (this.body.invuln) {
            if (this.player.command.right || this.player.command.left || this.player.command.up || this.player.command.down || this.player.command.lmb) {
                this.body.invuln = false;
            }
        }
        this.body.autoOverride = this.player.command.override;
        let goal = {
            x: this.player.command.right - this.player.command.left,
            y: this.player.command.down - this.player.command.up
        };
        /*if (c.SPACE_MODE) {
            let spaceOffsetAngle = Math.atan2(room.width / 2 - this.body.x, room.height / 2 - this.body.y);
            goal = rotatePoint(goal, -spaceOffsetAngle);
        }*/
        return {
            target: targ,
            goal: {
                x: this.body.x + goal.x,
                y: this.body.y + goal.y
            },
            fire: this.player.command.lmb || this.player.command.autofire,
            main: this.player.command.lmb || this.player.command.autospin || this.player.command.autofire,
            alt: this.player.command.rmb
        };
    }
}
ioTypes.mapTargetToGoal = class extends IO {
    constructor(b) {
        super(b);
    }
    think(input) {
        if (input.main || input.alt) {
            return {
                goal: {
                    x: input.target.x + this.body.x,
                    y: input.target.y + this.body.y
                },
                power: 1
            };
        }
    }
}
ioTypes.plane = class extends IO {
    constructor(b) {
        super(b);
    }
    think(input) {
        if (this.body.master.master.controllingSquadron && this.body.master.master.control.target) {
            input.target = this.body.master.master.control.target;
            return {
                goal: {
                    x: input.target.x + this.body.x,
                    y: input.target.y + this.body.y
                },
                power: 1
            }
        }
    }
}
ioTypes.boomerang = class extends IO {
    constructor(b) {
        super(b);
        this.r = 0;
        this.b = b;
        this.m = b.master;
        this.turnover = false;
        this.myGoal = {
            x: 3 * b.master.control.target.x + b.master.x,
            y: 3 * b.master.control.target.y + b.master.y
        };
    }
    think(input) {
        if (this.b.range > this.r) this.r = this.b.range;
        let t = 1;
        if (!this.turnover) {
            if (this.r && this.b.range < this.r * 0.5) {
                this.turnover = true;
            }
            return {
                goal: this.myGoal,
                power: t
            };
        } else {
            return {
                goal: {
                    x: this.m.x,
                    y: this.m.y
                },
                power: t
            };
        }
    }
}
ioTypes.goToMasterTarget = class extends IO {
    constructor(body) {
        super(body);
        this.myGoal = {
            x: body.master.control.target.x + body.master.x,
            y: body.master.control.target.y + body.master.y
        };
        this.countdown = 5;
    }
    think() {
        if (this.countdown) {
            if (util.getDistance(this.body, this.myGoal) < 1) {
                this.countdown--;
            }
            return {
                goal: {
                    x: this.myGoal.x,
                    y: this.myGoal.y
                }
            };
        }
    }
}
ioTypes.canRepel = class extends IO {
    constructor(b) {
        super(b);
    }
    think(input) {
        if (input.alt && input.target) {
            return {
                target: {
                    x: -input.target.x,
                    y: -input.target.y
                },
                main: true
            };
        }
    }
}
ioTypes.alwaysFire = class extends IO {
    constructor(body) {
        super(body);
    }
    think() {
        return {
            fire: true
        };
    }
}
ioTypes.targetSelf = class extends IO {
    constructor(body) {
        super(body);
    }
    think() {
        return {
            main: true,
            target: {
                x: 0,
                y: 0
            }
        };
    }
}
ioTypes.mapAltToFire = class extends IO {
    constructor(body) {
        super(body);
    }
    think(input) {
        if (input.alt) {
            return {
                fire: true
            };
        }
    }
}
ioTypes.onlyAcceptInArc = class extends IO {
    constructor(body) {
        super(body);
    }
    think(input) {
        if (input.target && this.body.firingArc != null) {
            if (Math.abs(util.angleDifference(Math.atan2(input.target.y, input.target.x), this.body.firingArc[0])) >= this.body.firingArc[1]) {
                return {
                    fire: false,
                    alt: false,
                    main: false
                };
            }
        }
    }
}
ioTypes.onlyFireWhenInRange = class extends IO {
    constructor(body) {
        super(body);
    }
    think(input) {
        if (input.target && this.body.firingArc != null) {
            if (Math.abs(util.angleDifference(Math.atan2(input.target.y, input.target.x), this.body.facing)) >= .025) {
                return {
                    fire: false
                };
            }
        }
    }
}
ioTypes.nearestDifferentMaster = class extends IO {
    constructor(body) {
        super(body);
        this.targetLock = undefined;
        this.tick = ran.irandom(30);
        this.lead = 0;
        this.validTargets = this.buildList(body.fov);
        this.oldHealth = body.health.display();
    }
    validate(e, m, mm, sqrRange, sqrRangeMaster) {
        return (e.health.amount > 0) &&
        (e.dangerValue > 0) &&
        (!e.invuln && !e.master.master.passive && !this.body.master.master.passive) &&
        (e.master.master.team !== this.body.master.master.team) &&
        (e.master.master.team !== -101) &&
        (this.body.aiSettings.seeInvisible || e.alpha > 0.5) &&
        (!c.SANDBOX || this.body.master.master.sandboxId === e.master.master.sandboxId) &&
        (this.body.settings.targetPlanes ? e.isPlane : this.body.settings.targetMissiles ? e.settings.missile : this.body.settings.targetAmmo ? (e.type === "drone" || e.type === "minion" || e.type === "swarm" || e.type === "crasher") : (e.type === "tank" || e.type === "crasher" || e.type === "miniboss" || (!this.body.aiSettings.shapefriend && e.type === 'food'))) &&
        (this.body.aiSettings.blind || ((e.x - m.x) * (e.x - m.x) < sqrRange && (e.y - m.y) * (e.y - m.y) < sqrRange)) &&
        (this.body.aiSettings.skynet || ((e.x - mm.x) * (e.x - mm.x) < sqrRangeMaster && (e.y - mm.y) * (e.y - mm.y) < sqrRangeMaster));
    }
    buildList(range) {
        // Establish whom we judge in reference to
        let mostDangerous = 0,
            keepTarget = false;
        // Filter through everybody...
        let out = entities.filter(e => {
            // Only look at those within our view, and our parent's view, not dead, not invisible, not our kind, not a bullet/trap/block etc
            return this.validate(e, {
                    x: this.body.x,
                    y: this.body.y,
                }, {
                    x: this.body.master.master.x,
                    y: this.body.master.master.y,
                }, range * range, range * range * 4 / 3);
        }).filter((e) => {
            // Only look at those within range and arc (more expensive, so we only do it on the few)
            if (this.body.firingArc == null || this.body.aiSettings.view360 || Math.abs(util.angleDifference(util.getDirection(this.body, e), this.body.firingArc[0])) < this.body.firingArc[1]) {
                mostDangerous = Math.max(e.dangerValue, mostDangerous);
                return true;
            }
            return false;
        }).filter((e) => {
            // Only return the highest tier of danger
            if (this.body.aiSettings.farm || e.dangerValue === mostDangerous) {
                if (this.targetLock && e.id === this.targetLock.id) keepTarget = true;
                return true;
            }
            return false;
        });
        // Reset target if it's not in there
        if (!keepTarget) this.targetLock = undefined;
        return out;
    }
    think(input) {
        // Override target lock upon other commands
        if (input.main || input.alt || this.body.master.autoOverride) {
            this.targetLock = undefined;
            return {};
        }
        // Otherwise, consider how fast we can either move to ram it or shoot at a potiential target.
        let tracking = this.body.topSpeed,
            range = this.body.fov;
        // Use whether we have functional guns to decide
        for (let i = 0; i < this.body.guns.length; i++) {
            if (this.body.guns[i].canShoot && !this.body.aiSettings.skynet) {
                let v = this.body.guns[i].getTracking();
                tracking = v.speed;
                if (!this.body.isPlayer || this.body.type === "miniboss" || this.body.master !== this.body) range = 640 * this.body.FOV;
                else range = Math.min(range, (v.speed || 1) * (v.range || 90));
                break;
            }
        }
        if (!Number.isFinite(tracking)) {
            tracking = this.body.topSpeed + .01;
        }
        if (!Number.isFinite(range)) {
            range = 640 * this.body.FOV;
        }
        // Check if my target's alive
        if (this.targetLock) {
            if (!this.validate(this.targetLock, {
                    x: this.body.x,
                    y: this.body.y,
                }, {
                    x: this.body.master.master.x,
                    y: this.body.master.master.y,
                }, range * range, range * range * 4 / 3)) {
                this.targetLock = undefined;
                this.tick = 100;
            }
        }
        // Think damn hard
        if (this.tick++ > 15 * roomSpeed) {
            this.tick = 0;
            this.validTargets = this.buildList(range);
            // Ditch our old target if it's invalid
            if (this.targetLock && this.validTargets.indexOf(this.targetLock) === -1) {
                this.targetLock = undefined;
            }
            // Lock new target if we still don't have one.
            if (this.targetLock == null && this.validTargets.length) {
                this.targetLock = (this.validTargets.length === 1) ? this.validTargets[0] : nearest(this.validTargets, {
                    x: this.body.x,
                    y: this.body.y
                });
                this.tick = -90;
            }
        }
        // Lock onto whoever's shooting me.
        // let damageRef = (this.body.bond == null) ? this.body : this.body.bond
        // if (damageRef.collisionArray.length && damageRef.health.display() < this.oldHealth) {
        //     this.oldHealth = damageRef.health.display()
        //     if (this.validTargets.indexOf(damageRef.collisionArray[0]) === -1) {
        //         this.targetLock = (damageRef.collisionArray[0].master.id === -1) ? damageRef.collisionArray[0].source : damageRef.collisionArray[0].master
        //     }
        // }
        // Consider how fast it's moving and shoot at it
        if (this.targetLock != null) {
            let radial = this.targetLock.velocity;
            let diff = {
                x: this.targetLock.x - this.body.x,
                y: this.targetLock.y - this.body.y,
            }
            /// Refresh lead time
            if (this.tick % 4 === 0) {
                this.lead = 0
                // Find lead time (or don't)
                if (!this.body.aiSettings.chase) {
                    let toi = timeOfImpact(diff, radial, tracking)
                    this.lead = toi
                }
            }
            if (!Number.isFinite(this.lead)) {
                this.lead = 0;
            }
            // And return our aim
            return {
                target: {
                    x: diff.x + this.lead * radial.x,
                    y: diff.y + this.lead * radial.y,
                },
                fire: true,
                main: true
            };
        }
        return {};
    }
}
ioTypes.avoid = class extends IO {
    constructor(body) {
        super(body)
    }
    think(input) {
        let masterId = this.body.master.id
        let range = this.body.size * this.body.size * 100
        this.avoid = nearest(entities, {
            x: this.body.x,
            y: this.body.y
        }, function (test, sqrdst) {
            return (test.master.id !== masterId && (test.type === 'bullet' || test.type === 'drone' || test.type === 'swarm' || test.type === 'trap' || test.type === 'block') && sqrdst < range);
        })
        // Aim at that target
        if (this.avoid != null) {
            // Consider how fast it's moving.
            let delt = new Vector(this.body.velocity.x - this.avoid.velocity.x, this.body.velocity.y - this.avoid.velocity.y)
            let diff = new Vector(this.avoid.x - this.body.x, this.avoid.y - this.body.y);
            let comp = (delt.x * diff.x + delt.y * diff.y) / delt.length / diff.length
            let goal = {}
            if (comp > 0) {
                if (input.goal) {
                    let goalDist = Math.sqrt(range / (input.goal.x * input.goal.x + input.goal.y * input.goal.y))
                    goal = {
                        x: input.goal.x * goalDist - diff.x * comp,
                        y: input.goal.y * goalDist - diff.y * comp
                    }
                } else {
                    goal = {
                        x: -diff.x * comp,
                        y: -diff.y * comp
                    }
                }
                return goal
            }
        }
    }
}
ioTypes.minion = class extends IO {
    constructor(body) {
        super(body);
        this.turnwise = 1;
    }
    think(input) {
        if (this.body.aiSettings.reverseDirection && ran.chance(0.005)) {
            this.turnwise = -1 * this.turnwise;
        }
        if (input.target != null && (input.alt || input.main)) {
            let sizeFactor = Math.sqrt(this.body.master.size / this.body.master.SIZE);
            let leash = 60 * sizeFactor;
            let orbit = this.body.type === "miniboss" ? (360 + this.body.size / 2) : (120 * sizeFactor);
            let repel = 135 * sizeFactor;
            let goal;
            let power = 1;
            let target = new Vector(input.target.x, input.target.y);
            if (input.alt) {
                // Leash
                if (target.length < leash) {
                    goal = {
                        x: this.body.x + target.x,
                        y: this.body.y + target.y,
                    };
                    // Spiral repel
                } else if (target.length < repel) {
                    let dir = -this.turnwise * target.direction + Math.PI / 5;
                    goal = {
                        x: this.body.x + Math.cos(dir),
                        y: this.body.y + Math.sin(dir),
                    };
                    // Free repel
                } else {
                    goal = {
                        x: this.body.x - target.x,
                        y: this.body.y - target.y,
                    };
                }
            } else if (input.main) {
                // Orbit point
                let dir = this.turnwise * target.direction + 0.01;
                goal = {
                    x: this.body.x + target.x - orbit * Math.cos(dir),
                    y: this.body.y + target.y - orbit * Math.sin(dir),
                };
                if (Math.abs(target.length - orbit) < this.body.size * 2) {
                    power = 0.7;
                }
            }
            return {
                goal: goal,
                power: power,
            };
        }
    }
}
ioTypes.hangOutNearMaster = class extends IO {
    constructor(body) {
        super(body);
        this.acceptsFromTop = false;
        this.orbit = 30;
        this.currentGoal = {
            x: this.body.source.x,
            y: this.body.source.y,
        };
        this.timer = 0;
    }
    think(input) {
        if (this.body.invisible[1]) return;
        if (this.body.source != this.body) {
            let bound1 = this.orbit * 0.8 + this.body.source.size + this.body.size;
            let bound2 = this.orbit * 1.5 + this.body.source.size + this.body.size;
            let dist = util.getDistance(this.body, this.body.source) + Math.PI / 8;
            let output = {
                target: {
                    x: this.body.velocity.x,
                    y: this.body.velocity.y,
                },
                goal: this.currentGoal,
                power: undefined,
            };
            // Set a goal
            if (dist > bound2 || this.timer > 30) {
                this.timer = 0;
                let dir = util.getDirection(this.body, this.body.source) + Math.PI * ran.random(0.5);
                let len = ran.randomRange(bound1, bound2);
                let x = this.body.source.x - len * Math.cos(dir);
                let y = this.body.source.y - len * Math.sin(dir);
                this.currentGoal = {
                    x: x,
                    y: y,
                };
            }
            if (dist < bound2) {
                output.power = 0.15;
                if (ran.chance(0.3)) {
                    this.timer++;
                }
            }
            return output;
        }
    }
}
ioTypes.spin = class extends IO {
    constructor(b) {
        super(b);
        this.a = 0;
    }
    think(input) {
        this.a += 0.05;
        let offset = 0;
        if (this.body.bond != null) {
            offset = this.body.bound.angle;
        }
        return {
            target: {
                x: Math.cos(this.a + offset),
                y: Math.sin(this.a + offset),
            },
            main: true,
        };
    }
}
ioTypes.fastspin = class extends IO {
    constructor(b) {
        super(b);
        this.a = 0;
    }
    think(input) {
        this.a += 0.072;
        let offset = 0;
        if (this.body.bond != null) {
            offset = this.body.bound.angle;
        }
        return {
            target: {
                x: Math.cos(this.a + offset),
                y: Math.sin(this.a + offset),
            },
            main: true,
        };
    }
}
ioTypes.reversespin = class extends IO {
    constructor(b) {
        super(b);
        this.a = 0;
    }
    think(input) {
        this.a -= 0.05;
        let offset = 0;
        if (this.body.bond != null) {
            offset = this.body.bound.angle;
        }
        return {
            target: {
                x: Math.cos(this.a + offset),
                y: Math.sin(this.a + offset),
            },
            main: true,
        };
    }
}
ioTypes.slowSpin = class extends IO {
    constructor(b) {
        super(b);
        this.a = 0;
    }
    think(input) {
        this.a += 0.01;
        let offset = 0;
        if (this.body.bond != null) {
            offset = this.body.bound.angle;
        }
        return {
            target: {
                x: Math.cos(this.a + offset),
                y: Math.sin(this.a + offset)
            },
            main: true
        };
    }
}
ioTypes.reverseSlowSpin = class extends IO {
    constructor(body) {
        super(body)
        this.a = 0
    }
    think(input) {
        this.a -= 0.01;
        let offset = 0
        if (this.body.bond != null) {
            offset = this.body.bound.angle
        }
        return {
            target: {
                x: Math.cos(this.a + offset),
                y: Math.sin(this.a + offset),
            },
            main: true,
        };
    }
}
ioTypes.dontTurn = class extends IO {
    constructor(b) {
        super(b);
    }
    think(input) {
        return {
            target: {
                x: 1,
                y: 0,
            },
            main: true,
        };
    }
}
ioTypes.dontTurnDominator = class extends IO {
    constructor(b) {
        super(b);
    }
    think(input) {
        return {
            target: rotatePoint({
                x: 10,
                y: 10
            }, Math.PI / 4),
            main: true,
        };
    }
}
ioTypes.fleeAtLowHealth = class extends IO {
    constructor(b) {
        super(b);
        this.fear = Math.random() * .25;
    }
    think(input) {
        if (input.fire && input.target != null && this.body.health.amount < this.body.health.max * this.fear) {
            return {
                goal: {
                    x: this.body.x - input.target.x,
                    y: this.body.y - input.target.y,
                },
            };
        }
    }
}
ioTypes.orion = class extends IO {
    constructor(b) {
        super(b);
        this.turnwise = 1;
        this.r = 0;
        this.turnover = false;
    }
    think(input) {
        let sizeFactor = Math.sqrt(this.body.master.size / this.body.master.SIZE),
            orbit = 45 * sizeFactor,
            power = 1;
        this.body.x += this.body.source.velocity.x;
        this.body.y += this.body.source.velocity.y;
        let dir = this.turnwise * util.getDirection(this.body, this.body.source) + .01,
            goal = {
                x: this.body.source.x - orbit * Math.cos(dir),
                y: this.body.source.y - orbit * Math.sin(dir)
            };
        return {
            goal: goal,
            power: power
        };
    }
}
ioTypes.botMovement = class extends IO {
    constructor(body) {
        super(body);
        this.goal = room.randomType("norm");
        this.timer = Math.random() * 500 | 0;
        this.defendTick = -1;
        this.state = 1;
    }
    think(input) {
        if (c.SPECIAL_BOSS_SPAWNS && room["bas1"] && room["bas1"].length < 3 && room["bas1"].length > 0) {
            if ((this.defendTick <= 0 && (!room.isIn("bas1", this.goal) || !input.target)) || (room.isIn("bas1", this.goal) && !input.target)) {
                this.goal = room.randomType("bas1");
                this.defendTick = 50 + Math.random() * 150;
            }
            this.defendTick --;
        } else if (c.TRENCH_WARFARE) {
            if ((this.defendTick <= 0 && (!room.isIn("bas2", this.goal) || !input.target)) || (room.isIn("bas2", this.goal) && !input.target)) {
                this.goal = room.randomType("bas2");
                this.defendTick = 50 + Math.random() * 150;
            }
        } else if (global.escortMotherships && global.escortMotherships.length) {
            const closest = global.escortMotherships.sort((a, b) => util.getDistance(a, this.body) - util.getDistance(b, this.body))[0];
            if (closest && util.getDistance(closest, this.body) > this.body.size * 25) {
                this.goal = {
                    x: closest.x,
                    y: closest.y
                };
            } else {
                this.timer --;
            if (input.target) {
                if (this.timer <= 0 || util.getDistance(this.body, this.goal) < this.body.SIZE || this.state === 1) {
                    const target = {
                        x: input.target.x + this.body.x,
                        y: input.target.y + this.body.y
                    };
                    const angle = Math.atan2(target.y - this.body.y, target.x - this.body.x) + (Math.PI / 2 * (Math.random() - .5));
                    const dist = Math.random() * this.body.fov;
                    this.timer = Math.random() * 100 | 0;
                    this.goal = {
                        x: target.x + Math.cos(angle) * dist,
                        y: target.y + Math.sin(angle) * dist
                    };
                    this.state = 0;
                }
            } else {
                if (this.timer <= 0 || util.getDistance(this.body, this.goal) < this.body.SIZE || this.state === 0) {
                    this.timer = Math.random() * 500 | 0;
                    this.state = 1;
                    this.goal = room.randomType(Math.random() > .9 ? "nest" : "norm");
                }
            }
            }
        } else {
            this.timer --;
            if (input.target) {
                if (this.timer <= 0 || util.getDistance(this.body, this.goal) < this.body.SIZE || this.state === 1) {
                    const target = {
                        x: input.target.x + this.body.x,
                        y: input.target.y + this.body.y
                    };
                    const angle = Math.atan2(target.y - this.body.y, target.x - this.body.x) + (Math.PI / 2 * (Math.random() - .5));
                    const dist = Math.random() * this.body.fov;
                    this.timer = Math.random() * 100 | 0;
                    this.goal = {
                        x: target.x + Math.cos(angle) * dist,
                        y: target.y + Math.sin(angle) * dist
                    };
                    this.state = 0;
                }
            } else {
                if (this.timer <= 0 || util.getDistance(this.body, this.goal) < this.body.SIZE || this.state === 0) {
                    this.timer = Math.random() * 500 | 0;
                    this.state = 1;
                    this.goal = room.randomType(Math.random() > .9 ? "nest" : "norm");
                }
            }
        }
        return {
            goal: this.goal
        }
    }
}
ioTypes.listenToPlayerStatic = class extends IO {
    constructor(b, p) {
        super(b);
        this.player = p;
        this.acceptsFromTop = false;
    }
    think() {
        let targ = {
            x: this.player.target.x,
            y: this.player.target.y,
        };
        if (this.player.command.autospin) {
            let kk = Math.atan2(this.body.control.target.y, this.body.control.target.x) + 0.02;
            targ = {
                x: 275 * Math.cos(kk),
                y: 275 * Math.sin(kk),
            };
        }
        if (this.body.invuln && (this.player.command.right || this.player.command.left || this.player.command.up || this.player.command.down || this.player.command.lmb)) {
            this.body.invuln = false;
            if (this.body.invisible[0] === 0) {
                let alpha = this.body.alphaMax
                this.body.alpha = alpha
            }
        }
        this.body.autoOverride = this.body.passive || this.player.command.override;
        return {
            target: targ,
            fire: this.player.command.lmb || this.player.command.autofire,
            main: this.player.command.lmb || this.player.command.autospin || this.player.command.autofire,
            alt: this.player.command.rmb,
            power: 1,
            goal: {
                x: this.body.x,
                y: this.body.y
            }
        };
    }
}
ioTypes.spinWhenIdle = class extends IO {
    constructor(b) {
        super(b);
        this.a = 0;
    }
    think(input) {
        if (input.target) {
            this.a = Math.atan2(input.target.y, input.target.x);
            return input;
        }
        this.a += 0.02;
        return {
            target: {
                x: Math.cos(this.a),
                y: Math.sin(this.a)
            },
            main: true,
            goal: {
                x: this.body.x,
                y: this.body.y
            }
        };
    }
}
ioTypes.multiboxClone = class extends IO {
    constructor(b) {
        super(b);
    }
    think(input) {
        if (this.body.multiboxMaster) {
            let control = this.body.multiboxMaster.control;
            control.goal = {
                x: this.body.multiboxMaster.x,
                y: this.body.multiboxMaster.y
            };
            control.power = 1;
            return control;
        }
    }
}
ioTypes.taurusPortal = class extends IO {
    constructor(body) {
        super(body);
        this.myGoal = {
            x: body.master.control.target.x + body.master.x,
            y: body.master.control.target.y + body.master.y,
        };
    }
    think() {
        this.body.x = this.myGoal.x;
        this.body.y = this.myGoal.y;
    }
}
ioTypes.spinMissile = class extends IO {
    constructor(body) {
        super(body);
        this.angle = 0;
    }
    think(input) {
        this.angle += (0.125 * (input.alt ? -2 : 1));
        let offset = 0;
        if (this.body.bond != null) {
            offset = this.body.bound.angle;
        }
        return {
            target: {
                x: Math.cos(this.angle + offset),
                y: Math.sin(this.angle + offset),
            },
            main: true
        };
    }
}
const skipBombVariation = Math.PI / 3;
ioTypes.skipBomb = class extends IO {
    constructor(body) {
        super(body);
        this.goal = {
            x: 0,
            y: 0
        };
        this.lastSkip = Date.now();
    }
    think(input) {
        if (Date.now() - this.lastSkip >= 1250) {
            this.lastSkip = Date.now();
            const angle = this.body.velocity.direction + (Math.random() * (skipBombVariation * 2) + skipBombVariation);
            this.goal = {
                x: Math.cos(angle) * 100,
                y: Math.cos(angle) * 100
            };
        }
        return {
            target: {
                x: this.goal.x,
                y: this.goal.y
            },
            power: 1
        }
    }
}
ioTypes.nestNPC = class extends IO {
    constructor(body) {
        super(body);
        this.goal = room.randomType("nest");
    }
    think(input) {
        if (!input.main && !input.alt && !room.isIn("nest", this.body)) {
            return {
                main: false,
                alt: false,
                goal: this.goal,
                target: {
                    x: this.goal.x - this.body.x,
                    y: this.goal.y - this.body.y
                }
            }
        }
    }
}
ioTypes.bossRushAI = class extends IO {
    constructor(body) {
        super(body);
        this.enabled = true;
        this.goal = room.randomType("nest");
    }
    think(input) {
        if (room.isIn("nest", this.body)) {
            this.enabled = false;
        }
        if (room.isIn("boss", this.body)) {
            this.enabled = true;
        }
        if (this.enabled) {
            return {
                main: false,
                alt: false,
                goal: this.goal,
                target: {
                    x: this.goal.x - this.body.x,
                    y: this.goal.y - this.body.y
                }
            }
        } else if (!input.main && !input.alt) {
            if (room["bas1"] && room["bas1"].length) {
                this.goal = room["bas1"][0];
                return {
                    main: false,
                    alt: false,
                    goal: this.goal,
                    target: {
                        x: this.goal.x - this.body.x,
                        y: this.goal.y - this.body.y
                    }
                }
            }
        }
    }
}
ioTypes.escortMothershipAI = class extends IO {
    constructor(body) {
        super(body);
        this.enabled = true;
        this.goal = {
            x: room.width / 2,
            y: room.height / 2
        };
    }
    think() {
        if (util.getDistance(this.body, this.goal) < 100 && room.isIn("nest", this.body)) {
            this.goal = room["goal"][Math.random() * room["goal"].length | 0];
        }
        return {
            main: false,
            alt: false,
            goal: this.goal
        }
    }
}
ioTypes.pathFind = class extends IO {
    constructor(body) {
        super(body);
        this.path = [];
        this.lastPathUpdate = 0;
    }
    think(input) {
        if (!input.target || typeof global.findPath !== "function") {
            this.path = [];
            return;
        }
        if (!this.path.length || Date.now() - this.lastPathUpdate > 1000) {
            this.path = findPath(this.body, {
                x: input.target.x + this.body.x,
                y: input.target.y + this.body.y
            });
            this.lastPathUpdate = Date.now();
        }
        if (this.path.length) {
            if (this.path.length < 2 || !global.checkIfNearWalls(this.body)) {
                this.path = [];
                this.lastPathUpdate = Date.now() + 5000;
            } else if (util.getDistance(this.body, {
                x: this.path[0].x,
                y: this.path[0].y
            }) < 1) {
                this.path.shift();
            } else {
                return {
                    goal: {
                        x: this.path[0].x,
                        y: this.path[0].y
                    },
                    power: 1.334
                }
            }
        }
    }
}
ioTypes.carrierThinking = class extends IO {
    constructor(body) {
        super(body);
        this.targetLock = undefined;
        this.tick = ran.irandom(30);
        this.lead = 0;
        this.validTargets = this.buildList(body.fov * 10);
        this.oldHealth = body.health.display();
    }
    validate(e, m, mm, sqrRange, sqrRangeMaster) {
        return (e.health.amount > 0) &&
        (e.dangerValue > 0) &&
        (!e.invuln && !e.master.master.passive && !this.body.master.master.passive) &&
        (e.master.master.team !== this.body.master.master.team) &&
        (e.master.master.team !== -101) &&
        (this.body.aiSettings.seeInvisible || e.alpha > 0.5) &&
        (!c.SANDBOX || this.body.master.master.sandboxId === e.master.master.sandboxId) &&
        (this.body.settings.targetPlanes ? e.isPlane : this.body.settings.targetMissiles ? e.settings.missile : this.body.settings.targetAmmo ? (e.type === "drone" || e.type === "minion" || e.type === "swarm" || e.type === "crasher") : (e.type === "tank" || e.type === "miniboss")) &&
        (this.body.aiSettings.blind || ((e.x - m.x) * (e.x - m.x) < sqrRange && (e.y - m.y) * (e.y - m.y) < sqrRange)) &&
        (this.body.aiSettings.skynet || ((e.x - mm.x) * (e.x - mm.x) < sqrRangeMaster && (e.y - mm.y) * (e.y - mm.y) < sqrRangeMaster));
    }
    buildList(range) {
        // Establish whom we judge in reference to
        let mostDangerous = 0,
            keepTarget = false;
        // Filter through everybody...
        let out = entities.filter(e => {
            if (this.body.controllingSquadron && this.body.lastCameraPos) {
                return this.validate(e, {
                    x: this.body.lastCameraPos[0],
                    y: this.body.lastCameraPos[1],
                }, {
                    x: this.body.lastCameraPos[0],
                    y: this.body.lastCameraPos[1],
                }, range * range, range * range * 4 / 3);
            }
            // Only look at those within our view, and our parent's view, not dead, not invisible, not our kind, not a bullet/trap/block etc
            return this.validate(e, {
                    x: this.body.x,
                    y: this.body.y,
                }, {
                    x: this.body.master.master.x,
                    y: this.body.master.master.y,
                }, range * range, range * range * 4 / 3);
        }).filter((e) => {
            // Only look at those within range and arc (more expensive, so we only do it on the few)
            if (this.body.firingArc == null || this.body.aiSettings.view360 || Math.abs(util.angleDifference(util.getDirection(this.body, e), this.body.firingArc[0])) < this.body.firingArc[1]) {
                mostDangerous = Math.max(e.dangerValue, mostDangerous);
                return true;
            }
            return false;
        }).filter((e) => {
            // Only return the highest tier of danger
            if (this.body.aiSettings.farm || e.dangerValue === mostDangerous) {
                if (this.targetLock && e.id === this.targetLock.id) keepTarget = true;
                return true;
            }
            return false;
        });
        // Reset target if it's not in there
        if (!keepTarget) this.targetLock = undefined;
        return out;
    }
    think(input) {
        // Override target lock upon other commands
        if (input.main || input.alt || this.body.master.autoOverride) {
            this.targetLock = undefined;
            return {};
        }
        // Otherwise, consider how fast we can either move to ram it or shoot at a potiential target.
        let tracking = this.body.topSpeed,
            range = this.body.fov;
        // Use whether we have functional guns to decide
        for (let i = 0; i < this.body.guns.length; i++) {
            if (this.body.guns[i].canShoot && !this.body.aiSettings.skynet) {
                let v = this.body.guns[i].getTracking();
                tracking = v.speed;
                if (!this.body.isPlayer || this.body.type === "miniboss" || this.body.master !== this.body) range = 640 * this.body.FOV;
                else range = Math.min(range, (v.speed || 1) * (v.range || 90));
                break;
            }
        }
        if (!Number.isFinite(tracking)) {
            tracking = this.body.topSpeed + .01;
        }
        if (!Number.isFinite(range)) {
            range = 640 * this.body.FOV;
        }
        // Check if my target's alive
        if (this.targetLock) {
            if (this.body.controllingSquadron && this.body.lastCameraPos) {
                if (!this.validate(this.targetLock, {
                        x: this.body.lastCameraPos[0],
                        y: this.body.lastCameraPos[1],
                    }, {
                        x: this.body.lastCameraPos[0],
                        y: this.body.lastCameraPos[1],
                    }, range * range, range * range * 4 / 3)) {
                        this.targetLock = undefined;
                    this.tick = 100;
                }
            } else if (!this.validate(this.targetLock, {
                    x: this.body.x,
                    y: this.body.y,
                }, {
                    x: this.body.master.master.x,
                    y: this.body.master.master.y,
                }, range * range, range * range * 4 / 3)) {
                this.targetLock = undefined;
                this.tick = 100;
            }
        }
        // Think damn hard
        if (this.tick++ > 15 * roomSpeed) {
            this.tick = 0;
            this.validTargets = this.buildList(range * 10);
            // Ditch our old target if it's invalid
            if (this.targetLock && this.validTargets.indexOf(this.targetLock) === -1) {
                this.targetLock = undefined;
            }
            // Lock new target if we still don't have one.
            if (this.targetLock == null && this.validTargets.length) {
                this.targetLock = (this.validTargets.length === 1) ? this.validTargets[0] : nearest(this.validTargets, {
                    x: this.body.x,
                    y: this.body.y
                });
                this.tick = -90;
            }
        }
        // Lock onto whoever's shooting me.
        // let damageRef = (this.body.bond == null) ? this.body : this.body.bond
        // if (damageRef.collisionArray.length && damageRef.health.display() < this.oldHealth) {
        //     this.oldHealth = damageRef.health.display()
        //     if (this.validTargets.indexOf(damageRef.collisionArray[0]) === -1) {
        //         this.targetLock = (damageRef.collisionArray[0].master.id === -1) ? damageRef.collisionArray[0].source : damageRef.collisionArray[0].master
        //     }
        // }
        // Consider how fast it's moving and shoot at it
        if (this.targetLock != null) {
            const squadron = this.body.controllingSquadron && this.body.lastCameraPos;
            let radial = this.targetLock.velocity;
            let diff = {
                x: this.targetLock.x - (squadron ? this.body.lastCameraPos[0] : this.body.x),
                y: this.targetLock.y - (squadron ? this.body.lastCameraPos[1] : this.body.y)
            }
            /// Refresh lead time
            if (this.tick % 4 === 0) {
                this.lead = 0
                // Find lead time (or don't)
                if (!this.body.aiSettings.chase) {
                    let toi = timeOfImpact(diff, radial, tracking)
                    this.lead = toi
                }
            }
            if (!Number.isFinite(this.lead)) {
                this.lead = 0;
            }
            // And return our aim
            return {
                target: {
                    x: diff.x + this.lead * radial.x,
                    y: diff.y + this.lead * radial.y,
                },
                fire: true,
                main: true,
                alt: squadron && util.getDistance(this.targetLock, { x: this.body.lastCameraPos[0], y: this.body.lastCameraPos[1] }) < this.targetLock.SIZE * 3
            };
        }
        return {};
    }
}
ioTypes.carrierAI = class extends IO {
    constructor(body) {
        super(body);
        this.goal = room.random();
        this.goalDate = Date.now();
    }
    summon() {
        const possible = this.body.guns.filter(gun => typeof gun.launchSquadron === "string");
        if (possible.length) {
            const gun = possible[Math.random() * possible.length | 0];
            if (gun && (Date.now() - gun.coolDown.time >= 10000 + (gun.countsOwnKids * 1000)) && !this.body.controllingSquadron) {
                gun.coolDown.time = Date.now();
                let gx = gun.offset * Math.cos(gun.direction + gun.angle + gun.body.facing) + (1.5 * gun.length - gun.width * gun.settings.size / 2) * Math.cos(gun.angle + gun.body.facing),
                    gy = gun.offset * Math.sin(gun.direction + gun.angle + gun.body.facing) + (1.5 * gun.length - gun.width * gun.settings.size / 2) * Math.sin(gun.angle + gun.body.facing);
                for (let i = 0; i < gun.countsOwnKids; i++) setTimeout(() => gun.fire(gx, gy, gun.body.skill, true), 75 * i);
                setTimeout(() => {
                    if (this.body != null) {
                        this.body.controllingSquadron = true;
                    }
                }, 75 * gun.countsOwnKids);
            }
        }
    }
    think(input) {
        if (!this.body.controllingSquadron && Math.random() > .95) {
            this.summon();
        }
        if (this.body.controllingSquadron) {
            const squadron = this.body.guns.find(gun => typeof gun.launchSquadron === "string" && gun.children.length);
            if (squadron) {
                let x = 0, y = 0;
                for (const child of squadron.children) {
                    x += child.x;
                    y += child.y;
                }
                x /= squadron.children.length;
                y /= squadron.children.length;
                this.body.lastCameraPos = [x, y];
                this.body.cameraLingerTime = 35;
                global.squadronPoints[this.body.id] = {
                    showsOnMap: true,
                    isSquadron: true,
                    x: x,
                    y: y,
                    SIZE: 1,
                    color: this.body.color,
                    id: squadron.children[0].id
                };
            } else {
                delete global.squadronPoints[this.body.id];
                this.body.cameraLingerTime --;
                if (this.body.cameraLingerTime <= 0) this.body.controllingSquadron = false;
            }
        } else if (global.squadronPoints[this.body.id]) {
            delete global.squadronPoints[this.body.id];
        }
        if (Date.now() - this.goalDate > 10000 || util.getDistance(this.goal, this.body) < 250) {
            this.goal = room.random();
            this.goalDate = Date.now();
        }
        input.goal = {
            x: this.goal.x - this.body.x,
            y: this.goal.y - this.body.y
        };
        return input;
    }
}
ioTypes.sineA = class extends IO {
    constructor(b) {
        super(b);
        this.phase = 5;
        const wo = this.body.master.facing;
        this.wo = wo;
    }
    think(input) {
        this.phase += .5;
        this.body.x += this.phase * Math.cos(this.wo) - 10 * Math.cos(this.phase) * Math.sin(this.wo);
        this.body.y += this.phase * Math.sin(this.wo) + 10 * Math.cos(this.phase) * Math.cos(this.wo);
        this.body.facing = this.wo;
        return {
            power: 1
        };
    }
}
ioTypes.sineB = class  extends IO {
    constructor(b) {
        super(b);
        this.phase = 5;
        const wo = this.body.master.facing;
        this.wo = wo;
    }
    think(input) {
        this.phase += .5;
        this.body.x += this.phase * Math.cos(this.wo) + 10 * Math.cos(this.phase) * Math.sin(this.wo);
        this.body.y += this.phase * Math.sin(this.wo) - 10 * Math.cos(this.phase) * Math.cos(this.wo);
        this.body.facing = this.wo;
        return {
            power: 1
        };
    }
}
module.exports = {
    IO,
    ioTypes
};
