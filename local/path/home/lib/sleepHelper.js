import { getHowManyThreadsCanRun } from './execHelper.js';
import { getRunners } from './scanHelper.js';

const SCRIPT_SHARE = "/batch/shotgun/share.js";

/** @param {NS} ns 
 * @param {number} ms
*/
export async function wait(ns, ms, isSharingEnabled = true) {
    if (typeof ns != "object" || typeof ns.getServerMaxRam != "function") {
        throw new Error(`ns is not of type NS: ${typeof ns}`);
    }
    if (typeof ms != "number" || ms < 0) {
        throw new Error(`ms is not a valid number: ${ms}`);
    }

    if (ms > 10000 & isSharingEnabled) {
        var runners = getRunners(ns).filter((a) => ns.getServerMaxRam(a) - ns.getServerUsedRam(a) > 4);
        var times = Math.floor(ms / 10500);

        for (var i = 0; i < times; i++) {
            runners.forEach((runner) => {
                var threads = getHowManyThreadsCanRun(ns, SCRIPT_SHARE, [runner]); 
                if(threads > 0) {
                    var pid = ns.exec(SCRIPT_SHARE, runner, threads);
                    if (pid == 0) {
                        ns.scp(SCRIPT_SHARE, runner, "home");
                        pid = ns.exec(SCRIPT_SHARE, runner, threads);
                    }
                }
                
            });
            await ns.sleep(11000);
        }
        var remainingTime = ms % 10500;
        if (remainingTime > 0) {
            await ns.sleep(remainingTime);
        }
    } else {
        await ns.sleep(ms);
    }
}