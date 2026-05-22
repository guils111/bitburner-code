import { deepScan, getRunners, getRunnersServer } from "../../lib/scanHelper.js";
import { wait } from "../../lib/sleepHelper.js";

const HACK_PERCENT = 0.5;
const WEAKEN_SCRIPT = "/batch/shotgun/weaken.js";
const GROW_SCRIPT = "/batch/shotgun/grow.js";
const HACK_SCRIPT = "/batch/shotgun/hack.js";
const NUKE_SCRIPT = "/batch/shotgun/nuke.js";
const PURCHASE_SERVER_SCRIPT = "/batch/shotgun/purchaseServer.js";
const SOLVE_CONTRACTS_SCRIPT = "/contracts/solveContracts.js";
const MAX_BATCHS = 50000;
const SHARE = true;
const RAM_RESERVE = 8;

/** @param {NS} ns */
export async function main(ns) {
  ns.clearLog();
  ns.disableLog("ALL");


  await run(ns);

}

/**
 * @param {NS} ns 
 */
async function run(ns) {
  ns.print("Starting.");

  if (!ns.scriptRunning(NUKE_SCRIPT)) {
    ns.exec(NUKE_SCRIPT, "home");
  }
  if (!ns.scriptRunning(PURCHASE_SERVER_SCRIPT) && ns.getServerMaxRam() > 64) {
    ns.exec(PURCHASE_SERVER_SCRIPT, "home");
  }
  if (!ns.scriptRunning(SOLVE_CONTRACTS_SCRIPT) && ns.getServerMaxRam() > 1000) {
    ns.exec(SOLVE_CONTRACTS_SCRIPT, "home");
  }

  await ns.sleep(2000);

  var target = await ns.prompt("Server to attack: ", { type: "select", choices: deepScan(ns).filter((a) => !a.includes("hacknet") && ns.hasRootAccess(a) && ns.getServerMaxMoney(a) > 0) });

  var cyclesRan = 0;
  if (!target) {
    ns.exit();
  }
  ns.print(`Best target is ${target}`);
  await prepareServer(ns, target);
  while (true) {
    var time = performance.now();
    var runTime = Math.max(ns.getHackTime(target), ns.getGrowTime(target), ns.getWeakenTime(target));
    var threadsAvailable = getHowManyThreadsCanRun(ns, WEAKEN_SCRIPT);
    var threadsPerBatch = calculateBatchThreads(ns, target);

    var batchesToStart = Math.min(MAX_BATCHS, Math.floor(threadsAvailable / threadsPerBatch));
    ns.print(`There are ${ns.format.number(threadsAvailable)} threads available. Each batch requires ${ns.format.number(threadsPerBatch)} threads. Can start ${ns.format.number(Math.floor(threadsAvailable / threadsPerBatch))} batches right now. Will start ${ns.format.number(batchesToStart)}`);

    await batch(ns, target, batchesToStart);
    ns.print(`Batch will take ${ns.format.time(runTime)} to run.`);
    ns.print(performance.now() - time);
    await wait(ns, runTime, SHARE);

  }
}

/** 
 * @param {NS} ns 
 * @param {string} target 
 * @param {number} instances 
 */
async function batch(ns, target, instances, runners = getRunnersServer(ns)) {
  if (typeof ns != "object" || typeof ns.getServerMaxRam != "function") {
    throw new Error(`ns is not of type NS: ${typeof ns}`);
  }
  if (typeof target != "string") {
    throw new Error(`target is not a string: ${target}`);
  }
  if (typeof instances != "number" || instances < 0) {
    throw new Error(`instances is not a valid number: ${instances}`);
  }
  var targetServer = ns.getServer(target);
  var runTime = Math.max(ns.getHackTime(target), ns.getGrowTime(target), ns.getWeakenTime(target));
  var weakenDelay = runTime - ns.getWeakenTime(target);
  var hackDelay = runTime - ns.formulas.hacking.hackTime(targetServer, ns.getPlayer());
  var growDelay = runTime - ns.getGrowTime(target);
  ns.print(`${target} is at ${ns.format.number(targetServer.hackDifficulty - targetServer.minDifficulty)} above maximum security and at ${ns.format.percent(targetServer.moneyAvailable / targetServer.moneyMax)}% money.`);

  var hackThreads = Math.ceil(Math.max((HACK_PERCENT / ns.formulas.hacking.hackChance(targetServer, ns.getPlayer())) / ns.formulas.hacking.hackPercent(targetServer, ns.getPlayer()), 1));

  targetServer.moneyAvailable -= targetServer.moneyAvailable * ns.formulas.hacking.hackPercent(targetServer, ns.getPlayer()) * hackThreads;
  targetServer.hackDifficulty += ns.hackAnalyzeSecurity(hackThreads);
  var weakenHackThreads = Math.ceil((targetServer.hackDifficulty - targetServer.minDifficulty) / ns.formulas.hacking.weakenEffect(1));
  targetServer.hackDifficulty -= ns.formulas.hacking.weakenEffect(weakenHackThreads);
  targetServer.hackDifficulty = Math.max(targetServer.hackDifficulty, targetServer.minDifficulty);

  var growThreads = ns.formulas.hacking.growThreads(targetServer, ns.getPlayer(), targetServer.moneyMax);
  targetServer.hackDifficulty += ns.growthAnalyzeSecurity(growThreads);

  var weakenGrowThreads = Math.ceil((targetServer.hackDifficulty - targetServer.minDifficulty) / ns.formulas.hacking.weakenEffect(1));
  targetServer.hackDifficulty -= ns.formulas.hacking.weakenEffect(weakenHackThreads);
  targetServer.hackDifficulty = Math.max(targetServer.hackDifficulty, targetServer.minDifficulty);
  var hackRam = ns.getScriptRam(HACK_SCRIPT);
  var weakenRam = ns.getScriptRam(WEAKEN_SCRIPT);
  var growRam = ns.getScriptRam(GROW_SCRIPT);
  let time = performance.now()
  for (var i = 0; i < instances; i++) {
    runners = execScript(ns, HACK_SCRIPT, hackThreads, target, hackDelay, runners, hackRam);
    runners = execScript(ns, WEAKEN_SCRIPT, weakenHackThreads, target, weakenDelay, runners, weakenRam);
    runners = execScript(ns, GROW_SCRIPT, growThreads, target, growDelay, runners, growRam);
    runners = execScript(ns, WEAKEN_SCRIPT, weakenGrowThreads, target, weakenDelay, runners, weakenRam);
    if (performance.now() > time + 2000) {
      //await ns.sleep(0)
      time = performance.now()
    }
  }
  return runTime;
}

/** 
 * @param {NS} ns 
 * @param {string} target 
 * @return {number} number of threads needed to run a batch against the target
 */
function calculateBatchThreads(ns, target) {
  if (typeof ns != "object" || typeof ns.getServerMaxRam != "function") {
    throw new Error(`ns is not of type NS: ${typeof ns}`);
  }
  if (typeof target != "string") {
    throw new Error(`target is not a string: ${target}`);
  }
  var targetServer = ns.getServer(target);
  var runTime = Math.max(ns.getHackTime(target), ns.getGrowTime(target), ns.getWeakenTime(target));
  var weakenDelay = runTime - ns.getWeakenTime(target);
  var hackDelay = runTime - ns.formulas.hacking.hackTime(targetServer, ns.getPlayer());
  var growDelay = runTime - ns.getGrowTime(target);
  ns.print(`${target} is at ${ns.format.number(targetServer.hackDifficulty - targetServer.minDifficulty)} above maximum security and at ${ns.format.percent(targetServer.moneyAvailable / targetServer.moneyMax)}% money.`);

  var hackThreads = Math.ceil(Math.max((HACK_PERCENT / ns.formulas.hacking.hackChance(targetServer, ns.getPlayer())) / ns.formulas.hacking.hackPercent(targetServer, ns.getPlayer()), 1));

  targetServer.moneyAvailable -= targetServer.moneyAvailable * ns.formulas.hacking.hackPercent(targetServer, ns.getPlayer()) * hackThreads;
  targetServer.hackDifficulty += ns.hackAnalyzeSecurity(hackThreads);
  var weakenHackThreads = Math.ceil((targetServer.hackDifficulty - targetServer.minDifficulty) / ns.formulas.hacking.weakenEffect(1));
  targetServer.hackDifficulty -= ns.formulas.hacking.weakenEffect(weakenHackThreads);
  targetServer.hackDifficulty = Math.max(targetServer.hackDifficulty, targetServer.minDifficulty);

  var growThreads = ns.formulas.hacking.growThreads(targetServer, ns.getPlayer(), targetServer.moneyMax);
  targetServer.hackDifficulty += ns.growthAnalyzeSecurity(growThreads);

  var weakenGrowThreads = Math.ceil((targetServer.hackDifficulty - targetServer.minDifficulty) / ns.formulas.hacking.weakenEffect(1));
  targetServer.hackDifficulty -= ns.formulas.hacking.weakenEffect(weakenHackThreads);
  targetServer.hackDifficulty = Math.max(targetServer.hackDifficulty, targetServer.minDifficulty);
  return hackThreads + weakenHackThreads + growThreads + weakenGrowThreads;
}

/** 
 * @param {NS} ns 
 * @param {string} target 
 * @return {number} number of threads needed to hack the target by HACK_PERCENT percent
 */
function calculateHackThreads(ns, target) {
  if (typeof ns != "object" || typeof ns.getServerMaxRam != "function") {
    throw new Error(`ns is not of type NS: ${typeof ns}`);
  }
  if (typeof target != "string") {
    throw new Error(`target is not a string: ${target}`);
  }
  var threadEffect = ns.hackAnalyze(target);
  var threads = Math.ceil(HACK_PERCENT / threadEffect);
  var threads = Math.ceil(threads / ns.hackAnalyzeChance(target));
  if (isNaN(threads)) {
    ns.print(`calculateHackThreads - target: ${target} threadEffect: ${threadEffect} threads: ${threads}`);
  }
  //threads = Math.ceil(threads / ns.hackAnalyzeChance(target));
  return threads;
}

/** 
 * @param {NS} ns 
 * @param {string} target 
 * @return {number} number of threads needed to grow the target
 */
function calculateGrowThreads(ns, target) {
  if (typeof ns != "object" || typeof ns.getServerMaxRam != "function") {
    throw new Error(`ns is not of type NS: ${typeof ns}`);
  }
  if (typeof target != "string") {
    throw new Error(`target is not a string: ${target}`);
  }
  var hackPercent = ns.hackAnalyze(target) * calculateHackThreads(ns, target);
  var multi = ns.getServerMaxMoney(target) / (ns.getServerMaxMoney(target) - ns.getServerMaxMoney(target) * hackPercent);
  if (isNaN(multi) || isNaN(hackPercent)) {
    ns.print(`Multi is NaN: target: ${target} hackPercent: ${hackPercent} hackAnalyze: ${ns.hackAnalyze(target)} calculateHackThreads: ${calculateHackThreads(ns, target)}`);
    //ns.spawn(ns.getScriptName());
    ns.exit();
  }
  return Math.ceil(ns.growthAnalyze(target, multi) * 1.1);
}


/** 
 * @param {NS} ns 
 * @param {number} amount 
 * @return {number} number of threads needed to weaken the target by the specified amount
 */
function calculateWeakenThreads(ns, amount) {
  if (typeof ns != "object" || typeof ns.getServerMaxRam != "function") {
    throw new Error(`ns is not of type NS: ${typeof ns}`);
  }
  if (typeof amount != "number") {
    throw new Error(`amount is not a number: ${amount}`);
  }
  return Math.ceil(amount / ns.weakenAnalyze(1));
}




/** 
 * @param {NS} ns 
 * @param {string} target 
 * @return {Promise<void>}
 */
async function prepareServer(ns, target, runners = getRunnersServer(ns)) {
  if (typeof ns != "object" || typeof ns.getServerMaxRam != "function") {
    throw new Error(`ns is not of type NS: ${typeof ns}`);
  }
  if (typeof target != "string") {
    throw new Error(`target is not a string: ${target}`);
  }
  if ((ns.getServerMaxMoney(target) - ns.getServerMoneyAvailable(target)) > 0 || (ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target)) > 0) {
    ns.print(`Preparing ${target}. Need to reduce security by ${ns.format.number((ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target)))} `
      + `and multiply money by ${ns.format.number((ns.getServerMaxMoney(target) / ns.getServerMoneyAvailable(target)))}`);

    var weakenRam = ns.getScriptRam(WEAKEN_SCRIPT);
    var growRam = ns.getScriptRam(GROW_SCRIPT);

    var weakenThreads = calculateWeakenThreads(ns, (ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target)));

    while (weakenThreads > 0) {
      var threadsToRun = Math.min(weakenThreads, getHowManyThreadsCanRun(ns, WEAKEN_SCRIPT));

      runners = execScript(ns, WEAKEN_SCRIPT, threadsToRun, target, weakenRam);

      ns.print(`Waiting for ${ns.format.time(ns.getWeakenTime(target))} for weaken to run.`);

      await wait(ns, ns.getWeakenTime(target), SHARE);

      weakenThreads = calculateWeakenThreads(ns, (ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target)));

      ns.print(`INFO - ${target} was weakened to ${ns.getServerSecurityLevel(target)}. Need ${weakenThreads} more threads to weaken fully.`);
    }

    var growThreads = Math.ceil(ns.growthAnalyze(target, Math.min((ns.getServerMaxMoney(target) / ns.getServerMoneyAvailable(target)), 100000)));

    while (growThreads > 0) {

      var threadCapacity = getHowManyThreadsCanRun(ns, GROW_SCRIPT, runners, growRam);
      var threadsToRun = Math.min(growThreads, threadCapacity);
      var secIncrease = ns.growthAnalyzeSecurity(threadsToRun);
      var weakenThreads = Math.ceil(secIncrease / ns.weakenAnalyze(1));

      while (threadsToRun + weakenThreads > threadCapacity) {

        threadsToRun--;
        secIncrease = ns.growthAnalyzeSecurity(threadsToRun);
        weakenThreads = Math.ceil(secIncrease / ns.weakenAnalyze(1))

      }

      var runTime = Math.max(ns.getWeakenTime(target), ns.getGrowTime(target));
      runners = execScript(ns, GROW_SCRIPT, threadsToRun, target, runTime - ns.getGrowTime(target), runners, growRam);
      runners = execScript(ns, WEAKEN_SCRIPT, weakenThreads, target, runTime - ns.getWeakenTime(target), runners, weakenRam);
      ns.print(`Waiting for ${ns.format.time(runTime)} for ${threadsToRun} threads of grow to run.`);
      await wait(ns, runTime, SHARE);
      growThreads = Math.ceil(ns.growthAnalyze(target, Math.min((ns.getServerMaxMoney(target) / ns.getServerMoneyAvailable(target)), 100000)));
      ns.print(`INFO - ${target} was grow to ${ns.format.percent(ns.getServerMoneyAvailable(target) / ns.getServerMaxMoney(target))} money. Need ${growThreads} more threads to grow fully.`);
    }
  }


}

/**
 * @param {NS} ns 
 * @param {string} script 
 * @param {import("@/NetscriptDefinitions.js").Server[]} runners 
 * @param {number} [scriptRam=ns.getScriptRam(script)] 
 * @returns {number}
 */
function getHowManyThreadsCanRun(ns, script, runners = getRunnersServer(ns), scriptRam = ns.getScriptRam(script)) {
  if (typeof ns != "object" || typeof ns.getServerMaxRam != "function") {
    throw new Error(`ns is not of type NS: ${typeof ns}`);
  }
  if (typeof script != "string") {
    throw new Error(`script is not a string: ${script}`);
  }
  if (!Array.isArray(runners)) {
    throw new Error(`runners is not an array: ${runners}`);
  }
  var threads = 0;
  runners.forEach((server) => {
    var serverAvailableRam = server.maxRam - server.ramUsed;
    if (server == "home") {
      serverAvailableRam -= RAM_RESERVE;
    }
    threads += Math.floor(serverAvailableRam / scriptRam);
  });
  return threads;
}


/**
 * 
 * @param {NS} ns 
 * @param {string} script 
 * @param {number} [threads=1] 
 * @param {string} [target=""] 
 * @param {number} [delay=0] 
 * @param {import("@/NetscriptDefinitions.js").Server[]} [runners=getRunnersServer(ns)] 
 * @returns {import("@/NetscriptDefinitions.js").Server[]}
 */
export function execScript(ns, script, threads = 1, target = "", delay = 0, runners = getRunnersServer(ns), scriptRam = ns.getScriptRam(script)) {
  for (var runner of runners) {
    if (threads > 0) {
      var serverAvailableRam = runner.maxRam - runner.ramUsed;
      var runnerThreads = Math.min(threads, getHowManyThreadsCanRun(ns, script, [runner], scriptRam));
      if (runnerThreads > 0) {

        //ns.print("Starting ", script, " on ", runner, " with ", runnerThreads, " threads.");
        var pid = ns.exec(script, runner.hostname, runnerThreads, target, delay);
        runner.ramUsed += scriptRam * runnerThreads;
        if (pid == 0) {
          ns.scp(script, runner.hostname, "home");
          pid = ns.exec(script, runner.hostname, runnerThreads, target, delay);
        }
        threads -= runnerThreads;
        if (threads > 0) {
          runners.shift();
        }
      }
    } else {
      break;
    }
  }
  if (threads > 0) {
    ns.print("ERROR - Not enough RAM. Could not run ", script, " with ", threads, " threads.");
    ns.ui.openTail();
  }
  return runners;
}