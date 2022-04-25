/*jslint node: true */
/*jshint -W061 */
/*global goog, Map, let */
"use strict";
// General requires
require('google-closure-library');
goog.require('goog.structs.PriorityQueue');
goog.require('goog.structs.QuadTree');
let activeGroups = [];
const getID = () => {
    let i = 0;
    while (i < 100) {
        const id = Math.random() * 100 | 0;
        if (!activeGroups.find(e => e.teamID === id)) return id;
        i ++;
    }
    return Number(Math.random().toString().replace("0.", ""));
};
class Group {
    constructor(size, key = -1) {
        this.members = [];
        this.size = size;
        this.teamID = getID();
        this.color = (100 + (this.teamID % 85)) | 0;
        this.private = false;
        activeGroups.push(this);
        console.log("New group created.");
    }
    check() {
        let bots = this.members.map(e => e).filter(r => r.isBot).length;
        return bots > 0 || this.members.length < this.size;
    }
    removeBot() {
        const bot = this.members.find(entry => entry.isBot);
        if (bot) {
            this.removeMember(bot);
            if (bot.body) {
                bot.body.onDead = null;
                bot.body.kill();
            }
        }
    }
    addMember(socket) {
        if (this.members.length === this.size) return false;
        this.members.push(socket);
        socket.rememberedTeam = this.teamID;
        socket.group = this;
        return true;
    }
    removeMember(socket) {
        this.members = this.members.filter(entry => entry !== socket);
        if (this.members.length === 0) this.delete();
    }
    delete() {
        for (let i = 0; i < this.members.length; i++) removeMember(this.members[i]);
        activeGroups = activeGroups.filter(entry => entry !== this);
        console.log("Group deleted.");
    }
    getSpawn() {
        let validMembers = this.members.map(entry => entry).filter(a => !!a.player).filter(b => !!b.player.body);
        if (!validMembers.length) return room.random();
        let {
            x,
            y
        } = ran.choose(validMembers).player.body;
        return {
            x,
            y
        };
    }
}
const addMember = (socket, party = -1) => {
    let index = -1;
    if (party !== -1) {
        index = activeGroups.findIndex(entry => (entry.teamID === party / room.partyHash && entry.check()));
    }
    if (index === -1) {
        index = activeGroups.findIndex(entry => (!entry.private && entry.check()));
    }
    const group = activeGroups[index] || new Group(c.GROUPS || index);
    group.removeBot();
    group.addMember(socket);
};
const removeMember = socket => {
    if (!socket.group) return;
    let group = activeGroups.find(entry => entry === socket.group);
    group.removeMember(socket);
    socket.group = null;
};
let groups = {
    addMember,
    removeMember
};
module.exports = {
    Group,
    activeGroups,
    addMember,
    groups
};
