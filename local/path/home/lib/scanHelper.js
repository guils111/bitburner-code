const DEFAULT_DEEP_SCAN_CACHE_TTL_MS = 5000;
const deepScanCache = new Map();

/**
 * @param {NS} ns
 * @param {string} [root="home"]
 * @param {number} [ttlMs=1000]
 * @return {string[]} list of all servers found
 */
export function deepScan(ns, root = "home", ttlMs = DEFAULT_DEEP_SCAN_CACHE_TTL_MS) {
  const now = Date.now();
  if (ttlMs > 0) {
    const cached = deepScanCache.get(root);
    if (cached && cached.expiresAt > now) {
      return [...cached.servers];
    }
  }

  const servers = deepScan2(ns, root);

  if (ttlMs > 0) {
    deepScanCache.set(root, {
      expiresAt: now + ttlMs,
      servers,
    });
  }

  return [...servers];
}

/**
 * @param {string | undefined} [root]
 */
export function clearDeepScanCache(root = undefined) {
  if (typeof root === "string") {
    deepScanCache.delete(root);
    return;
  }
  deepScanCache.clear();
}

/** 
 * @param {NS} ns 
 * @param {string} root
 * @return {string[]} list of all servers found
 */
export function deepScan2(ns, root = "home") {
  const seen = new Set([root]);
  const result = [];
  const stack = [root];

  while (stack.length > 0) {
    const server = stack.pop();
    const neighbors = ns.scan(server);

    for (const neighbor of neighbors) {
      if (seen.has(neighbor)) {
        continue;
      }
      seen.add(neighbor);
      result.push(neighbor);
      stack.push(neighbor);
    }
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
  var runners = deepScan(ns).filter((a) => {
    return !a.includes("hacknet") && ns.hasRootAccess(a) && ns.getServerMaxRam(a) > 0;
  });
  runners.push("home");
  return runners;
}

/**
 * 
 * @param {NS} ns 
 * @param {string[]} servers 
 * @returns {number}
 */
export function getTotalAvailableRam(ns, servers = getRunners(ns)) {
  return servers.map((s) => ns.getServerMaxRam(s)).reduce((total, cur) => total + cur);
}
