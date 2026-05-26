/** @param {NS} ns */
export async function main(ns) {
  var availableRam = 0;
  for (var server of getRunners(ns)) {
    availableRam += ns.getServerMaxRam(server);// - ns.getServerUsedRam(server);
  }
  ns.tprint(`${ns.format.ram(availableRam)} available across all servers.`);
}

/** @param {NS} ns */
function getRunners(ns) {
  var runners = [];
  runners.push("home");
  for (var server of deepScan(ns, "home")) {
    if (ns.hasRootAccess(server)) {
      runners.push(server);
    }
  }
  //ns.print(`Runners: ${runners}`);
  return runners;
}

/** @param {NS} ns */
function deepScan(ns, root) {
  var neighbors = ns.scan(root);
  if (root != "home") {
    neighbors.shift();
  }
  var result = neighbors;
  for (var server of neighbors) {
    result = result.concat(deepScan(ns, server));
  }
  return result;
}