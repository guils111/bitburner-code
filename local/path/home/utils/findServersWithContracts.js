import { findContracts } from "/lib/contractHelper.js";

/** @param {NS} ns */
export async function main(ns) {
    var servers = findServersWithContracts(ns);
    var result = "Servers with contracts: \n";
    for (var [server, contract] of servers) {
        result += ` - ${server}: ${contract} (${ns.codingcontract.getContractType(contract, server )}) ${ns.codingcontract.getContract(contract, server).difficulty}\n`;
    }
    ns.tprint(result);
}

/** @param {NS} ns */
function findServersWithContracts(ns) {
    var contracts = findContracts(ns);
    var servers = new Map();
    for (var contract of contracts) {
        servers.set(contract.server, contract.contract);
    }
    return Array.from(servers);
}


