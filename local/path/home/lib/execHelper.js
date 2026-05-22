import { getRunners } from './scanHelper.js';



/** 
 * @param {NS} ns 
 * @param {string[]} runners
 * @param {string} script
 * @param {number || undefined} threads
 * @param {string || undefined} target
 * @param {number || undefined} delay
 * 
*/
export function execScript(ns, script, threads = 1, target = "", delay = 0, runners = getRunners(ns)) {
    if (typeof ns != "object" || typeof ns.getServerMaxRam != "function") {
        throw new Error(`ns is not of type NS: ${typeof ns}`);
    }
    if (typeof script != "string") {
        throw new Error(`script is not a string: ${script}`);
    }
    if (typeof threads != "number" && typeof threads != "undefined") {
        throw new Error(`threads is not a number or undefined: ${threads}`);
    }
    if (typeof target != "string" && typeof target != "undefined") {
        throw new Error(`target is not a string or undefined: ${target}`);
    }
    if (typeof delay != "number" && typeof delay != "undefined") {
        throw new Error(`delay is not a number or undefined: ${delay}`);
    }
    if (!Array.isArray(runners)) {
        throw new Error(`runners is not an array: ${runners}`);
    }
    for (var runner of runners) {
        if (threads > 0) {
            var serverAvailableRam = ns.getServerMaxRam(runner) - ns.getServerUsedRam(runner);
            if (runner == "home") {
                serverAvailableRam -= RAM_RESERVE;
            }
            var runnerThreads = Math.min(threads, getHowManyThreadsCanRun(ns, script, [runner]));
            if (runnerThreads > 0) {

                //ns.print("Starting ", script, " on ", runner, " with ", runnerThreads, " threads.");
                var pid = ns.exec(script, runner, runnerThreads, target, delay);
                if (pid == 0) {
                    ns.scp(script, runner, "home");
                    pid = ns.exec(script, runner, runnerThreads, target, delay);
                }
                threads -= runnerThreads;
            }
        } else {
            break;
        }
    }
    if (threads > 0) {
        ns.print("Not enough RAM. Could not run ", script, " with ", threads, " threads.");
    }
    return threads;
}

/**
 * @param {NS} ns 
 * @param {string} script 
 * @param {string[]} runners 
 * @returns {number}
 */
export function getHowManyThreadsCanRun(ns, script, runners = getRunners(ns)) {
    if (typeof ns != "object" || typeof ns.getServerMaxRam != "function") {
        throw new Error(`ns is not of type NS: ${typeof ns}`);
    }
    if (typeof script != "string") {
        throw new Error(`script is not a string: ${script}`);
    }
    if (!Array.isArray(runners)) {
        throw new Error(`runners is not an array: ${runners}`);
    }
    var threads = 0;
    runners.forEach((a) => {
        var serverAvailableRam = ns.getServerMaxRam(a) - ns.getServerUsedRam(a);
        if (a == "home") {
            serverAvailableRam -= RAM_RESERVE;
        }
        threads += Math.floor(serverAvailableRam / ns.getScriptRam(script, "home"));
    });
    return threads;
}