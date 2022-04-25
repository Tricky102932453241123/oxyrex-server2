/* jslint node: true */
'use strict';
exports.addArticle = function(string, cap = false) {
    let output = (/[aeiouAEIOU]/.test(string[0])) ? 'an ' + string : 'a ' + string;
    if (cap) {
        output = output.split("");
        output[0] = output[0].toUpperCase();
        output = output.join("");
    }
    return output;
};
exports.getDistance = function(p1, p2) {
    return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
};
exports.getDirection = function(p1, p2) {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x);
};
exports.clamp = function(value, min, max) {
    return value > max ? max : value < min ? min : value;
};
exports.lerp = (a, b, x) => a + x * (b - a);
exports.angleDifference = (() => {
    let mod = function(a, n) {
        return (a % n + n) % n;
    };
    return (sourceA, targetA) => {
        let a = targetA - sourceA;
        return mod(a + Math.PI, 2 * Math.PI) - Math.PI;
    };
})();
exports.loopSmooth = (angle, desired, slowness) => {
    return exports.angleDifference(angle, desired) / slowness;
};
exports.deepClone = (obj, hash = new WeakMap()) => {
    let result;
    // Do not try to clone primitives or functions
    if (Object(obj) !== obj || obj instanceof Function) return obj;
    if (hash.has(obj)) return hash.get(obj); // Cyclic reference
    try { // Try to run constructor (without arguments, as we don't know them)
        result = new obj.constructor();
    } catch (e) { // Constructor failed, create object without running the constructor
        result = Object.create(Object.getPrototypeOf(obj));
    }
    // Optional: support for some standard constructors (extend as desired)
    if (obj instanceof Map) Array.from(obj, ([key, val]) => result.set(exports.deepClone(key, hash), exports.deepClone(val, hash)));
    else if (obj instanceof Set) Array.from(obj, (key) => result.add(exports.deepClone(key, hash)));
    // Register in hash
    hash.set(obj, result);
    // Clone and assign enumerable own properties recursively
    return Object.assign(result, ...Object.keys(obj).map(key => ({
        [key]: exports.deepClone(obj[key], hash)
    })));
};
exports.averageArray = arr => {
    if (!arr.length) return 0;
    var sum = arr.reduce((a, b) => {
        return a + b;
    });
    return sum / arr.length;
};
exports.sumArray = arr => {
    if (!arr.length) return 0;
    var sum = arr.reduce((a, b) => {
        return a + b;
    });
    return sum;
};
exports.signedSqrt = x => {
    return Math.sign(x) * Math.sqrt(Math.abs(x));
};
exports.getJackpot = x => {
    return (x > 26300 * 1.5) ? Math.pow(x - 26300, 0.85) + 26300 : x / 1.5;
};
exports.serverStartTime = Date.now();
// Get a better logging function
exports.time = () => {
    return Date.now() - exports.serverStartTime;
};
exports.formatTime = x => Math.floor(x / (1000 * 60 * 60)) + " hours, " + Math.floor(x / (1000 * 60)) % 60 + " minutes and " + Math.floor(x / 1000) % 60 + " seconds";
// create a custom timestamp format for log statements
exports.log = text => {
    console.log('[' + (exports.time() / 1000).toFixed(3) + ']: ' + text);
};
exports.warn = text => {
    console.log('[' + (exports.time() / 1000).toFixed(3) + ']: ' + '[WARNING] ' + text);
};
exports.error = text => {
    console.log(text);
};
exports.remove = (array, index) => {
    // there is more than one object in the container
    if (index === array.length - 1) {
        // special case if the obj is the newest in the container
        return array.pop();
    } else {
        let o = array[index];
        array[index] = array.pop();
        return o;
    }
};
exports.formatLargeNumber = x => {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};
exports.timeForHumans = x => {
    // ought to be in seconds
    let seconds = x % 60;
    x /= 60;
    x = Math.floor(x);
    let minutes = x % 60;
    x /= 60;
    x = Math.floor(x);
    let hours = x % 24;
    x /= 24;
    x = Math.floor(x);
    let days = x;
    let y = '';
    function weh(z, text) {
        if (z) {
            y = y + ((y === '') ? '' : ', ') + z + ' ' + text + ((z > 1) ? 's' : '');
        }
    }
    weh(days, 'day');
    weh(hours, 'hour');
    weh(minutes, 'minute');
    weh(seconds, 'second');
    if (y === '') {
        y = 'less than a second';
    }
    return y;
};

exports.formatDate = function(date = new Date()) {
    function pad2(n) {
        return (n < 10 ? '0' : '') + n;
    }
    var month = pad2(date.getMonth() + 1);
    var day = pad2(date.getDate());
    var year = date.getFullYear();
    return [month, day, year].join("/");
}

exports.constructDateWithYear = function(month = (new Date()).getMonth() + 1, day = (new Date()).getDate(), year = (new Date()).getFullYear()) {
    function pad2(n) {
        return (n < 10 ? '0' : '') + n;
    }
    month = pad2(month);
    day = pad2(day);
    year = year;
    return [month, day, year].join("/");
}

exports.dateCheck = function(from, to, check = exports.formatDate()) {
    var fDate, lDate, cDate;
    fDate = Date.parse(from);
    lDate = Date.parse(to);
    cDate = Date.parse(check);
    return cDate <= lDate && cDate >= fDate;
}
