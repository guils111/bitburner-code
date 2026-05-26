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

  ns.ui.resizeTail(481, 170);
  ns.ui.moveTail(1867, 1);

  ns.atExit(() => {
    ns.print(`Window size: ${ns.ui.windowSize()}.`);
  });
  
  while(true) {
    await ns.sleep(10000);
  }

}
