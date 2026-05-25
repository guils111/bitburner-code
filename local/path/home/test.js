import { execScript, getAvailableRam } from "./lib/execHelper";
import { clonePlayer, cloneServer, findBestPrepedTarget, findBestUnprepedTarget, simulateMegaBatch } from "./lib/hackingHelper";
import { getRunners } from "./lib/scanHelper";

const BATCHER_SCRIPT = "/continuousBatcher/continuousBatcher.js";
const PREP_SCRIPT = "/continousBatcher/prepTarget.js"
const HACK_SCRIPT = "/continousBatcher/workers/hack.js";
const WEAKEN_SCRIPT = "/continousBatcher/workers/weaken.js";
const GROW_SCRIPT = "/continousBatcher/workers/grow.js";

/** @param {NS} ns */
export async function main(ns) {
  ns.clearLog();
  ns.disableLog("ALL");
  const prepedServer = ns.getServer("phantasy");
  const unprepedServer = ns.getServer("joesguns");
  const target = findBestPrepedTarget(ns, HACK_SCRIPT, GROW_SCRIPT, WEAKEN_SCRIPT);
  const player = ns.getPlayer();
  let time = performance.now();
  const megaBatch = simulateMegaBatch(ns, prepedServer, player, HACK_SCRIPT, WEAKEN_SCRIPT, GROW_SCRIPT);
  time = performance.now() - time;
  ns.print(`Time taken: ${time} ms`);

  for (const batch of megaBatch) {
    
    const hackPercent = ns.hackAnalyze(target.hostname) * batch.hackThreads;
    const growThreadsDifference = Math.ceil(ns.growthAnalyze(target.hostname, 1 / (1 - hackPercent))) - batch.growThreads;

    if(growThreadsDifference > 0) {
      ns.print(JSON.stringify(batch));
      break;
    }

  }
}
