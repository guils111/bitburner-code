import { getBestBatchSize, simulateBatch, simulateMegaBatch } from "./lib/hackingHelper";

const BATCHER_SCRIPT = "/continuousBatcher/continuousBatcher.js";
const PREP_SCRIPT = "/continousBatcher/prepTarget.js"
const HACK_SCRIPT = "/continuousBatcher/workers/hack.js";
const WEAKEN_SCRIPT = "/continuousBatcher/workers/weaken.js";
const GROW_SCRIPT = "/continuousBatcher/workers/grow.js";

/** @param {NS} ns */
export async function main(ns) {
  ns.clearLog();
  ns.disableLog("ALL");
  const targetServer = ns.getServer("phantasy");

  const player = ns.getPlayer();
  
  ns.print(JSON.stringify(targetServer));
  //const megabatch = simulateMegaBatch(ns, targetServer, player, HACK_SCRIPT, WEAKEN_SCRIPT, GROW_SCRIPT);
  //ns.print(JSON.stringify(targetServer));
  let time = performance.now();
  const hackThreads = getBestBatchSize(ns, targetServer, player, HACK_SCRIPT, WEAKEN_SCRIPT, GROW_SCRIPT);
  ns.print(performance.now() - time);
  //const batch = simulateBatch(ns, targetServer, player, hackThreads);
  ns.print(JSON.stringify(targetServer));

  


}
