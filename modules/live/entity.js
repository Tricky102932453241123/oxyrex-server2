/*jslint node: true */
/*jshint -W061 */
/*global goog, Map, let */
"use strict";
// General requires
require('google-closure-library');
goog.require('goog.structs.PriorityQueue');
goog.require('goog.structs.QuadTree');
class Gun {
    constructor(body, info) {
        this.lastShot = {
            time: 0,
            power: 0,
        };
        this.body = body;
        this.master = body.source;
        this.label = '';
        this.controllers = [];
        this.children = [];
        this.control = {
            target: new Vector(0, 0),
            goal: new Vector(0, 0),
            main: false,
            alt: false,
            fire: false,
        };
        this.color = 16;
        this.skin = 0;
        this.canShoot = false;
        this.launchSquadron = info.LAUNCH_SQUADRON;
        this.coolDown = {
            time: 0,
            max: +info.COOLDOWN
        };
                
        if (info.PROPERTIES != null && info.PROPERTIES.TYPE != null) {
            this.canShoot = true;
            this.label = (info.PROPERTIES.LABEL == null) ? '' : info.PROPERTIES.LABEL;
            if (Array.isArray(info.PROPERTIES.TYPE)) { // This is to be nicer about our definitions
                this.bulletTypes = info.PROPERTIES.TYPE;
                this.natural = info.PROPERTIES.TYPE.BODY;
            } else {
                this.bulletTypes = [info.PROPERTIES.TYPE];
            }
            // Pre-load bullet definitions so we don't have to recalculate them every shot
            let natural = {};
            this.bulletTypes.forEach(function setNatural(type) {
                if (type.PARENT != null) { // Make sure we load from the parents first
                    for (let i = 0; i < type.PARENT.length; i++) {
                        setNatural(type.PARENT[i]);
                    }
                }
                if (type.BODY != null) { // Get values if they exist
                    for (let index in type.BODY) {
                        natural[index] = type.BODY[index];
                    }
                }
            });
            this.natural = natural; // Save it
            if (info.PROPERTIES.GUN_CONTROLLERS != null) {
                let toAdd = [];
                let self = this;
                info.PROPERTIES.GUN_CONTROLLERS.forEach(function(ioName) {
                    toAdd.push(eval('new ' + ioName + '(self)'));
                });
                this.controllers = toAdd.concat(this.controllers);
            }
            this.setSubmerged = (info.PROPERTIES.SET_SUBMERGED == null) ? null : info.PROPERTIES.SET_SUBMERGED;
            this.onShoot = (info.PROPERTIES.ON_SHOOT == null) ? null : info.PROPERTIES.ON_SHOOT;
            this.autofire = (info.PROPERTIES.AUTOFIRE == null) ? false : info.PROPERTIES.AUTOFIRE;
			this.randomType = (info.PROPERTIES.RANDOM_TYPE == null) ? false : info.PROPERTIES.RANDOM_TYPE;
            this.altFire = (info.PROPERTIES.ALT_FIRE == null) ? false : info.PROPERTIES.ALT_FIRE;
            this.settings = (info.PROPERTIES.SHOOT_SETTINGS == null) ? [] : info.PROPERTIES.SHOOT_SETTINGS;
            this.settings2 = (info.PROPERTIES.SHOOT_SETTINGS2 == null) ? [] : info.PROPERTIES.SHOOT_SETTINGS2;
            this.settings3 = (info.PROPERTIES.SHOOT_SETTINGS3 == null) ? [] : info.PROPERTIES.SHOOT_SETTINGS3;
            this.calculator = (info.PROPERTIES.STAT_CALCULATOR == null) ? 'default' : info.PROPERTIES.STAT_CALCULATOR;
            this.waitToCycle = (info.PROPERTIES.WAIT_TO_CYCLE == null) ? false : info.PROPERTIES.WAIT_TO_CYCLE;
            this.bulletStats = (info.PROPERTIES.BULLET_STATS == null || info.PROPERTIES.BULLET_STATS == 'master') ? 'master' : new Skill(info.PROPERTIES.BULLET_STATS);
            this.settings = (info.PROPERTIES.SHOOT_SETTINGS == null) ? [] : info.PROPERTIES.SHOOT_SETTINGS;
            this.countsOwnKids = (info.PROPERTIES.MAX_CHILDREN == null) ? false : info.PROPERTIES.MAX_CHILDREN;
            this.syncsSkills = (info.PROPERTIES.SYNCS_SKILLS == null) ? false : info.PROPERTIES.SYNCS_SKILLS;
            this.negRecoil = (info.PROPERTIES.NEGATIVE_RECOIL == null) ? false : info.PROPERTIES.NEGATIVE_RECOIL;
            this.destroyOldestChild = info.PROPERTIES.DESTROY_OLDEST_CHILD == null ? false : info.PROPERTIES.DESTROY_OLDEST_CHILD;
            this.colorOverride = info.PROPERTIES.COLOR_OVERRIDE;
            this.colorAtBody = info.PROPERTIES.COLOR_OVERRIDE_BODY;
            if (info.PROPERTIES.COLOR != null && info.PROPERTIES != null) {
                this.color = info.PROPERTIES.COLOR
            }
            if (info.PROPERTIES.COLOR_UNMIX != null && info.PROPERTIES != null) {
                this.colorUnmix = info.PROPERTIES.COLOR_UNMIX;
            }

            this.shootOnDeath = !!info.PROPERTIES.SHOOT_ON_DEATH;
            if (this.shootOnDeath) this.body.onDead = () => {
                for (let i = 0; i < this.body.guns.length; i++) {
                    let gun = this.body.guns[i];
                    if (gun.shootOnDeath) {
                        let gx = gun.offset * Math.cos(gun.direction + gun.angle + gun.body.facing) + (1.5 * gun.length - gun.width * gun.settings.size / 2) * Math.cos(gun.angle + this.body.facing),
                        gy = gun.offset * Math.sin(gun.direction + gun.angle + gun.body.facing) + (1.5 * gun.length - gun.width * gun.settings.size / 2) * Math.sin(gun.angle + this.body.facing);
                        gun.fire(gx, gy, this.body.skill);
                    }
                }
            };
        }
        if (info.PROPERTIES != null && info.PROPERTIES.COLOR != null) this.color = info.PROPERTIES.COLOR;
        if (info.PROPERTIES != null && info.PROPERTIES.COLOR_UNMIX != null) this.colorUnmix = info.PROPERTIES.COLOR_UNMIX;
        if (info.PROPERTIES != null && info.PROPERTIES.SKIN != null) this.skin = info.PROPERTIES.SKIN;
        if (info.PROPERTIES != null && info.PROPERTIES.ON_SHOOT != null) this.onshoot = info.PROPERTIES.ON_SHOOT;
        let position = info.POSITION;
        this.length = position[0] / 10;
        this.width = position[1] / 10;
        this.aspect = position[2];
        let _off = new Vector(position[3], position[4]);
        this.angle = position[5] * Math.PI / 180;
        this.direction = _off.direction;
        this.offset = _off.length / 10;
        this.delay = position[6];
        this.position = 0;
        this.motion = 0;
        if (this.canShoot) {
            this.cycle = !this.waitToCycle - this.delay;
            this.trueRecoil = this.settings.recoil;
            this.recoilDir = 0;
        }
    }
    recoil() {
        if (this.motion || this.position) {
            // Simulate recoil
            this.motion -= 0.25 * this.position / roomSpeed;
            this.position += this.motion;
            if (this.position < 0) { // Bouncing off the back
                this.position = 0;
                this.motion = -this.motion;
            }
            if (this.motion > 0) {
                this.motion *= 0.75;
            }
        }
        if (this.canShoot && !this.body.settings.hasNoRecoil) {
            // Apply recoil to motion
            if (this.motion > 0) {
                let recoilForce = -this.position * this.trueRecoil * 0.045 / roomSpeed * (1 + c.SPACE_PHYSICS);
                this.body.accel.x += recoilForce * Math.cos(this.recoilDir);
                this.body.accel.y += recoilForce * Math.sin(this.recoilDir);
            }
        }
    }
    getSkillRaw() {
        if (this.bulletStats === 'master') {
            return [
                this.body.skill.raw[0],
                this.body.skill.raw[1],
                this.body.skill.raw[2],
                this.body.skill.raw[3],
                this.body.skill.raw[4],
                0, 0, 0, 0, 0,
            ];
        }
        return this.bulletStats.raw;
    }
    getLastShot() {
        return this.lastShot;
    }
    live() {
        // Do
        this.recoil();
        // Dummies ignore this
        if (this.canShoot) {
            // Find the proper skillset for shooting
            let sk = (this.bulletStats === 'master') ? this.body.skill : this.bulletStats;
            // Decides what to do based on child-counting settings
            let shootPermission = (this.countsOwnKids) ? this.countsOwnKids > this.children.length * ((this.calculator == 'necro') ? sk.rld : 1) : (this.body.maxChildren) ? this.body.maxChildren > this.body.children.length * ((this.calculator == 'necro') ? sk.rld : 1) : true;
            if (this.destroyOldestChild) {
                if (!shootPermission) {
                    shootPermission = true;
                    this.destroyOldest();
                }
            }
            // Override in invuln
            if (this.body.master.invuln) {
                shootPermission = false;
            }
            // Cycle up if we should
            if (shootPermission || !this.waitToCycle) {
                if (this.cycle < 1) {
                    this.cycle += 1 / this.settings.reload / roomSpeed / ((this.calculator == 'necro' || this.calculator == 'fixed reload') ? 1 : sk.rld);
                }
            }
            // Firing routines
            if (shootPermission && (this.autofire || ((this.altFire) ? this.body.control.alt : this.body.control.fire))) {
                if (this.cycle >= 1) {
                    // Find the end of the gun barrel
                    let gx = this.offset * Math.cos(this.direction + this.angle + this.body.facing) + (1.5 * this.length - this.width * this.settings.size / 2) * Math.cos(this.angle + this.body.facing);
                    let gy = this.offset * Math.sin(this.direction + this.angle + this.body.facing) + (1.5 * this.length - this.width * this.settings.size / 2) * Math.sin(this.angle + this.body.facing);
                    // Shoot, multiple times in a tick if needed
                    this.fire(gx, gy, sk);
                    // Cycle down
                    this.cycle -= 1;
                    /*let shots = 0;
                    while (shootPermission && this.cycle >= 1 && shots < 3) {
                        shots ++;
                        this.fire(gx, gy, sk);
                        // Figure out if we may still shoot
                        shootPermission = (this.countsOwnKids) ? this.countsOwnKids > this.children.length : (this.body.maxChildren) ? this.body.maxChildren > this.body.children.length : true;
                        // Cycle down
                        this.cycle -= 1;
                    }*/
                } // If we're not shooting, only cycle up to where we'll have the proper firing delay
            } else if (this.cycle > !this.waitToCycle - this.delay) {
                this.cycle = !this.waitToCycle - this.delay;
            }
        }
    }
    destroyOldest() {
        /*let oldest = this.children.length - this.countsOwnKids;
        for (let i = oldest - 1; i < oldest; i++) {
          let o = this.children[i];
          if (o) o.kill();
        }*/
        let child = this.children.map(entry => entry).filter(instance => !!instance).sort((a, b) => a.creationTime - b.creationTime)[0];
        if (child) child.kill();
    }
    syncChildren() {
        if (this.syncsSkills) {
            let self = this;
            for (let i = 0; i < this.children.length; i++) {
                let child = this.children[i];
                child.define({
                    BODY: self.interpret(),
                    SKILL: self.getSkillRaw()
                });
                child.refreshBodyAttributes();
            }
        }
    }
    fire(gx, gy, sk, carrier = false) {
        if (this.body.emp.timeLeft > 0 || this.body.master.emp.timeLeft > 0 || this.body.master.master.emp.timeLeft > 0) {
            return;
        }
        if (this.launchSquadron && this.launchSquadron !== "yes" && !carrier) return;
        if (c.MODE === "tdm" && c.DO_BASE_DAMAGE && this.master.master.isPlayer) {
            for (let i = 1; i <= c.TEAMS; i ++) {
                if (room[`bas${i}`].length && room.isIn(`bas${i}`, this.master.master)) return;
                if (room[`bap${i}`].length && room.isIn(`bap${i}`, this.master.master)) return;
            }
        }
        // Recoil
        this.lastShot.time = util.time();
        this.lastShot.power = 3 * Math.log(Math.sqrt(sk.spd) + this.trueRecoil + 1) + 1;
        this.motion += this.lastShot.power;
        // Find inaccuracy
        let ss = ran.gauss(0, Math.sqrt(this.settings.shudder)), sd = ran.gauss(0, this.settings.spray * this.settings.shudder);
        let loops = 0;
        do {
            loops ++;
            ss = ran.gauss(0, Math.sqrt(this.settings.shudder));
        } while ((Math.abs(ss) >= this.settings.shudder * 2) && loops < 5);
        loops = 0;
        do {
            loops ++;
            sd = ran.gauss(0, this.settings.spray * this.settings.shudder);
        } while ((Math.abs(sd) >= this.settings.spray / 2) && loops < 5);
        sd *= Math.PI / 180;
        // Find speed
        let s = new Vector(
            ((this.negRecoil) ? -1 : 1) * this.settings.speed * c.runSpeed * sk.spd * (1 + ss) * Math.cos(this.angle + this.body.facing + sd),
            ((this.negRecoil) ? -1 : 1) * this.settings.speed * c.runSpeed * sk.spd * (1 + ss) * Math.sin(this.angle + this.body.facing + sd));
        // Boost it if we shouldw
        if (this.body.velocity.length) {
            let extraBoost = Math.max(0, s.x * this.body.velocity.x + s.y * this.body.velocity.y) / this.body.velocity.length / s.length;
            if (extraBoost) {
                let len = s.length;
                s.x += this.body.velocity.length * extraBoost * s.x / len;
                s.y += this.body.velocity.length * extraBoost * s.y / len;
            }
        }
        // Create the bullet
        var o = new Entity({
            x: this.body.x + this.body.size * gx - s.x,
            y: this.body.y + this.body.size * gy - s.y,
        }, this.master.master);
        /*let jumpAhead = this.cycle - 1;
        if (jumpAhead) {
            o.x += s.x * this.cycle / jumpAhead;
            o.y += s.y * this.cycle / jumpAhead;
        }*/
        o.velocity = s;
        if (this.setSubmerged) {
            o.submarine.submerged = this.body.submarine.submerged;
        }
        if (o.submarine.submerged) {
            o.alpha = .15;
        }
        this.bulletInit(o);
        o.coreSize = o.SIZE;
    }
    bulletInit(o) {
        // Define it by its natural properties
		if (this.randomType) {
			o.define(ran.choose(this.bulletTypes))
		} else {
        this.bulletTypes.forEach(type => o.define(type))};
        // Pass the gun attributes
        o.define({
            BODY: this.interpret(),
            SKILL: this.getSkillRaw(),
            SIZE: this.body.size * this.width * this.settings.size / 2,
            LABEL: this.master.label + ((this.label) ? ' ' + this.label : '') + ' ' + o.label,
        });
        o.color = this.colorOverride == null ? this.body.master.color : this.colorOverride;
        if (this.colorOverride == null) {
            let source = this.body;
            while (source.id != source.source.id) {
                source = source.source;
                if (source.isOverridingColor) {
                    o.color = source.color;
                    break;
                }
            }
        }
        // Keep track of it and give it the function it needs to deutil.log itself upon death
        if (this.countsOwnKids) {
            o.parent = this;
            this.children.push(o);
        } else if (this.body.maxChildren) {
            o.parent = this.body;
            this.body.children.push(o);
            this.children.push(o);
        }
        o.source = this.body;
        o.facing = o.velocity.direction;
        // Necromancers.
        let oo = o;
        o.necro = (host, retain = false) => {
            let shootPermission = (this.countsOwnKids) ? this.countsOwnKids > this.children.length * ((this.bulletStats === 'master') ? this.body.skill.rld : this.bulletStats.rld) : (this.body.maxChildren) ? this.body.maxChildren > this.body.children.length * ((this.bulletStats === 'master') ? this.body.skill.rld : this.bulletStats.rld) : true;
            if (shootPermission) {
                let save = {
                    facing: host.facing,
                    size: host.SIZE,
                    index: host.index
                };
                if (!retain) host.define(Class.genericEntity);
                this.bulletInit(host);
                host.team = oo.master.master.team;
                host.master = oo.master;
                host.source = oo.source;
                host.color = oo.color;
                host.facing = save.facing;
                host.SIZE = oo.SIZE;
                host.health.max = oo.health.max;
                host.health.amount = host.health.max;
                if (retain) {
                    host.velocity.x *= -0.5;
                    host.velocity.y *= -0.5;
                    host.index = save.index;
                    host.independent = true;
                    host.damage *= 0.5;
                    host.health.max /= 2;
                    host.health.amount = host.health.max;
                    host.refreshBodyAttributes();
                }
                return true;
            }
            return false;
        };
        // Otherwise
        o.refreshBodyAttributes();
        o.life();
        this.onShootFunction(o);
        this.recoilDir = this.body.facing + this.angle;
    }
    onShootFunction(bullet) {
        if (typeof this.onShoot === "string") {
            switch (this.onShoot) {
                case "die": {
                    this.body.kill();
                } break;
                case "plane": {
                    setTimeout(() => this.body.kill(), 2500);
                } break;
                case "kiva": {
                    if (!this.body.isDead()) this.body.define(Class.kivaaritehdasFire);
                    bullet.onDead = () => {
                        if (!bullet.master.isDead()) bullet.master.define(Class.kivaaritehdas);
                    };
                } break;
                case "mindController": {
                    if (!this.body.controllingSquadron && this.body.guns.find(gun => typeof gun.launchSquadron === "string" && gun.children.length)) {
                        this.body.controllingSquadron = true;
                    }
                } break;
                case "aka":
                case "aka2":
                    for (let i = 1; i < 32; i++) setTimeout(() => {
                        if (this.body.health.amount <= 0) {
                            return;
                        }
                        if (this.onShoot === "aka2" && i === 31) {
                            this.body.master.upgrades = [];
                        }
                        this.body.master.define(Class[`akafuji${this.onShoot === "aka" ? i : 31 - i}`]);
                    }, 15 * i);
                    break;
                case "sab":
                case "sab2":
                    for (let i = 1; i < 32; i++) setTimeout(() => {
                        if (this.body.health.amount <= 0) {
                            return;
                        }
                        if (this.onShoot === "sab2" && i === 31) {
                            this.body.master.upgrades = [];
                        }
                        this.body.master.define(Class[`saboten${this.onShoot === "sab" ? i : 31 - i}`]);
                    }, 15 * i);
                    break;
                case "ves":
                case "ves2":
                    for (let i = 1; i < 32; i++) setTimeout(() => {
                        if (this.body.health.amount <= 0) {
                            return;
                        }
                        if (this.onShoot === "ves2" && i === 31) {
                            this.body.master.upgrades = [];
                        }
                        this.body.master.define(Class[`vessle${this.onShoot === "ves" ? i : 31 - i}`]);
                    }, 15 * i);
                    break;
                case "kashmir": {
                    this.body.master.define(Class.kashmir30);
                    this.body.master.sendMessage("Hold Right-Click to detonate your missile!");
                } break;
                case "hitScan":
                case "hitScan1":
                case "hitScan2":
                case "hitScan3": {
                    if (this.body.master.health.amount < 0) break;
                    let save = {
                        x: this.body.master.x,
                        y: this.body.master.y,
                        angle: this.body.master.facing + this.angle
                    };
                    let s = this.body.size * this.width * this.settings2.size;
                    let target = {
                        x: save.x + this.body.master.control.target.x,
                        y: save.y + this.body.master.control.target.y
                    };
                    let amount = util.getDistance(target, save) / s | 0;
                    let explode = e => {
                        e.onDead = () => {
                            let o = new Entity(e, this.body);
                            o.accel = {
                                x: 3 * Math.cos(save.angle),
                                y: 3 * Math.sin(save.angle)
                            };
                            o.color = this.body.master.color;
                            o.define(Class.hitScanExplosion);
                            // Pass the gun attributes
                            o.define({
                                BODY: this.interpret(this.settings3),
                                SKILL: this.getSkillRaw(),
                                SIZE: (this.body.size * this.width * this.settings3.size) / 2,
                                LABEL: this.master.label + (this.label ? " " + this.label : "") + " " + o.label
                            });
                            o.refreshBodyAttributes();
                            o.life();
                            o.source = this.body;
                        }
                    };
                    let branchAlt = 0;
                    let branchLength = 0;
                    let branch = (e, a, b = false, g = 0, z = amount) => {
                        if (!b) branchAlt++;
                        let total = (z / 5 | 0) || 2;
                        let dir = (a ? Math.PI / 2 : -Math.PI / 2) + g;
                        for (let i = 0; i < total; i++) setTimeout(() => {
                            let ss = s * 1.5;
                            let x = e.x + (ss * Math.cos(save.angle + dir)) * i;
                            let y = e.y + (ss * Math.sin(save.angle + dir)) * i;
                            let o = new Entity({
                                x,
                                y
                            }, this.body);
                            o.facing = Math.atan2(target.y - y, target.x - x) + dir;
                            o.color = this.body.master.color;
                            o.define(Class.hitScanBullet);
                            // Pass the gun attributes
                            o.define({
                                BODY: this.interpret(this.settings3),
                                SKILL: this.getSkillRaw(),
                                SIZE: (this.body.size * this.width * this.settings2.size) / 2,
                                LABEL: this.master.label + (this.label ? " " + this.label : "") + " " + o.label
                            });
                            o.refreshBodyAttributes();
                            o.life();
                            o.source = this.body;
                            if (i === total - 1) {
                                if (branchLength < 3) {
                                    branchLength++;
                                    branch(o, a, true, dir + g, total);
                                } else branchLength = 0;
                            }
                        }, (500 / amount) * i);
                    };
                    const hitScanLevel = +this.onShoot.split("hitScan").pop();
                    for (let i = 0; i < amount; i++) {
                        setTimeout(() => {
                            if (this.body.master.health.amount < 0) return;
                            let x = save.x + (s * Math.cos(save.angle)) * i;
                            let y = save.y + (s * Math.sin(save.angle)) * i;
                            let e = new Entity({
                                x: x,
                                y: y
                            }, this.body);
                            e.facing = Math.atan2(target.y - y, target.x - x);
                            e.color = this.body.master.color;
                            e.define(Class.hitScanBullet);
                            // Pass the gun attributes
                            e.define({
                                BODY: this.interpret(this.settings2),
                                SKILL: this.getSkillRaw(),
                                SIZE: (this.body.size * this.width * this.settings2.size) / 2,
                                LABEL: this.master.label + (this.label ? " " + this.label : "") + " " + e.label
                            });
                            e.refreshBodyAttributes();
                            e.life();
                            e.source = this.body;
                            switch (hitScanLevel) {
                                case 1: {
                                    if (i % 5 === 0) branch(e, branchAlt % 2 === 0);
                                }
                                break;
                            case 2: { // Superlaser
                                if (i === amount - 1) explode(e);
                            }
                            break;
                            case 3: { // Death Star
                                if (i % 3 === 0) explode(e);
                            }
                            break;
                            }
                        }, 10 * i);
                    }
                }
                break;
            }
        } else {
            if (this.onShoot && this.onShoot.animation) {
                const frames = this.onShoot.frames;
                for (let i = 1; i <= frames; i++) setTimeout(() => {
                    if (this.body.health.amount <= 0) {
                        return;
                    }
                    if (this.onShoot.end && i === frames) {
                        this.body.master.upgrades = [];
                    }
                    const id = `${this.onShoot.exportName}${this.onShoot.end ? frames - i : i}`;
                    try {
                        this.body.master.define(Class[id]);
                    } catch(e) {
                        console.log(id);
                    }
                }, 20 * i);
            }
        }
    }
    getTracking() {
        return {
            speed: c.runSpeed * ((this.bulletStats == 'master') ? this.body.skill.spd : this.bulletStats.spd) * this.settings.maxSpeed * this.natural.SPEED,
            range: Math.sqrt((this.bulletStats == 'master') ? this.body.skill.spd : this.bulletStats.spd) * this.settings.range * this.natural.RANGE,
        };
    }
    interpret(alt = false) {
        let sizeFactor = this.master.size / this.master.SIZE;
        const shoot = alt ? alt : this.settings;
        const sk = (this.bulletStats == 'master') ? this.body.skill : this.bulletStats;
        // Defaults
        let out = {
            SPEED: shoot.maxSpeed * sk.spd,
            HEALTH: shoot.health * sk.str,
            RESIST: shoot.resist + sk.rst,
            DAMAGE: shoot.damage * sk.dam,
            PENETRATION: Math.max(1, shoot.pen * sk.pen),
            RANGE: shoot.range / Math.sqrt(sk.spd),
            DENSITY: shoot.density * sk.pen * sk.pen / sizeFactor,
            PUSHABILITY: 1 / sk.pen,
            HETERO: 3 - 2.8 * sk.ghost,
        }
        // Special cases
        switch (this.calculator) {
        case 'thruster':
            this.trueRecoil = this.settings.recoil * Math.sqrt(sk.rld * sk.spd)
            break
        case 'sustained':
            out.RANGE = shoot.range
            break
        case 'swarm':
            out.PENETRATION = Math.max(1, shoot.pen * (0.5 * (sk.pen - 1) + 1))
            out.HEALTH /= shoot.pen * sk.pen
            break
        case 'trap':
        case 'block':
            out.PUSHABILITY = 1 / Math.sqrt(sk.pen);
            out.RANGE = shoot.range
            break
        case 'necro':
        case 'drone':
            out.PUSHABILITY = 1
            out.PENETRATION = Math.max(1, shoot.pen * (0.5 * (sk.pen - 1) + 1))
            out.HEALTH = (shoot.health * sk.str + sizeFactor) / Math.pow(sk.pen, 0.8)
            out.DAMAGE = shoot.damage * sk.dam * Math.sqrt(sizeFactor) * shoot.pen * sk.pen
            out.RANGE = shoot.range * Math.sqrt(sizeFactor)
            break
        }
        // Go through and make sure we respect its natural properties
        for (let property in out) {
            if (this.natural[property] == null || !out.hasOwnProperty(property)) continue;
            out[property] *= this.natural[property];
        }
        return out;
    }
}
function rgbToHexSub(rgb) {
    let hex = Number(rgb).toString(16);
    if (hex.length < 2) {
        hex = "0" + hex;
    }
    return hex;
}
function rgbToHex(r, g, b) {
    return `#${rgbToHexSub(r)}${rgbToHexSub(g)}${rgbToHexSub(b)}`;
}
let entitiesIdLog = 0;
class Entity {
    constructor(position, master = this) {
        this.isGhost = false;
        this.nameColor = "#FFFFFF";
        this.nameColorRGB = {
            r: 0,
            g: 0,
            b: 0
        };
        this.nameColorTransition = {
            r: 0,
            g: 0,
            b: 0,
            colors: [],
            index: 0
        };
        this.killEntity = this;
        this.killCount = {
            solo: 0,
            assists: 0,
            bosses: 0,
            killers: [],
        };
        this.creationTime = (new Date()).getTime();
        // Inheritance
        this.master = master;
        this.source = this;
        this.parent = this;
        this.control = {
            target: new Vector(0, 0),
            goal: new Vector(0, 0),
            main: false,
            alt: false,
            fire: false,
            power: 0,
        };
        let objectOutput = null;
        this.__defineSetter__("sandboxId", function set(value) {
            objectOutput = value;
            if (!global.sandboxRooms.find(entry => entry.id === objectOutput)) {
                global.sandboxRooms.push({
                    id: objectOutput,
                    botCap: 0,
                    bots: []
                });
            }
        });
        this.__defineGetter__("sandboxId", function get() {
            return objectOutput;
        });
        if (this.master) {
            if (this.master.sandboxId != null) {
                this.sandboxId = this.master.sandboxId;
            }
        }
        this.poison = { // Poison effect
            // My settings
            status: false,
            duration: 0,
            amplification: 1,
            // What other people give me
            timeLeft: 0,
            strength: 1
        };
        this.ice = { // Ice effect
            // My settings
            status: false,
            duration: 0,
            amplification: 1,
            // What other people give me
            timeLeft: 0,
            strength: 1
        };
        this.emp = { // EMP effect
            // My settings
            status: false,
            duration: 0,
            // What other people give me
            timeLeft: 0
        };
        this.confusion = { // Confusion effect
            // My settings
            status: false,
            duration: 0,
            // What other people give me
            timeLeft: 0
        };
        this.tesla = { // Tesla effect
            // My settings
            status: false,
            amplification: 1,
	          radius: 1
        };
        this.isInGrid = false;
        this.removeFromGrid = () => {
            if (this.isInGrid) {
                grid.removeObject(this);
                this.isInGrid = false;
            }
        };
        this.addToGrid = () => {
            if (!mockupsLoaded) return;
            if (!this.isInGrid && (this.settings.hitsOwnType === "everything" || this.bond == null)) {
                grid.addObject(this);
                this.isInGrid = true;
            }
        };
        this.activation = (() => {
            let active = true;
            let timer = ran.irandom(15);
            return {
                update: () => {
                    if (this.isDead()) return 0;
                    if (!active) {
                        this.removeFromGrid();
                        if (this.settings.diesAtRange) this.kill();
                        if (!(timer--)) active = true;
                    } else {
                        this.addToGrid();
                        timer = 15;
                        active = views.some(v => v.check(this, .6)) || this.alwaysActive;
                    }
                },
                check: () => {
                    return active;
                }
            };
        })();
        this.autoOverride = false;
        this.controllers = [];
        this.blend = {
            color: '#FFFFFF',
            amount: 0,
        };
        // Objects
        this.skill = new Skill();
        this.health = new HealthType(1, 'static', 0);
        this.shield = new HealthType(0, 'dynamic');
        this.guns = [];
        this.turrets = [];
        this.upgrades = [];
        this.settings = {};
        this.aiSettings = {};
        this.children = [];
        // Define it
        this.SIZE = 1;
        this.define(Class.genericEntity);
        // Initalize physics and collision
        this.maxSpeed = 0;
        this.facing = 0;
        this.vfacing = 0;
        this.range = 0;
        this.damageRecieved = 0;
        this.stepRemaining = 1;
        this.x = position.x;
        this.y = position.y;
        this.velocity = new Vector(0, 0);
        this.accel = new Vector(0, 0);
        this.damp = 0.05;
        this.collisionArray = [];
        this.invuln = false;
        this.invulnTime = [-1, -1];
        this.alpha = 1;
        this.invisible = [0, 0];
        this.dangerValue = 5;
        this.turretTraverseSpeed = 1;
        this.antiNaN = (function(me) {
            let nansInARow = 0;
            let data = {
                x: 0,
                y: 0,
                vx: 0,
                vy: 0,
                ax: 0,
                ay: 0
            };

            function update(my) {
                data.x = my.x;
                data.y = my.y;
                data.vx = my.velocity.x;
                data.vy = my.velocity.y;
                data.ax = my.accel.x;
                data.ay = my.accel.y;
            };

            function set() {
                me.x = data.x;
                me.y = data.y;
                me.velocity.x = data.vx;
                me.velocity.y = data.vy;
                me.accel.x = data.ax;
                me.accel.y = data.ay;
                me.velocity.update();
                me.accel.update();
            };

            function check() {
                let amNaN = () => [
                    isNaN(me.x),
                    isNaN(me.y),
                    isNaN(me.velocity.x),
                    isNaN(me.velocity.y),
                    isNaN(me.accel.x),
                    isNaN(me.accel.x),
                ].map(entry => !!entry).some(entry => entry);
                if (amNaN()) {
                    nansInARow++;
                    if (nansInARow > 50) {
                        console.log("NaN instance found. (Repeated)");
                        console.log("Debug:", [
                            isNaN(me.x),
                            isNaN(me.y),
                            isNaN(me.velocity.x),
                            isNaN(me.velocity.y),
                            isNaN(me.accel.x),
                            isNaN(me.accel.y)
                        ].map(entry => !!entry));
                        if (nansInARow > 100) {
                            console.log("NaN instance killed.");
                            me.kill();
                        }
                    }
                    set();
                    if (amNaN()) console.log("NaN instance is still NaN.");
                } else {
                    update(me);
                    if (nansInARow > 0) nansInARow--;
                }
            };
            return check;
        })(this);
        // Get a new unique id
        this.id = entitiesIdLog++;
        this.team = this.id;
        this.team = master.team;
        this.turnAngle = 0;
        this.submarine = {
            submerged: false,
            air: 0,
            maxAir: 0,
            lastTick: 0
        };
        // This is for collisions
        this.updateAABB = () => {};
        this.getAABB = (() => {
            let data = {},
                savedSize = 0;
            let getLongestEdge = (x1, y1, x2, y2) => {
                return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
            };
            this.updateAABB = active => {
                if (this.settings.hitsOwnType !== "everything" && this.bond != null) return 0;
                if (!active) {
                    data.active = false;
                    return 0;
                }
                //if (mockupsLoaded && this.health.amount > 0 && this.master.master.team !== 101 && !this.invuln && !this.passive && this.alpha > 0.25 && (this.type === "tank" || this.type === "crasher" || this.type === "miniboss")) viewGrid.insert(this);
                if (this.isPlayer && !this.isDead()) this.refreshBodyAttributes();
                this.antiNaN();
                if (this.multiboxMaster) {
                    let body = this.multiboxMaster;
                    this.SIZE = body.SIZE;
                    this.skill = body.skill;
                    this.topSpeed = body.topSpeed;
                    this.color = body.color;
                    this.invuln = body.invuln;
                    this.godmode = body.godmode;
                    this.passive = body.passive;
                    this.facing = body.facing;
                    this.control = body.control;
                    this.team = body.team;
                    if (this.index !== body.index) {
                        for (let tank in Class) {
                            if (Class.hasOwnProperty(tank)) {
                                if (body.index === Class[tank].index) {
                                    this.define(Class[tank]);
                                    break;
                                }
                            }
                        }
                    }
                }
                if (this.invuln && this.invulnTime[1] > -1) {
                    if (Date.now() - this.invulnTime[0] > this.invulnTime[1]) {
                        this.invuln = false;
                        this.sendMessage("Your invulnerability has expired.");
                    }
                }
                if (this.submarine && this.submarine.maxAir > 0) {
                    this.alpha = util.lerp(this.alpha, util.clamp(+!this.submarine.submerged, .1, .9), .075);
                    if (this.submarine.submerged) {
                        if (this.submarine.air > 0) {
                            if (Date.now() - this.submarine.lastTick >= 1000) {
                                this.submarine.air --;
                                if (this.submarine.air === 0) {
                                    this.sendMessage("Warning! Ship out of air! Please surface!");
                                }
                                this.submarine.lastTick = Date.now();
                            }
                        } else {
                            this.health.amount -= .2;
                            this.health.lastDamage = this.shield.lastDamage = Date.now();
                        }
                    } else if (Date.now() - this.submarine.lastTick >= 1000) {
                        this.submarine.air ++;
                        if (this.submarine.air >= this.submarine.maxAir) {
                            this.submarine.air = this.submarine.maxAir;
                        }
                        this.submarine.lastTick = Date.now();
                    }
                }
                this.effectTick();
                if (this.shield.max) this.shield.regenerate();
                if (this.health.amount) this.health.regenerate(this.shield.max && this.shield.max === this.shield.amount);
                // Get bounds
                const width = (this.width ? this.realSize * this.width : this.realSize);
                const height = (this.height ? this.realSize * this.height : this.realSize);
                let x1 = (Math.min(this.x, this.x + this.velocity.x + this.accel.x) - width - 5);
                let y1 = (Math.min(this.y, this.y + this.velocity.y + this.accel.y) - height - 5);
                let x2 = (Math.max(this.x, this.x + this.velocity.x + this.accel.x) + width + 5);
                let y2 = (Math.max(this.y, this.y + this.velocity.y + this.accel.y) + height + 5);
                //if (this.type === "wall") console.log(x1, x2, y1, y2, width, height, cos, sin, this.facing);
                // Size check
                let size = getLongestEdge(x1, y1, x2, y1);
                let sizeDiff = savedSize / size;
                // Update data
                data = {
                    min: [x1, y1],
                    max: [x2, y2],
                    active: true,
                    size: size,
                };
                // Update grid if needed
                if (sizeDiff > Math.SQRT2 || sizeDiff < Math.SQRT1_2) {
                    this.removeFromGrid();
                    this.addToGrid();
                    savedSize = data.size;
                }
                // Update name color if it should
                if (this.nameColorTransition.colors.length) {
                    const target = this.nameColorTransition.colors[this.nameColorTransition.index];
                    if (this.nameColorTransition.r < target.r) this.nameColorTransition.r += 1;
                    if (this.nameColorTransition.r > target.r) this.nameColorTransition.r -= 1;
                    if (this.nameColorTransition.g < target.g) this.nameColorTransition.g += 1;
                    if (this.nameColorTransition.g > target.g) this.nameColorTransition.g -= 1;
                    if (this.nameColorTransition.b < target.b) this.nameColorTransition.b += 1;
                    if (this.nameColorTransition.b > target.b) this.nameColorTransition.b -= 1;
                    const { r, g, b } = this.nameColorTransition;
                    this.nameColor = rgbToHex(r, g, b);
                    for (const hex of this.nameColorTransition.colors) {
                        if (this.nameColor === hex) {
                            this.nameColorTransition.index = this.nameColorTransition.indexOf(hex) + 1;
                            if (this.nameColorTransition.index >= this.nameColorTransition.colors.length) {
                                this.nameColorTransition.index --;
                            }
                        }
                    }
                }
            };
            return () => {
                return data;
            };
        })();
        this.updateAABB(true);
        entities.push(this); // everything else
        views.forEach(v => v.add(this));
        this.activation.update();
    }
    transferEffects(instance) {
        if (instance.poison.status && (this.type === "tank" || this.type === "crasher" || this.type === "miniboss" || this.type === "food")) {
            this.poison.strength = instance.poison.amplification;
            if (instance.poison.duration > this.poison.timeLeft) {
                this.poison.timeLeft = instance.poison.duration;
            }
        }
        if (instance.ice.status && (this.type === "tank" || this.type === "crasher" || this.type === "miniboss" || this.type === "food")) {
            this.ice.strength = instance.ice.amplification;
            if (instance.ice.duration > this.ice.timeLeft) {
                this.ice.timeLeft = instance.ice.duration;
            }
        }
        if (instance.emp.status) {
            if (instance.emp.duration > this.emp.timeLeft) {
                this.emp.timeLeft = instance.emp.duration;
            }
        }
        if (instance.confusion.status) {
            if (instance.confusion.duration > this.confusion.timeLeft) {
                this.confusion.timeLeft = instance.confusion.duration;
            }
        }
    }
    effectTick() {
        if (this.passive || this.invuln || this.godmode) {
            this.poison.timeLeft = 0;
            this.ice.timeLeft = 0;
            this.emp.timeLeft = 0;
            this.confusion.timeLeft = 0;
            return;
        }
        if (this.poison.timeLeft > 0) {
            if ((this.health.amount - (.3 * this.poison.strength)) > (this.health.max / 10)) {
                this.health.amount -= (.3 * this.poison.strength);
                this.health.lastDamage = Date.now();
            }
            if ((this.shield.amount - (.3 * this.poison.strength)) > (this.shield.max / 10)) {
                this.shield.amount -= (.3 * this.poison.strength);
                this.shield.lastDamage = Date.now();
            }
            this.poison.timeLeft --;
        }
        if (this.ice.timeLeft > 0) {
            this.velocity.x -= (this.velocity.x * (this.ice.strength / 4.25));
            this.velocity.y -= (this.velocity.y * (this.ice.strength / 4.25));
            this.ice.timeLeft --;
        }
        if (this.emp.timeLeft > 0) {
            this.emp.timeLeft --;
        }
        if (this.confusion.timeLeft > 0) {
            this.confusion.timeLeft --;
        }
        if (this.tesla.status) {
            for (let instance of entities) {
                if (util.getDistance(instance, this) < (this.size * 8) * this.tesla.radius && instance.master.team !== this.master.team && instance.master.master !== this.master.master && !instance.passive && !instance.invuln && !instance.godmode) {
                    if (instance.type === "tank" || instance.type === "crasher" || instance.type === "miniboss" || instance.type === "food") {
                        if ((instance.health.amount - (.15 * this.tesla.amplification)) > (instance.health.max / 10)) {
                            instance.health.amount -= (.15 * this.tesla.amplification);
                            instance.health.lastDamage = Date.now();
                        }
                        if ((instance.shield.amount - (.15 * this.tesla.amplification)) > (instance.shield.max / 10)) {
                            instance.shield.amount -= (.15 * this.tesla.amplification);
                            instance.shield.lastDamage = Date.now();
                        }
                        instance.velocity.x -= (instance.velocity.x * (this.tesla.amplification / 8));
                        instance.velocity.y -= (instance.velocity.y * (this.tesla.amplification / 8));
                    }
                }
            }
        }
    }
    life() {
        bringToLife(this);
    }
    addController(newIO) {
        if (Array.isArray(newIO)) {
            this.controllers = newIO.concat(this.controllers);
        } else {
            this.controllers.unshift(newIO);
        }
    }
    become(player, dom = false) {
        this.addController(dom ? new ioTypes.listenToPlayerStatic(this, player) : new ioTypes.listenToPlayer(this, player));
        this.sendMessage = (content, color) => player.socket.talk("m", content);
        this.kick = (reason) => player.socket.kick(reason);
    }
    giveUp(player, name = "Mothership") {
        if (!player.body.isMothership) player.body.controllers = [new ioTypes.nearestDifferentMaster(player.body), new ioTypes.spinWhenIdle(player.body)];
        else if (player.body.isMothership) player.body.controllers = [new ioTypes.nearestDifferentMaster(player.body), new ioTypes.botMovement(player.body), new ioTypes.mapTargetToGoal(player.body)];
        player.body.name = player.body.label;
        player.body.underControl = false;
        player.body.sendMessage = content => {};
        let fakeBody = new Entity({
            x: player.body.x,
            y: player.body.y
        });
        fakeBody.passive = true;
        fakeBody.underControl = true;
        player.body = fakeBody;
        player.body.kill();
    }
    define(set) {
        if (set.PARENT != null) {
            for (let i = 0; i < set.PARENT.length; i++) {
                this.define(set.PARENT[i]);
            }
        }
      if (set.PASS_THROUGH_SHIELDS != null) this.passThroughShields = set.PASS_THROUGH_SHIELDS
        if (set.HITS_OWN_TEAM != null) this.hitsOwnTeam = set.HITS_OWN_TEAM;
        if (set.LAYER != null) this.layerID = set.LAYER;
        if (set.TRAVERSE_SPEED != null) this.turretTraverseSpeed = set.TRAVERSE_SPEED;
        if (set.ALWAYS_ACTIVE != null) this.alwaysActive = set.ALWAYS_ACTIVE;
        if (set.BOUNCE_OBSTACLES != null) this.bounceObstacles = set.BOUNCE_OBSTACLES;
        if (set.CARRIER_TALK_DATA != null && this.socket) {
            this.socket.talk("cv", ...set.CARRIER_TALK_DATA.flat());
        } else if (this.socket) {
            this.socket.talk("cv");
        }
        if (set.SUBMARINE != null) {
            this.submarine.maxAir = set.SUBMARINE;
        } else if (this.submarine != null && this.submarine.maxAir > 0) {
            this.submarine.maxAir = 0;
        }
        if (set.index != null) {
            this.index = set.index;
        }
        if (set.NAME != null) {
            this.name = set.NAME;
        }
        if (set.LABEL != null) {
            this.label = set.LABEL;
        }
        if (set.TYPE != null) {
            this.type = set.TYPE;
        }
        if (set.IS_PLANE != null) this.isPlane = set.IS_PLANE;
        if (set.TARGET_PLANES != null) this.settings.targetPlanes = set.TARGET_PLANES;
        if (set.SHAPE != null) {
            this.shape = typeof set.SHAPE === 'number' ? set.SHAPE : 0
            this.shapeData = set.SHAPE;
        }
        if (set.COLOR != null) {
            this.color = set.COLOR;
        }
        if (set.OVERRIDING_COLOR != null) {
            this.isOverridingColor = set.OVERRIDING_COLOR;
        }
        if (set.CONTROLLERS != null && mockupsLoaded) {
            let toAdd = [];
            for (let ioName of set.CONTROLLERS) toAdd.push(new ioTypes[ioName](this))
            this.addController(toAdd);
        }
        if (set.MOTION_TYPE != null) {
            this.motionType = set.MOTION_TYPE;
        }
        if (set.FACING_TYPE != null) {
            this.facingType = set.FACING_TYPE;
        }
        if (set.DRAW_HEALTH != null) {
            this.settings.drawHealth = set.DRAW_HEALTH;
        }
        if (set.DRAW_SELF != null) {
            this.settings.drawShape = set.DRAW_SELF;
        }
        if (set.DAMAGE_EFFECTS != null) {
            this.settings.damageEffects = set.DAMAGE_EFFECTS;
        }
        if (set.RATIO_EFFECTS != null) {
            this.settings.ratioEffects = set.RATIO_EFFECTS;
        }
        if (set.MOTION_EFFECTS != null) {
            this.settings.motionEffects = set.MOTION_EFFECTS;
        }
        if (set.POISON != null) {
            if (set.POISON.STATUS != null) {
                this.poison.status = set.POISON.STATUS;
            }
            if (set.POISON.TIME != null) {
                this.poison.duration = set.POISON.TIME;
            }
            if (set.POISON.AMPLIFY != null) {
                this.poison.amplification = set.POISON.AMPLIFY;
            }
        }
        if (set.ICE != null) {
            if (set.ICE.STATUS != null) {
                this.ice.status = set.ICE.STATUS;
            }
            if (set.ICE.TIME != null) {
                this.ice.duration = set.ICE.TIME;
            }
            if (set.ICE.AMPLIFY != null) {
                this.ice.amplification = set.ICE.AMPLIFY;
            }
        }
        if (set.EMP != null) {
            if (set.EMP.STATUS != null) {
                this.emp.status = set.EMP.STATUS;
            }
            if (set.EMP.TIME != null) {
                this.emp.duration = set.EMP.TIME;
            }
        }
        if (set.CONFUS != null) {
            if (set.CONFUS.STATUS != null) {
                this.confusion.status = set.CONFUS.STATUS;
            }
            if (set.CONFUS.TIME != null) {
                this.confusion.duration = set.CONFUS.TIME;
            }
        }
        if (set.TESLA != null) {
            if (set.TESLA.STATUS != null) {
                this.tesla.status = set.TESLA.STATUS;
            }
            if (set.TESLA.AMPLIFY != null) {
                this.tesla.amplification = set.TESLA.AMPLIFY;
            }
            if (set.TESLA.RADIUS != null) {
                this.tesla.radius = set.TESLA.RADIUS;
            }
        }
        if (set.ACCEPTS_SCORE != null) {
            this.settings.acceptsScore = set.ACCEPTS_SCORE;
        }
        if (set.GIVE_KILL_MESSAGE != null) {
            this.settings.givesKillMessage = set.GIVE_KILL_MESSAGE;
        }
        if (set.DAMAGE_TURRET != null) {
            this.settings.collision = set.DAMAGE_TURRET;
        }
        if (set.CAN_GO_OUTSIDE_ROOM != null) {
            this.settings.canGoOutsideRoom = set.CAN_GO_OUTSIDE_ROOM;
        }
        if (set.HITS_OWN_TYPE != null) {
            this.settings.hitsOwnType = set.HITS_OWN_TYPE;
        }
        if (set.DIE_AT_LOW_SPEED != null) {
            this.settings.diesAtLowSpeed = set.DIE_AT_LOW_SPEED;
        }
        if (set.DIE_AT_RANGE != null) {
            this.settings.diesAtRange = set.DIE_AT_RANGE;
        }
        if (set.INDEPENDENT != null) {
            this.settings.independent = set.INDEPENDENT;
        }
        if (set.PERSISTS_AFTER_DEATH != null) {
            this.settings.persistsAfterDeath = set.PERSISTS_AFTER_DEATH;
        }
        if (set.CLEAR_ON_MASTER_UPGRADE != null) {
            this.settings.clearOnMasterUpgrade = set.CLEAR_ON_MASTER_UPGRADE;
        }
        if (set.HEALTH_WITH_LEVEL != null) {
            this.settings.healthWithLevel = set.HEALTH_WITH_LEVEL;
        }
        if (set.ACCEPTS_SCORE != null) {
            this.settings.acceptsScore = set.ACCEPTS_SCORE;
        }
        if (set.OBSTACLE != null) {
            this.settings.obstacle = set.OBSTACLE;
        }
        if (set.NECRO != null) {
            this.settings.isNecromancer = set.NECRO;
        }
        if (set.TARGETS_AMMO != null) {
            this.settings.targetAmmo = set.TARGETS_AMMO;
        }
        if (set.TARGETS_MISSILES != null) {
            this.settings.targetMissiles = set.TARGETS_MISSILES;
        }
        if (set.MISSILE != null) this.settings.missile = set.MISSILE;
        if (set.NECRO_BULLETS) this.settings.necroBullets = set.NECRO_BULLETS;
        if (set.GO_THROUGH_BASES != null) this.settings.goThroughBases = set.GO_THROUGH_BASES;
        if (set.GO_THROUGH_WALLS != null) this.settings.goThroughWalls = set.GO_THROUGH_WALLS;
        if (set.SCOPE != null) {
            this.settings.canScope = set.SCOPE;
        }
        if (set.AUTO_UPGRADE != null) {
            this.settings.upgrading = set.AUTO_UPGRADE;
        }
        if (set.HAS_NO_RECOIL != null) {
            this.settings.hasNoRecoil = set.HAS_NO_RECOIL;
        }
        if (set.CRAVES_ATTENTION != null) {
            this.settings.attentionCraver = set.CRAVES_ATTENTION;
        }
        if (set.BROADCAST_MESSAGE != null) {
            this.settings.broadcastMessage = (set.BROADCAST_MESSAGE === '') ? undefined : set.BROADCAST_MESSAGE;
        }
        if (set.DEFEAT_MESSAGE) this.settings.defeatMessage = true;
        if (set.DAMAGE_CLASS != null) {
            this.settings.damageClass = set.DAMAGE_CLASS;
        }
        if (set.BUFF_VS_FOOD != null) {
            this.settings.buffVsFood = set.BUFF_VS_FOOD;
        }
        if (set.CAN_BE_ON_LEADERBOARD != null) {
            this.settings.leaderboardable = set.CAN_BE_ON_LEADERBOARD;
        }
        if (set.INTANGIBLE != null) {
            this.intangibility = set.INTANGIBLE;
        }
        if (set.IS_SMASHER != null) {
            this.settings.reloadToAcceleration = set.IS_SMASHER;
        }
        if (set.STAT_NAMES != null) {
            this.settings.skillNames = set.STAT_NAMES;
        }
        if (set.AI != null) {
            this.aiSettings = set.AI;
        }
        if (set.LIKES_SHAPES != null) this.aiSettings.shapefriend = set.LIKES_SHAPES;
        if (set.ALPHA != null) {
            this.alpha = set.ALPHA;
        }
        if (set.INVISIBLE != null) {
            this.invisible = set.INVISIBLE;
        }
        if (set.DANGER != null) {
            this.dangerValue = set.DANGER;
        }
        if (set.VARIES_IN_SIZE != null) {
            this.settings.variesInSize = set.VARIES_IN_SIZE;
            this.squiggle = (this.settings.variesInSize) ? ran.randomRange(0.8, 1.2) : 1;
        }
        if (set.RESET_UPGRADES) {
            this.upgrades = [];
        }
        if (set.UPGRADES_TIER_1 != null) {
            set.UPGRADES_TIER_1.forEach((e) => {
                this.upgrades.push({
                    class: e,
                    level: c.TIER_1,
                    index: e.index,
                    tier: 1
                });
            });
        }
        if (set.UPGRADES_TIER_2 != null) {
            set.UPGRADES_TIER_2.forEach((e) => {
                this.upgrades.push({
                    class: e,
                    level: c.TIER_2,
                    index: e.index,
                    tier: 2
                });
            });
        }
        if (set.UPGRADES_TIER_3 != null) {
            set.UPGRADES_TIER_3.forEach((e) => {
                this.upgrades.push({
                    class: e,
                    level: c.TIER_3,
                    index: e.index,
                    tier: 3
                });
            });
        }
        if (set.UPGRADES_TIER_4 != null) {
            set.UPGRADES_TIER_4.forEach((e) => {
                this.upgrades.push({
                    class: e,
                    level: c.TIER_4,
                    index: e.index,
                    tier: 4
                });
            });
        }
        if (set.SIZE != null) {
            this.SIZE = set.SIZE * this.squiggle;
            if (this.coreSize == null) {
                this.coreSize = this.SIZE;
            }
            this.classSize = set.SIZE;
        }
        if (set.SKILL != null && set.SKILL != []) {
            if (set.SKILL.length != 10) {
                throw ('Inappropiate skill raws.');
            }
            this.skill.set(set.SKILL);
        }
        if (set.LEVEL != null) {
            if (set.LEVEL === -1) {
                this.skill.reset();
            }
            while (this.skill.level < c.SKILL_CHEAT_CAP && this.skill.level < set.LEVEL) {
                this.skill.score += this.skill.levelScore;
                this.skill.maintain();
            }
            this.refreshBodyAttributes();
        }
        if (set.SKILL_CAP != null && set.SKILL_CAP != []) {
            if (set.SKILL_CAP.length != 10) {
                throw ('Inappropiate skill caps.');
            }
            this.skill.setCaps(set.SKILL_CAP);
        }
        if (set.VALUE != null) {
            this.skill.score = Math.max(this.skill.score, set.VALUE * this.squiggle);
        }
        if (set.ALT_ABILITIES != null) {
            this.abilities = set.ALT_ABILITIES;
        }
        if (set.GUNS != null) {
            let newGuns = [];
            set.GUNS.forEach((gundef) => {
                newGuns.push(new Gun(this, gundef));
            });
            this.guns = newGuns;
        }
        if (set.MAX_CHILDREN != null) {
            this.maxChildren = set.MAX_CHILDREN;
        }
        if (set.FOOD != null) {
            if (set.FOOD.LEVEL != null) {
                this.foodLevel = set.FOOD.LEVEL;
                this.foodCountup = 0;
            }
        }
        if (set.BODY != null) {
            if (set.BODY.ACCELERATION != null) {
                this.ACCELERATION = set.BODY.ACCELERATION;
            }
            if (set.BODY.SPEED != null) {
                this.SPEED = set.BODY.SPEED;
            }
            if (set.BODY.HEALTH != null) {
                this.HEALTH = set.BODY.HEALTH;
            }
            if (set.BODY.RESIST != null) {
                this.RESIST = set.BODY.RESIST;
            }
            if (set.BODY.SHIELD != null) {
                this.SHIELD = set.BODY.SHIELD;
            }
            if (set.BODY.REGEN != null) {
                this.REGEN = set.BODY.REGEN;
            }
            if (set.BODY.DAMAGE != null) {
                this.DAMAGE = set.BODY.DAMAGE;
            }
            if (set.BODY.PENETRATION != null) {
                this.PENETRATION = set.BODY.PENETRATION;
            }
            if (set.BODY.FOV != null) {
                this.FOV = set.BODY.FOV;
            }
            if (set.BODY.RANGE != null) {
                this.RANGE = set.BODY.RANGE;
            }
            if (set.BODY.SHOCK_ABSORB != null) {
                this.SHOCK_ABSORB = set.BODY.SHOCK_ABSORB;
            }
            if (set.BODY.DENSITY != null) {
                this.DENSITY = set.BODY.DENSITY;
            }
            if (set.BODY.STEALTH != null) {
                this.STEALTH = set.BODY.STEALTH;
            }
            if (set.BODY.PUSHABILITY != null) {
                this.PUSHABILITY = set.BODY.PUSHABILITY;
            }
            if (set.BODY.HETERO != null) {
                this.heteroMultiplier = set.BODY.HETERO;
            }
            this.refreshBodyAttributes();
        }
        if (set.SPAWN_ON_DEATH) this.spawnOnDeath = set.SPAWN_ON_DEATH;
       if (set.SECONDARY_SPAWN_ON_DEATH) this.secondarySpawnOnDeath = set.SECONDARY_SPAWN_ON_DEATH;
        if (set.FRAG_SPAWNS) this.fragEntities = set.FRAG_SPAWNS;
        if (set.DEATH_FUNCTION) this.deathFunction = set.DEATH_FUNCTION;
        if (set.TURRETS != null) {
            let o;
            this.turrets.forEach(o => o.destroy());
            this.turrets = [];
            set.TURRETS.forEach(def => {
                o = new Entity(this, this.master);
                let turretDanger = false;
                ((Array.isArray(def.TYPE)) ? def.TYPE : [def.TYPE]).forEach(type => {
                    o.define(type);
                    if (type.TURRET_DANGER) turretDanger = true;
                });
                if (!turretDanger) o.define({
                    DANGER: 0
                });
                o.bindToMaster(def.POSITION, this);
            });
        }
        if (set.mockup != null) {
            this.mockup = set.mockup;
        }
    }
    refreshBodyAttributes() {
        let speedReduce = this.size / (this.coreSize || this.SIZE);
        this.acceleration = c.runSpeed * this.ACCELERATION / speedReduce;
        if (this.settings.reloadToAcceleration) this.acceleration *= this.skill.acl;
        this.topSpeed = c.runSpeed * this.SPEED * this.skill.mob / speedReduce;
        if (this.settings.reloadToAcceleration) this.topSpeed /= Math.sqrt(this.skill.acl);
        this.health.set((((this.settings.healthWithLevel) ? 1.5 * this.skill.level : 0) + this.HEALTH) * this.skill.hlt);
        this.health.resist = 1 - 1 / Math.max(1, this.RESIST + this.skill.brst);
        this.shield.set((this.SHIELD) * (1 + this.skill.shi), Math.max(0, this.REGEN * this.skill.rgn));
        this.damage = this.DAMAGE * (1 + (this.settings.hitsOwnType === 'everything' ? this.skill.lancer.dam : this.skill.atk));
        this.penetration = this.PENETRATION + 1.5 * ((this.settings.hitsOwnType === 'everything' ? this.skill.lancer.pen : this.skill.brst) + 0.8 * (this.skill.atk - 1));
        if (!this.settings.dieAtRange || !this.range) {
            this.range = this.RANGE;
        }
        this.fov = this.FOV * 250 * Math.sqrt(this.size) * (1 + 0.005 * this.skill.level);
        this.density = (1 + 0.08 * this.skill.level) * this.DENSITY * (this.settings.hitsOwnType === "everything" ? this.skill.lancer.str : 1);
        this.stealth = this.STEALTH;
        this.pushability = this.PUSHABILITY;
    }
    bindToMaster(position, bond) {
        this.bond = bond;
        this.source = bond;
        this.bond.turrets.push(this);
        this.skill = this.bond.skill;
        this.label = this.bond.label + ' ' + this.label;
        // It will not be in collision calculations any more nor shall it be seen.
        if (this.settings.hitsOwnType !== "everything") this.removeFromGrid();
        this.settings.drawShape = false;
        // Get my position.
        this.bound = {};
        this.bound.size = position[0] / 20;
        let _off = new Vector(position[1], position[2]);
        this.bound.angle = position[3] * Math.PI / 180;
        this.bound.direction = _off.direction;
        this.bound.offset = _off.length / 10;
        this.bound.arc = position[4] * Math.PI / 180;
        // Figure out how we'll be drawn.
        this.bound.layer = position[5];
        // Initalize.
        this.facing = this.bond.facing + this.bound.angle;
        this.facingType = 'bound';
        this.motionType = 'bound';
        this.move();
    }
    get size() {
        if (this.bond == null) return (this.coreSize || this.SIZE) * (1 + this.skill.level / 60);
        return this.bond.size * this.bound.size;
    }
    get mass() {
        return this.density * (this.size * this.size + 1);
    }
    get realSize() {
        return this.size * ((Math.abs(this.shape) > lazyRealSizes.length) ? 1 : lazyRealSizes[Math.abs(this.shape)]);
    }
    get m_x() {
        return (this.velocity.x + this.accel.x) / roomSpeed;
    }
    get m_y() {
        return (this.velocity.y + this.accel.y) / roomSpeed;
    }
    camera(tur = false) {
        const out = {
            type: 0 + tur * 0x01 + this.settings.drawHealth * 0x02 + (this.type === 'tank') * 0x04 + this.invuln * 0x08,
            id: this.id,
            index: this.index,
            x: this.x,
            y: this.y,
            cx: this.x,
            cy: this.y,
            vx: this.velocity.x,
            vy: this.velocity.y,
            size: this.size,
            rsize: this.realSize,
            status: 1,
            health: this.health.display(),
            shield: this.shield.display(),
            alpha: this.alpha,
            facing: this.facing,
            vfacing: this.vfacing,
            twiggle: this.facingType === 'autospin' || this.facingType === 'lucrehulkSpin' || this.facingType === "windmill" || (this.facingType === 'locksFacing' && this.control.alt),
            layer: this.layerID ? this.layerID : (this.bond != null) ? this.bound.layer : (this.type === 'wall') ? 11 : (this.type === 'food') ? 10 : (this.type === 'tank') ? 5 : (this.type === 'crasher') ? 1 : 0,
            color: this.color,
            name: this.nameColor + this.name,
            score: this.skill.score,
            sizeRatio: [this.width || 1, this.height || 1],
            guns: this.guns.map(gun => gun.getLastShot()),
            turrets: this.turrets.map(turret => turret.camera(true)),
        };
        if (this.settings.canScope) {
            if (!this.control.alt) {
                this.cameraShiftFacing = null;
            } else if (this.cameraShiftFacing) {
                [out.cx, out.cy] = this.cameraShiftFacing;
            } else {
                out.cx += (this.fov * Math.cos(this.facing)) / 4;
                out.cy += (this.fov * Math.sin(this.facing)) / 4;
                this.cameraShiftFacing = [out.cx, out.cy];
            }
        }
        if (this.controllingSquadron) {
            const squadron = this.guns.find(gun => typeof gun.launchSquadron === "string" && gun.children.length);
            if (squadron) {
                let x = 0, y = 0;
                for (const child of squadron.children) {
                    x += child.x;
                    y += child.y;
                }
                x /= squadron.children.length;
                y /= squadron.children.length;
                out.cx = x;
                out.cy = y;
                this.lastCameraPos = [x, y];
                this.cameraLingerTime = 35;
                global.squadronPoints[this.id] = {
                    showsOnMap: true,
                    isSquadron: true,
                    x: x,
                    y: y,
                    SIZE: 1,
                    color: this.color,
                    id: squadron.children[0].id
                };
            } else {
                delete global.squadronPoints[this.id];
                this.cameraLingerTime --;
                const [x, y] = (this.lastCameraPos || [0, 0]);
                out.cx = x;
                out.cy = y;
                if (this.cameraLingerTime <= 0) this.controllingSquadron = false;
            }
        } else if (global.squadronPoints[this.id]) {
            delete global.squadronPoints[this.id];
        }
        return out;
    }
    syncTurretSkill() {
        this.skill = this.master.skill;
        this.refreshBodyAttributes();
        for (let i = 0; i < this.turrets.length; i++) {
            if (this.turrets[i].settings.hitsOwnType === "everything") {
                this.turrets[i].syncTurretSkill();
            }
        }
    }
    skillUp(stat) {
        let suc = this.skill.upgrade(stat);
        if (suc) {
            this.refreshBodyAttributes();
            for (let i = 0; i < this.guns.length; i++) this.guns[i].syncChildren();
            for (let i = 0; i < this.turrets.length; i++) {
                if (this.turrets[i].settings.hitsOwnType === "everything") {
                    this.turrets[i].syncTurretSkill();
                }
            }
        }
        return suc;
    }
    upgrade(number) {
        if (number < this.upgrades.length && this.skill.level >= this.upgrades[number].level) {
            let saveMe = this.upgrades[number].class;
            this.upgrades = [];
            this.define(saveMe);
            this.sendMessage('You have upgraded to ' + this.label + '.');
            if (typeof saveMe.TOOLTIP === "string") this.sendMessage("ToolTip: " + saveMe.TOOLTIP);
            for (let instance of entities) {
                if (instance.settings.clearOnMasterUpgrade && instance.master.id === this.id) {
                    instance.kill();
                }
            }
            this.skill.update();
            this.refreshBodyAttributes();
        }
    }
    damageMultiplier() {
        switch (this.type) {
            case 'swarm':
                return 0.25 + 1.5 * util.clamp(this.range / (this.RANGE + 1), 0, 1);
            default:
                return 1;
        }
    }
    move() { // ENTITIES LOOP REMOVE WHEN POSSIBLE
        let g = {
            x: this.control.goal.x - this.x,
            y: this.control.goal.y - this.y,
            //jump: this.control.goal.y < this.y && this.collisionArray.some(r => r.type === 'wall')
        },
        gactive = (g.x !== 0 || g.y !== 0),
        engine = {
            x: 0,
            y: 0,
        },
        a = this.acceleration / roomSpeed;
        if (c.SPACE_PHYSICS && this.type === "tank") {
            this.damp = .05;
        }
        switch (this.motionType) {
            case "grow":
                this.SIZE += 5;
                break;
            case "carrierBomb":
                this.SIZE += 8;
                break;
            case "grower":
                this.SIZE += 0.8;
    			this.damp = 0.02;
                break;
			case "flare":
                this.SIZE += 0.8;
    			this.damp = -0.01;
                break;
            case 'glide':
                this.maxSpeed = this.topSpeed;
                this.damp = 0.05;
                break;
            case 'motor':
                this.maxSpeed = 0;
                if (this.topSpeed) {
                    this.damp = a / this.topSpeed;
                }
                if (gactive) {
                    let len = Math.sqrt(g.x * g.x + g.y * g.y);
                    engine = {
                        x: a * g.x / len,
                        y: a * g.y / len,
                    };
                }
                break;
            case "spgw":
                this.SIZE += 0.75;
                this.maxSpeed = this.topSpeed;
                this.damp = -0.025;
                break;
            case "explosion":
                this.SIZE += 3;
                this.damp = 0.25;
                break;
            case 'swarm':
            case 'sidewinder':
                this.maxSpeed = this.topSpeed;
                let l = util.getDistance({
                    x: 0,
                    y: 0,
                }, g) + 1;
                if (gactive && l > this.size) {
                    let desiredxspeed = this.topSpeed * g.x / l,
                        desiredyspeed = this.topSpeed * g.y / l,
                        turning = Math.sqrt((this.topSpeed * Math.max(1, this.range) + 1) / a);
                    engine = {
                        x: (desiredxspeed - this.velocity.x) / Math.max(this.motionType === "sidewinder" ? 45 : 5, turning),
                        y: (desiredyspeed - this.velocity.y) / Math.max(this.motionType === "sidewinder" ? 45 : 5, turning),
                    };
                } else {
                    if (this.velocity.length < this.topSpeed) {
                        engine = {
                            x: this.velocity.x * a / 20,
                            y: this.velocity.y * a / 20,
                        };
                    }
                }
                break;
            case 'chase':
                if (gactive) {
                    let l = util.getDistance({
                        x: 0,
                        y: 0,
                    }, g);
                    if (l > this.size * 2) {
                        this.maxSpeed = this.topSpeed;
                        let desiredxspeed = this.topSpeed * g.x / l,
                            desiredyspeed = this.topSpeed * g.y / l;
                        engine = {
                            x: (desiredxspeed - this.velocity.x) * a,
                            y: (desiredyspeed - this.velocity.y) * a,
                        };
                    } else {
                        this.maxSpeed = 0;
                    }
                } else {
                    this.maxSpeed = 0;
                }
                break;
            case 'drift':
                this.maxSpeed = 0;
                engine = {
                    x: g.x * a,
                    y: g.y * a,
                };
                break;
            case 'bound':
                let bound = this.bound,
                    ref = this.bond;
                this.x = ref.x + ref.size * bound.offset * Math.cos(bound.direction + bound.angle + ref.facing);
                this.y = ref.y + ref.size * bound.offset * Math.sin(bound.direction + bound.angle + ref.facing);
                this.bond.velocity.x += bound.size * this.accel.x;
                this.bond.velocity.y += bound.size * this.accel.y;
                this.firingArc = [ref.facing + bound.angle, bound.arc / 2];
                nullVector(this.accel);
                this.blend = ref.blend;
                this.skill.set(this.bond.skill.raw);
                break;
            case "shrinkTrail":
                if (this.SIZE - .6 > 1) {
                    this.SIZE -= .6;
                }
                break;
        }
        this.accel.x += engine.x * this.control.power;
        this.accel.y += engine.y * this.control.power;
    }
    face() {
        let t = this.control.target,
            tactive = (t.x !== 0 || t.y !== 0),
            oldFacing = this.facing;
        switch (this.facingType) {
            case 'autospin':
                this.facing += 0.02 / roomSpeed;
                break;
            case 'reverseSpin':
                this.facing -= 0.02 / roomSpeed;
                break;
            case 'lucrehulkSpin':
                this.facing += .005 / roomSpeed;
                break;
            case 'turnWithSpeed':
                this.facing += this.velocity.length / 90 * Math.PI / roomSpeed;
                break;
            case "windmill":
                this.facing += 0.1 + ((this.velocity.length / 90) * Math.PI) / roomSpeed;
                break;
            case 'spin':
                this.facing += 0.05 / roomSpeed;
                break;
            case 'spinMissile':
                this.facing += (this.id % 2 === 0 ? 0.1 : -0.1) / roomSpeed;
                break;
            case 'withMotion':
                this.facing = this.velocity.direction;
                break;
            case 'smoothWithMotion':
            case 'looseWithMotion':
                this.facing += util.loopSmooth(this.facing, this.velocity.direction, 4 / roomSpeed);
                break;
            case 'withTarget':
            case 'toTarget':
                this.facing = Math.atan2(t.y, t.x);
                break;
            case 'locksFacing':
                if (!this.control.alt) this.facing = Math.atan2(t.y, t.x);
                break;
            case 'looseWithTarget':
            case 'looseToTarget':
            case 'smoothToTarget':
                this.facing += util.loopSmooth(this.facing, Math.atan2(t.y, t.x), 4 / roomSpeed);
                break;
			case 'smootherToTarget':
                this.facing += util.loopSmooth(this.facing, Math.atan2(t.y, t.x), 20 / roomSpeed);
                break;
            case 'warshipTurn':
                this.facing += util.loopSmooth(this.facing, this.velocity.direction, 50 / roomSpeed);
                break;
            case 'bound':
                let givenangle;
                if (this.control.main) {
                    givenangle = Math.atan2(t.y, t.x);
                    let diff = util.angleDifference(givenangle, this.firingArc[0]);
                    if (Math.abs(diff) >= this.firingArc[1]) {
                        givenangle = this.firingArc[0]; // - util.clamp(Math.sign(diff), -this.firingArc[1], this.firingArc[1]);
                    }
                } else {
                    givenangle = this.firingArc[0];
                }
                this.facing += util.loopSmooth(this.facing, givenangle,( 4 / roomSpeed) * this.turretTraverseSpeed);
                break;
        }
        this.facing += this.turnAngle;
        // Loop
        const TAU = 2 * Math.PI;
        this.facing = (this.facing % TAU + TAU) % TAU;
        this.vfacing = util.angleDifference(oldFacing, this.facing) * roomSpeed;
    }
    takeSelfie() {
        this.flattenedPhoto = null;
        this.photo = (this.settings.drawShape) ? this.camera() : this.photo = undefined;
    }
    physics() {
        if (this.accel.x == null || this.velocity.x == null) {
            util.error('Void Error!');
            util.error(this.collisionArray);
            util.error(this.label);
            util.error(this);
            this.accel.null();
            this.velocity.null();
        }
        // Apply acceleration
        this.velocity.x += this.accel.x;
        this.velocity.y += this.accel.y;
        // Reset acceleration
        this.accel.null();
        // Apply motion
        this.stepRemaining = 1;
        if (c.SPACE_PHYSICS) {
            this.stepRemaining = 1.175;
        }
        this.x += this.stepRemaining * this.velocity.x / roomSpeed;
        this.y += this.stepRemaining * this.velocity.y / roomSpeed;
    }
    friction() {
        var motion = this.velocity.length,
            excess = motion - this.maxSpeed;
        if (excess > 0 && this.damp) {
            var k = this.damp / roomSpeed,
                drag = excess / (k + 1),
                finalvelocity = this.maxSpeed + drag;
            if (c.SPACE_PHYSICS) {
                finalvelocity *= 1.05;
            }
            this.velocity.x = finalvelocity * this.velocity.x / motion;
            this.velocity.y = finalvelocity * this.velocity.y / motion;
        }
    }
    confinementToTheseEarthlyShackles() {
        if (this.x == null || this.x == null) {
            util.error('Void Error!');
            util.error(this.collisionArray);
            util.error(this.label);
            util.error(this);
            this.accel.null();
            this.velocity.null();
            return 0;
        }
        let loc = {
            x: this.x,
            y: this.y
        };
        if (!this.settings.canGoOutsideRoom) {
            if (c.ARENA_TYPE === "circle") {
                const centerPoint = {
                    x: room.width / 2,
                    y: room.height / 2
                };
                const dist = util.getDistance(this, centerPoint);
                if (dist > room.width / 2) {
                    let lerp = (a, b, x) => a + x * (b - a);
                    let strength = Math.abs((dist - room.width / 2) * (c.ROOM_BOUND_FORCE / roomSpeed)) / 100;
                    this.x = lerp(this.x, room.width / 2, strength);
                    this.y = lerp(this.y, room.height / 2, strength);
                }
            } else {
                this.accel.x -= Math.min(this.x - this.realSize + 50, 0) * c.ROOM_BOUND_FORCE / roomSpeed;
                this.accel.x -= Math.max(this.x + this.realSize - room.width - 50, 0) * c.ROOM_BOUND_FORCE / roomSpeed;
                this.accel.y -= Math.min(this.y - this.realSize + 50, 0) * c.ROOM_BOUND_FORCE / roomSpeed;
                this.accel.y -= Math.max(this.y + this.realSize - room.height - 50, 0) * c.ROOM_BOUND_FORCE / roomSpeed;
                if (c.DIVIDER_LEFT) {
                    let l = c.DIVIDER_LEFT;
                    let r = c.DIVIDER_RIGHT;
                    let m = (l + r) * 0.5;
                    if (this.x > m && this.x < r) this.accel.x -= Math.min(this.x - this.realSize + 50 - r, 0) * c.ROOM_BOUND_FORCE / roomSpeed;
                    if (this.x > l && this.x < m) this.accel.x -= Math.max(this.x + this.realSize - 50 - l, 0) * c.ROOM_BOUND_FORCE / roomSpeed;
                }
                if (c.DIVIDER_TOP) {
                    let l = c.DIVIDER_TOP;
                    let r = c.DIVIDER_BOTTOM;
                    let m = (l + r) * 0.5;
                    if (this.y > m && this.y < r) this.accel.y -= Math.min(this.y - this.realSize + 50 - r, 0) * c.ROOM_BOUND_FORCE / roomSpeed;
                    if (this.y > l && this.y < m) this.accel.y -= Math.max(this.y + this.realSize - 50 - l, 0) * c.ROOM_BOUND_FORCE / roomSpeed;
                }
            }
        }
        if (room.port.length) {
            if (room.isIn("port", loc) && !this.passive && !this.settings.goThruObstacle && this.facingType !== "bound") {
                let myRoom = room.isAt(loc);
                let dx = loc.x - myRoom.x;
                let dy = loc.y - myRoom.y;
                let dist2 = dx * dx + dy * dy;
                let force = c.ROOM_BOUND_FORCE;
                let portals = {
                    launchForce: 5000,
                    gravity: 20000,
                    threshold: 15 * 15,
                    spawnMe: (room.width / room.xgrid) / 2 + this.SIZE
                };
                if (this.type === "miniboss" || this.isMothership) {
                    this.accel.x += 3e4 * dx / dist2 * force / roomSpeed;
                    this.accel.y += 3e4 * dy / dist2 * force / roomSpeed;
                } else if (this.type === "tank") {
                    if (dist2 <= portals.threshold) {
                        let angle = Math.random() * Math.PI * 2;
                        this.accel.x = portals.launchForce * Math.sin(angle) * c.ROOM_BOUND_FORCE / roomSpeed;
                        this.accel.y = portals.launchForce * Math.cos(angle) * c.ROOM_BOUND_FORCE / roomSpeed;
                        let portTo;
                        do {
                            portTo = room['port'][Math.floor(Math.random() * room['port'].length)];
                        } while (portTo.id === myRoom.id && room['port'].length > 1);
                        this.x = portTo.x + portals.spawnMe * Math.sin(angle);
                        this.y = portTo.y + portals.spawnMe * Math.cos(angle);
                        if (this.isPlayer) {
                            this.invuln = true;
                            this.invulnTime = [Date.now(), 15000];
                            this.sendMessage("You will be invulnerable until you move, shoot or wait 15 seconds.");
                        }
                        for (let i of this.children)
                            if (i.type === 'drone') {
                                i.x = portTo.x + 320 * Math.sin(angle) + portals.spawnMe * (Math.random() - 0.5);
                                i.y = portTo.y + 320 * Math.cos(angle) + portals.spawnMe * (Math.random() - 0.5);
                            }
                    } else {
                        this.velocity.x -= portals.gravity * dx / dist2 * force / roomSpeed;
                        this.velocity.y -= portals.gravity * dy / dist2 * force / roomSpeed;
                    }
                } else this.kill();
            }
        }
        if (room.isIn("outb", loc) && !this.master.settings.goThroughBases && !this.master.godmode && !this.master.passive) {
            if (this.type === "miniboss" || this.type === "crasher") {
                let pos = room.randomType("nest");
                this.x = pos.x;
                this.y = pos.y;
            } else if (this.type === "tank" || this.type === "food") {
                this.kill();
            }
        }
        if (room.gameMode === 'tdm' && this.type !== 'food' && !this.master.settings.goThroughBases && !this.master.godmode && !this.master.passive && c.DO_BASE_DAMAGE && !this.isArenaCloser && !this.master.isArenaCloser) {
            if ((this.team !== -1 && (room.isIn('bas1', loc) || room.isIn('bap1', loc))) || (this.team !== -2 && (room.isIn('bas2', loc) || room.isIn('bap2', loc))) || (this.team !== -3 && (room.isIn('bas3', loc) || room.isIn('bap3', loc))) || (this.team !== -4 && (room.isIn('bas4', loc) || room.isIn('bap4', loc))) || (this.team !== -5 && (room.isIn('bas5', loc) || room.isIn('bap5', loc))) || (this.team !== -6 && (room.isIn('bas6', loc) || room.isIn('bap6', loc))) || (this.team !== -7 && (room.isIn('bas7', loc) || room.isIn('bap7', loc))) || (this.team !== -8 && (room.isIn('bas8', loc) || room.isIn('bap8', loc)))) {
                this.kill();
            }
        }
    }
    contemplationOfMortality() {
        if (this.invuln || this.settings.collision) {
            this.damageRecieved = 0;
            return 0;
        }
        if (this.godmode) this.damageRecieved = 0;
        // Life-limiting effects
        if (this.settings.diesAtRange) {
            this.range -= 1 / roomSpeed;
            if (this.range < 0) {
                this.kill();
            }
        }
        if (this.settings.diesAtLowSpeed) {
            if (!this.collisionArray.length && this.velocity.length < this.topSpeed / 2) {
                this.health.amount -= this.health.getDamage(1 / roomSpeed);
            }
        }
        // Shield regen and damage
        if (this.shield.max) {
            if (this.damageRecieved !== 0) {
                let shieldDamage = this.shield.getDamage(this.damageRecieved);
                this.damageRecieved -= shieldDamage;
                this.shield.amount -= shieldDamage;
                if (this.shield.amount > this.shield.max) {
                    this.shield.amount = this.shield.max;
                }
            }
        }
        // Health damage
        if (this.damageRecieved !== 0) {
            let healthDamage = this.health.getDamage(this.damageRecieved);
            this.blend.amount = 1;
            this.health.amount -= healthDamage;
            if (this.health.amount > this.health.max) {
                this.health.amount = this.health.max;
            }
        }
        this.damageRecieved = 0;
        // Check for death
        if (this.isDead()) {
            delete global.squadronPoints[this.id];
            if (this.onDead) this.onDead();
         
            if (this.deathFunction) {
                switch (this.deathFunction) {
                    case "kashmirDeath": {
                        setTimeout(() => {
                            if (this.source && this.source.health.amount > 0 && this.source.guns && this.source.guns.length) {
                                this.source.guns[0].onShootFunction();
                            }
                        }, 1500);
                    } break;
                    case "splitSquare": { 
                        let x = this.x,
                            y = this.y;
                            setTimeout(() => {
                              let positions = [
                                    [x + 20, y, -20, 0],
                                    [x - 20, y, 20, 0],
                                    [x, y + 20, 0, -20],
                                    [x, y - 20, 0, 20]
                                ];
                            for (let i = 0; i < 4; i++) {
                                let shard = new Entity({
                                    x: positions[i][0],
                                    y: positions[i][1]
                                });
                                shard.team = this.team;
                                shard.control.target.x = positions[i][2];
                                shard.control.target.y = positions[i][3];
                                shard.define(Class.summonerSquare);
                                //shard.ACCELERATION = 0.015 / (1 + 1)
                            }
                        }, 300);
                  } break;
                  case "splitTriangle": { 
                        let x = this.x,
                            y = this.y;
                            setTimeout(() => {
                              let positions = [
                                    [x + 0, y, -0, 0],
                                    [x - 20, y, 0, 0],
                                    [x, y + 20, 0, -20],
                                    [x, y - 20, 0, 20]
                                ];
                            for (let i = 0; i < 4; i++) {
                                let shard = new Entity({
                                    x: positions[i][0],
                                    y: positions[i][1]
                                });
                                shard.team = this.team;
                                shard.control.target.x = positions[i][2];
                                shard.control.target.y = positions[i][3];
                                shard.define(Class.trapCrasher);
                            }
                        }, 300);
                  } break;
                  case "splitPentagon": { 
                        let x = this.x,
                            y = this.y;
                            setTimeout(() => {
                              let positions = [
                                    [x + 0, y, 20, 0],
                                    [x - 15, y, -20, 0],
                                    [x, y + 15, 0, -20],
                                    [x - 20, y - 0, 0, 20],
                                   [x + 20, y + 0, 0, 20],
                                ];
                            for (let i = 0; i < 5; i++) {
                                let shard = new Entity({
                                    x: positions[i][0],
                                    y: positions[i][1]
                                });
                                shard.team = this.team;
                                //shard.control.target.x = positions[i][2];
                                //shard.control.target.y = positions[i][3];
                                shard.define(Class.crasher);
                            }
                        }, 300);
                  } break;
                  case "splitSplitSquare": { 
                       let x = this.x,
                            y = this.y;
                            setTimeout(() => {
                              let positions = [
                                    [x + 40, y, -40, 0],
                                    [x - 40, y, 40, 0],
                                    [x, y + 40, 0, -40],
                                    [x, y - 40, 0, 40]
                                ];
                            for (let i = 0; i < 4; i++) {
                                let shard = new Entity({
                                    x: positions[i][0],
                                    y: positions[i][1]
                                });
                                shard.team = this.team;
                                shard.control.target.x = positions[i][2];
                                shard.control.target.y = positions[i][3];
                                shard.define(Class.splitterSquare);
                            }
                        }, 300);
                  } break;
                  default: util.error("Unknown death function");
                }
            }
            if (c.KILL_RACE && (this.isPlayer || this.isBot)) {
                killRace.getKillData(this);
            }
            if (c.HIDE_AND_SEEK && (this.isPlayer || this.isBot)) {
                hideAndSeek.getKillData(this);
            }
            if (this.fragEntities) {
                for (let i = 0; i < this.fragEntities.length; i ++) {
                    let o = new Entity({
                        x: this.x + this.size * Math.cos(i / this.fragEntities.length),
                        y: this.y + this.size * Math.sin(i / this.fragEntities.length)
                    });
                    o.team = this.team;
                    o.color = this.color;
                    o.define(Class[this.fragEntities[i]]);
                }
            }
            if (c.TAG && (this.isPlayer || this.isBot)) tagDeathEvent(this);
            // Initalize message arrays
            let killers = [],
                killTools = [],
                notJustFood = false;
            // If I'm a tank, call me a nameless player
            let name = (this.master.name == '') ? (this.master.type === 'tank') ? "a nameless player's " + this.label : (this.master.type === 'miniboss') ? "a visiting " + this.label : util.addArticle(this.label) : this.master.name + "'s " + this.label;
            // Calculate the jackpot
            let jackpot = Math.ceil(util.getJackpot(this.skill.score) / this.collisionArray.length);
            // Now for each of the things that kill me...
            if (this.collisionArray.length) {
                let spectateEntity = this.collisionArray[this.collisionArray.length - 1].master.source.killEntity;
                if (this.socket) this.socket.spectateEntity = spectateEntity;
                for (let { socket } of sockets.players) {
                    if (socket.spectateEntity === this) socket.spectateEntity = spectateEntity;
                }
            }
            this.collisionArray.forEach(instance => {
                if (instance.type === 'wall') return 0;
                if (instance.socket && instance.socket.discordID != null) {
                    if (jackpot >= 250000) {
                        bot.database.makeEntry(bot, bot.config.logs.achievementDatabase, {
                            id: instance.socket.discordID,
                            achievement: "Jackpot|||Get at least 250k score from one kill."
                        });
                        instance.sendMessage("Achievement get: " + "Jackpot");
                    }
                    if (this.label === "Mothership" && this.isMothership) {
                        bot.database.makeEntry(bot, bot.config.logs.achievementDatabase, {
                            id: instance.socket.discordID,
                            achievement: "Big Game Hunter|||Kill a Mothership."
                        });
                        instance.sendMessage("Achievement get: " + "Big Game Hunter");
                    }
                    if (this.label === "Pumpkin" && c.SPAWN_PUMPKINS) {
                        bot.database.makeEntry(bot, bot.config.logs.achievementDatabase, {
                            id: instance.socket.discordID,
                            achievement: "Trick-Or-Treat|||Hunt a Pumpkin."
                        });
                        instance.sendMessage("Achievement get: Trick-Or-Treat");
                    }
                    if (this.type === "miniboss") {
                        bot.database.makeEntry(bot, bot.config.logs.achievementDatabase, {
                            id: instance.socket.discordID,
                            achievement: "That was tough...|||Kill a boss."
                        });
                        instance.sendMessage("Achievement get: " + "That was tough...");
                    }
                }
                if (instance.master.settings.acceptsScore) { // If it's not food, give its master the score
                    if (instance.master.type === 'tank' || instance.master.type === 'miniboss') notJustFood = true;
                    instance.master.skill.score += jackpot;
                    killers.push(instance.master); // And keep track of who killed me
                } else if (instance.settings.acceptsScore) {
                    instance.skill.score += jackpot;
                }
                killTools.push(instance); // Keep track of what actually killed me
            });
            // Remove duplicates
            killers = killers.filter((elem, index, self) => {
                return index == self.indexOf(elem);
            });
            // If there's no valid killers (you were killed by food), change the message to be more passive
            let killText = (notJustFood) ? '' : "You have been killed by ",
                dothISendAText = this.settings.givesKillMessage;
            killers.forEach(instance => {
                this.killCount.killers.push(instance.index);
                if (this.type === 'tank') {
                    if (killers.length > 1) instance.killCount.assists++;
                    else instance.killCount.solo++;
                } else if (this.type === "miniboss") instance.killCount.bosses++;
            });
            // Add the killers to our death message, also send them a message
            if (notJustFood) {
                killers.forEach(instance => {
                    if (instance.master.type !== 'food' && instance.master.type !== 'crasher') {
                        killText += (instance.name == '') ? (killText == '') ? 'An unnamed player' : 'an unnamed player' : instance.name;
                        killText += ' and ';
                    }
                    // Only if we give messages
                    if (dothISendAText) {
                        instance.sendMessage('You killed ' + name + ((killers.length > 1) ? ' (with some help).' : '.'));
                    }
                });
                // Prepare the next part of the next
                killText = killText.slice(0, -4);
                killText += 'killed you with ';
            }
            // Broadcast
            if (this.settings.broadcastMessage) sockets.broadcast(this.settings.broadcastMessage);
            if (this.settings.defeatMessage) {
                let text = util.addArticle(this.label, true);
                if (notJustFood) {
                    text += ' has been defeated by';
                    killers.forEach(instance => {
                        text += ' ';
                        text += (instance.name === '') ? 'an unnamed player' : instance.name;
                        text += ' and';
                    });
                    text = text.slice(0, -4);
                    text += '!';
                } else {
                    text += ' fought a polygon... and the polygon won.';
                }
                sockets.broadcast(text);
            }
            // Add the implements to the message
            killTools.forEach((instance) => {
                killText += util.addArticle(instance.label) + ' and ';
            });
            // Prepare it and clear the collision array.
            killText = killText.slice(0, -5);
            if (killText === 'You have been kille') killText = 'You have died a stupid death';
            this.sendMessage(killText + '.');
            // If I'm the leader, broadcast it:
            if (this.id === room.topPlayerID) {
                let usurptText = (this.name === '') ? 'The leader' : this.name;
                if (notJustFood) {
                    usurptText += ' has been usurped by';
                    killers.forEach(instance => {
                        usurptText += ' ';
                        usurptText += (instance.name === '') ? 'an unnamed player' : instance.name;
                        usurptText += ' and';
                    });
                    usurptText = usurptText.slice(0, -4);
                    usurptText += '!';
                } else {
                    usurptText += ' fought a polygon... and the polygon won.';
                }
                sockets.broadcast(usurptText);
            }
            this.setKillers(killers);
            if (this.socket && this.socket.discordID != null) {
                if (this.skill.score >= 10000000) {
                    bot.database.makeEntry(bot, bot.config.logs.achievementDatabase, {
                        id: this.socket.discordID,
                        achievement: "Wtf dude.... How much time do you have?|||Die with at least ten million points."
                    });
                    this.sendMessage("Achievement get: " + "Wtf dude.... How much time do you have?");
                } else if (this.skill.score >= 5000000) {
                    bot.database.makeEntry(bot, bot.config.logs.achievementDatabase, {
                        id: this.socket.discordID,
                        achievement: "Dang this guy is serious|||Die with at least five million points."
                    });
                    this.sendMessage("Achievement get: " + "Dang this guy is serious");
                } else if (this.skill.score >= 1000000) {
                    bot.database.makeEntry(bot, bot.config.logs.achievementDatabase, {
                        id: this.socket.discordID,
                        achievement: "Millionare|||Die with at least one million points."
                    });
                    this.sendMessage("achievement get: " + "Millionare");
                }
            }
            // Kill it
            return 1;
        }
        return 0;
    }
    protect() {
        entitiesToAvoid.push(this);
        this.isProtected = true;
    }
    sendMessage(message) {} // Dummy
    setKillers(killers) {} // Dummy
    kill() {
        this.health.lastDamage = this.shield.lastDamage = Infinity;
        this.invuln = false;
        this.godmode = false;
        this.passive = false;
        this.health.amount = -1;
    }
    destroy() {
        // Remove from the protected entities list
        if (this.isProtected) util.remove(entitiesToAvoid, entitiesToAvoid.indexOf(this));
        // Remove this from views
        views.forEach(v => v.remove(this));
        // Remove from parent lists if needed
        if (this.parent != null) util.remove(this.parent.children, this.parent.children.indexOf(this));
        // Kill all of its children
        for (let instance of entities) {
            if (instance.source.id === this.id) {
                if (instance.settings.persistsAfterDeath) {
                    instance.source = instance;
                } else {
                    instance.kill();
                }
            }
            if (instance.parent && instance.parent.id === this.id) {
                instance.parent = null;
            }
            if (instance.master.id === this.id) {
                instance.kill();
                instance.master = instance;
            }
        }
        // Remove everything bound to it
        for (let i = 0; i < this.turrets.length; i++) this.turrets[i].destroy();
        // Remove from the collision grid
        this.removeFromGrid();
        this.isGhost = true;
    }
    isDead() {
        return this.health.amount <= 0;
    }
}
module.exports = {
    Gun,
    Entity
};
