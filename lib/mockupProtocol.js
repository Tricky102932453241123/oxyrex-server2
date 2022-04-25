// TODO: Fix decoding based on array vs standard-object

const atlas = ["name", "index", "x", "y", "color", "shape", "size", "realSize", "facing", "position", "middle", "axis", "points", "upgrades", "guns", "turrets", "offset", "direction", "length", "width", "aspect", "angle", "skin", "layer", "sizeFactor", "colorOffset"];

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
        let element = json.shift();
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
        output[key] = element;
    }
    /*for (let key in json) {
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
    }*/
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
    module.exports = protocol;
} else if (typeof window !== "undefined") {
    window.mockupProtocol = protocol;
}