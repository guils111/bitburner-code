/** @param {NS} ns */
export async function main(ns) {
  ns.clearLog();
  ns.disableLog("ALL");
  var target = "n00dles";
  var amountToReduce = ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target);
  reduceSecurityByAmount(ns, target, amountToReduce);
  

  //find highest level server to hack
  //##Reduce security to minimum
  //calculate how many threads to reduce security to minimum
  //start as many threads as possible
  //if there are still pending threads, wait for them to complete and start the rest
  //if all threads where started

}
/** @param {NS} ns */
export async function reduceSecurityByAmount(ns, target, amountToReduce) {
  var weakenEffect = ns.formulas.hacking.weakenEffect(1);
  ns.print(`Weaken will reduce security by ${weakenEffect} if ran with 1 thread.`);
  var threads = Math.ceil(amountToReduce / weakenEffect);
  ns.print(`Need ${threads} to reduce security by ${amountToReduce}`);
  ns.print(`Running ${threads} of weaken will reduce security by ${ns.formulas.hacking.weakenEffect(threads)}`);
  var timeToCompletion = Math.ceil(ns.formulas.hacking.weakenTime(ns.getServer(), ns.getPlayer()));
  var date = Date.now() + timeToCompletion;
  ns.print(`Weakening will take ${timeToCompletion / 1000} seconds to run`);
  //loop until all threads can be be started
  //return time when server security will be minimum
  return date;
}
/** @param {NS} ns */
export async function grow(ns, target) {
  var threads = ns.formulas.hacking.growThreads(ns.getServer(), ns.getPlayer(), ns.getServerMaxMoney());
  ns.print(`Requires ${threads} to grow server money to max.`);
  var timeToCompletion = ns.formulas.hacking.growTime(ns.getServer(target), ns.getPlayer());
  var date = Date.now() + timeToCompletion;
  ns.print(`Growing will take `);
}