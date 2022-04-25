/*jslint node: true */
/*jshint -W061 */
/*global goog, Map, let */
"use strict";
// General requires
require('google-closure-library');
goog.require('goog.structs.PriorityQueue');
goog.require('goog.structs.QuadTree');
let accounts = [];
let chars = "1234567890qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM-_".split("");
let shuffle = "P_yRsjSODtMkv6wNE5Lr-HIbh4TYeAKVgFG3lW9dmUQqpn7JCZX2cBfaiu18zo0x".split(""); // DO NOT SHARE
let encode = message => {
    let output = [];
    message = message.split("");
    let index = 0;
    for (let i = 0; i < message.length; i++) {
        index++;
        let char = message[i];
        let charIndex = chars.indexOf(char) + index;
        if (charIndex >= chars.length) charIndex -= chars.length;
        output.push(shuffle[charIndex]);
    }
    return output.join("");
};
let decode = message => {
    let output = [];
    message = message.split("");
    let index = 0;
    for (let i = 0; i < message.length; i++) {
        index++;
        let char = message[i];
        let charIndex = shuffle.indexOf(char) - index;
        if (charIndex < 0) charIndex += shuffle.length;
        output.push(chars[charIndex]);
    }
    return output.join("");
};
module.exports = {
    accountEncryption: {
        encode,
        decode
    }
};
