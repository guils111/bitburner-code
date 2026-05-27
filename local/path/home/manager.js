import { GANG_MANAGER_SCRIPT, NUKE_SCRIPT, PREP_RUNNERS, PURCHASE_SERVER_SCRIPT, RESERVED_RUNNERS, SOLVE_CONTRACTS_SCRIPT } from "./lib/constants";
import { getAvailableRam } from "./lib/execHelper";
import { deepScan } from "./lib/scanHelper";
import { checkTarget, isPrepped } from "./part4/utils";

const BATCH_SCRIPT = "part4/controller.js";
const BATCH_WORKERS = ["part4/tHack.js", "part4/tWeaken.js", "part4/tGrow.js"];

const SCRIPTS_TO_COPY = [...BATCH_WORKERS, BATCH_SCRIPT, "part4/utils.js", "lib/constants.js"];

let target = null;
let lastTarget = "";
let prepTarget = null;
let prevPrepTarget = "";
let batchPid = 0;
let prepPid = 0;
let batchRam = 0;

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.clearLog();

    ns.atExit(() => {
        killBatch(ns, target);
        ns.kill(batchPid);
        killBatch(ns, prepTarget);
        ns.kill(prepPid);
    }, "killChildren");

    ns.ps().filter(p => {
        return p.filename === ns.getScriptName() && p.pid !== ns.pid;
    }).forEach(p => {
        ns.print(`WARN - Killing previous instance of manager script with PID ${p.pid} to avoid multiple instances running at the same time.`);
        ns.kill(p.pid); // Kill any other instance of this script that might be running to avoid multiple managers running at the same time.
    });
    await ns.sleep(1000); // Wait a bit to ensure any previous instance has been killed before proceeding.

    const managerPort = ns.pid;
    ns.print("INFO - Starting.");
    while (true) {

        if (!ns.isRunning(NUKE_SCRIPT, "home")) {
            ns.exec(NUKE_SCRIPT, "home");
            await ns.sleep(1000);
        }
        if (!ns.isRunning(PURCHASE_SERVER_SCRIPT, "home") && ns.getServerMaxRam("home") >= 64) {
            ns.exec(PURCHASE_SERVER_SCRIPT, "home");
            await ns.sleep(1000);
        }
        if (!ns.isRunning(SOLVE_CONTRACTS_SCRIPT, "home") && ns.getServerMaxRam("home") >= 1000) {
            ns.exec(SOLVE_CONTRACTS_SCRIPT, "home");
            await ns.sleep(1000);
        }
        if (!ns.isRunning(GANG_MANAGER_SCRIPT, "home") && ns.gang.inGang() && getAvailableRam(ns, "home") >= ns.getScriptRam(GANG_MANAGER_SCRIPT)) {
            ns.exec(GANG_MANAGER_SCRIPT, "home");
            await ns.sleep(1000);
        }

        deepScan(ns).forEach((s) => {
            target = checkTarget(ns, s, target, ns.fileExists("Formulas.exe", "home"), true);
            prepTarget ??= checkTarget(ns, s, prepTarget, ns.fileExists("Formulas.exe", "home"), false, lastTarget);
        });
        ns.print(`INFO - Current target: ${target}. Prep target: ${prepTarget}.`);
        ns.print(`DEBUG - lastTarget: ${lastTarget} target !== lastTarget: ${target !== lastTarget}. target !== prepTarget: ${target !== prepTarget}. isPrepped(target): ${isPrepped(ns, target)}. getBatchAvailableRam(ns): ${getBatchAvailableRam(ns)}. batchRam * 1.5: ${batchRam * 1.5}.`);
        if ((!ns.isRunning(batchPid) && target) || (target !== lastTarget && isPrepped(ns, target) && target) || (getBatchAvailableRam(ns) > batchRam * 1.5 && target)) {
            killBatch(ns, lastTarget);
            ns.kill(batchPid);
            lastTarget = target;
            batchRam = getBatchAvailableRam(ns);
            batchPid = ns.exec(BATCH_SCRIPT, "home", 1, ...[target]);
            if (batchPid === 0) {
                ns.print(`ERROR - Batch script failed to start. Check logs. ${JSON.stringify({ target, batchPid })}`);
                ns.ui.openTail();
                throw new Error("Batch script failed to start.");
            }
            await ns.sleep(1000); // Wait a bit for the batch script to start and acquire the target before potentially starting the prep script.
        }

        if ((!ns.isRunning(prepPid) && prepTarget) || (prepTarget !== target && prepTarget !== prevPrepTarget && prepTarget && !isPrepped(ns, prepTarget) && PREP_RUNNERS.some(r => ns.serverExists(r) && ns.getServerMaxRam(r) >= ns.getScriptRam(BATCH_SCRIPT) * 2))) {
            PREP_RUNNERS.forEach(r => { if (ns.serverExists(r)) ns.scp(SCRIPTS_TO_COPY, r, "home") });
            const runners = [...PREP_RUNNERS]
            if (!target) {
                runners.push("home");
            }
            const runner = runners.find(r => ns.serverExists(r) && ns.getServerMaxRam(r) >= ns.getScriptRam(BATCH_SCRIPT) * 2);
            if (runner) {
                prevPrepTarget = prepTarget;
                prepPid = ns.exec(BATCH_SCRIPT, runners.find(r => ns.serverExists(r) && ns.getServerMaxRam(r) >= ns.getScriptRam(BATCH_SCRIPT) * 2), 1, ...[prepTarget, true, managerPort]);
                if (prepPid === 0) {
                    ns.print(`ERROR - Prep script failed to start. Check logs. ${JSON.stringify({ prepTarget, prepPid })}`);
                    ns.ui.openTail();
                    throw new Error("Prep script failed to start.");
                }
            }

        }

        await ns.sleep(10000);
        const portData = ns.readPort(managerPort);
        if (portData && portData.includes(`prepDone:${prepTarget}`)) {
            ns.print(`INFO - Received prep done for ${prepTarget}. ${ns.isRunning(prepPid) ? "Prep script is still running." : "Prep script is not running."}. Prep target is ${isPrepped(ns, prepTarget) ? "prepped" : "not prepped"}.`);
            prepTarget = null;
            prepPid = 0;
        } else if (portData && portData.includes(`prepFailed`)) {
            ns.print(`ERROR - Prep script failed for ${prepTarget}.`);
            prepTarget = null;
            prepPid = 0;
        }
    }
}
/** @param {NS} ns */
function killBatch(ns, target) {
    deepScan(ns).forEach((s) => {
        ns.ps(s).filter(p => {
            return BATCH_WORKERS.includes(p.filename) && (() => {
                const job = JSON.parse(p.args[0]);
                return job.target === target;
            });
        }).forEach(p => ns.kill(p.pid));
    });
}

/** @param {NS} ns */
function getBatchAvailableRam(ns) {
    return deepScan(ns).filter(s => ns.hasRootAccess(s) && !RESERVED_RUNNERS.includes(s)).reduce((acc, s) => acc + (ns.getServerMaxRam(s)), 0);
}