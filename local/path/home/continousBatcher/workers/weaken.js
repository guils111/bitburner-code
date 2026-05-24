/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    if (ns.args.length < 2) {
        throw new Error(`Weaken worker expects at least 2 arguments, got: ${ns.args}`);
    }
    const target = ns.args[0].toString();
    const delay = Number.parseFloat(ns.args[1].toString());
    const reportBackPort = Number.parseInt(ns.args[2]?.toString());
    const dataToSendBack = ns.args[3];
    
    await ns.weaken(target, { additionalMsec: delay});
    if(!isNaN(reportBackPort)) {
        ns.writePort(reportBackPort, dataToSendBack);
    }
}