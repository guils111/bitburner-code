import { getHackTargetsInfo, isServerPrepared } from "../lib/hackingHelper";
import { isPrepped } from "../part4/utils";

const HACK_SCRIPT = "/continousBatcher/workers/hack.js";
const WEAKEN_SCRIPT = "/continousBatcher/workers/weaken.js";
const GROW_SCRIPT = "/continousBatcher/workers/grow.js";
/** @param {NS} ns */
export async function main(ns) {
  ns.clearLog();
  ns.disableLog("ALL");

  const hackTargets = getHackTargetsInfo(ns, HACK_SCRIPT, GROW_SCRIPT, WEAKEN_SCRIPT);
  let output = "Top hack targets:\n";
  hackTargets.sort((a, b) => (b.target.requiredHackingSkill ?? 0) - (a.target.requiredHackingSkill ?? 0));
  hackTargets.forEach((info) => {
    output += `${info.target.hostname.padEnd(20)}`
    output += `| Prepped: ${isServerPrepared(ns, info.target.hostname).toString().padEnd(6)}`
    output += `| Money/s: $${ns.format.number(info.moneyPSecond).padEnd(10)}`
    output += `| Exp/s: ${ns.format.number(info.expPSecond).padEnd(10)}`
    output += `| Max Batches: ${ns.format.number(info.maxBatches).padEnd(10)}`
    output += `| Run Time: ${ns.format.time(ns.getWeakenTime(info.target.hostname)).padEnd(25)}`
    output += `| Prep Time: ${ns.format.time(info.prepTime)}`;

    output += "\n";
    
  });
  ns.tprint(output);
  
}

