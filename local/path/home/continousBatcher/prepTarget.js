import { execScript } from "../lib/execHelper";
import { calculateGrowThreads, calculatePrepThreads, calculateWeakenThreads, isServerPrepared, simulateGrow, simulateWeaken } from "../lib/hackingHelper";
import { getRunners, getRunnersServer } from "../lib/scanHelper";
import { execGrow, execWeaken } from "./continuousBatcher";

const WEAKEN_SCRIPT = "/continuousBatcher/workers/weaken.js";
const GROW_SCRIPT = "/continuousBatcher/workers/grow.js";

/** @param {NS} ns */
export async function main(ns) {
    const targetName = ns.args[0].toString();
    const managerPort = Number.parseInt(ns.args[1].toString());

    const prepPort = ns.self().pid;
    ns.clearPort(prepPort);
    
    while (!isServerPrepared(ns, targetName)) {
        const target = ns.getServer(targetName);
        const player = ns.getPlayer();
        ns.print(`Preping ${targetName}. Need to reduce security by ${ns.format.number((target.hackDifficulty??0) - (target.minDifficulty??0), 2)}. Money is at ${ns.format.percent(((target.moneyAvailable??0)/(target.moneyMax??1))*100, 2)}.`);
        let runners = getRunnersServer(ns);
        const prepThreads = calculatePrepThreads(ns, target, player, runners, WEAKEN_SCRIPT, GROW_SCRIPT);
        ({ runners: runners } = execWeaken(ns, prepThreads.weakenThreads, runners, targetName, 0));
        ({ runners: runners } = execGrow(ns, prepThreads.growThreads, runners, targetName, ns.getWeakenTime(targetName)-ns.getGrowTime(targetName), false));
        ({ runners: runners } = execWeaken(ns, prepThreads.weakenGrowThreads, runners, targetName, 0, prepPort, "done"));

        await ns.nextPortWrite(prepPort);

    }

    ns.writePort(managerPort, `prepDone:${targetName}`);
}

/**
 * 
 * @param {NS} ns 
 */
function init(ns) {

}