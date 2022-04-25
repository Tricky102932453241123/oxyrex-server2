/*jslint node: true */
/*jshint -W061 */
/*global goog, Map, let */
"use strict";
// General requires
require('google-closure-library');
goog.require('goog.structs.PriorityQueue');
goog.require('goog.structs.QuadTree');
const atlas = ["name", "index", "x", "y", "color", "shape", "size", "realSize", "facing", "position", "middle", "axis", "points", "upgrades", "guns", "turrets", "offset", "direction", "length", "width", "aspect", "angle", "skin", "layer", "sizeFactor", "body", "Health", "Body Damage", "Movement Speed", "Regeneration", "Shield", "Acceleration", "Density", "Penetration", "Pushability"];

function encode(json) {
    let output = [];
    for (let key in json) {
        if (typeof json[key] === "object") {
            if (Array.isArray(json[key])) {
                for (let index = 0, length = json[key].length; index < length; index ++) {
                    if (typeof json[key][index] === "object" && !Array.isArray(json[key][index])) {
                        json[key][index] = encode(json[key][index]);
                    }
                }
            } else {
                json[key] = encode(json[key]);
            }
        }
        let newKey = (atlas.indexOf(key) === -1 ? key : atlas.indexOf(key));
        output.push(newKey, json[key]);//[newKey] = json[key];
    }
    return output;
}

function decode(json) {
    let output = {};
    while (json.length > 0) {
        const key = atlas[json.shift()];
        const element = json.shift();
        if (typeof element === "object") {
            if (Array.isArray(element)) {
                for (let index = 0, length = element.length; index < length; index ++) {
                    if (typeof element[index] === "object" && !Array.isArray(element[index])) {
                        element[index] = decode(element[index]);
                    }
                }
            } else {
                element = decode(element);
            }
        }
        output[key] = json[element];
    }
    for (let key in json) {
        if (typeof json[key] === "object") {
            if (Array.isArray(json[key])) {
                for (let index = 0, length = json[key].length; index < length; index ++) {
                    if (typeof json[key][index] === "object" && !Array.isArray(json[key][index])) {
                        json[key][index] = decode(json[key][index]);
                    }
                }
            } else {
                json[key] = decode(json[key]);
            }
        }
        let newKey = (isNaN(+key) ? key : atlas[+key]);
        output[newKey] = json[key];
    }
    return output;
}

function encodeMockups(data) {
    let output = [];
    for (let i = 0, length = data.length; i < length; i ++) output.push(encode(data[i]));
    return output;
}

function decodeMockups(data) {
    let output = [];
    for (let i = 0, length = data.length; i < length; i ++) output.push(decode(data[i]));
    return output;
}

const protocol = {
    encode: encodeMockups,
    decode: decodeMockups
};

if (typeof module !== "undefined") {
    //module.exports = protocol;
} else if (typeof window !== "undefined") {
    //window.mockupProtocol = protocol;
}

const loadMockupJsonData = (() => {
    console.log("Started loading mockups...");
    function rounder(val) {
        if (Math.abs(val) < 0.001) val = 0;
        return +val.toPrecision(3);
    }
    // Define mocking up functions
    function getMockup(e, positionInfo, tank) {
        const output = {
            index: e.index,
            name: e.label,
            x: rounder(e.x),
            y: rounder(e.y),
            color: e.color,
            shape: e.shapeData,
            size: rounder(e.size),
            realSize: rounder(e.realSize),
            facing: rounder(e.facing),
            layer: e.layer,
            statnames: e.settings.skillNames,
            position: positionInfo,
            upgrades: e.upgrades.map(r => ({
                tier: r.tier,
                index: r.index
            })),
            guns: e.guns.map(function(gun) {
                return {
                    offset: rounder(gun.offset),
                    direction: rounder(gun.direction),
                    length: rounder(gun.length),
                    width: rounder(gun.width),
                    aspect: rounder(gun.aspect),
                    angle: rounder(gun.angle),
                    color: rounder(gun.color),
                    skin: rounder(gun.skin),
                    colorUnmix: rounder(gun.colorUnmix || 0)
                };
            }),
            turrets: e.turrets.map(function(t) {
                let out = getMockup(t, {});
                out.sizeFactor = rounder(t.bound.size);
                out.offset = rounder(t.bound.offset);
                out.direction = rounder(t.bound.direction);
                out.layer = rounder(t.bound.layer);
                out.angle = rounder(t.bound.angle);
                return out;
            })
        };
        return output;
    }
    function getDimensions(entities) {
        let endpoints = [];
        let pointDisplay = [];
        let pushEndpoints = function(model, scale, focus = {
            x: 0,
            y: 0
        }, rot = 0) {
            let s = Math.abs(model.shape);
            let z = (Math.abs(s) > lazyRealSizes.length) ? 1 : lazyRealSizes[Math.abs(s)];
            if (z === 1) { // Body (octagon if circle)
                for (let i = 0; i < 2; i += 0.5) {
                    endpoints.push({
                        x: focus.x + scale * Math.cos(i * Math.PI),
                        y: focus.y + scale * Math.sin(i * Math.PI)
                    });
                }
            } else { // Body (otherwise vertices)
                for (let i = (s % 2) ? 0 : Math.PI / s; i < s; i++) {
                    let theta = (i / s) * 2 * Math.PI;
                    endpoints.push({
                        x: focus.x + scale * z * Math.cos(theta),
                        y: focus.y + scale * z * Math.sin(theta)
                    });
                }
            }
            for (let i = 0; i < model.guns.length; i++) {
                let gun = model.guns[i];
                let h = gun.aspect > 0 ? ((scale * gun.width) / 2) * gun.aspect : (scale * gun.width) / 2;
                let r = Math.atan2(h, scale * gun.length) + rot;
                let l = Math.sqrt(scale * scale * gun.length * gun.length + h * h);
                let x = focus.x + scale * gun.offset * Math.cos(gun.direction + gun.angle + rot);
                let y = focus.y + scale * gun.offset * Math.sin(gun.direction + gun.angle + rot);
                endpoints.push({
                    x: x + l * Math.cos(gun.angle + r),
                    y: y + l * Math.sin(gun.angle + r)
                });
                endpoints.push({
                    x: x + l * Math.cos(gun.angle - r),
                    y: y + l * Math.sin(gun.angle - r)
                });
                pointDisplay.push({
                    x: x + l * Math.cos(gun.angle + r),
                    y: y + l * Math.sin(gun.angle + r)
                });
                pointDisplay.push({
                    x: x + l * Math.cos(gun.angle - r),
                    y: y + l * Math.sin(gun.angle - r)
                });
            }
            for (let i = 0; i < model.turrets.length; i++) {
                let turret = model.turrets[i];
                if (!turret.label.includes("Collision")) {
                    pushEndpoints(turret, turret.bound.size, {
                        x: turret.bound.offset * Math.cos(turret.bound.angle),
                        y: turret.bound.offset * Math.sin(turret.bound.angle)
                    }, turret.bound.angle);
                }
            }
        };
        pushEndpoints(entities, 1);
        // 2) Find their mass center
        let massCenter = {
            x: 0,
            y: 0
        };
        // 3) Choose three different points (hopefully ones very far from each other)
        let chooseFurthestAndRemove = function(furthestFrom) {
            let index = 0;
            if (furthestFrom != -1) {
                let list = new goog.structs.PriorityQueue();
                let d;
                for (let i = 0; i < endpoints.length; i++) {
                    let thisPoint = endpoints[i];
                    d = Math.pow(thisPoint.x - furthestFrom.x, 2) + Math.pow(thisPoint.y - furthestFrom.y, 2) + 1;
                    list.enqueue(1 / d, i);
                }
                index = list.dequeue();
            }
            let output = endpoints[index];
            endpoints.splice(index, 1);
            return output;
        };
        let point1 = chooseFurthestAndRemove(massCenter);
        let point2 = chooseFurthestAndRemove(point1);
        let chooseBiggestTriangleAndRemove = function(point1, point2) {
            let list = new goog.structs.PriorityQueue();
            let index = 0;
            let a;
            for (let i = 0; i < endpoints.length; i++) {
                let thisPoint = endpoints[i];
                a = Math.pow(thisPoint.x - point1.x, 2) + Math.pow(thisPoint.y - point1.y, 2) + Math.pow(thisPoint.x - point2.x, 2) + Math.pow(thisPoint.y - point2.y, 2);
                list.enqueue(1 / a, i);
            }
            index = list.dequeue();
            let output = endpoints[index];
            endpoints.splice(index, 1);
            return output;
        };
        let point3 = chooseBiggestTriangleAndRemove(point1, point2);
        // 4) Define our first enclosing circle as the one which seperates these three furthest points
        function circleOfThreePoints(p1, p2, p3) {
            let x1 = p1.x;
            let y1 = p1.y;
            let x2 = p2.x;
            let y2 = p2.y;
            let x3 = p3.x;
            let y3 = p3.y;
            let denom = x1 * (y2 - y3) - y1 * (x2 - x3) + x2 * y3 - x3 * y2;
            let xy1 = x1 * x1 + y1 * y1;
            let xy2 = x2 * x2 + y2 * y2;
            let xy3 = x3 * x3 + y3 * y3;
            let x = (xy1 * (y2 - y3) + xy2 * (y3 - y1) + xy3 * (y1 - y2)) / (2 * denom);
            let y = (xy1 * (x3 - x2) + xy2 * (x1 - x3) + xy3 * (x2 - x1)) / (2 * denom);
            let r = Math.sqrt(Math.pow(x - x1, 2) + Math.pow(y - y1, 2));
            let r2 = Math.sqrt(Math.pow(x - x2, 2) + Math.pow(y - y2, 2));
            let r3 = Math.sqrt(Math.pow(x - x3, 2) + Math.pow(y - y3, 2));
            //if (r != r2 || r != r3) util.log("Something is up with the mockups generation!");
            return {
                x: x,
                y: y,
                radius: r
            };
        }
        let c = circleOfThreePoints(point1, point2, point3);
        pointDisplay = [{
            x: rounder(point1.x),
            y: rounder(point1.y),
        }, {
            x: rounder(point2.x),
            y: rounder(point2.y),
        }, {
            x: rounder(point3.x),
            y: rounder(point3.y),
        }];
        let centerOfCircle = {
            x: c.x,
            y: c.y
        };
        let radiusOfCircle = c.radius;
        // 5) Check to see if we enclosed everything
        function checkingFunction() {
            for (var i = endpoints.length; i > 0; i--) {
                // Select the one furthest from the center of our circle and remove it
                point1 = chooseFurthestAndRemove(centerOfCircle);
                let vectorFromPointToCircleCenter = new Vector(centerOfCircle.x - point1.x, centerOfCircle.y - point1.y);
                // 6) If we're still outside of this circle build a new circle which encloses the old circle and the new point
                if (vectorFromPointToCircleCenter.length > radiusOfCircle) {
                    pointDisplay.push({
                        x: rounder(point1.x),
                        y: rounder(point1.y)
                    });
                    // Define our new point as the far side of the cirle
                    let dir = vectorFromPointToCircleCenter.direction;
                    point2 = {
                        x: centerOfCircle.x + radiusOfCircle * Math.cos(dir),
                        y: centerOfCircle.y + radiusOfCircle * Math.sin(dir)
                    };
                    break;
                }
            }
            // False if we checked everything, true if we didn't
            return !!endpoints.length;
        }
        while (checkingFunction()) { // 7) Repeat until we enclose everything
            centerOfCircle = {
                x: (point1.x + point2.x) / 2,
                y: (point1.y + point2.y) / 2,
            };
            radiusOfCircle = Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2)) / 2;
        }
        // 8) Since this algorithm isn't perfect but we know our shapes are bilaterally symmetrical, we bind this circle along the x-axis to make it behave better
        return {
            middle: {
                x: rounder(centerOfCircle.x),
                y: 0
            },
            axis: rounder(radiusOfCircle * 2),
            points: pointDisplay,
        };
    }
    // Save them
    let mockupData = [];
    const temptank = new Entity({
        x: 0,
        y: 0
    });
    for (let k in Class) {
        try {
            if (!Class.hasOwnProperty(k)) continue;
            let type = Class[k];
            // Create a reference entities which we'll then take an image of.
            /*let temptank = new Entity({
                x: 0,
                y: 0
            });*/
            temptank.upgrades = [];
            temptank.settings.skillNames = null;
            temptank.define({
                SHAPE: 0,
                COLOR: 16,
                GUNS: [],
                TURRETS: []
            });
            temptank.define(type);
            temptank.name = type.LABEL; // Rename it (for the upgrades menu).
            // Fetch the mockup.
            type.mockup = {
                body: temptank.camera(true),
                position: getDimensions(temptank),
            };
            // This is to pass the size information about the mockup that we didn't have until we created the mockup
            type.mockup.body.position = type.mockup.position;
            // Add the new data to the thing.
            mockupData.push(getMockup(temptank, type.mockup.position, Class[k]));
            // Kill the reference entities.
            temptank.destroy();
        } catch (error) {
            util.error(error);
            util.error(k);
            util.error(Class[k]);
        }
    }
    temptank.destroy();
    // Remove them
    purgeEntities();
    // Build the function to return
    let writeData = JSON.stringify(mockupData);
    console.log("Finished compiling " + mockupData.length + " classes into mockups.");
    mockupsLoaded = true;
    return writeData;
});

let mockupJsonData = loadMockupJsonData();
module.exports = {
    mockupJsonData,
    loadMockupJsonData
};
