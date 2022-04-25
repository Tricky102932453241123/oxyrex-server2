const upgradePaths = {
    // German
    "rhein": "weser",
    "weser": "augustVonParceval",
    "augustVonParceval": "manfredVonRichthofen",
    // Premium German
    "erichLoewenhardt": "grafZeppelin",
    "grafZeppelin": "maxImmelmann"
};

function checkUpgrade(player) {
    // so we've gotten a kill eh?
    if (!player.carrierKills) player.carrierKills = 0;
    if (!player.carrierTier) player.carrierTier = 0;
    player.carrierKills ++;
}
