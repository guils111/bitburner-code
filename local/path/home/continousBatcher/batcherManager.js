import { execScript } from "../lib/execHelper";
import { findBestPrepedTarget, findBestUnprepedTarget, getAllHackTargets, getRunnersServer } from "../lib/scanHelper";

const BATCHER_SCRIPT = "/continuousBatcher/continuousBatcher.js";
const PREP_SCRIPT = "/continousBatcher/prepTarget.js"
const HACK_SCRIPT = "/continuousBatcher/workers/hack.js";
const WEAKEN_SCRIPT = "/continuousBatcher/workers/weaken.js";
const GROW_SCRIPT = "/continuousBatcher/workers/grow.js";

/** @param {NS} ns */
export async function main(ns) {
    const managerPort = ns.self().pid;
    ns.clearPort(managerPort);

    let target = findBestPrepedTarget(ns, HACK_SCRIPT, GROW_SCRIPT, WEAKEN_SCRIPT);
    let prevTarget;
    let batcherPid = 0;
    let prepPid = 0;
    let prepTarget = findBestUnprepedTarget(ns, HACK_SCRIPT, GROW_SCRIPT, WEAKEN_SCRIPT);
    let prevPrepTarget;
    if (!ns.serverExists(target.hostname) && prevTarget !== target) {
        prevTarget = target;
        ns.kill(batcherPid);
        batcherPid = execScript(ns, BATCHER_SCRIPT, 1, getRunnersServer(ns), ns.getScriptRam(BATCHER_SCRIPT, "home"), false, [target.hostname, managerPort]).pids[0];
    }
    if (!ns.serverExists(prepTarget.hostname) && prepTarget !== prevPrepTarget) {
        ns.kill(prepPid);
        prepPid = execScript(ns, PREP_SCRIPT, 1, getRunnersServer(ns), ns.getScriptRam(PREP_SCRIPT, "home"), false, [prepTarget.hostname, managerPort]).pids[0];
    }
    await ns.nextPortWrite(managerPort);
    let portData = "";
    while((portData = ns.readPort(managerPort)) !== "NULL PORT DATA") {
        const action = portData.split(":")[0];
        switch (action) {
            case "abort":
                target = ns.formulas.mockServer();
            case "prepDone":
                prepTarget = ns.formulas.mockServer();
        }
    }

}