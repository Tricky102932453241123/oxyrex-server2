/*jslint node: true */
/*jshint -W061 */
/*global goog, Map, let */
"use strict";
// General requires
require('google-closure-library');
goog.require('goog.structs.PriorityQueue');
goog.require('goog.structs.QuadTree');
let Class = (function() {
    const def = require("../../lib/definitions.js");
    let i = 0;
    for (let key in def) {
        if (!def.hasOwnProperty(key)) continue;
        def[key].index = i++;
        def[key].className = key;
    }
    return def;
})();
const skcnv = {
    rld: 0,
    pen: 1,
    str: 2,
    dam: 3,
    spd: 4,
    shi: 5,
    atk: 6,
    hlt: 7,
    rgn: 8,
    mob: 9,
};
const levelers = [];
for (let i = 0; i < 45; i ++) levelers.push(((i / 45) * 60 + 1) | 0);
const botBuilds = [
    [9, 9, 9, 9, 9, 0, 0, 0, 0, 0],
    [8, 8, 8, 8, 8, 0, 0, 0, 0, 5],
    [5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
    [6, 7, 7, 7, 6, 3, 2, 2, 3, 3],
    [9, 7, 7, 7, 6, 0, 0, 0, 0, 9]
];
const botSets = [{ // Smasher Ram Bots
    ai: "ramBot",
    build: [0, 0, 0, 0, 0, 5, 9, 12, 3, 10],
    startClass: "smasher"
}, { // Tri-Angle Ram Bots
    ai: "ramBot",
    build: [9, 0, 0, 0, 0, 5, 9, 9, 4, 9],
    startClass: "propeller"
}, { // Tri-Angle Bullet Bots
    ai: "bot",
    build: [9, 9, 9, 9, 0, 0, 0, 0, 0, 9],
    startClass: "tri"
}, { // Pounder Bots
    ai: "bot",
    build: [3, 8, 8, 8, 7, 0, 0, 3, 0, 7],
    startClass: "pounder"
}, { // Sniper Bots
    ai: "bot",
    build: [6, 8, 8, 8, 5, 0, 5, 5, 0, 2],
    startClass: "sniper"
}, { // Drone Bots
    ai: "bot",
    build: [3, 8, 8, 8, 7, 0, 3, 3, 0, 7],
    startClass: "director"
}, { // Lancer Bots
    ai: "ramBot",
    build: [0, 4, 4, 5, 0, 3, 6, 7, 3, 8],
    startClass: "lancer"
}];
for (let build of botBuilds) botSets.push({ // All the builds that bots have.
    ai: "bot",
    build: build,
    startClass: "basic",
    ignore: ["Lancer", "Smasher"]
});
class Skill {
    constructor(inital = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]) { // Just skill stuff.
        this.raw = inital;
        this.caps = [];
        this.setCaps([
            c.MAX_SKILL, c.MAX_SKILL, c.MAX_SKILL, c.MAX_SKILL, c.MAX_SKILL,
            c.MAX_SKILL, c.MAX_SKILL, c.MAX_SKILL, c.MAX_SKILL, c.MAX_SKILL
        ]);
        this.name = ['Reload', 'Bullet Penetration', 'Bullet Health', 'Bullet Damage', 'Bullet Speed', 'Shield Capacity', 'Body Damage', 'Max Health', 'Shield Regeneration', 'Movement Speed', ];
        this.atk = 0;
        this.hlt = 0;
        this.spd = 0;
        this.str = 0;
        this.pen = 0;
        this.dam = 0;
        this.rld = 0;
        this.mob = 0;
        this.rgn = 0;
        this.shi = 0;
        this.rst = 0;
        this.brst = 0;
        this.ghost = 0;
        this.acl = 0;
        this.lancer = {};
        this.reset();
    }
    reset() {
        this.points = 0;
        this.score = 0;
        this.deduction = 0;
        this.level = 0;
        this.canUpgrade = false;
        this.update();
        this.maintain();
    }
    update() {
        let curve = (() => {
            function make(x) {
                return Math.log(4 * x + 1) / Math.log(5);
            }
            let a = [];
            for (let i = 0; i < c.MAX_SKILL * 2; i++) {
                a.push(make(i / c.MAX_SKILL));
            }
            // The actual lookup function
            return x => {
                return a[x * c.MAX_SKILL];
            };
        })();

        function apply(f, x) {
            return (x < 0) ? 1 / (1 - x * f) : f * x + 1;
        }
        for (let i = 0; i < 10; i++) {
            if (this.raw[i] > this.caps[i]) {
                this.points += this.raw[i] - this.caps[i];
                this.raw[i] = this.caps[i];
            }
        }
        let attrib = [];
        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 2; j += 1) {
                attrib[i + 5 * j] = curve(
                    (this.raw[i + 5 * j] + this.bleed(i, j)) / c.MAX_SKILL);
            }
        }
        this.rld = Math.pow(0.5, attrib[skcnv.rld]);
        this.pen = apply(2.7, attrib[skcnv.pen]);
        this.str = apply(2.2, attrib[skcnv.str]);
        this.dam = apply(3.2, attrib[skcnv.dam]);
        this.spd = 0.5 + apply(1.5, attrib[skcnv.spd]);
        this.acl = apply(0.5, attrib[skcnv.rld]);
        this.rst = 0.5 * attrib[skcnv.str] + 2.5 * attrib[skcnv.pen];
        this.ghost = attrib[skcnv.pen];
        // this.shi = c.GLASS_HEALTH_FACTOR * apply(8 / c.GLASS_HEALTH_FACTOR - 1, attrib[skcnv.shi]);
        this.shi = apply(0.3, attrib[skcnv.shi]);
        this.atk = apply(0.085, attrib[skcnv.atk]);
        this.hlt = apply(0.3, attrib[skcnv.hlt]); // c.GLASS_HEALTH_FACTOR * apply(2.25 / c.GLASS_HEALTH_FACTOR - 1, attrib[skcnv.hlt]);
        this.mob = apply(.8, attrib[skcnv.mob]);
        this.rgn = apply(10, attrib[skcnv.rgn]);
        this.brst = 0.3 * (0.5 * attrib[skcnv.atk] + 0.5 * attrib[skcnv.hlt]);
        this.lancer = {
            pen: apply(10, attrib[skcnv.pen]),
            str: apply(10, attrib[skcnv.str]),
            dam: apply(10, attrib[skcnv.dam]),
            spd: apply(10, attrib[skcnv.spd])
        }
    }
    set(thing) {
        this.raw[0] = thing[0];
        this.raw[1] = thing[1];
        this.raw[2] = thing[2];
        this.raw[3] = thing[3];
        this.raw[4] = thing[4];
        this.raw[5] = thing[5];
        this.raw[6] = thing[6];
        this.raw[7] = thing[7];
        this.raw[8] = thing[8];
        this.raw[9] = thing[9];
        this.update();
    }
    setCaps(thing) {
        this.caps[0] = thing[0];
        this.caps[1] = thing[1];
        this.caps[2] = thing[2];
        this.caps[3] = thing[3];
        this.caps[4] = thing[4];
        this.caps[5] = thing[5];
        this.caps[6] = thing[6];
        this.caps[7] = thing[7];
        this.caps[8] = thing[8];
        this.caps[9] = thing[9];
        this.update();
    }
    maintain() {
        if (this.level < c.SKILL_CAP) {
            if (this.score - this.deduction >= this.levelScore) {
                this.deduction += this.levelScore;
                this.level += 1;
                this.points += this.levelPoints;
                if (this.level == c.TIER_1 || this.level == c.TIER_2 || this.level == c.TIER_3) {
                    this.canUpgrade = true;
                }
                this.update();
                return true;
            }
        }
        return false;
    }
    get levelScore() {
        return Math.ceil(1.8 * Math.pow(this.level + 1, 1.8) - 2 * this.level + 1);
    }
    get progress() {
        return (this.levelScore) ? (this.score - this.deduction) / this.levelScore : 0;
    }
    get levelPoints() {
        if (levelers.findIndex(e => {
                return e === this.level;
            }) != -1) {
            return 1;
        }
        return 0;
    }
    cap(skill, real = false) {
        if (!real && this.level < c.SKILL_SOFT_CAP) {
            return Math.round(this.caps[skcnv[skill]] * c.SOFT_MAX_SKILL);
        }
        return this.caps[skcnv[skill]];
    }
    bleed(i, j) {
        let a = ((i + 2) % 5) + 5 * j,
            b = ((i + ((j === 1) ? 1 : 4)) % 5) + 5 * j;
        let value = 0;
        let denom = Math.max(c.MAX_SKILL, this.caps[i + 5 * j]);
        value += (1 - Math.pow(this.raw[a] / denom - 1, 2)) * this.raw[a] * c.SKILL_LEAK;
        value -= Math.pow(this.raw[b] / denom, 2) * this.raw[b] * c.SKILL_LEAK;
        return value;
    }
    upgrade(stat) {
        if (this.points && this.amount(stat) < this.cap(stat)) {
            this.change(stat, 1);
            this.points -= 1;
            return true;
        }
        return false;
    }
    title(stat) {
        return this.name[skcnv[stat]];
    }
    /*
    let i = skcnv[skill] % 5,
        j = (skcnv[skill] - i) / 5;
    let roundvalue = Math.round(this.bleed(i, j) * 10);
    let string = '';
    if (roundvalue > 0) { string += '+' + roundvalue + '%'; }
    if (roundvalue < 0) { string += '-' + roundvalue + '%'; }

    return string;
    */
    amount(skill) {
        return this.raw[skcnv[skill]];
    }
    change(skill, levels) {
        this.raw[skcnv[skill]] += levels;
        this.update();
    }
}
class HealthType {
    constructor(health, type, resist = 0) {
        this.max = health || .01;
        this.amount = health || .01;
        this.type = type;
        this.resist = resist;
        this.regen = 0;
        this.lastDamage = 0;
        this.rMax = health || .01;
        this.rAmount = health || .01;
    }
    get max() {
        return this.rMax;
    }
    get amount() {
        return this.rAmount;
    }
    set max(value) {
        if (Number.isFinite(value)) {
            this.rMax = value;
        }
    }
    set amount(value) {
        if (Number.isFinite(value)) {
            this.rAmount = value;
        }
    }
    set(health, regen = 0) {
        if (health <= 0) {
            health = .01;
        }
        this.amount = (this.max) ? this.amount / this.max * health : health;
        this.max = health;
        this.regen = regen;
    }
    display() {
        return this.amount / this.max;
    }
    getDamage(amount, capped = true) {
        this.lastDamage = Date.now();
        switch (this.type) {
            case 'dynamic':
                return (capped) ? (Math.min(amount * this.permeability, this.amount)) : (amount * this.permeability);
            case 'static':
                return (capped) ? (Math.min(amount, this.amount)) : (amount);
        }
    }
    regenerate(boost = false) {
        if (Date.now() - this.lastDamage < 3000) return;
        boost /= 2;
        let cons = 5;
        switch (this.type) {
            case 'static':
                if (this.amount >= this.max || !this.amount) break;
                this.amount += (cons / 5) * (this.max / 10 / 60 / 2.5 + (boost * 2.5));
                break;
            case 'dynamic':
                let r = util.clamp(this.amount / this.max, 0, 1);
                if (!r) {
                    this.amount = 0.0001;
                }
                if (r === 1) {
                    this.amount = this.max;
                } else {
                    this.amount += (cons / 2) * ((this.regen * 5) * Math.exp(-50 * Math.pow(Math.sqrt(0.5 * r) - 0.4, 2)) / 5 + r * (this.max / 1.5) / 10 / 15 + boost);
                }
                break;
        }
        this.amount = util.clamp(this.amount, 0, this.max);
    }
    get permeability() {
        switch (this.type) {
            case 'static':
                return 1;
            case 'dynamic':
                return (this.max) ? util.clamp(this.amount / this.max, 0, 1) : 0;
        }l
    }
    get ratio() {
        return (this.max) ? util.clamp(1 - Math.pow(this.amount / this.max - 1, 4), 0, 1) : 0;
    }
}
const dirtyCheck = function(p, r) {
    return entitiesToAvoid.some(e => {
        return Math.abs(p.x - e.x) < r + e.size && Math.abs(p.y - e.y) < r + e.size;
    });
};
const purgeEntities = function() {
    entities = entities.filter(e => {
        return !e.isGhost;
    });
};
var bringToLife = (() => {
    let remapTarget = (i, ref, self) => {
        if (i.target == null || (!i.main && !i.alt)) return;
        return {
            x: i.target.x + ref.x - self.x,
            y: i.target.y + ref.y - self.y,
        };
    };
    let passer = (a, b, acceptsFromTop) => {
        return index => {
            if (a != null && a[index] != null && (b[index] == null || acceptsFromTop)) {
                b[index] = a[index];
            }
        };
    };
    return my => {
        // Size
        my.coreSize = my.SIZE;
        //if (my.SIZE - my.coreSize) my.coreSize += my.type === "wall" ? my.SIZE - my.coreSize : (my.SIZE - my.coreSize) / 50;
        // Think
        let faucet = (my.settings.independent || my.source == null || my.source === my) ? {} : my.source.control;
        let b = {
            target: remapTarget(faucet, my.source, my),
            goal: undefined,
            fire: faucet.fire,
            main: faucet.main,
            alt: faucet.alt,
            power: undefined,
        };
        // Seek attention
        if (my.settings.attentionCraver && !faucet.main && my.range) {
            my.range -= 1;
        }
        // Invisibility
        if (my.invisible[1]) {
            my.alpha = Math.max(0, my.alpha - my.invisible[1])
            if (!my.velocity.isShorterThan(0.1) || my.damageReceived) my.alpha = Math.min(1, my.alpha + my.invisible[0]);
        }
        // So we start with my master's thoughts and then we filter them down through our control stack
        for (let AI of my.controllers) {
            let a = AI.think(b);
            let passValue = passer(a, b, AI.acceptsFromTop);
            passValue('target');
            passValue('goal');
            passValue('fire');
            passValue('main');
            passValue('alt');
            passValue('power');
        }
        my.control.target = (b.target == null) ? my.control.target : b.target;
        my.control.goal = b.goal ? b.goal : {
            x: my.x,
            y: my.y
        };
        my.control.fire = b.fire;
        my.control.main = b.main;
        my.control.alt = b.alt;
        my.control.power = (b.power == null) ? 1 : b.power;
        // React
        my.move();
        my.face();
        // Handle guns and turrets if we've got them
        for (let gun of my.guns) gun.live();
        for (let turret of my.turrets) turret.life();
        if (my.skill.maintain()) my.refreshBodyAttributes();
    };
})();
const lazyRealSizes = (() => {
    let o = [1, 1, 1];
    for (var i = 3; i < 17; i++) {
        // We say that the real size of a 0-gon, 1-gon, 2-gon is one, then push the real sizes of triangles, squares, etc...
        o.push(Math.sqrt((2 * Math.PI / i) * (1 / Math.sin(2 * Math.PI / i))));
    }
    return o;
})();
module.exports = {
    Class,
    skcnv,
    levelers,
    Skill,
    HealthType,
    dirtyCheck,
    purgeEntities,
    bringToLife,
    lazyRealSizes,
    botSets
};
