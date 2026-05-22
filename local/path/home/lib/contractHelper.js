import { deepScan } from "/lib/scanHelper.js";
/** @param {NS} ns */
export function findContracts(ns) {
  var servers = deepScan(ns, "home");
  var contracts = [];
    for (var server of servers) {
        var serverContracts = ns.ls(server, ".cct");
        for (var contract of serverContracts) {
            contracts.push({ server: server, contract: contract});
        }
    }
    return contracts;
}