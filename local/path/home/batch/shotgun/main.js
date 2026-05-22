
const HACK_PERCENT = 0.2;
const DELAY_BUFFER = 0;
const WEAKEN_SCRIPT = "/batch/shotgun/weaken.js";
const GROW_SCRIPT = "/batch/shotgun/grow.js";
const HACK_SCRIPT = "/batch/shotgun/hack.js";
const NUKE_SCRIPT = "/batch/shotgun/nuke.js";
const PURCHASE_SERVER_SCRIPT = "/batch/shotgun/purchaseServer.js"
const DELAY = 300;
//test

var runners = []
/** @param {NS} ns */
export async function main(ns) {
    ns.clearLog();
    ns.disableLog("ALL");

    ns.print("Starting.");

    if (!ns.scriptRunning(NUKE_SCRIPT)) {
        ns.exec(NUKE_SCRIPT, "home");
    }
    if (!ns.scriptRunning(PURCHASE_SERVER_SCRIPT)) {
        ns.exec(PURCHASE_SERVER_SCRIPT, "home");
    }
    runners = getRunners(ns);
    var target = "n00dles"
    await prepareServer(ns, target);
    while (true) {
        var runTime = Math.max(ns.getHackTime(target), ns.getGrowTime(target), ns.getWeakenTime(target));
        runners = getRunners(ns);

        var threadsAvailable = getHowManyThreadsCanRun(ns);
        ns.print(`There are ${threadsAvailable} threads available.`);
        var threadsPerBatch = calculateBatchThreads(ns, target);
        ns.print(`Each batch requires ${threadsPerBatch} threads.`)

        var batchesToStart = Math.min(40000, Math.floor(threadsAvailable / threadsPerBatch));
        ns.print(`Can start ${Math.floor(threadsAvailable / threadsPerBatch)} batches right now. Will start ${batchesToStart}`);
        for (let i = 0; i < batchesToStart; i++) {
            batch(ns, target);
        }
        await ns.sleep(runTime);
    }
}
/** @param {NS} ns */
function batch(ns, target) {
    var runTime = Math.max(ns.getHackTime(target), ns.getGrowTime(target), ns.getWeakenTime(target));
    hack(ns, target, runTime);
    weakenAfterHack(ns, target, runTime);
    grow(ns, target, runTime);
    weakenAfterGrow(ns, target, runTime);
}

/** @param {NS} ns */
function calculateBatchThreads(ns, target) {
    var hackThreads = calculateHackThreads(ns, target);
    var growThreads = calculateGrowThreads(ns, target);
    var hackSecIncrease = ns.hackAnalyzeSecurity(hackThreads, target);
    var growSecIncrease = ns.growthAnalyzeSecurity(growThreads);
    var weakenAfterHackthreads = calculateWeakenThreads(ns, hackSecIncrease);
    var weakenAfterGrowThreads = calculateWeakenThreads(ns, growSecIncrease);
    return hackThreads + weakenAfterHackthreads + growThreads + weakenAfterGrowThreads;
}

function getHowManyThreadsCanRun(ns) {
    var threads = 0;
    runners.forEach((a) => threads += Math.floor((ns.getServerMaxRam(a) - ns.getServerUsedRam(a)) / 1.75));
    return threads;
}

/** @param {NS} ns */
function hack(ns, target, runTime) {
    var threads = calculateHackThreads(ns, target);
    var delay = runTime - ns.getHackTime(target);
    execScript(ns, HACK_SCRIPT, threads, target, delay);

}

/** @param {NS} ns */
function calculateHackThreads(ns, target) {
    var threadEffect = ns.hackAnalyze(target);
    var threads = Math.ceil(HACK_PERCENT / threadEffect);
    //threads = Math.ceil(threads / ns.hackAnalyzeChance(target));
    return threads;
}

/** @param {NS} ns */
function grow(ns, target, runTime) {
    var threads = calculateGrowThreads(ns, target);
    var delay = runTime - ns.getGrowTime(target);
    execScript(ns, GROW_SCRIPT, threads, target, delay);
}

/** @param {NS} ns */
function calculateGrowThreads(ns, target) {
    var hackPercent = ns.hackAnalyze(target) * calculateHackThreads(ns, target);
    var multi = ns.getServerMaxMoney(target) / (ns.getServerMaxMoney(target) - ns.getServerMaxMoney(target) * hackPercent);
    return Math.ceil(ns.growthAnalyze(target, multi));
}

/** @param {NS} ns */
function weakenAfterHack(ns, target, runTime) {
    var hackSecIncrease = ns.hackAnalyzeSecurity(calculateHackThreads(ns, target), target);
    weaken(ns, target, hackSecIncrease, runTime);
}

/** @param {NS} ns */
function weakenAfterGrow(ns, target, runTime) {
    var growSecIncrease = ns.growthAnalyzeSecurity(calculateGrowThreads(ns, target));
    weaken(ns, target, growSecIncrease, runTime);
}
/** @param {NS} ns */
function weaken(ns, target, amount, runTime) {
    var threads = calculateWeakenThreads(ns, amount);
    var delay = runTime - ns.getWeakenTime(target);
    execScript(ns, WEAKEN_SCRIPT, threads, target, delay);
}

/** @param {NS} ns */
function calculateWeakenThreads(ns, amount) {
    return Math.ceil(amount / ns.weakenAnalyze(1));
}

/** @param {NS} ns */
function getRunners(ns) {
    var runners = [];
    runners.push("home");
    for (var server of deepScan(ns, "home")) {
        if (ns.hasRootAccess(server)) {
            runners.push(server);
        }
    }
    //ns.print(`Runners: ${ runners } `);
    return runners.sort((a, b) => (ns.getServerMaxRam(b)-ns.getServerUsedRam(b))-(ns.getServerMaxRam(b)-ns.getServerUsedRam(b)));
}

/** @param {NS} ns */
function execScript(ns, script, threads, target, delay) {
    for (var runner of runners) {

        if (threads > 0) {
            var serverAvailableRam = ns.getServerMaxRam(runner) - ns.getServerUsedRam(runner);
            if (runner == "home") {
                serverAvailableRam -= 16;
            }
            var runnerThreads = Math.min(Math.floor((serverAvailableRam) / ns.getScriptRam(script, "home")), threads);
            if (runnerThreads > 0) {
                ns.scp(script, runner, "home");
                //ns.print("Starting ", script, " on ", runner, " with ", runnerThreads, " threads.");
                var pid = ns.exec(script, runner, runnerThreads, target, delay);
                threads -= runnerThreads;
            }
        } else {
            break;
        }
    }
    if (threads > 0) {
        ns.print("Not enough RAM.");
    }
    return threads;
}
/** @param {NS} ns */
async function prepareServer(ns, target) {
    ns.print("Prepare server.");
    if (ns.getServerSecurityLevel(target) > ns.getServerMinSecurityLevel(target) || ns.getServerMoneyAvailable(target) < ns.getServerMaxMoney(target)) {
        var amountToReduce = ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target);
        var weakenThreads = calculateWeakenThreads(ns, amountToReduce);
        var runTime = Math.max(ns.getGrowTime(target), ns.getWeakenTime(target));
        var weakenFinishTime = 0;
        while (weakenThreads > 0) {
            ns.print(`Weaken Threads ${weakenThreads}`);
            var threadsAvailable = getHowManyThreadsCanRun(ns);
            var maxThreadsToRun = Math.min(Math.floor(threadsAvailable), weakenThreads);
            execScript(ns, WEAKEN_SCRIPT, maxThreadsToRun, target, 0);
            weakenThreads -= maxThreadsToRun;
            await ns.sleep(1000);
            weakenFinishTime = Date.now() + ns.getWeakenTime(target);
        }
        var amountToGrow = ns.getServerMaxMoney(target) / ns.getServerMoneyAvailable(target);
        var growThreads = Math.ceil(ns.growthAnalyze(target, amountToGrow))
        while (growThreads > 0) {
            var threadsAvailable = getHowManyThreadsCanRun(ns);
            var maxThreadsToRun = Math.min(Math.floor(threadsAvailable / 10), growThreads);
            var secIncrease = ns.growthAnalyzeSecurity(maxThreadsToRun, target);
            weakenThreads = calculateWeakenThreads(ns, secIncrease);
            var delay = Math.max((weakenFinishTime - Date.now()), runTime);
            execScript(ns, GROW_SCRIPT, maxThreadsToRun, target, delay - ns.getGrowTime(target));
            execScript(ns, WEAKEN_SCRIPT, weakenThreads, target, delay - ns.getWeakenTime(target));
            growThreads -= maxThreadsToRun;
            await ns.sleep(1000);
        }
        while ((ns.getServerMaxMoney(target) / ns.getServerMoneyAvailable(target)) > 1 || (ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target)) > 0) {
            ns.print(`Waiting for grow to finish. Grow: ${(ns.getServerMaxMoney(target) / ns.getServerMoneyAvailable(target)) > 1} Weaken: ${(ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target)) > 0}`);
            await ns.sleep(runTime);
        }
    }
    ns.print("Prepare server end");
}

/** @param {NS} ns */
function deepScan(ns, root) {
    var neighbors = ns.scan(root);
    if (root != "home") {
        neighbors.shift();
    }
    var result = neighbors;
    for (var server of neighbors) {
        result = result.concat(deepScan(ns, server));
    }
    return result;
}
/** @param {NS} ns */
function findBestTarget(ns) {
    var targets = deepScan(ns, "home")
        .filter((a) => ns.hasRootAccess(a))
        .filter((a) => ns.getServerMaxMoney(a) > 0)
        .filter((a) => ns.getWeakenTime(a) < 60000)
        .sort((a, b) => ns.getServerMaxMoney(b) - ns.getServerMaxMoney(a));

    return targets[0];

}