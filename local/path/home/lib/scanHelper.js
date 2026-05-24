import { NUKE_SCRIPT } from "./constants";
import { calculateGrowThreads, calculateWeakenThreads, getBestBatchSize, isServerPrepared, simulateBatch, simulateGrow, simulateHack, simulateMegaBatch, simulateWeaken } from "./hackingHelper";

/** 
 * @param {NS} ns 
 * @param {string} root
 * @return {string[]} list of all servers found
 */
export function deepScan(ns, root = "home") {
  if (typeof ns != "object" || typeof ns.getServerMaxRam != "function") {
    throw new Error(`ns is not of type NS: ${typeof ns}`);
  }
  if (typeof root != "string") {
    throw new Error(`root is not a string: ${root}`);
  }
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



/** 
 * @param {NS} ns 
 * @param {string} target
 * @return {string[]} path from home to the target server
 */
export function getPathToServer(ns, target) {
  if (typeof ns != "object" || typeof ns.getServerMaxRam != "function") {
    throw new Error(`ns is not of type NS: ${ns}`);
  }
  if (typeof target != "string") {
    throw new Error(`target is not a string: ${target}`);
  }
  var result = [target];
  var node = target;
  while (node != "home") {
    var parent = ns.scan(node)[0];
    result.unshift(parent);
    node = parent;

  }
  return result;
}

/** @param {NS} ns */
export function getRunners(ns) {
  if (typeof ns != "object" || typeof ns.getServerMaxRam != "function") {
    throw new Error(`ns is not of type NS: ${typeof ns}`);
  }
  var runners = deepScan(ns).filter((a) => {
    return !a.includes("hacknet") && ns.hasRootAccess(a) && ns.getServerMaxRam(a) > 0;
  });
  runners.push("home");
  return runners;
}

/** 
 * @param {NS} ns
 * @return {import("@/NetscriptDefinitions").Server[]}
 */
export function getRunnersServer(ns) {
  /**
   * @type {import("@/NetscriptDefinitions").Server[]}
   */
  let servers = []
  getRunners(ns).sort((a, b) => ns.getServerMaxRam(b) - ns.getServerMaxRam(a)).forEach((runner) => {
    servers.push(ns.getServer(runner));
  });
  return servers;
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
    .sort((a, b) => b.moneyPSecond - a.moneyPSecond)[0].target;
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
  const bestPrepped = getHackTargetsInfo(ns, hackScript, growScript, weakenScript, possibleTargets)
    .filter((t) => isServerPrepared(ns, t.target.hostname))
    .sort((a, b) => b.moneyPSecond - a.moneyPSecond)[0];

  return getHackTargetsInfo(ns, hackScript, growScript, weakenScript, possibleTargets)
    .filter((t) => t.moneyPSecond > bestPrepped.moneyPSecond)
    .sort((a, b) => (b.target.requiredHackingSkill ?? 0) - (a.target.requiredHackingSkill ?? 0))[0].target;
}

/** 
 * @param {NS} ns 
 * @param {string} hackScript 
 * @param {string} growScript 
 * @param {string} weakenScript 
 * @param {string[]} [possibleTargets=getAllHackTargets(ns)] 
 * @return {{
 * target: import("@/NetscriptDefinitions").Server,
 * moneyPSecond: number
 * }[]}
 */
export function getHackTargetsInfo(ns, hackScript, growScript, weakenScript, possibleTargets = getAllHackTargets(ns)) {
  const runners = getRunnersServer(ns);
  /**
   * @type {{
 * target: import("@/NetscriptDefinitions").Server,
 * moneyPSecond: number
 * }[]}
   */
  const result = []
  possibleTargets.forEach((targetName) => {
    const targetServer = ns.getServer(targetName);
    const player = ns.getPlayer();
    const batchResult = simulateMegaBatch(ns, targetServer, player, hackScript, weakenScript, growScript);
    let moneyStolen = 0;
    batchResult.forEach((b) => {
      moneyStolen += b.moneyStolen;
    });
    const moneyPSecond = (moneyStolen / (ns.getWeakenTime(targetServer.hostname) / 1000));
    result.push({ target: targetServer, moneyPSecond: moneyPSecond });


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
 * @param {import("@/NetscriptDefinitions").Server[]} servers 
 */
export function getMaxRamSum(ns, servers) {
  let totalRam = 0;
  servers.forEach((s) => {
    totalRam += s.maxRam;
  })
  return totalRam;
}
