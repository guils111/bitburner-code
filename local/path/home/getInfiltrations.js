/**
 * @param {NS} ns
 */
export async function main(ns) {
    var locations = ns.infiltration.getPossibleLocations();
    var infiltrations = [];
    for (var location of locations) {
        var infiltration = ns.infiltration.getInfiltration(location.name);
        if (infiltration != null) {
            infiltrations.push(infiltration);
        }
    }
    infiltrations.sort((a, b) => a.difficulty - b.difficulty);
    var result = "Infiltrations: \n";
    for (var infiltration of infiltrations) {
        result += ` - ${infiltration.location.city.padEnd(15)} - ${infiltration.location.name.padEnd(30)}: ${Math.floor(infiltration.difficulty*30).toString().padEnd(5)} difficulty - ${Math.floor(infiltration.reward.tradeRep/infiltration.maxClearanceLevel).toString().padEnd(5)} trade reputation per clearance.\n`;
    }
    ns.tprint(result);

}