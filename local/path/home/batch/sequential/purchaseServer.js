/** @param {NS} ns */
export async function main(ns) {
  while (true) {
    if (ns.cloud.getServerLimit() > ns.cloud.getServerNames().length) {
      if (ns.cloud.getServerCost(8) < ns.getServerMoneyAvailable("home")) {
        ns.cloud.purchaseServer("cloudServer", 8);
      }
    } else {
      for (var server of ns.cloud.getServerNames()) {
        if (ns.cloud.getServerUpgradeCost(server, ns.getServerMaxRam(server) * 2)) {
          ns.cloud.upgradeServer(server, ns.getServerMaxRam(server) * 2);
        }
      }
    }

    await ns.sleep(1000);
  }

}