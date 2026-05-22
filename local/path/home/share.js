import { execScript, getHowManyThreadsCanRun } from "./lib/execHelper";

const SHARE_SCRIPT = "batch/sequential/share.js";

/** @param {NS} ns */
export async function main(ns) {
  while(true) {
    var threads = getHowManyThreadsCanRun(ns, SHARE_SCRIPT);
    execScript(ns, SHARE_SCRIPT, threads, "", 0);
    await ns.sleep(1000);

  }
}
