import { execScript, getHowManyThreadsCanRun } from "../lib/execHelper";

const SHARE_SCRIPT = "workers/share.js";

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");
  ns.clearLog();
  while(true) {
    var threads = ns.args[0] ? ns.args[0]/4 : getHowManyThreadsCanRun(ns, SHARE_SCRIPT);
    execScript(ns, SHARE_SCRIPT, threads, true);
    await ns.sleep(10000);
    
  }
}
