import { NUKE_SCRIPT, PURCHASE_SERVER_SCRIPT, SOLVE_CONTRACTS_SCRIPT } from "../lib/constants";
import { findBestPrepedTarget, findBestUnprepedTarget, isServerPrepared } from "../lib/hackingHelper";

const BATCHER_SCRIPT = "/continousBatcher/continuousBatcher.js";
const PREP_SCRIPT = "/continousBatcher/prepTarget.js"
const HACK_SCRIPT = "/continousBatcher/workers/hack.js";
const WEAKEN_SCRIPT = "/continousBatcher/workers/weaken.js";
const GROW_SCRIPT = "/continousBatcher/workers/grow.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.clearLog();

    const managerPortNumber = ns.self().pid;
    const managerPort = ns.getPortHandle(managerPortNumber);
    managerPort.clear();

    if (!ns.scriptRunning(NUKE_SCRIPT)) {
        ns.exec(NUKE_SCRIPT, "home");
    }
    if (!ns.scriptRunning(PURCHASE_SERVER_SCRIPT) && ns.getServerMaxRam() > 64) {
        ns.exec(PURCHASE_SERVER_SCRIPT, "home");
    }
    if (!ns.scriptRunning(SOLVE_CONTRACTS_SCRIPT) && ns.getServerMaxRam() > 1000) {
        ns.exec(SOLVE_CONTRACTS_SCRIPT, "home");
    }

    let target = findBestPrepedTarget(ns, HACK_SCRIPT, GROW_SCRIPT, WEAKEN_SCRIPT);
    let prevTarget = ns.formulas.mockServer();
    let batcherPid = 0;
    let prepPid = 0;
    let prepTarget = findBestUnprepedTarget(ns, HACK_SCRIPT, GROW_SCRIPT, WEAKEN_SCRIPT);
    let prevPrepTarget = ns.formulas.mockServer();

    while (true) {
        if (ns.serverExists(target.hostname) && prevTarget !== target) {
            ns.print(`INFO - Changing targets from ${prevTarget.hostname} to ${target.hostname}`)
            prevTarget = target;
            ns.kill(batcherPid);
            batcherPid = ns.exec(BATCHER_SCRIPT, "home", 1, ...[target.hostname, managerPortNumber]);
        }
        if (ns.serverExists(prepTarget.hostname) && prepTarget !== prevPrepTarget && isServerPrepared(ns, prepTarget.hostname)) {
            ns.print(`INFO - Changing prep target from ${prevPrepTarget?.hostname} to ${prepTarget}`);
            prevPrepTarget = prepTarget
            ns.kill(prepPid);
            prepPid = ns.exec(PREP_SCRIPT, "home", 1, ...[prepTarget.hostname, managerPortNumber]);
        }
        await managerPort.nextWrite()
        while (!managerPort.empty()) {
            const portData = managerPort.read();
            const action = portData.split(":")[0];
            switch (action) {
                case "abort":
                    target = ns.formulas.mockServer();
                case "prepDone":
                    prepTarget = ns.formulas.mockServer();
            }
        }
    }


}