import { RAM_RESERVE } from './constants.js';
import { getRunners } from './scanHelper.js';



/**
 * 
 * @param {NS} ns 
 * @param {string} script 
 * @param {number} threads 
 * @param {boolean} canSplitThreads 
 * @param {import('@/NetscriptDefinitions.js').ScriptArg[]} [args=[]] 
 * @returns {number[]}
 */
export function execScript(ns, script, threads, canSplitThreads, args = []) {

    const runners = getRunners(ns);
    const scriptRam = ns.getScriptRam(script);

    /**
     * @type {number[]}
     */
    const pids = [];
    for (const runner of runners) {
        if (threads > 0) {
            const runnerThreads = Math.min(threads, getHowManyThreadsCanRun(ns, script, [runner]));
            if ((runnerThreads > 0 && canSplitThreads) || (!canSplitThreads && runnerThreads == threads)) {

                if (!ns.scp(script, runner, "home")) {
                    throw new Error(`Could not copy ${script} to ${runner}. Does the script exist? ${ns.fileExists(script, "home")}`);
                }

                let pid = ns.exec(script, runner, runnerThreads, ...args);

                if (pid > 0) {
                    pids.push(pid);
                    threads -= runnerThreads;
                } else {
                    ns.print(`ERROR - Script execution failed. ${JSON.stringify({ script, threads, runnersLength: runners.length, scriptRam, canSplitThreads, args })}`);
                    ns.ui.openTail();
                    throw new Error(`Script execution failed. Check logs.`);
                }
            }
        } else {
            break;
        }
    }
    if (threads > 0) {
        ns.print("WARN - Not enough RAM. Could not run ", script, " with ", threads, " threads.");
        ns.ui.openTail();
    }
    if (pids.length === 0) {
        pids.push(0);
    }
    return pids;
}


/**
 * @param {NS} ns 
 * @param {string} script 
 * @param {string[]} runners 
 * @param {number} [scriptRam=ns.getScriptRam(script)] 
 * @returns {number}
 */
export function getHowManyThreadsCanRun(ns, script, runners = getRunners(ns), scriptRam = ns.getScriptRam(script, "home")) {
    let threads = 0;
    runners.forEach((server) => {
        let serverAvailableRam = getAvailableRam(ns, server);
        if (server == "home") {
            serverAvailableRam -= RAM_RESERVE;
        }
        threads += Math.floor(serverAvailableRam / scriptRam);
    });
    return threads;
}

/**
 * 
 * @param {NS} ns 
 * @param {string} server 
 * @returns {number}
 */
export function getAvailableRam(ns, server) {
    return ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
}

/**
 * @param {NS} ns 
 * @param {string} script 
 * @returns {number[]}
 */
export function getHowManyThreadsCanRunNoSplitting(ns, script) {
    const runners = getRunners(ns);
    const scriptRam = ns.getScriptRam(script);
    /**
     * @type {number[]}
     */
    const threads = [];
    runners.forEach((server) => {
        let serverAvailableRam = getAvailableRam(ns, server);
        if (server == "home") {
            serverAvailableRam -= RAM_RESERVE;
        }
        threads.push(Math.floor(serverAvailableRam / scriptRam));
    });
    return threads.sort((a, b) => b - a);
}


