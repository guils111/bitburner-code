import { getRunners, getRunnersServer } from "./scanHelper";

/**
 * 
 * @param {NS} ns 
 * @param {import("@/NetscriptDefinitions").Server} target 
 * @param {import("@/NetscriptDefinitions").Person} player
 * @param {number} threads
 * @returns {{ server: import("@/NetscriptDefinitions").Server, player: import("@/NetscriptDefinitions").Person }}
 */
export function simulateHack(ns, target, player, threads = 1) {
    if (!Number.isInteger(threads)) {
        throw new Error(`Threads must be an integer: ${threads}`);
    }
    const hackPercent = ns.formulas.hacking.hackPercent(target, player) * threads;
    const hackChance = ns.formulas.hacking.hackChance(target, player);
    const moneyStolen = (target.moneyAvailable ?? 0) * hackPercent * hackChance;
    const securityIncrease = ns.hackAnalyzeSecurity(threads);
    const hackExp = (ns.formulas.hacking.hackExp(target, player) * threads * hackChance) + (ns.formulas.hacking.hackExp(target, player) * threads * (1 - hackChance) * 0.25);
    target.moneyAvailable = (target.moneyAvailable ?? 0) - moneyStolen;
    target.hackDifficulty = (target.hackDifficulty ?? 0) + securityIncrease;
    player = addHackingExp(ns, player, hackExp);
    return { server: target, player };
}
/**
 * @param {NS} ns 
 * @param {import("@/NetscriptDefinitions").Server} target 
 * @param {import("@/NetscriptDefinitions").Person} player
 * @param {number} [threads=1]
 * @param {number} [cores=1] 
 * @returns {{ server: import("@/NetscriptDefinitions").Server, player: import("@/NetscriptDefinitions").Person }}
 */
export function simulateGrow(ns, target, player, threads = 1, cores = 1) {
    const money = ns.formulas.hacking.growAmount(target, player, threads, cores);
    const secIncrease = ns.growthAnalyzeSecurity(threads, undefined, cores);
    const exp = ns.formulas.hacking.hackExp(target, player) * threads;
    target.moneyAvailable = money;
    target.hackDifficulty = (target.hackDifficulty ?? 0) + secIncrease
    player = addHackingExp(ns, player, exp);
    return { server: target, player };
}

/**
 * @param {NS} ns 
 * @param {import("@/NetscriptDefinitions").Server} target 
 * @param {import("@/NetscriptDefinitions").Person} player
 * @param {number} [threads=1]
 * @param {number} [cores=1] 
 * @returns {{ server: import("@/NetscriptDefinitions").Server, player: import("@/NetscriptDefinitions").Person }}
 */
export function simulateWeaken(ns, target, player, threads = 1, cores = 1) {
    const secDecrease = ns.formulas.hacking.weakenEffect(threads, cores);
    const exp = ns.formulas.hacking.hackExp(target, player) * threads;
    target.hackDifficulty = Math.max((target.hackDifficulty ?? 0) - secDecrease, (target.minDifficulty ?? 1));
    player = addHackingExp(ns, player, exp);
    return { server: target, player };
}
/**
 * 
 * @param {NS} ns 
 * @param {import("@/NetscriptDefinitions").Server} target 
 * @param {import("@/NetscriptDefinitions").Person} player 
 * @param {number} percent 
 */
export function calculateHackThreads(ns, target, player, percent) {
    let threads = Math.ceil(percent / ns.formulas.hacking.hackPercent(target, player));
    return threads;
}

/**
 * 
 * @param {NS} ns 
 * @param {import("@/NetscriptDefinitions").Server} target 
 * @param {import("@/NetscriptDefinitions").Person} player 
 * @param {number} targetValue 
 * @param {number} [cores=1] 
 * @returns {number}
 */
export function calculateGrowThreads(ns, target, player, targetValue, cores = 1) {
    let threads = ns.formulas.hacking.growThreads(target, player, targetValue, cores);
    return threads;
}

/**
 * 
 * @param {NS} ns 
 * @param {import("@/NetscriptDefinitions").Server} target 
 * @param {number} cores 
 * @returns {number}
 */
export function calculateWeakenThreads(ns, target, cores = 1) {
    let secToDecrease = (target.hackDifficulty ?? 0) - (target.minDifficulty ?? 0);
    let threads = Math.ceil(secToDecrease / ns.formulas.hacking.weakenEffect(1, cores));
    return threads;
}

/**
 * 
 * @param {NS} ns 
 * @param {import("@/NetscriptDefinitions").Server} target 
 * @param {import("@/NetscriptDefinitions").Person} player 
 * @param {number} hackThreads 
 * @param {number} cores 
 * @returns {{ 
 * server: import("@/NetscriptDefinitions").Server, 
 * player: import("@/NetscriptDefinitions").Person, 
 * moneyStolen: number, 
 * hackThreads: number,
 * weakenHackThreads: number, 
 * growThreads: number, 
 * weakenGrowThreads: number, 
 * expGained: number }}
 */
export function simulateBatch(ns, target, player, hackThreads, cores = 1) {

    const startingMoney = target.moneyAvailable ?? 0;
    const startingExp = player.exp.hacking;

    //calculate based on a single hack thread
    let workResult = simulateHack(ns, target, player, hackThreads);

    const moneyStolen = startingMoney - (workResult.server.moneyAvailable ?? 0);

    const weakenHackThreads = calculateWeakenThreads(ns, workResult.server);
    workResult = simulateWeaken(ns, workResult.server, workResult.player, weakenHackThreads, cores);
    const growThreads = calculateGrowThreads(ns, workResult.server, workResult.player, workResult.server.moneyMax ?? 0, cores);
    workResult = simulateGrow(ns, workResult.server, workResult.player, growThreads, cores);
    const weakenGrowThreads = calculateWeakenThreads(ns, workResult.server, cores);
    workResult = simulateWeaken(ns, workResult.server, workResult.player, weakenGrowThreads, cores);

    const expGained = workResult.player.exp.hacking - startingExp;

    return {
        server: workResult.server,
        player: workResult.player,
        moneyStolen: moneyStolen,
        hackThreads: hackThreads,
        weakenHackThreads: weakenHackThreads,
        growThreads: growThreads,
        weakenGrowThreads: weakenGrowThreads,
        expGained: expGained
    };
}

/**
 * 
 * @param {NS} ns 
 * @param {import("@/NetscriptDefinitions").Server} target 
 * @param {import("@/NetscriptDefinitions").Person} player 
 * @param {string} hackScript 
 * @param {string} weakenScript 
 * @param {string} growScript 
 * @returns {{ 
 * server: import("@/NetscriptDefinitions").Server, 
 * player: import("@/NetscriptDefinitions").Person, 
 * moneyStolen: number, 
 * hackThreads: number,
 * weakenHackThreads: number,
 * growThreads: number, 
 * weakenGrowThreads: number, 
 * expGained: number 
 * }[]}
 */
export function simulateMegaBatch(ns, target, player, hackScript, weakenScript, growScript) {
    /**
     * @type {{ server: import("@/NetscriptDefinitions").Server, 
     *          player: import("@/NetscriptDefinitions").Person, 
     *          moneyStolen: number, 
     *          hackThreads: number,
     *          weakenHackThreads: number, 
     *          growThreads: number, 
     *          weakenGrowThreads: number, 
     *          expGained: number }[]}
     */
    const result = []

    const startingHackingSkill = player.skills.hacking;
    let weakenTime = ns.getWeakenTime(target.hostname);
    const runners = getRunnersServer(ns);
    let hackThreads = getBestBatchSize(ns, target, player, runners, hackScript, weakenScript, growScript);

    for (let i = 0; i < weakenTime / 4; i++) {
        let previousBatchResult = result.length > 0 ? result[i - 1] : { server: target, player: player };
        result.push(simulateBatch(ns, previousBatchResult.server, previousBatchResult.player, hackThreads))

        if (previousBatchResult.player.skills.hacking > startingHackingSkill) {
            hackThreads = getBestBatchSize(ns, previousBatchResult.server, previousBatchResult.player, runners, hackScript, weakenScript, growScript);
            weakenTime = ns.getWeakenTime(target.hostname);
        }
    }
    if (result.length < 1) {
        throw new Error(`Could not simulate batches. Array size is zero.`);
    }
    return result;
}

/**
 * 
 * @param {NS} ns 
 * @param {import("@/NetscriptDefinitions").Server} target 
 * @param {import("@/NetscriptDefinitions").Person} player 
 * @param {import("@/NetscriptDefinitions").Server[]} runners
 * @param {string} hackScript 
 * @param {string} weakenScript
 * @param {string} growScript
 * @param {number} cores 
 * @returns {number} ideal number of hack threads to maximize money per thread
 */
export function getBestBatchSize(ns, target, player, runners, hackScript, weakenScript, growScript, cores = 1) {
    let simulatedTarget = target;
    let simulatedPlayer = player;
    let hackThreads = 0;
    let bestThreads = 0;
    let bestMoneyPThread = 0;
    while ((simulatedTarget.moneyAvailable ?? 0) > 0) {
        hackThreads++;
        simulatedPlayer = player;
        simulatedTarget = target;
        const batchResult = simulateBatch(ns, simulatedTarget, simulatedPlayer, hackThreads, cores);

        if (!canBatchRun(ns, hackThreads, batchResult.weakenHackThreads, batchResult.growThreads, batchResult.weakenGrowThreads, hackScript, weakenScript, growScript, runners)) {
            break;
        }

        const totalThreads = hackThreads + batchResult.growThreads + batchResult.weakenGrowThreads + batchResult.weakenHackThreads;
        const moneyPThread = batchResult.moneyStolen / totalThreads;
        if (moneyPThread > bestMoneyPThread) {
            bestMoneyPThread = moneyPThread;
            bestThreads = hackThreads;
        }
    }
    return bestThreads;
}

/**
 * 
 * @param {NS} ns 
 * @param {number} hackThreads 
 * @param {number} weakenHackThreads 
 * @param {number} growThreads 
 * @param {number} weakenGrowThreads 
 * @param {string} hackScript 
 * @param {string} weakenScript 
 * @param {string} growScript 
 * @param {import("@/NetscriptDefinitions").Server[]} runners 
 * @returns {boolean}
 */
export function canBatchRun(ns, hackThreads, weakenHackThreads, growThreads, weakenGrowThreads, hackScript, weakenScript, growScript, runners) {
    for (let runner of runners) {

        let canRunHack, canRunWeakenHack, canRunGrow, canRunWeakenGrow = false;

        if (!canRunHack && runner.maxRam - runner.ramUsed >= hackThreads * ns.getScriptRam(hackScript)) {
            runner.ramUsed += hackThreads * ns.getScriptRam(hackScript, "home");
            canRunHack = true;
        }
        if (!canRunWeakenHack && runner.maxRam - runner.ramUsed >= weakenHackThreads * ns.getScriptRam(weakenScript)) {
            runner.ramUsed += weakenHackThreads * ns.getScriptRam(weakenScript, "home");
            canRunWeakenHack = true;
        }
        if (!canRunGrow && runner.maxRam - runner.ramUsed >= growThreads * ns.getScriptRam(growScript)) {
            runner.ramUsed += growThreads * ns.getScriptRam(weakenScript, "home");
            canRunGrow = true;
        }
        if (!canRunWeakenGrow && runner.maxRam - runner.ramUsed >= weakenGrowThreads * ns.getScriptRam(weakenScript)) {
            runner.ramUsed += weakenGrowThreads * ns.getScriptRam(weakenScript, "home");
            canRunWeakenGrow = true;
        }

        if (canRunHack && canRunWeakenHack && canRunGrow && canRunWeakenGrow) {
            return true;
        }

    }
    return false;
}

/**
 * 
 * @param {NS} ns 
 * @param {string} target 
 * @returns {boolean}
 */
export function isServerPrepared(ns, target) {
    return (ns.getServerMaxMoney(target) == ns.getServerMoneyAvailable(target) && ns.getServerSecurityLevel(target) <= ns.getServerMinSecurityLevel(target) + 0.01);
}

/**
 * 
 * @param {NS} ns 
 * @param {import("@/NetscriptDefinitions").Person} player 
 * @param {number} exp 
 * @returns {import("@/NetscriptDefinitions").Person}
 */
function addHackingExp(ns, player, exp) {
    player.exp.hacking += exp;
    player.skills.hacking = ns.formulas.skills.calculateSkill(player.exp.hacking, player.mults.hacking);
    return player;
}

