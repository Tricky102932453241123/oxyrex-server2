function setWaitingForPlayers(players) {
    return new Promise(function(resolve, reject) {
        let checkInterval = setInterval(function() {
                if (views.length === players) {
                    clearInterval(checkInterval);
                    clearInterval(notifyInterval);
                    resolve();
                }
            }, 1000),
            notifyInterval = setInterval(function() {
                sockets.broadcast(`${players - views.length} players needed! Invite people by copying the party link!`);
            }, 5000);
    });
}
const scenarios = {
    baseDefense: (function() {})()
};