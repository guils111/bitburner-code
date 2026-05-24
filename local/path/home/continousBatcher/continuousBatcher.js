import { execScript } from "../lib/execHelper";
import { isServerPrepared, simulateMegaBatch } from "../lib/hackingHelper";
import { getRunners } from "../lib/scanHelper";

const HACK_SCRIPT = "/continousBatcher/workers/hack.js";
const WEAKEN_SCRIPT = "/continousBatcher/workers/weaken.js";
const GROW_SCRIPT = "/continousBatcher/workers/grow.js";
let managerPort = 0;
let targetName = "";

/**
 * 
 * @param {NS} ns 
 */
function init(ns) {
  ns.clearPort(ns.self().pid);
  targetName = ns.args[0]?.toString();
  managerPort = Number.parseInt(ns.args[1]?.toString());
  ns.atExit(() => abort(ns));
  ns.ui.openTail();
}

/** @param {NS} ns */
export async function main(ns) {
  ns.clearLog();
  ns.disableLog("ALL");
  init(ns);
  ns.print(`INFO - Starting continous batch against ${targetName}`);
  launchBatches(ns);
  await keepBatchesRunning(ns);

}

/**
 * 
 * @param {NS} ns 
 */
async function keepBatchesRunning(ns) {
  const batchPort = ns.self().pid;

  while (true) {
    await ns.nextPortWrite(batchPort);

    if (!isServerPrepared(ns, targetName)) {
      const secAboveMin = ns.getServerSecurityLevel(targetName) - ns.getServerMinSecurityLevel(targetName);
      const moneyPercent = (ns.getServerMoneyAvailable(targetName) / ns.getServerMaxMoney(targetName)) * 100;
      ns.print(`ERROR - Server ${targetName} is not prepared. Sec above min ${secAboveMin}, money at ${ns.format.percent(moneyPercent, 0)}`);
      ns.exit();
    }

    launchBatches(ns);

  }
}

/**
 * 
 * @param {NS} ns 
 */
function abort(ns) {
  ns.print(`WARN - Aborting this script. Killing all scripts that have args[0] = ${targetName}.`)
  getRunners(ns).forEach((runner) => {
    ns.ps(runner).filter((p) => p.args.length > 0 && p.args[0] === targetName && p.filename !== ns.getScriptName()).forEach((p) => {
      ns.kill(p.pid);
    })
  })
  ns.writePort(managerPort, `abort: ${targetName}`);
  ns.ui.openTail();
}

/**
 * 
 * @param {NS} ns 
 * @returns {{ 
 * server: import("@/NetscriptDefinitions").Server, 
 * player: import("@/NetscriptDefinitions").Person, 
 * moneyStolen: number, 
 * hackThreads: number,
 * weakenHackThreads: number, 
 * growThreads: number, 
 * weakenGrowThreads: number, 
 * expGained: number }}
 */
function launchBatches(ns) {
  ns.print(`INFO - Launching batches.`)
  const player = ns.getPlayer();
  const server = ns.getServer(targetName);

  const megaBatch = simulateMegaBatch(ns, server, player, HACK_SCRIPT, WEAKEN_SCRIPT, GROW_SCRIPT);
  ns.print(`INFO - Predicted a mega batch of ${megaBatch.length} batches against ${targetName}`);
  const reportBackPort = ns.self().pid;
  const weakenTime = ns.getWeakenTime(targetName);
  const growTime = ns.getGrowTime(targetName);
  const hackTime = ns.getHackTime(targetName);
  let lastPid = 0;
  for (const batch of megaBatch) {
    lastPid = executeBatch(ns, batch, weakenTime, growTime, hackTime)
    if (lastPid <= 0) {
      break;
    }
  }
  ns.kill(lastPid);
  execWeaken(ns, megaBatch[megaBatch.length - 1].weakenGrowThreads, targetName, 0, reportBackPort, megaBatch[megaBatch.length - 1].player.skills.hacking.toString());

  return megaBatch[megaBatch.length - 1];
}

/**
 *
 * @param {NS} ns
 * @param {{
 * hackThreads: number, 
 * weakenHackThreads: number, 
 * growThreads: number, 
 * weakenGrowThreads: number, 
 * player: import("@/NetscriptDefinitions.js").Person}} batch
 * @param {number} weakenTime
 * @param {number} growTime
 * @param {number} hackTime
 * @returns {number}
 */
function executeBatch(ns, batch, weakenTime, growTime, hackTime) {
  ns.print(`INFO - Executing batch against ${targetName}. ${JSON.stringify(batch)}`);
  let hackPid = execHack(ns, batch.hackThreads, targetName, false, weakenTime - hackTime);

  let weakenHackPid = execWeaken(ns, batch.weakenHackThreads, targetName, 0);
  let growPid = execGrow(ns, batch.growThreads, targetName, weakenTime - growTime, false);
  let weakenGrowPid = execWeaken(ns, batch.weakenGrowThreads, targetName, 0);

  if (hackPid <= 0 || weakenHackPid <= 0 || growPid <= 0 || weakenGrowPid <= 0) {
    ns.print(`WARN - Batch could not be executed fully. Killing this batch. ${JSON.stringify({hackPid, weakenHackPid, growPid, weakenGrowPid})}`);
    ns.kill(hackPid);
    ns.kill(weakenHackPid);
    ns.kill(growPid);
    ns.kill(weakenGrowPid);
    return 0;
  }
  return weakenGrowPid;
}
/**
 * 
 * @param {NS} ns 
 * @param {string} target 
 * @param {number} threads 
 * @param {boolean} affectStock
 * @param {number} delay 
 * @returns {number}
 */
function execHack(ns, threads, target, affectStock, delay) {
  return execScript(ns, HACK_SCRIPT, threads, false, [target, affectStock, delay])[0];
}

/**
 * 
 * @param {NS} ns 
 * @param {string} target 
 * @param {number} threads 
 * @param {number} delay 
 * @param {number|undefined} reportBackPort 
 * @param {string} dataToSendBack 
 * @returns {number}
 */
export function execWeaken(ns, threads, target, delay, reportBackPort = undefined, dataToSendBack = "") {
  const args = [target, delay];
  if (reportBackPort) {
    args.push(reportBackPort);
    args.push(dataToSendBack);
  }
  const execResult = execScript(ns, WEAKEN_SCRIPT, threads, false, args);

  return execScript(ns, WEAKEN_SCRIPT, threads, false, args)[0];
}

/**
 * 
 * @param {NS} ns 
 * @param {string} target 
 * @param {number} threads 
 * @param {number} delay 
 * @param {boolean} affectStock 
 * @returns {number}
 */
export function execGrow(ns, threads, target, delay, affectStock) {
  return execScript(ns, GROW_SCRIPT, threads, false, [target, affectStock, delay])[0];
}


