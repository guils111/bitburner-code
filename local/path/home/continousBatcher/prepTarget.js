import { calculatePrepThreads, isServerPrepared } from "../lib/hackingHelper";
import { execGrow, execWeaken } from "./continuousBatcher";

const WEAKEN_SCRIPT = "/continuousBatcher/workers/weaken.js";
const GROW_SCRIPT = "/continuousBatcher/workers/grow.js";

/** @type {number[]} */
let pids = [];
/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.clearLog();
    ns.atExit(() => killPreppingScripts(ns));

    const targetName = ns.args[0].toString();
    const managerPort = Number.parseInt(ns.args[1].toString());

    const prepPort = ns.self().pid;
    ns.clearPort(prepPort);

    while (!isServerPrepared(ns, targetName)) {
        const target = ns.getServer(targetName);
        const player = ns.getPlayer();
        const prepThreads = calculatePrepThreads(ns, target, player, WEAKEN_SCRIPT, GROW_SCRIPT);
        ns.print(`INFO - Preping ${targetName}. Need to reduce security by ${ns.format.number((target.hackDifficulty ?? 0) - (target.minDifficulty ?? 0), 2)}. Money is at ${ns.format.percent(((target.moneyAvailable ?? 0) / (target.moneyMax ?? 1)), 2)}. ${JSON.stringify(prepThreads)}`);

        if (prepThreads.weakenThreads > 0) {
            if (prepThreads.weakenGrowThreads === 0) {
                pids.push(execWeaken(ns, prepThreads.weakenThreads, targetName, 0, prepPort, "done"));
            } else {
                pids.push(execWeaken(ns, prepThreads.weakenThreads, targetName, 0));
            }
        }
        if (prepThreads.growThreads > 0) {
            pids.push(execGrow(ns, prepThreads.growThreads, targetName, ns.getWeakenTime(targetName) - ns.getGrowTime(targetName), false));
            if (prepThreads.weakenGrowThreads === 0) {
                ns.print(`ERROR - Attempting to grow ${targetName} without scheduling a weaken to follow up. ${JSON.stringify(prepThreads)}`);
                ns.ui.openTail();
                ns.exit();
            }
        }
        if (prepThreads.weakenGrowThreads > 0) {
            pids.push(execWeaken(ns, prepThreads.weakenGrowThreads, targetName, 0, prepPort, "done"));
        }
        if(pids.some(p => p === 0)) {
            ns.print(`ERROR - Could not start prep. Aborting.`);
            ns.exit();
        }
        //if all prepThreads are 0, exit to avoid infinite loop
        if (prepThreads.weakenThreads === 0 && prepThreads.growThreads === 0 && prepThreads.weakenGrowThreads === 0) {
            ns.print(`ERROR - No prep threads needed for ${targetName}, but server is not prepared. This should not happen. Aborting.`);
            ns.writePort(managerPort, `abort:${targetName}`);
            ns.ui.openTail();
            ns.exit();
        }


        await ns.nextPortWrite(prepPort);
        ns.print(`INFO - Received signal that prep batch is done, checking if ${targetName} is prepped...`);
        pids = [];

    }
    ns.print(`SUCCESS - Finished prepping ${targetName}, sending signal to batcher`);

    ns.writePort(managerPort, `prepDone:${targetName}`);
}

/** @param {NS} ns */
function killPreppingScripts(ns) {
    ns.print(`INFO - Exiting, killing all ${pids.length} prepping scripts...`);
    pids.forEach((pid) => {
        ns.kill(pid);
    });
}