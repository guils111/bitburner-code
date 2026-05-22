/** 
 * @param {NS} ns 
 * @param {string} root
 * @return {string[]} list of all servers found
 */
export function deepScan(ns, root = "home") {
  if (typeof ns != "object" || typeof ns.getServerMaxRam != "function") {
    throw new Error(`ns is not of type NS: ${typeof ns}`);
  }
  if (typeof root != "string") {
    throw new Error(`root is not a string: ${root}`);
  }
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



/** 
 * @param {NS} ns 
 * @param {string} target
 * @return {string[]} path from home to the target server
 */
export function getPathToServer(ns, target) {
  if (typeof ns != "object" || typeof ns.getServerMaxRam != "function") {
    throw new Error(`ns is not of type NS: ${ns}`);
  }
  if (typeof target != "string") {
    throw new Error(`target is not a string: ${target}`);
  }
  var result = [target];
  var node = target;
  while (node != "home") {
    var parent = ns.scan(node)[0];
    result.unshift(parent);
    node = parent;

  }
  return result;
}

/** @param {NS} ns */
export function getRunners(ns) {
  if (typeof ns != "object" || typeof ns.getServerMaxRam != "function") {
    throw new Error(`ns is not of type NS: ${typeof ns}`);
  }
  var runners = deepScan(ns).filter((a) => {
    return !a.includes("hacknet") && ns.hasRootAccess(a) && ns.getServerMaxRam(a) > 0;
  });
  runners.push("home");
  return runners;
}

/** 
 * @param {NS} ns
 * @return {import("@/NetscriptDefinitions").Server[]}
 */
export function getRunnersServer(ns) {
  var servers = [];
  getRunners(ns).sort((a, b) => ns.getServerMaxRam(b) - ns.getServerMaxRam(a)).forEach((runner) => {
    servers.push(ns.getServer(runner));
  });
  return servers;
}

/** 
 * @param {NS} ns 
 * @return {string} the best target server
 */
export function findBestTarget(ns, currentTarget = "n00dles", printToTerminal = false) {
  if (typeof ns != "object" || typeof ns.getServerMaxRam != "function") {
    throw new Error(`ns is not of type NS: ${typeof ns}`);
  }
  var result = [];

  deepScan(ns, "home").filter((server) => !server.includes("hacknet") && ns.hasRootAccess(server) && ns.getServerMaxMoney(server) > 0).sort((a, b) => ns.getServerRequiredHackingLevel(b) - ns.getServerRequiredHackingLevel(a))
    .forEach((s) => {
      var server = ns.getServer(s);

      var totalThreadsAvailable = 0;
      getRunners(ns).forEach((r) => {
        totalThreadsAvailable += Math.floor((ns.getServerMaxRam(r)) / 1.75);
      })

      var hackThreads = HACK_PERCENT / ns.formulas.hacking.hackPercent(server, ns.getPlayer());
      hackThreads = Math.ceil(hackThreads * ns.formulas.hacking.hackChance(server, ns.getPlayer()));
      var hackChance = ns.formulas.hacking.hackChance(server, ns.getPlayer());
      var hackTime = ns.formulas.hacking.hackTime(server, ns.getPlayer());
      server.moneyAvailable = server.moneyAvailable * (1 - ns.formulas.hacking.hackPercent(server, ns.getPlayer()) * hackThreads * hackChance);
      var secIncreaseHack = ns.hackAnalyzeSecurity(hackThreads);
      var weakenHackThreads = secIncreaseHack / ns.formulas.hacking.weakenEffect(1);
      var weakenTime = ns.formulas.hacking.weakenTime(server, ns.getPlayer());
      var prepGrowThreads = ns.formulas.hacking.growThreads(server, ns.getPlayer(), server.moneyMax);
      var growTime = ns.formulas.hacking.growTime(server, ns.getPlayer());
      var growSecIncrease = ns.growthAnalyzeSecurity(prepGrowThreads);
      var weakenGrowThreads = growSecIncrease / ns.formulas.hacking.weakenEffect(1);

      var runTime = Math.max(hackTime, weakenTime, growTime);
      var moneyStolenPerBatch = server.moneyMax - server.moneyAvailable;
      var threadsPerBatch = (hackThreads + weakenHackThreads + prepGrowThreads + weakenGrowThreads);
      var batchesCount = Math.floor(Math.min(totalThreadsAvailable / threadsPerBatch, 50000));
      var totalMoneyStolen = moneyStolenPerBatch * batchesCount;
      var moneyPerSecond = totalMoneyStolen / (runTime / 1000);
      var expPerBatch = ns.formulas.hacking.hackExp(server, ns.getPlayer()) * (hackThreads * hackChance + (hackThreads * (1 - hackChance)) / 4 + weakenHackThreads + prepGrowThreads + weakenGrowThreads);
      var totalExp = expPerBatch * batchesCount;
      var expPerSecond = totalExp / (runTime / 1000);
      server.hackDifficulty = ns.getServerSecurityLevel(s);
      var prepTime = 0;
      if (ns.getServerSecurityLevel(s) > ns.getServerMinSecurityLevel(s)) {
        let prepSecToDecrease = ns.getServerSecurityLevel(s) - ns.getServerMinSecurityLevel(s);
        let prepWeakenThreads = Math.ceil(prepSecToDecrease / ns.formulas.hacking.weakenEffect(1));
        prepTime += ns.getWeakenTime(s) * Math.ceil(prepWeakenThreads / totalThreadsAvailable);
      }
      if (ns.getServerMoneyAvailable < ns.getServerMaxMoney(s)) {
        let prepGrowThreads = ns.formulas.hacking.growThreads(ns.getServer(s), ns.getPlayer(), ns.getServer(s).moneyMax) + ns.growthAnalyzeSecurity(prepGrowThreads);

        prepTime += ns.getWeakenTime(s) * Math.ceil(prepGrowThreads / totalThreadsAvailable);
      }



      var moneyFirstHour = ((3600 * 1000 - prepTime) / 1000) * moneyPerSecond;
      if (printToTerminal) {
        ns.tprint(s.padEnd(20) + " moneyFirstHour: $" + ns.format.number(moneyFirstHour).toString().padEnd(10) + " expPerSecond: " + ns.format.number(expPerSecond).toString().padEnd(10) + "runTime: " + ns.format.number(runTime / 1000).toString().padStart(7) + " seconds prepTime: " + ns.format.time(prepTime) + "\n");
      }


      result.push({ "server": s, "moneyFirstHour": moneyFirstHour, "expPerSecond": expPerSecond, "runTime": runTime, "prepTime": prepTime })


    });
  var currentValue = 0;
  var bestValue = 0;

  result.sort((a, b) => b["moneyFirstHour"] - a["moneyFirstHour"]);
  currentValue = result.find((a) => a["server"] == currentTarget)["moneyFirstHour"];
  result = result.filter((a) => a["runTime"] > 10000 && a["prepTime"] < 600000);
  bestValue = result[0]["moneyFirstHour"];
  ns.print(`Current target ${currentTarget} moneyPerHour \$${ns.format.number(currentValue)}, best target ${result[0]["server"]} moneyPerHour \$${ns.format.number(bestValue)}`);

  if (bestValue > currentValue * 1.3) {
    ns.print(`returning best target ${result[0]["server"]}`);
    return result[0]["server"];
  } else {
    ns.print(`returning current target ${currentTarget}`);
    return currentTarget;
  }


}