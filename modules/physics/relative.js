/*jslint node: true */
/*jshint -W061 */
/*global goog, Map, let */
"use strict";
// General requires
require('google-closure-library');
goog.require('goog.structs.PriorityQueue');
goog.require('goog.structs.QuadTree');
// Basic Vector
class Vector {
    constructor(x, y) {
        this.X = x;
        this.Y = y;
    }
    get x() {
        if (isNaN(this.X)) this.X = c.MIN_SPEED;
        return this.X;
    }
    get y() {
        if (isNaN(this.Y)) this.Y = c.MIN_SPEED;
        return this.Y;
    }
    set x(value) {
        this.X = value;
    }
    set y(value) {
        this.Y = value;
    }
    null() {
        this.X = 0;
        this.Y = 0;
    }
    update() {
        this.len = this.length;
        this.dir = this.direction;
    }
    isShorterThan(d) {
        return this.x * this.x + this.y * this.y <= d * d;
    }
    get length() {
        return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
    }
    get direction() {
        return Math.atan2(this.y, this.x);
    }
};
// Null vector that will turn a vector into null.
function nullVector(v) {
    v.x = 0;
    v.y = 0;
};
// Gets a priority queue and returns the nearest.
function nearest(array, location, test) {
    if (!array.length) return
    let priority = Infinity,
        lowest
    if (test) {
        for (let instance of array) {
            let x = instance.x - location.x
            let y = instance.y - location.y
            let d = x * x + y * y
            if (d < priority && test(instance, d)) {
                priority = d
                lowest = instance
            }
        }
    } else {
        for (let instance of array) {
            let x = instance.x - location.x
            let y = instance.y - location.y
            let d = x * x + y * y
            if (d < priority) {
                priority = d
                lowest = instance
            }
        }
    }
    return lowest
}

function timeOfImpact(p, v, s) {
    // Requires relative position and velocity to aiming point
    let a = s * s - (v.x * v.x + v.y * v.y)
    let b = p.x * v.x + p.y * v.y
    let c = p.x * p.x + p.y * p.y
    let d = b * b + a * c
    let t = 0
    if (d >= 0) {
        t = Math.max(0, (b + Math.sqrt(d)) / a)
    }
    return t * 0.9
}
module.exports = {
    Vector,
    nullVector,
    nearest,
    timeOfImpact
};
