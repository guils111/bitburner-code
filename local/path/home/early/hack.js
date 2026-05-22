/** @param {NS} ns */
export async function main(ns) {

  while(true) {
    if (shouldWeaken(ns)) {
      await ns.weaken();
    } else if (ns.getServerMoneyAvailable() < ns.getServerMaxMoney()) {
      await ns.grow();
    } else {
      await ns.hack();
    }
  }

}
/** @param {NS} ns 
 * @param {number} threads
 * @return bool
*/
function shouldWeaken(ns) {
  var securityThreshold = ns.getServerBaseSecurityLevel(ns.getHostname());
  securityThreshold += ns.weakenAnalyze(1);
  return (ns.getServerSecurityLevel() >= securityThreshold);
}