/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");
  while (true) {
    var data = ns.readPort(1);
    while(data != "NULL PORT DATA") {
        ns.print(data);
        data = ns.readPort(1);
    }
    await ns.sleep(100);
  }
}