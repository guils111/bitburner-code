import { execScript } from "./batch/shotgun/shotgun";
import { deepScan, getRunners, getRunnersServer } from "./lib/scanHelper";


const WEAKEN_SCRIPT = "/batch/shotgun/weaken.js";

/** @param {NS} ns */
export async function main(ns) {
  ns.clearLog();
  ns.disableLog("ALL");

  deepScan(ns).forEach((a) => {
    let server = ns.getServer(a);
    server.hackDifficulty = 1;
    ns.print(`${a} - Hack analyze security 1: ${ns.hackAnalyze(a)} - Security: ${ns.getServerSecurityLevel(a)} - ${ns.formulas.hacking.hackPercent(server, ns.getPlayer())}`);
  });

}
