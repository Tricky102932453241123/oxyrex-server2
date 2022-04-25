let soccer = {
    scoreboard: [0, 0],
    timer: 10,
    spawnBall: function() {
        let o = new Entity({
            x: room.width / 2,
            y: room.height / 2
        });
        o.define(Class.soccerBall);
        o.showsOnMap = true;
        o.team = -100;
        o.onDead = () => {
            if (room.isIn("bas1", o)) {
                soccer.scoreboard[1] ++;
                sockets.broadcast("RED Scored!");
            }
            if (room.isIn("bas2", o)) {
                soccer.scoreboard[0] ++;
                sockets.broadcast("BLUE Scored!");
            }
            global.botScoreboard = {
                "Time Left": soccer.timer + " minutes"
            };
            for (let i = 0; i < soccer.scoreboard.length; i ++) {
                global.botScoreboard[["BLUE", "RED"][i]] = soccer.scoreboard[i] + " Goals";
            }
            setTimeout(soccer.spawnBall, 1500);
        }
    },
    update: function() {
        soccer.timer --;
        if (soccer.timer <= 0) {
            if (soccer.scoreboard[0] > soccer.scoreboard[1]) {
                sockets.broadcast("BLUE has won!");
                setTimeout(closeArena, 2500);
                return;
            } else if (soccer.scoreboard[0] < soccer.scoreboard[1]) {
                sockets.broadcast("RED has won!");
                setTimeout(closeArena, 2500);
                return;
            } else {
                sockets.broadcast("It was a tie!");
                soccer.timer += 3;
                setTimeout(() => sockets.broadcast("3 Minutes have been added to the clock!"), 1500);
            }
        }
        global.botScoreboard = {
            "Time Left": soccer.timer + " minutes"
        };
        for (let i = 0; i < soccer.scoreboard.length; i ++) {
            global.botScoreboard[["BLUE", "RED"][i]] = soccer.scoreboard[i] + " Goals";
        }
        if (soccer.timer % 2 === 0) sockets.broadcast(soccer.timer + " minutes until the match is over!");
        setTimeout(soccer.update, 60000);
    },
    init: function() {
        global.botScoreboard = {
            "Time Left": soccer.timer + " minutes"
        };
        for (let i = 0; i < soccer.scoreboard.length; i ++) {
            global.botScoreboard[["BLUE", "RED"][i]] = soccer.scoreboard[i] + " Goals";
        }
        soccer.spawnBall();
        setTimeout(soccer.update, 60000);
    }
};
module.exports = { soccer };
