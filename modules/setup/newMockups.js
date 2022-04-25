/*jslint node: true */
/*jshint -W061 */
/*global goog, Map, let */
"use strict";
// General requires
require('google-closure-library');
goog.require('goog.structs.PriorityQueue');
goog.require('goog.structs.QuadTree');

const protocol = require("../../lib/mockupProtocol.js");

function rounder(val) {
    if (Math.abs(val) < 0.001) val = 0;
    return +val.toPrecision(3);
}

const defaults = {
    x: 0,
    y: 0,
    color: 16,
    shape: 0,
    size: 1,
    realSize: 1,
    facing: 0,
    layer: 0,
    statnames: 0,
    defaultArrayLength: 0,
    aspect: 1,
    skin: 0,
    colorUnmix: 0,
    angle: 0
};

function applyDefaults(mockup) {
    for (const key in mockup) {
        if (defaults[key] != null) {
            if (mockup[key] == defaults[key] || mockup[key] == null) {
                delete mockup[key];
            }
        } else if (mockup[key] instanceof Array && mockup[key].length === defaults.defaultArrayLength) {
            delete mockup[key];
        } else if (mockup[key] == null) {
            delete mockup[key];
        }
    }
    (mockup.guns || []).forEach(gun => {
        for (const key in gun) {
            if (defaults[key] != null) {
                if (gun[key] == defaults[key] || gun[key] == null) {
                    delete gun[key];
                }
            } else if (gun[key] instanceof Array && gun[key].length === defaults.defaultArrayLength) {
                delete gun[key];
            } else if (gun[key] == null) {
                delete gun[key];
            }
        }
    });
    return mockup;
}

function getMockup(e, positionInfo) {
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
    return applyDefaults(output);
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
        if (z === 1) {
            for (let i = 0; i < 2; i += 0.5) {
                endpoints.push({
                    x: focus.x + scale * Math.cos(i * Math.PI),
                    y: focus.y + scale * Math.sin(i * Math.PI)
                });
            }
        } else {
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
    let massCenter = {
        x: 0,
        y: 0
    };
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
    function circleOfThreePoints(p1, p2, p3) {
        let x1 = p1.x,
            y1 = p1.y,
            x2 = p2.x,
            y2 = p2.y,
            x3 = p3.x,
            y3 = p3.y,
            denom = x1 * (y2 - y3) - y1 * (x2 - x3) + x2 * y3 - x3 * y2,
            xy1 = x1 * x1 + y1 * y1,
            xy2 = x2 * x2 + y2 * y2,
            xy3 = x3 * x3 + y3 * y3,
            x = (xy1 * (y2 - y3) + xy2 * (y3 - y1) + xy3 * (y1 - y2)) / (2 * denom),
            y = (xy1 * (x3 - x2) + xy2 * (x1 - x3) + xy3 * (x2 - x1)) / (2 * denom);
        return {
            x: x,
            y: y,
            radius: Math.sqrt(Math.pow(x - x1, 2) + Math.pow(y - y1, 2))
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
    function checkingFunction() {
        for (var i = endpoints.length; i > 0; i--) {
            point1 = chooseFurthestAndRemove(centerOfCircle);
            let vectorFromPointToCircleCenter = new Vector(centerOfCircle.x - point1.x, centerOfCircle.y - point1.y);
            if (vectorFromPointToCircleCenter.length > radiusOfCircle) {
                pointDisplay.push({
                    x: rounder(point1.x),
                    y: rounder(point1.y)
                });
                let dir = vectorFromPointToCircleCenter.direction;
                point2 = {
                    x: centerOfCircle.x + radiusOfCircle * Math.cos(dir),
                    y: centerOfCircle.y + radiusOfCircle * Math.sin(dir)
                };
                break;
            }
        }
        return !!endpoints.length;
    }
    while (checkingFunction()) {
        centerOfCircle = {
            x: (point1.x + point2.x) / 2,
            y: (point1.y + point2.y) / 2,
        };
        radiusOfCircle = Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2)) / 2;
    }
    return {
        middle: {
            x: rounder(centerOfCircle.x),
            y: 0
        },
        axis: rounder(radiusOfCircle * 2),
        points: pointDisplay,
    };
}

function getTankMockup(key, tempTank, purge = true) {
    if (!Class.hasOwnProperty(key)) return false;
    tempTank = tempTank || new Entity({ x: 0, y: 0 });
    let type = Class[key], output;
    tempTank.upgrades = [];
    tempTank.settings.skillNames = null;
    tempTank.define({
        SHAPE: 0,
        COLOR: 16,
        GUNS: [],
        TURRETS: []
    });
    tempTank.define(type);
    tempTank.name = type.LABEL;
    type.mockup = {
        body: tempTank.camera(true),
        position: getDimensions(tempTank),
    };
    type.mockup.body.position = type.mockup.position;
    output = getMockup(tempTank, type.mockup.position);
    tempTank.destroy();
    if (purge) {
        purgeEntities();
    }
    return output;
}

function loadMockupJsonData() {
    mockupsLoaded = false;
    console.log("Started loading mockups!");
    let mockupData = [];
    const tempTank = new Entity({
        x: 0,
        y: 0
    });
    for (let k in Class) {
        try {
            mockupData.push(getTankMockup(k, tempTank, false));
        } catch (error) {
            util.error(error);
            util.error(k);
            util.error(Class[k]);
        }
    }
    tempTank.destroy();
    purgeEntities();
    let writeData = JSON.stringify(mockupData);
    console.log("Finished compiling " + mockupData.length + " classes into mockups.");
    mockupsLoaded = true;
    return writeData;
}

module.exports = {
    mockupJsonData: loadMockupJsonData(),
    loadMockupJsonData,
    getTankMockup
};
