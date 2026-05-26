import { MAX_BATCHS } from "./constants";
import { getHowManyThreadsCanRunNoSplitting } from "./execHelper";
import { deepScan, getRunners, getTotalAvailableRam } from "./scanHelper";

/**
 * 
 * @param {NS} ns 
 * @param {import("@/NetscriptDefinitions").Person} player 
 * @returns {import("@/NetscriptDefinitions").Person}
 */
export function clonePlayer(ns, player) {
    const mockPlayer = ns.formulas.mockPlayer();
    mockPlayer.skills.hacking = player.skills.hacking;
    mockPlayer.skills.intelligence = player.skills.intelligence;
    mockPlayer.mults = player.mults;
    mockPlayer.exp.hacking = player.exp.hacking;

    return mockPlayer;
}
/**
 * 
 * @param {NS} ns 
 * @param {import("@/NetscriptDefinitions").Server} server 
 * @returns {import("@/NetscriptDefinitions").Server}
 */
export function cloneServer(ns, server) {
    const mockServer = ns.formulas.mockServer();
    mockServer.hostname = server.hostname;
    mockServer.hackDifficulty = server.hackDifficulty;
    mockServer.minDifficulty = server.minDifficulty;
    mockServer.baseDifficulty = server.baseDifficulty;
    mockServer.moneyAvailable = server.moneyAvailable;
    mockServer.moneyMax = server.moneyMax;
    mockServer.requiredHackingSkill = server.requiredHackingSkill;
    mockServer.serverGrowth = server.serverGrowth;
    mockServer.hasAdminRights = server.hasAdminRights;
    return mockServer;
}

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
    const simulatedTarget = cloneServer(ns, target);
    const simulatedPlayer = clonePlayer(ns, player);
    const hackPercent = ns.formulas.hacking.hackPercent(simulatedTarget, simulatedPlayer) * threads;
    const hackChance = ns.formulas.hacking.hackChance(simulatedTarget, simulatedPlayer);
    const moneyStolen = (simulatedTarget.moneyAvailable ?? 0) * hackPercent * hackChance;
    const securityIncrease = ns.hackAnalyzeSecurity(threads);
    const hackExp = (ns.formulas.hacking.hackExp(simulatedTarget, simulatedPlayer) * threads * hackChance) + (ns.formulas.hacking.hackExp(simulatedTarget, simulatedPlayer) * threads * (1 - hackChance) * 0.25);
    simulatedTarget.moneyAvailable = (simulatedTarget.moneyAvailable ?? 0) - moneyStolen;
    simulatedTarget.hackDifficulty = (simulatedTarget.hackDifficulty ?? 0) + securityIncrease;
    ({ expHacking: simulatedPlayer.exp.hacking, skillsHacking: simulatedPlayer.skills.hacking } = addHackingExp(ns, simulatedPlayer, hackExp));
    return { server: simulatedTarget, player: simulatedPlayer };
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
    const simulatedTarget = cloneServer(ns, target);
    const simulatedPlayer = clonePlayer(ns, player);
    const money = ns.formulas.hacking.growAmount(simulatedTarget, simulatedPlayer, threads, cores);
    const secIncrease = ns.growthAnalyzeSecurity(threads, undefined, cores);
    const exp = ns.formulas.hacking.hackExp(simulatedTarget, simulatedPlayer) * threads;

    simulatedTarget.moneyAvailable = money;
    simulatedTarget.hackDifficulty = (simulatedTarget.hackDifficulty ?? 0) + secIncrease;
    ({ expHacking: simulatedPlayer.exp.hacking, skillsHacking: simulatedPlayer.skills.hacking } = addHackingExp(ns, simulatedPlayer, exp));
    return { server: simulatedTarget, player: simulatedPlayer };
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
    const simulatedTarget = cloneServer(ns, target);
    const simulatedPlayer = clonePlayer(ns, player);
    const secDecrease = ns.formulas.hacking.weakenEffect(threads, cores);
    const exp = ns.formulas.hacking.hackExp(simulatedTarget, simulatedPlayer) * threads;
    simulatedTarget.hackDifficulty = Math.max((simulatedTarget.hackDifficulty ?? 0) - secDecrease, (simulatedTarget.minDifficulty ?? 1));
    ({ expHacking: simulatedPlayer.exp.hacking, skillsHacking: simulatedPlayer.skills.hacking } = addHackingExp(ns, simulatedPlayer, exp));
    return { server: simulatedTarget, player: simulatedPlayer };
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
 * expGained: number,
 * weakenTime: number }}
 */
export function simulateBatch(ns, target, player, hackThreads, cores = 1) {

    const startingMoney = target.moneyAvailable ?? 0;
    const startingExp = player.exp.hacking;
    const weakenTime = ns.formulas.hacking.weakenTime(target, player);
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
        expGained: expGained,
        weakenTime: weakenTime
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
 * expGained: number,
 * weakenTime: number
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
     *          expGained: number,
     *          weakenTime: number }[]}
     */
    const result = []

    let prevHackingSkill = player.skills.hacking;
    let weakenTime = ns.getWeakenTime(target.hostname);
    let hackThreads = getBestBatchSize(ns, target, player, hackScript, weakenScript, growScript);
    let previousBatchResult = simulateBatch(ns, target, player, hackThreads);
    const batchThreads = previousBatchResult.hackThreads + previousBatchResult.weakenHackThreads + previousBatchResult.growThreads + previousBatchResult.weakenGrowThreads;
    const maxBatches = Math.min(weakenTime / 4, getTotalAvailableRam(ns) / (batchThreads * ns.getScriptRam(weakenScript)));
    //const maxBatches = MAX_BATCHS;

    for (let i = 0; i < maxBatches - 1; i++) {

        if (previousBatchResult.player.skills.hacking > prevHackingSkill) {
            hackThreads = getBestBatchSize(ns, previousBatchResult.server, previousBatchResult.player, hackScript, weakenScript, growScript);
            previousBatchResult = simulateBatch(ns, previousBatchResult.server, previousBatchResult.player, hackThreads);
            prevHackingSkill = previousBatchResult.player.skills.hacking;
        } else {
            ({ expHacking: previousBatchResult.player.exp.hacking, skillsHacking: previousBatchResult.player.skills.hacking } = addHackingExp(ns, previousBatchResult.player, previousBatchResult.expGained));
        }
        result.push(previousBatchResult);
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
 * @param {string} hackScript 
 * @param {string} weakenScript
 * @param {string} growScript
 * @param {number} cores 
 * @returns {number} ideal number of hack threads to maximize money per thread
 */
export function getBestBatchSize(ns, target, player, hackScript, weakenScript, growScript, cores = 1) {
    let simulatedTarget = cloneServer(ns, target);
    let simulatedPlayer = clonePlayer(ns, player);
    let percentStolen = 0.05;
    let bestThreads = 0;
    let bestMoneyPThread = 0;
    while ((simulatedTarget.moneyAvailable ?? 0) > 0 && percentStolen <= 1) {
        simulatedTarget = cloneServer(ns, target);
        simulatedPlayer = clonePlayer(ns, player);
        const hackThreads = calculateHackThreads(ns, simulatedTarget, simulatedPlayer, percentStolen);
        const batchResult = simulateBatch(ns, simulatedTarget, simulatedPlayer, hackThreads, cores);
        simulatedTarget = batchResult.server;
        simulatedPlayer = batchResult.player;

        if (!canBatchRun(ns, hackThreads, batchResult.weakenHackThreads, batchResult.growThreads, batchResult.weakenGrowThreads, hackScript, weakenScript, growScript)) {
            break;
        }

        const totalThreads = hackThreads + batchResult.growThreads + batchResult.weakenGrowThreads + batchResult.weakenHackThreads;
        const moneyPThread = batchResult.moneyStolen / totalThreads;
        if (moneyPThread > bestMoneyPThread) {
            bestMoneyPThread = moneyPThread;
            bestThreads = hackThreads;
        }
        percentStolen += 0.05;
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
 * @returns {boolean}
 */
export function canBatchRun(ns, hackThreads, weakenHackThreads, growThreads, weakenGrowThreads, hackScript, weakenScript, growScript) {
    const runners = getRunners(ns);
    for (let r of runners) {
        const runner = ns.getServer(r);
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
 * @param {string|import("@/NetscriptDefinitions").Server} target 
 * @returns {boolean}
 */
export function isServerPrepared(ns, target) {
    if (typeof target == "string") {
        target = ns.getServer(target);
    }
    return (target.hackDifficulty ?? 0) <= (target.minDifficulty ?? 0) + 0.0001 && (target.moneyAvailable ?? 0) >= (target.moneyMax ?? 0);
}

/**
 * 
 * @param {NS} ns 
 * @param {import("@/NetscriptDefinitions").Server} target 
 * @param {import("@/NetscriptDefinitions").Person} player 
 * @param {string} weakenScript 
 * @param {string} growScript 
 * @returns {{
     * server: import("@/NetscriptDefinitions").Server,
     * runTime: number
     * }}
 */
export function simulatePrepServer(ns, target, player, weakenScript, growScript) {
    let simulatedTarget = cloneServer(ns, target);
    let simulatedPlayer = clonePlayer(ns, player);
    let runTime = 0;

    while (!isServerPrepared(ns, simulatedTarget)) {

        runTime += ns.formulas.hacking.weakenTime(simulatedTarget, simulatedPlayer);
        const threads = calculatePrepThreads(ns, simulatedTarget, simulatedPlayer, weakenScript, growScript);
        if (threads.growThreads === 0 && threads.weakenThreads === 0) {
            runTime = Number.POSITIVE_INFINITY;
            break;
        }
        ({ server: simulatedTarget, player: simulatedPlayer } = simulateWeaken(ns, simulatedTarget, simulatedPlayer, threads.weakenThreads));
        ({ server: simulatedTarget, player: simulatedPlayer } = simulateGrow(ns, simulatedTarget, simulatedPlayer, threads.growThreads));
        ({ server: simulatedTarget, player: simulatedPlayer } = simulateWeaken(ns, simulatedTarget, simulatedPlayer, threads.weakenGrowThreads));


    }
    if (!isServerPrepared(ns, simulatedTarget)) {
        ns.print(`WARN - Prep simulation failed on ${simulatedTarget.hostname}. Server is not prepared at the end of the simulation.`);
    }

    return { server: simulatedTarget, runTime: runTime };
}
/**
 * 
 * @param {NS} ns 
 * @param {import("@/NetscriptDefinitions").Server} target 
 * @param {import("@/NetscriptDefinitions").Person} player 
 * @param {string} weakenScript 
 * @param {string} growScript 
 * @returns {{
     * weakenThreads: number,
     * growThreads: number,
     * weakenGrowThreads: number
     * }}
 */
export function calculatePrepThreads(ns, target, player, weakenScript, growScript) {
    let weakenThreads, growThreads, weakenGrowThreads = 0;
    let threadCapacity = getHowManyThreadsCanRunNoSplitting(ns, weakenScript);


    weakenThreads = Math.min(calculateWeakenThreads(ns, target), threadCapacity.shift() ?? 0);
    growThreads = Math.min(growThreads = calculateGrowThreads(ns, target, player, target.moneyMax ?? 0), threadCapacity.shift() ?? 0);
    let growResult = simulateGrow(ns, target, player, growThreads);
    weakenGrowThreads = Math.min(calculateWeakenThreads(ns, growResult.server), threadCapacity.shift() ?? 0);
    growThreads = Math.min(growThreads, Math.floor(weakenGrowThreads * 12.5));

    return { weakenThreads: weakenThreads, growThreads: growThreads, weakenGrowThreads: weakenGrowThreads };
}


/** 
 * @param {NS} ns 
 * @param {string} hackScript 
 * @param {string} growScript 
 * @param {string} weakenScript 
 * @param {string[]} [possibleTargets=getAllHackTargets(ns)] 
 * @return {import("@/NetscriptDefinitions").Server} the best target server
 */
export function findBestPrepedTarget(ns, hackScript, growScript, weakenScript, possibleTargets = getAllHackTargets(ns)) {
    return getHackTargetsInfo(ns, hackScript, growScript, weakenScript, possibleTargets)
        .filter((t) => isServerPrepared(ns, t.target.hostname))
        .sort((a, b) => b.moneyPSecond - a.moneyPSecond)[0]?.target;
}

/** 
 * @param {NS} ns 
 * @param {string} hackScript 
 * @param {string} growScript 
 * @param {string} weakenScript 
 * @param {string[]} [possibleTargets=getAllHackTargets(ns)] 
 * @return {import("@/NetscriptDefinitions").Server} the best target server
 */
export function findBestUnprepedTarget(ns, hackScript, growScript, weakenScript, possibleTargets = getAllHackTargets(ns)) {
    const targetsInfo = getHackTargetsInfo(ns, hackScript, growScript, weakenScript, possibleTargets).sort((a, b) => b.moneyPSecond - a.moneyPSecond);
    //const prepedTargets = targetsInfo.filter((t) => isServerPrepared(ns, t.target.hostname));
    const unprepedTargets = targetsInfo.filter((t) => !isServerPrepared(ns, t.target.hostname));
    //const bestUnpreped = unprepedTargets.filter((t) => t.moneyPSecond > (prepedTargets[0]?.moneyPSecond ?? 0))[0];
    //if (!bestUnpreped || prepedTargets.length <= 0) {
    unprepedTargets.sort((a, b) => a.prepTime - b.prepTime);
    //  ns.print(`WARN - Could not find any unprepped target that is better than the best prepped target. Returning the unprepped target with the quickest prep time: ${unprepedTargets[0]?.target.hostname}`);
    return unprepedTargets[0]?.target;
    //}
    //return bestUnpreped.target;
}

/** 
 * @param {NS} ns 
 * @param {string} hackScript 
 * @param {string} growScript 
 * @param {string} weakenScript 
 * @param {string[]} [possibleTargets=getAllHackTargets(ns)] 
 * @return {{
 * target: import("@/NetscriptDefinitions").Server,
 * moneyPSecond: number,
 * expPSecond: number,
 * prepTime: number,
 * maxBatches: number
 * }[]}
 */
export function getHackTargetsInfo(ns, hackScript, growScript, weakenScript, possibleTargets = getAllHackTargets(ns)) {

    const runners = getRunners(ns);

    /**
     * @type {{
   * target: import("@/NetscriptDefinitions").Server,
   * moneyPSecond: number,
   * expPSecond: number,
   * prepTime: number,
   * maxBatches: number
   * }[]}
     */
    const result = [];
    const player = ns.getPlayer();
    possibleTargets.forEach((targetName) => {
        let targetServer = ns.getServer(targetName);

        const prepResult = simulatePrepServer(ns, targetServer, player, weakenScript, growScript);
        targetServer = prepResult.server;
        const hackThreads = getBestBatchSize(ns, targetServer, player, hackScript, weakenScript, growScript);
        const weakenTime = ns.formulas.hacking.weakenTime(targetServer, player);
        const batchResult = simulateBatch(ns, targetServer, player, hackThreads);
        const batchThreads = batchResult.hackThreads + batchResult.weakenHackThreads + batchResult.growThreads + batchResult.weakenGrowThreads;
        const maxBatches = Math.min(weakenTime / 4, getTotalAvailableRam(ns, runners) / (batchThreads * ns.getScriptRam(weakenScript)));
        const moneyStolen = batchResult.moneyStolen * maxBatches;
        const expGained = batchResult.expGained * maxBatches;
        const moneyPSecond = (moneyStolen / (ns.getWeakenTime(targetServer.hostname) / 1000));
        const expPSecond = (expGained / (ns.getWeakenTime(targetServer.hostname) / 1000));
        result.push({ target: targetServer, moneyPSecond: moneyPSecond, expPSecond: expPSecond, prepTime: prepResult.runTime, maxBatches: maxBatches });


    });


    return result;
}

/**
 * 
 * @param {NS} ns
 * @returns {string[]} 
 */
export function getAllHackTargets(ns) {
    return deepScan(ns).filter((target) => {
        return !target.includes("hacknet") &&
            !ns.dnet.isDarknetServer(target) &&
            ns.hasRootAccess(target) &&
            ns.getServerMaxMoney(target) > 0;
    });
}

/**
 * 
 * @param {NS} ns 
 * @param {import("@/NetscriptDefinitions").Person} player 
 * @param {number} exp 
 * @returns {{ expHacking: number, skillsHacking: number }}
 */
function addHackingExp(ns, player, exp) {
    const simulatedPlayer = clonePlayer(ns, player);
    simulatedPlayer.exp.hacking += exp;
    simulatedPlayer.skills.hacking = ns.formulas.skills.calculateSkill(simulatedPlayer.exp.hacking, simulatedPlayer.mults.hacking);
    return { expHacking: simulatedPlayer.exp.hacking, skillsHacking: simulatedPlayer.skills.hacking };
}

