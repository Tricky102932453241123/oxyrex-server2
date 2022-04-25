async function logEvent(data) {
    if (typeof bot !== "object") {
        return console.log("No bot to log events with!");
    }
    const channel = await bot.channels.fetch("881643877516316683");
    if (!channel) {
        return console.log("Couldn't find the events channel!");
    }
    
}
const events = {
    winterRush: {
        name: "Winter Rush",
        start: util.constructDateWithYear(12, 20),
        end: util.constructDateWithYear(1, 1, (new Date()).getFullYear() + 1)
    },
    testbed: {
        name: "TESTBED Event",
        start: "00/00/00",
        end: "00/00/00",
        onstart: function() {
            Class.basic.UPGRADES_TIER_1.push(Class.betaTester);
            entities.forEach(entity => {
                if (entity.isPlayer || entity.isBot) {
                    entity.sendMessage("Let the TESTBED event begin!");
                    entity.kill();
                }
            });
        },
        onend: function() {}
    }
};
