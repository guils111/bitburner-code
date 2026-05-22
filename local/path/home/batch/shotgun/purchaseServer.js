/** @param {NS} ns */
export async function main(ns) {
  ns.clearLog();
  ns.disableLog("ALL");
  while (true) {
    if (ns.cloud.getServerLimit() > ns.cloud.getServerNames().length) {
      if (ns.cloud.getServerCost(8) < ns.getServerMoneyAvailable("home")) {
        ns.cloud.purchaseServer("cloudServer", 8);
      }
    } else {
      var servers = ns.cloud.getServerNames().filter((a) => ns.cloud.getRamLimit() > ns.getServerMaxRam(a))
      if (servers.length == 0) {
        ns.exit();
      }
      for (var server of servers) {
        
        if (ns.cloud.getRamLimit() > ns.getServerMaxRam(server) && ns.cloud.getServerUpgradeCost(server, Math.min(ns.getServerMaxRam(server) * 2))  < ns.getServerMoneyAvailable("home")/2) {
          ns.cloud.upgradeServer(server, ns.getServerMaxRam(server) * 2);
        }
      }
    }

    await ns.sleep(1000);
  }

}