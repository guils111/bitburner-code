import { findBestTarget } from "./lib/scanHelper";

/** @param {NS} ns */
export async function main(ns) {
  ns.clearLog();
  ns.disableLog("ALL");

  findBestTarget(ns, "n00dles", true);
}

