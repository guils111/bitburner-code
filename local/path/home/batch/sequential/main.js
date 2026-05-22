

/** @param {NS} ns */



export async function main(ns) {
  ns.clearLog();
  ns.disableLog("ALL");

  const WEAKEN_SCRIPT = "/batch/sequential/weaken.js";
  const GROW_SCRIPT = "/batch/sequential/grow.js";
  const HACK_SCRIPT = "/batch/sequential/hack.js";
  const SHARE_SCRIPT = "batch/sequential/share.js";
  const NUKE_SCRIPT = "batch/sequential/nuke.js"
  const HACK_TARGET = 0.2;

  if (!ns.scriptRunning(NUKE_SCRIPT)) {
    execScript(ns, NUKE_SCRIPT, 1, "");
  }

  var completeTimes = new Map();
  while (true) {

    for (var target of getListOfServersToHack(ns)) {
      if (!completeTimes.has(target) || completeTimes.get(target) < Date.now()) {
        var pendingThreads = 0;
        if (ns.getServerSecurityLevel(target) > ns.getServerMinSecurityLevel(target)) {
          var weakenEffect = ns.weakenAnalyze(1);
          var threads = Math.ceil((ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target)) / weakenEffect);
          pendingThreads = execScript(ns, WEAKEN_SCRIPT, threads, target);
          var timeToWait = Math.ceil(ns.getWeakenTime(target));
          if (pendingThreads < threads) {
            ns.print(`Need to run ${threads} to fully weaken ${target}. Was able to start ${threads - pendingThreads}. Will take ${timeToWait / 1000}s to complete.`);
            completeTimes.set(target, Date.now() + timeToWait);
          }
          if (pendingThreads > 0) {
            break;
          }
        } else if (ns.getServerMaxMoney(target) > ns.getServerMoneyAvailable(target)) {
          var growthNeeded = ns.getServerMaxMoney(target) / ns.getServerMoneyAvailable(target);
          var threads = Math.max(Math.ceil(ns.growthAnalyze(target, growthNeeded)), 1);
          pendingThreads = execScript(ns, GROW_SCRIPT, threads, target);
          timeToWait = Math.ceil(ns.getGrowTime(target));
          if (pendingThreads < threads) {
            ns.print(`Need to run ${threads} to grow ${target} by ${growthNeeded} times. Was able to start ${threads - pendingThreads}. Will take ${timeToWait / 1000}s to complete.`);
            completeTimes.set(target, Date.now() + timeToWait);
          }
          if (pendingThreads > 0) {
            break;
          }
        } else {
          var threads = Math.ceil(ns.hackAnalyzeThreads(target, ns.getServerMoneyAvailable(target) * HACK_TARGET));
          ns.print("Need to run ", threads, " threads to hack ", target, " by ", HACK_TARGET * 100, "%");
          pendingThreads = execScript(ns, HACK_SCRIPT, threads, target);
          timeToWait = Math.ceil(ns.getHackTime(target));
          if (pendingThreads < threads) {
            ns.print(`Need to run ${threads} to hack ${target} by ${HACK_TARGET * 100}%. Was able to start ${threads - pendingThreads}. Will take ${timeToWait / 1000}s to complete.`);
            completeTimes.set(target, Date.now() + timeToWait);
          }
          if (pendingThreads > 0) {
            break;
          }
        }
      }

    }
    if (pendingThreads <= 0) {
      for (var server of getRunners(ns)) {
        var availableRam = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
        var threads = Math.floor(availableRam / ns.getScriptRam(SHARE_SCRIPT, "home"));
        if (threads >= 1) {
          //execScript(ns, SHARE_SCRIPT, threads, "");
        }
      }
    } else {
      buyMoreRAM(ns);
    }
    await ns.sleep(1000);
  }


}

function buyMoreRAM(ns) {
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
}

/** @param {NS} ns */
function getBestServerToHack(ns) {
  const OVERRIDE_TARGET = "max-hardware";
  var bestMoney = 0;
  var serverName;

  for (var server of deepScan(ns, "home")) {
    if (ns.hasRootAccess(server)) {
      if (ns.getServerMaxMoney(server) > bestMoney) {
        bestMoney = ns.getServerMaxMoney(server);
        serverName = server;
      }
    }
  }
  //return serverName;
  return "silver-helix";
}

/** @param {NS} ns */
function getListOfServersToHack(ns) {
  return deepScan(ns, "home")
    .filter((a) => ns.hasRootAccess(a))
    .filter((a) => ns.getServerMaxMoney(a) > 0)
    .sort((a, b) => ns.getServerRequiredHackingLevel(a) - ns.getServerRequiredHackingLevel(b));
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

/** @param {NS} ns */
function execScript(ns, script, threads, target) {
  for (var runner of getRunners(ns)) {

    if (threads > 0) {
      var serverAvailableRam = ns.getServerMaxRam(runner) - ns.getServerUsedRam(runner);
      if (runner == "home") {
        serverAvailableRam -= 16;
      }
      var runnerThreads = Math.min(Math.floor((serverAvailableRam) / ns.getScriptRam(script, "home")), threads);
      if (runnerThreads > 0) {
        ns.scp(script, runner, "home");
        //ns.print("Starting ", script, " on ", runner, " with ", runnerThreads, " threads.");
        var pid = ns.exec(script, runner, runnerThreads, target);
        threads -= runnerThreads;
      }
    } else {
      break;
    }
  }

  return threads;
}
