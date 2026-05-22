/** @param {NS} ns */
export async function main(ns) {
    ns.clearLog();
    ns.disableLog("ALL");

    ns.ps().filter((a) => a.filename == ns.getScriptName() && a.pid != ns.self().pid).forEach((script) => {
        ns.kill(script.pid);
    });

    while (true) {

        while (ns.hacknet.numHashes() > 4) {
            ns.hacknet.spendHashes("Sell for Money", "", Math.floor(ns.hacknet.numHashes() / 4));
        }
        
        upgradeMostCostEffective(ns);
        
        if(canAfford(ns, ns.hacknet.getPurchaseNodeCost())) {
            ns.print(`SUCCESS - Buying new server.`);
            ns.hacknet.purchaseNode();
        }

        await ns.sleep(10000);
    }
}

/**
 * 
 * @param {NS} ns 
 */
function upgradeMostCostEffective(ns) {
    var upgradeCosts = getAllUpgradeCosts(ns);

    for (var upgrade of upgradeCosts) {
        if(canAfford(ns, upgrade["cost"])) {
            ns.print(`SUCCESS - Upgrading ${upgrade["type"]} on node ${upgrade["node"]}.`);
            switch (upgrade["type"]) {
                case "level":
                    ns.hacknet.upgradeLevel(upgrade["node"]);
                    break;
                case "ram":
                    ns.hacknet.upgradeRam(upgrade["node"]);
                    break;
                case "core":
                    ns.hacknet.upgradeCore(upgrade["node"]);
                    break;
            }
        } else {
            ns.print(`INFO - Cannot afford upgrade ${JSON.stringify(upgrade)}. Stopping.`);
            break;
        }
    }
}
/**
 * 
 * @param {NS} ns 
 * @param {number} cost 
 * @returns {boolean}
 */
function canAfford(ns, cost) {
    return ns.getServerMoneyAvailable("home") > cost;
}

/**
 * 
 * @param {NS} ns 
 */
function upgradeCheapest(ns) {
    var upgradeCosts = [];
}
/**
 * 
 * @param {NS} ns 
 * @returns {Object[]}
 */
function getAllUpgradeCosts(ns) {
    var upgradeCosts = [];
    for (var i = 0; i < ns.hacknet.numNodes(); i++) {
        var node = ns.hacknet.getNodeStats(i);
        var currentProduction = ns.formulas.hacknetServers.hashGainRate(node.level, node.ramUsed, node.ram, node.cores, ns.getPlayer().mults.hacknet_node_money);
        upgradeCosts.push({"node": i, "type": "level", "cost": ns.hacknet.getLevelUpgradeCost(i), "costEffectiviness": (ns.formulas.hacknetServers.hashGainRate(node.level + 1, node.ramUsed, node.ram, node.cores, ns.getPlayer().mults.hacknet_node_money) - currentProduction)/ns.hacknet.getLevelUpgradeCost(i) });
        upgradeCosts.push({"node": i, "type": "ram", "cost": ns.hacknet.getRamUpgradeCost(i), "costEffectiviness": (ns.formulas.hacknetServers.hashGainRate(node.level, node.ramUsed, node.ram*2, node.cores, ns.getPlayer().mults.hacknet_node_money) - currentProduction)/ns.hacknet.getRamUpgradeCost(i) });
        upgradeCosts.push({"node": i, "type": "core", "cost": ns.hacknet.getCoreUpgradeCost(i), "costEffectiviness": (ns.formulas.hacknetServers.hashGainRate(node.level, node.ramUsed, node.ram, node.cores+1, ns.getPlayer().mults.hacknet_node_money) - currentProduction)/ns.hacknet.getCoreUpgradeCost(i) });
    }
    return upgradeCosts.sort((a,b) => b["costEffectiviness"] - a["costEffectiviness"]);
}