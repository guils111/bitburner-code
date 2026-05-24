/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    if (ns.args.length < 3) {
        throw new Error(`Grow worker expects at least 3 arguments, got: ${ns.args}`);
    }
    const target = ns.args[0].toString();
    const affectStock = ns.args[1].toString() == "true";
    const delay = Number.parseFloat(ns.args[2].toString());
    await ns.grow(target, { additionalMsec: delay, stock: affectStock });

}