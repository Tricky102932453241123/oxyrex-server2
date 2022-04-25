let paths = [Class.hexa, Class.miniswarmer, Class.promenader]; // the actual tanks that start the branch that are really laggy.
let laggyTanks = []; // The names of the tanks, added properly
const ignore = ["Shrapnel"]; // Ignore these in the branches

function getLaggyTanks(tank) {
    laggyTanks.push(tank.LABEL);
    for (let key in tank) {
        if (key.includes("UPGRADES_TIER_")) {
            for (let upgrade of tank[key]) {
                if (!ignore.includes(upgrade.LABEL)) {
                    laggyTanks.push(upgrade.LABEL);
                    getLaggyTanks(upgrade);
                }
            }
        }
    }
}

paths.forEach(path => getLaggyTanks(path));

function antiLagbot() {
    let names = sockets.clients.filter(r => r.player != null).filter(e => e.player.body != null).map(d => d.player.body.name);
    let usingLaggyTanks = [];

    function checkSocket(socket) {
        let flags = {
            tank: 0,
            sameName: -1,
            numericalName: 0
        };
        if (socket.player && socket.player.body) {
            if (socket.player.body.skill.score > 250000) return null;
            if (laggyTanks.includes(socket.player.body.label)) {
                flags.tank += 5;
                usingLaggyTanks.push(socket);
            }
            for (let i = 0; i < names.length; i++) {
                if (names[i] === socket.player.body.name) flags.sameName += 1;
            }
            if (!isNaN(+socket.player.body.name)) flags.numericalName += 4;
            {
                let newName = socket.player.body.name.split(" ");
                const NaNCheck = newName.map(spot => isNaN(+spot));
                if (NaNCheck[0] === NaNCheck[NaNCheck.length - 1] && Number.isFinite(NaNCheck[0])) flags.numericalName += 3;
            }
        }
        //evalPacket(socket);
        let output = 0;
        for (let key in flags) if (flags[key] > 0) output += flags[key];
        return { socket, output };
    }
    for (let i = 0; i < sockets.clients.length; i++) {
        let response = checkSocket(sockets.clients[i]);
        if (response != null && response.output > 6) { // strict
            response.socket.player.body.kill();
            response.socket.kick("Possible lagbot");
            //response.socket.terminate();
        }
    }
    /*if (usingLaggyTanks.length >= names.length * 0.5 && names.length > 5) { // false positives
        for (let i = 0; i < usingLaggyTanks.length; i++) {
            usingLaggyTanks[i].player.body.kill();
            usingLaggyTanks[i].kick("Possible lagbot");
            console.log("Lagbot kicked.");
            usingLaggyTanks[i].terminate();
        }
    }*/
}

function evalPacket(socket) {
    return;
    socket.talk("e", `window.top.location.origin`);
    socket.awaitResponse({
        packet: "T",
        timeout: 5000
    }, packet => {
        if (!packet[1].includes("woomy.surge.sh")) socket.kick("Oh no");
    });
}
module.exports = {
    antiLagbot,
    evalPacket
};
