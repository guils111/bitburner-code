/** @param {NS} ns */
export async function main(ns) {
  ns.tprint(findBestTarget(ns));
}

/** @param {NS} ns */
function findBestTarget(ns) {
    var targets = deepScan(ns, "home")
        .filter((a) => ns.hasRootAccess(a))
        .filter((a) => ns.getServerMaxMoney(a) > 0)
        .sort((a, b) => ns.getServerMaxMoney(b) - ns.getServerMaxMoney(a));

    return targets;

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