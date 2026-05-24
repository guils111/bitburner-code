import { RAM_RESERVE } from './constants.js';
import { getRunnersServer } from './scanHelper.js';



/**
 * 
 * @param {NS} ns 
 * @param {string} script 
 * @param {number} threads 
 * @param {import("@/NetscriptDefinitions.js").Server[]} runners 
 * @param {number} scriptRam 
 * @param {boolean} canSplitThreads 
 * @param {import('@/NetscriptDefinitions.js').ScriptArg[]} [args=[]] 
 * @returns {{runners: import("@/NetscriptDefinitions.js").Server[], pids: number[]}}
 */
export function execScript(ns, script, threads, runners, scriptRam, canSplitThreads, args = [] ) {
    /**
     * @type {number[]}
     */
    const pids = [];
    for (const runner of runners) {
        if (threads > 0) {
            const serverAvailableRam = runner.maxRam - runner.ramUsed;
            const runnerThreads = Math.min(threads, getHowManyThreadsCanRun(ns, script, [runner], scriptRam));
            if ((runnerThreads > 0 && canSplitThreads) || (!canSplitThreads && runnerThreads == threads)) {

                //ns.print("Starting ", script, " on ", runner, " with ", runnerThreads, " threads.");
                let pid = ns.exec(script, runner.hostname, runnerThreads, ...args);
                runner.ramUsed += scriptRam * runnerThreads;
                if (pid == 0) {
                    ns.scp(script, runner.hostname, "home");
                    pid = ns.exec(script, runner.hostname, runnerThreads, ...args);
                }
                if(pid > 0) {
                    pids.push(pid);
                    threads -= runnerThreads;
                    runners[runners.indexOf(runner)].ramUsed += scriptRam*runnerThreads;
                } else {
                    ns.print(`ERROR - Script execution failed. ${JSON.stringify({script, threads, runners, scriptRam, canSplitThreads, args})}`);
                    ns.ui.openTail();
                    throw new Error(`Script execution failed. Check logs.`);
                }
                
            }
        } else {
            break;
        }
    }
    if (threads > 0) {
        ns.print("ERROR - Not enough RAM. Could not run ", script, " with ", threads, " threads.");
        ns.ui.openTail();
    }
    return {runners, pids: pids};
}


/**
 * @param {NS} ns 
 * @param {string} script 
 * @param {import("@/NetscriptDefinitions.js").Server[]} runners 
 * @param {number} [scriptRam=ns.getScriptRam(script)] 
 * @returns {number}
 */
export function getHowManyThreadsCanRun(ns, script, runners = getRunnersServer(ns), scriptRam = ns.getScriptRam(script, "home")) {
    let threads = 0;
    runners.forEach((server) => {
        var serverAvailableRam = server.maxRam - server.ramUsed;
        if (server.hostname == "home") {
            serverAvailableRam -= RAM_RESERVE;
        }
        threads += Math.floor(serverAvailableRam / scriptRam);
    });
    return threads;
}