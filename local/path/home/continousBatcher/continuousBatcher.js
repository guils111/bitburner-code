import { NUKE_SCRIPT, PURCHASE_SERVER_SCRIPT, SOLVE_CONTRACTS_SCRIPT } from "../lib/constants";
import { execScript } from "../lib/execHelper";
import { getBestBatchSize, isServerPrepared, simulateBatch, simulateMegaBatch } from "../lib/hackingHelper";
import { getMaxRamSum, getRunners, getRunnersServer } from "../lib/scanHelper";

const HACK_SCRIPT = "/continuousBatcher/workers/hack.js";
const WEAKEN_SCRIPT = "/continuousBatcher/workers/weaken.js";
const GROW_SCRIPT = "/continuousBatcher/workers/grow.js";
let hackRam = 0;
let weakenRam = 0;
let growRam = 0;
let managerPort = 0;
let targetName = "";

/**
 * 
 * @param {NS} ns 
 */
function init(ns) {
  hackRam = ns.getScriptRam(HACK_SCRIPT, "home");
  weakenRam = ns.getScriptRam(WEAKEN_SCRIPT, "home");
  growRam = ns.getScriptRam(GROW_SCRIPT, "home");
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
  runWorkers(ns);

  keepBatchesRunning(ns, launchBatches(ns));

}
/**
 * 
 * @param {NS} ns 
 */
function runWorkers(ns) {
  if (!ns.scriptRunning(NUKE_SCRIPT)) {
    ns.exec(NUKE_SCRIPT, "home");
  }
  if (!ns.scriptRunning(PURCHASE_SERVER_SCRIPT) && ns.getServerMaxRam() > 64) {
    ns.exec(PURCHASE_SERVER_SCRIPT, "home");
  }
  if (!ns.scriptRunning(SOLVE_CONTRACTS_SCRIPT) && ns.getServerMaxRam() > 1000) {
    ns.exec(SOLVE_CONTRACTS_SCRIPT, "home");
  }
}
/**
 * 
 * @param {NS} ns 
 * @param {{ 
 * server: import("@/NetscriptDefinitions").Server, 
 * player: import("@/NetscriptDefinitions").Person, 
 * moneyStolen: number, 
 * hackThreads: number,
 * weakenHackThreads: number, 
 * growThreads: number, 
 * weakenGrowThreads: number, 
 * expGained: number }} lastBatch 
 */
async function keepBatchesRunning(ns, lastBatch) {
  const batchPort = ns.self().pid;
  let nextMegaBatch = simulateMegaBatch(ns, lastBatch.server, lastBatch.player, HACK_SCRIPT, WEAKEN_SCRIPT, GROW_SCRIPT);
  let totalRam = getMaxRamSum(ns, getRunnersServer(ns));
  while (true) {
    await ns.nextPortWrite(batchPort);
    let data;
    while ((data = ns.readPort(batchPort)) !== "NULL PORT DATA") {
      const runners = getRunnersServer(ns);
      const targetName = lastBatch.server.hostname;
      if (nextMegaBatch.length < 1) {
        nextMegaBatch = simulateMegaBatch(ns, lastBatch.server, lastBatch.player, HACK_SCRIPT, WEAKEN_SCRIPT, GROW_SCRIPT);
      }
      let nextBatch = nextMegaBatch.shift();
      if (!nextBatch) {
        ns.print(`ERROR - Next batch is not available.`);
        ns.exit();
      }
      if (data !== ns.getHackingLevel()) {
        ns.print(`WARN - Hacking skill desync. Expected ${data} was ${ns.getHackingLevel()}`);
        ns.exit();
      }

      if (!isServerPrepared(ns, targetName)) {
        const secAboveMin = ns.getServerSecurityLevel(targetName) - ns.getServerMinSecurityLevel(targetName);
        const moneyPercent = (ns.getServerMoneyAvailable(targetName) / ns.getServerMaxMoney(targetName)) * 100;
        ns.print(`ERROR - Server ${targetName} is not prepared. Sec above min ${secAboveMin}, money at ${ns.format.percent(moneyPercent, 0)}`);
        ns.exit();
      }

      const weakenTime = ns.getWeakenTime(targetName);
      const growTime = ns.getGrowTime(targetName);
      const hackTime = ns.getHackTime(targetName);
      executeBatch(ns, runners, nextBatch, weakenTime, growTime, hackTime, batchPort);

    }
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
  const player = ns.getPlayer();
  const server = ns.getServer(targetName);
  let runners = getRunnersServer(ns);

  const megaBatch = simulateMegaBatch(ns, server, player, HACK_SCRIPT, WEAKEN_SCRIPT, GROW_SCRIPT);
  const reportBackPort = ns.self().pid;
  const weakenTime = ns.getWeakenTime(targetName);
  const growTime = ns.getGrowTime(targetName);
  const hackTime = ns.getHackTime(targetName);
  for (const batch of megaBatch) {
    runners = executeBatch(ns, runners, batch, weakenTime, growTime, hackTime, reportBackPort);
  }
  return megaBatch[megaBatch.length - 1];
}

/**
 *
 * @param {NS} ns
 * @param {import("@/NetscriptDefinitions.js").Server[]} runners
 * @param {{
 * hackThreads: number, 
 * weakenHackThreads: number, 
 * growThreads: number, 
 * weakenGrowThreads: number, 
 * player: import("@/NetscriptDefinitions.js").Person}} batch
 * @param {number} weakenTime
 * @param {number} growTime
 * @param {number} hackTime
 * @param {number} reportBackPort
 * @returns {import("@/NetscriptDefinitions.js").Server[]}
 */
function executeBatch(ns, runners, batch, weakenTime, growTime, hackTime, reportBackPort) {
  let execResult = execHack(ns, batch.hackThreads, runners, targetName, false, weakenTime - hackTime);

  execResult = execWeaken(ns, batch.weakenHackThreads, execResult.runners, targetName, 0);
  execResult = execGrow(ns, batch.growThreads, execResult.runners, targetName, weakenTime - growTime, false);
  execResult = execWeaken(ns, batch.weakenGrowThreads, execResult.runners, targetName, 0, reportBackPort, batch.player.skills.hacking.toString());
  return execResult.runners
}
/**
 * 
 * @param {NS} ns 
 * @param {string} target 
 * @param {number} threads 
 * @param {import("@/NetscriptDefinitions.js").Server[]} runners 
 * @param {boolean} affectStock
 * @param {number} delay 
 * @returns {{runners: import("@/NetscriptDefinitions.js").Server[], pid: number}}
 */
function execHack(ns, threads, runners, target, affectStock, delay) {
  const execResult = execScript(ns, HACK_SCRIPT, threads, runners, hackRam, false, [target, affectStock]);

  return { runners: execResult.runners, pid: execResult.pids[0] };
}

/**
 * 
 * @param {NS} ns 
 * @param {string} target 
 * @param {number} threads 
 * @param {import("@/NetscriptDefinitions.js").Server[]} runners
 * @param {number} delay 
 * @param {number|undefined} reportBackPort 
 * @param {string} dataToSendBack 
 * @returns {{runners: import("@/NetscriptDefinitions.js").Server[], pid: number}}
 */
function execWeaken(ns, threads, runners, target, delay, reportBackPort = undefined, dataToSendBack = "") {
  const args = [target, delay];
  if (reportBackPort) {
    args.push(reportBackPort);
    args.push(dataToSendBack);
  }
  const execResult = execScript(ns, WEAKEN_SCRIPT, threads, runners, weakenRam, false, args);

  return { runners: execResult.runners, pid: execResult.pids[0] };
}

/**
 * 
 * @param {NS} ns 
 * @param {string} target 
 * @param {number} threads 
 * @param {import("@/NetscriptDefinitions.js").Server[]} runners
 * @param {number} delay 
 * @param {boolean} affectStock 
 * @returns {{runners: import("@/NetscriptDefinitions.js").Server[], pid: number}}
 */
function execGrow(ns, threads, runners, target, delay, affectStock) {
  const execResult = execScript(ns, WEAKEN_SCRIPT, threads, runners, weakenRam, false, [target, affectStock, delay]);

  return { runners: execResult.runners, pid: execResult.pids[0] };
}


