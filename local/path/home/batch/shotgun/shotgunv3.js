import { deepScan, getRunners, getRunnersServer } from "../../lib/scanHelper.js";
import { execScript } from "../../lib/execHelper.js";
import { wait } from "../../lib/sleepHelper.js";

const HACK_PERCENT = 0.01;
const WEAKEN_SCRIPT = "/batch/shotgun/weaken.js";
const GROW_SCRIPT = "/batch/shotgun/grow.js";
const HACK_SCRIPT = "/batch/shotgun/hack.js";
const NUKE_SCRIPT = "/batch/shotgun/nuke.js";
const PURCHASE_SERVER_SCRIPT = "/batch/shotgun/purchaseServer.js";
const SOLVE_CONTRACTS_SCRIPT = "/contracts/solveContracts.js";
const MAX_BATCHS = 30000;
const SHARE = false;

/** @param {NS} ns */
export async function main(ns) {
  ns.clearLog();
  ns.disableLog("ALL");

  var time = performance.now();
  var runners = getRunnersServer(ns);
  for (var i = 0; i < 1; i++) {
    getHowManyThreadsCanRun(ns, WEAKEN_SCRIPT, runners, true);
  }
  //calculatePrepTime(ns, "iron-gym");
  ns.print(performance.now() - time);
}

/** @param {NS} ns */
function simulate(ns, target) {

}



/** @param {NS} ns */
function getPossibleTargets(ns) {
  return deepScan(ns, "home").filter((serverName) => {
    return ns.getServerMaxMoney(serverName) > 0 &&
      ns.hasRootAccess(serverName);
  });
}

/** 
 * @param {NS} ns 
 * @return {string} the best target server
 */
function findBestTarget(ns, prioritizeExp = false, currentTarget = "n00dles") {
  if (typeof ns != "object" || typeof ns.getServerMaxRam != "function") {
    throw new Error(`ns is not of type NS: ${typeof ns}`);
  }
  var result = [];
  if (ns.fileExists("formulas.exe", "home")) {
    ns.print(`Formulas exist. Running new search.`);
    deepScan(ns, "home").filter((server) => ns.hasRootAccess(server) && ns.getServerMaxMoney(server) > 0).sort((a, b) => ns.getServerRequiredHackingLevel(b) - ns.getServerRequiredHackingLevel(a))
      .forEach((s) => {
        var server = ns.getServer(s);
        server.hackDifficulty = server.minDifficulty;
        server.moneyAvailable = server.moneyMax;

        var totalThreadsAvailable = 0;
        getRunners(ns).forEach((a) => totalThreadsAvailable += Math.floor(ns.getServerMaxRam(a) / ns.getScriptRam(WEAKEN_SCRIPT, "home")));

        var hackThreads = HACK_PERCENT / ns.formulas.hacking.hackPercent(server, ns.getPlayer());
        hackThreads = Math.ceil(hackThreads * ns.formulas.hacking.hackChance(server, ns.getPlayer()));
        var hackChance = ns.formulas.hacking.hackChance(server, ns.getPlayer());
        var hackTime = ns.formulas.hacking.hackTime(server, ns.getPlayer());
        server.moneyAvailable = server.moneyAvailable * (1 - ns.formulas.hacking.hackPercent(server, ns.getPlayer()) * hackThreads * hackChance);
        var secIncreaseHack = ns.hackAnalyzeSecurity(hackThreads);
        var weakenHackThreads = secIncreaseHack / ns.formulas.hacking.weakenEffect(1);
        var weakenTime = ns.formulas.hacking.weakenTime(server, ns.getPlayer());
        var growThreads = ns.formulas.hacking.growThreads(server, ns.getPlayer(), server.moneyMax);
        var growTime = ns.formulas.hacking.growTime(server, ns.getPlayer());
        var growSecIncrease = ns.growthAnalyzeSecurity(growThreads);
        var weakenGrowThreads = growSecIncrease / ns.formulas.hacking.weakenEffect(1);

        var runTime = Math.max(hackTime, weakenTime, growTime);
        var moneyStolenPerBatch = server.moneyMax - server.moneyAvailable;
        var threadsPerBatch = (hackThreads + weakenHackThreads + growThreads + weakenGrowThreads);
        var batchesCount = Math.floor(Math.min(totalThreadsAvailable / threadsPerBatch, MAX_BATCHS));
        var totalMoneyStolen = moneyStolenPerBatch * batchesCount;
        var moneyPerSecond = totalMoneyStolen / (runTime / 1000);
        var expPerBatch = ns.formulas.hacking.hackExp(server, ns.getPlayer()) * (hackThreads * hackChance + (hackThreads * (1 - hackChance)) / 4 + weakenHackThreads + growThreads + weakenGrowThreads);
        var totalExp = expPerBatch * batchesCount;
        var expPerSecond = totalExp / (runTime / 1000);

        var prepTime = ns.getWeakenTime(s) + runTime;



        var moneyFirstHour = ((3600 * 1000 - prepTime) / 1000) * moneyPerSecond;

        ns.print(s.padEnd(20) + " moneyFirstHour: $" + ns.format.number(moneyFirstHour).toString().padEnd(10) + " expPerSecond: " + ns.format.number(expPerSecond).toString().padEnd(10) + "runTime: " + ns.format.number(runTime / 1000).toString().padStart(7) + " seconds prepTime: " + ns.format.time(prepTime) + "\n");
        if (prepTime < 600000)
          result.push({ "server": s, "moneyFirstHour": moneyFirstHour, "expPerSecond": expPerSecond })
      });
    var currentValue = 0;
    var bestValue = 0;
    if (prioritizeExp) {
      result.sort((a, b) => b["expPerSecond"] - a["expPerSecond"]);

      currentValue = result.find((a) => a["server"] == currentTarget)["expPerSecond"];
      bestValue = result[0]["expPerSecond"];

    } else {
      result.sort((a, b) => b["moneyFirstHour"] - a["moneyFirstHour"])

      currentValue = result.find((a) => a["server"] == currentTarget)["moneyFirstHour"];
      bestValue = result[0]["moneyFirstHour"];
    }

    if (bestValue > currentValue * 1.3) {
      ns.print(`returning best target ${result[0]["server"]}`);
      return result[0]["server"];
    } else {
      ns.print(`returning current target ${currentTarget}`);
      return currentTarget;
    }
  }
  return "n00dles";


}

/** 
 * @param {NS} ns 
 * @param {string} target
 * @param {import("@/NetscriptDefinitions.js").Server} server
 * @return {number} amount of time to weaken to min and grow to max
 */
function calculatePrepTime(ns, target, server = ns.getServer(target), runners = getRunners(ns)) {
  var prepTime = 0;
  var secAboveMin = server.hackDifficulty - server.minDifficulty;
  var growMulti = server.moneyMax / server.moneyAvailable;
  ns.print(`INFO - When starting prep calculation server ${target} is at ${ns.format.number(secAboveMin)} sec above minimum and ${ns.format.percent(1 / growMulti)} money.`);
  var weakenThreads = calculateWeakenThreads(ns, target, server);
  server.hackDifficulty -= ns.formulas.hacking.weakenEffect(weakenThreads);
  if (server.hackDifficulty != server.minDifficulty) {
    ns.print(`WARN - Something went wrong with calculation. Min security is ${server.minDifficulty} and calculated security after weaken is ${server.hackDifficulty}.`);
  }

}

/** 
 * @param {NS} ns 
 * @param {string} script 
 * @param {import("@/NetscriptDefinitions.js").Server[]} runners
 * @param {boolean} [simulate=false] 
 * @return {number} amount of time to weaken to min and grow to max
 */
function getHowManyThreadsCanRun(ns, script, runners = getRunnersServer(ns), simulate = false) {
  var threads = 0;
  runners.forEach((runner) => {
    var availableRam = runner.maxRam;
    if (simulate) {
      if (runner == "home") {
        if (ns.isRunning(PURCHASE_SERVER_SCRIPT, "home")) {
          availableRam -= ns.getScriptRam(PURCHASE_SERVER_SCRIPT, "home");
        }
        if (ns.isRunning(NUKE_SCRIPT, "home")) {
          availableRam -= ns.getScriptRam(NUKE_SCRIPT, "home");
        }
        if (ns.isRunning(SOLVE_CONTRACTS_SCRIPT, "home")) {
          availableRam -= ns.getScriptRam(SOLVE_CONTRACTS_SCRIPT, "home");
        }
      }
    } else {
      availableRam -= runner.ramUsed;
    }
    threads += Math.floor(availableRam / ns.getScriptRam(script));
  });
  return threads;
}

/** 
 * @param {NS} ns 
 * @param {string} target
 * @param {import("@/NetscriptDefinitions.js").Server} server
 * @return {number}
 */
function calculateWeakenThreads(ns, target, server = ns.getServer(target)) {
  var secToDecrease = server.hackDifficulty - server.minDifficulty;
  var weakenThreads = secToDecrease / ns.formulas.hacking.weakenEffect(1);
  ns.print(`INFO - Calculated that ${weakenThreads} are needed to decrease security by ${secToDecrease}. Running that many threads will reduce security by ${ns.formulas.hacking.weakenEffect(weakenThreads)}.`);
  return weakenThreads;
}


