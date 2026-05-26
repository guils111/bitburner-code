/**
 * @param {NS} ns
 */
export async function main(ns) {
    const crimes = Object.entries(ns.enums.CrimeType);
    let result = "Crime gains:\n";
    for(const crime of crimes) {
        result += crime[1].padEnd(20);
        result += `| Money/completion: $${ns.format.number(ns.formulas.work.crimeGains(ns.getPlayer(), crime[1]).money*ns.formulas.work.crimeSuccessChance(ns.getPlayer(), crime[1]))}`;
        result += "\n";
    }
    ns.tprint(result);

}