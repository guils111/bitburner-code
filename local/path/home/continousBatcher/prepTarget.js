import { execScript } from "../lib/execHelper";
import { calculateGrowThreads, calculateWeakenThreads, isServerPrepared, simulateGrow, simulateWeaken } from "../lib/hackingHelper";
import { getRunners, getRunnersServer } from "../lib/scanHelper";

const WEAKEN_SCRIPT = "/continuousBatcher/workers/weaken.js";
const GROW_SCRIPT = "/continuousBatcher/workers/grow.js";
let targetName = "";
/** @param {NS} ns */
export async function main(ns) {
    init(ns);

    while (!isServerPrepared(ns, targetName)) {
        const target = ns.getServer(targetName);
        const player = ns.getPlayer();
        const weakenThreads = calculateWeakenThreads(ns, target);
        let workResult = simulateWeaken(ns, target, player, weakenThreads);
        const growThreads = calculateGrowThreads(ns, workResult.server, workResult.player, workResult.server.moneyMax ?? 0);
        workResult = simulateGrow(ns, workResult.server, workResult.player, growThreads);
        const weakenGrowThreads = calculateWeakenThreads(ns, workResult.server);
        execScript(ns, WEAKEN_SCRIPT, weakenThreads, getRunnersServer(ns), ns.getScriptRam(WEAKEN_SCRIPT), true, [targetName, false, 0]);
        execScript(ns, GROW_SCRIPT, growThreads, getRunnersServer(ns), ns.getScriptRam(GROW_SCRIPT), true, [targetName, false, 0]);

    }
}

/**
 * 
 * @param {NS} ns 
 */
function init(ns) {
    targetName = ns.args[0].toString();
}