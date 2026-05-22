/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");
  while (true) {
    bruteSSHAll(ns);
    ftpCrackAll(ns);
    relaySMTPAll(ns);
    httpWormAll(ns);
    sqlInjectAll(ns);
    nukeAll(ns);
    await ns.sleep(5000);
  }

}

/** @param {NS} ns */
function nukeAll(ns) {
  for (var server of deepScan(ns, "home")) {
    var serverInfo = ns.getServer(server);
    if (serverInfo.requiredHackingSkill <= ns.getHackingLevel() && serverInfo.numOpenPortsRequired <= serverInfo.openPortCount && !serverInfo.hasAdminRights) {
      if (ns.nuke(server)) {
        ns.tprint(`Nuked ${server}`);
      }

    }
  }
}
/** @param {NS} ns */
function bruteSSHAll(ns) {
  for (var server of deepScan(ns, "home")) {
    var serverInfo = ns.getServer(server);
    if (serverInfo.requiredHackingSkill <= ns.getHackingLevel() && !serverInfo.sshPortOpen) {
      ns.brutessh(server);
    }
  }
}

/** @param {NS} ns */
function ftpCrackAll(ns) {
  for (var server of deepScan(ns, "home")) {
    var serverInfo = ns.getServer(server);
    if (serverInfo.requiredHackingSkill <= ns.getHackingLevel() && !serverInfo.ftpPortOpen) {
      ns.ftpcrack(server);
    }
  }
}

/** @param {NS} ns */
function httpWormAll(ns) {
  for (var server of deepScan(ns, "home")) {
    var serverInfo = ns.getServer(server);
    if (serverInfo.requiredHackingSkill <= ns.getHackingLevel() && !serverInfo.httpPortOpen) {
      ns.httpworm(server);
    }
  }
}

/** @param {NS} ns */
function relaySMTPAll(ns) {
  for (var server of deepScan(ns, "home")) {
    var serverInfo = ns.getServer(server);
    if (serverInfo.requiredHackingSkill <= ns.getHackingLevel() && !serverInfo.smtpPortOpen) {
      ns.relaysmtp(server);
    }
  }
}

/** @param {NS} ns */
function sqlInjectAll(ns) {
  for (var server of deepScan(ns, "home")) {
    var serverInfo = ns.getServer(server);
    if (serverInfo.requiredHackingSkill <= ns.getHackingLevel() && !serverInfo.sqlPortOpen) {
      ns.sqlinject(server);
    }
  }
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