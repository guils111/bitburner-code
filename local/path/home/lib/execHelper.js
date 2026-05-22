import { RAM_RESERVE } from './constants.js';
import { getRunnersServer } from './scanHelper.js';



/**
 * 
 * @param {NS} ns 
 * @param {string} script 
 * @param {number} [threads=1] 
 * @param {string} [target=""] 
 * @param {number} [delay=0] 
 * @param {import("@/NetscriptDefinitions.js").Server[]} [runners=getRunnersServer(ns)] 
 * @returns {import("@/NetscriptDefinitions.js").Server[]}
 */
export function execScript(ns, script, threads = 1, target = "", delay = 0, runners = getRunnersServer(ns), scriptRam = ns.getScriptRam(script)) {
    for (var runner of runners) {
        if (threads > 0) {
            var serverAvailableRam = runner.maxRam - runner.ramUsed;
            var runnerThreads = Math.min(threads, getHowManyThreadsCanRun(ns, script, [runner], scriptRam));
            if (runnerThreads > 0) {

                //ns.print("Starting ", script, " on ", runner, " with ", runnerThreads, " threads.");
                var pid = ns.exec(script, runner.hostname, runnerThreads, target, delay);
                runner.ramUsed += scriptRam * runnerThreads;
                if (pid == 0) {
                    ns.scp(script, runner.hostname, "home");
                    pid = ns.exec(script, runner.hostname, runnerThreads, target, delay);
                }
                threads -= runnerThreads;
                if (threads > 0) {
                    runners.shift();
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
    return runners;
}


/**
 * @param {NS} ns 
 * @param {string} script 
 * @param {import("@/NetscriptDefinitions.js").Server[]} runners 
 * @param {number} [scriptRam=ns.getScriptRam(script)] 
 * @returns {number}
 */
export function getHowManyThreadsCanRun(ns, script, runners = getRunnersServer(ns), scriptRam = ns.getScriptRam(script)) {
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