//map of crime and the time it takes to complete in seconds.
/**
 * shoplift: "Shoplift";
  robStore: "Rob Store";
  mug: "Mug";
  larceny: "Larceny";
  dealDrugs: "Deal Drugs";
  bondForgery: "Bond Forgery";
  traffickArms: "Traffick Arms";
  homicide: "Homicide";
  grandTheftAuto: "Grand Theft Auto";
  kidnap: "Kidnap";
  assassination: "Assassination";
  heist: "Heist";
 */
const crimeTimes = {
    "Shoplift": 2,
    "Rob Store": 60,
    "Mug": 4,
    "Larceny": 90,
    "Deal Drugs": 10,
    "Bond Forgery": 300,
    "Traffick Arms": 40,
    "Homicide": 3,
    "Grand Theft Auto": 80,
    "Kidnap": 120,
    "Assassination": 300,
    "Heist": 600
};

/**
 * @param {NS} ns
 */
export async function main(ns) {
    const crimes = Object.entries(ns.enums.CrimeType);
    let result = "Crime gains:\n";
    for(const crime of crimes) {
        result += crime[1].padEnd(20);
        result += `| Money/completion: $${ns.format.number(ns.formulas.work.crimeGains(ns.getPlayer(), crime[1]).money*ns.formulas.work.crimeSuccessChance(ns.getPlayer(), crime[1])).padEnd(10)}`;
        result += `| Money/s: $${ns.format.number(ns.formulas.work.crimeGains(ns.getPlayer(), crime[1]).money*ns.formulas.work.crimeSuccessChance(ns.getPlayer(), crime[1])/crimeTimes[crime[1]]).padEnd(10)}`;
        result += `| Time to complete: ${ns.format.time(crimeTimes[crime[1]]*1000)}`;
        result += "\n";
    }
    ns.tprint(result);

}