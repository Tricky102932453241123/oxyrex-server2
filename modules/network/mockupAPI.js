const { getTankMockup } = require("../setup/newMockups");

function lookup(type, search) {
    switch (type) {
        case "index": {
            for (const key in Class) {
                if (Class[key].index == search) {
                    return key;
                }
            }
        } break;
        case "searchName": {
            for (const key in Class) {
                if (Class[key].LABEL.toLowerCase() == search.toLowerCase()) {
                    return key;
                }
            }
        } break;
    }
    return false;
}

module.exports = function(app) {
    app.get("/mockups/get", function(request, response) {
        let output = {
            ok: false,
            message: "Unknown error"
        };
        if (request.query && request.query.index) {
            if (!Number.isFinite(+request.query.index)) {
                output = {
                    ok: false,
                    message: "Invalid index!"
                };
            } else {
                const tank = lookup("index", +request.query.index);
                if (tank) {
                    output = {
                        ok: true,
                        mockup: getTankMockup(tank)
                    };
                    if (request.query.bodyData == "true") {
                        output.bodyData = Class[tank].BODY || ((Class[tank].PARENT || []).find(parent => parent.BODY) || { BODY: {} }).BODY;
                    }
                    if (request.query.upgrades == "true") {
                        output.upgrades = (output.mockup.upgrades || []).map(entry => {
                            return {
                                index: entry.index,
                                tier: entry.tier,
                                name: Object.values(Class).find(instance => instance.index === entry.index).LABEL
                            };
                        });
                        output.branches = Object.values(Class).filter(entry => ["UPGRADES_TIER_1", "UPGRADES_TIER_2", "UPGRADES_TIER_3", "UPGRADES_TIER_4"].find(key => entry[key] && entry[key].find(upgrade => upgrade.index === output.mockup.index))).map(instance => {
                            return {
                                index: instance.index,
                                name: instance.LABEL
                            };
                        });
                    }
                } else {
                    output = {
                        ok: false,
                        message: "Tank not found!"
                    };
                }
            }
        } else if (request.query && request.query.searchName) {
            const tank = lookup("searchName", request.query.searchName);
            if (tank) {
                output = {
                    ok: true,
                    mockup: getTankMockup(tank)
                };
                if (request.query.bodyData == "true") {
                    output.bodyData = Class[tank].BODY || ((Class[tank].PARENT || []).find(parent => parent.BODY) || { BODY: {} }).BODY;
                }
                if (request.query.upgrades == "true") {
                    output.upgrades = (output.mockup.upgrades || []).map(entry => {
                        return {
                            index: entry.index,
                            tier: entry.tier,
                            name: Object.values(Class).find(instance => instance.index === entry.index).LABEL
                        };
                    });
                    output.branches = Object.values(Class).filter(entry => ["UPGRADES_TIER_1", "UPGRADES_TIER_2", "UPGRADES_TIER_3", "UPGRADES_TIER_4"].find(key => entry[key] && entry[key].find(upgrade => upgrade.index === output.mockup.index))).map(instance => {
                        return {
                            index: instance.index,
                            name: instance.LABEL
                        };
                    });
                }
            } else {
                output = {
                    ok: false,
                    message: "Tank not found!"
                };
            }
        } else {
            output = {
                ok: false,
                message: "Please provide an 'index' or a 'searchName' in the search parameters!"
            };
        }
        response.json(output);
    });
    app.get("/mockups/guide", function(request, response) {
        response.send(`<html>
            <head>
                <title>Oxyrex.io - Mockup API Guide</title>
                <link href="https://fonts.googleapis.com/css?family=Ubuntu:400,700" rel="stylesheet">
                <style>
                    body {
                        font: 14px Ubuntu;
                    }
                </style>
            </head>
            <body>
                <h2>Get a tank by index</h2>
                <code>https://ext.oxyrex.io:3000/mockups/get?index=123</code>
                <p>Please note, that the index can be replaced by ANY real number.</p>
                <h2>Get a tank by name</h2>
                <code>https://ext.oxyrex.io:3000/mockups/get?searchName=Beta Tanks</code>
                <h2>Getting body stats</h2>
                <code>https://ext.oxyrex.io:3000/mockups/get?searchName=Basic&bodyData=true</code><br/>
                <code>https://ext.oxyrex.io:3000/mockups/get?index=123&bodyData=true</code>
                <h2>Getting upgrade and path data</h2>
                <code>https://ext.oxyrex.io:3000/mockups/get?searchName=Basic&upgrades=true</code><br/>
                <code>https://ext.oxyrex.io:3000/mockups/get?index=123&upgrades=true</code>
            </body>
        </html>`);
    });
}