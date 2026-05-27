//@ts-check

//declare an enum for the different states the manager can be in.
const PRIORITY = {
    RESPECT: "respect",
    MONEY: "money",
    POWER: "power",
    WANTED: "wanted"
}

const memberTaskMap = new Map();

/**
 * @param {NS} ns 
 */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.clearLog();
    ns.ui.openTail();
    ns.ui.moveTail(2191, 498);
    ns.ui.resizeTail(368, 231);
    ns.atExit(() => {
        ns.ui.closeTail();
    }, "closeTail");

    while (true) {
        if (ns.gang.inGang()) {
            recruit(ns);
            assignTasks(ns);
            ascendMembers(ns);
            buyEquipment(ns);
            clash(ns);
            printStatus(ns);
            await ns.gang.nextUpdate();
        }
        await ns.sleep(60000);
    }

}

/**
 * 
 * @param {NS} ns 
 */
function printStatus(ns) {
    ns.clearLog();
    const gangInfo = ns.gang.getGangInformation();
    const priority = getPriority(ns);
    let result = `Gang power: ${ns.format.number(gangInfo.power)}\n`;
    result += `Respect: ${ns.format.number(gangInfo.respect)}\n`;
    result += `Territory: ${ns.format.percent(gangInfo.territory)}\n`;
    result += `Wanted penalty: ${ns.format.percent(1 - ns.formulas.gang.wantedPenalty(gangInfo))}\n`;
    result += `Chance to win clash: ${ns.format.percent(getChanceToWinClash(ns))}\n`;
    result += `Next recruit: ${ns.format.number(ns.gang.respectForNextRecruit())} respect\n`;
    result += `Priority: ${priority}\n`;
    result += `Respect/s: ${ns.format.number(getRespectPerSecond(ns))} `;
    result += `Money/s: ${ns.format.number(getMoneyPerSecond(ns))}\n`;

    ns.print(result);
}

/**
 * 
 * @param {NS} ns 
 */
function getPriority(ns) {
    const gangInfo = ns.gang.getGangInformation();
    const bestMoneyGain = Math.max(...ns.gang.getMemberNames().map(member => ns.formulas.gang.moneyGain(gangInfo, ns.gang.getMemberInformation(member), ns.gang.getTaskStats(getTaskMostMoney(ns, ns.gang.getMemberInformation(member))))));
    const bestRespectGain = Math.max(...ns.gang.getMemberNames().map(member => ns.formulas.gang.respectGain(gangInfo, ns.gang.getMemberInformation(member), ns.gang.getTaskStats(getTaskMostRespect(ns, ns.gang.getMemberInformation(member))))));
    if (ns.formulas.gang.wantedPenalty(gangInfo) < 0.8) {
        if (bestRespectGain * 10 * 60 * 1000 > gangInfo.respect) {
            return PRIORITY.RESPECT;
        } else {
            return PRIORITY.WANTED;
        }
    } else if (ns.gang.respectForNextRecruit() < Number.POSITIVE_INFINITY) {
        return PRIORITY.RESPECT;
    } else if (getChanceToWinClash(ns) < 0.55) {
        return PRIORITY.POWER;
    } else if (bestRespectGain * 10 * 60 * 1000 > gangInfo.respect) {
        return PRIORITY.MONEY;
    } else if (bestMoneyGain * 10 * 60 * 1000 > ns.getServerMoneyAvailable("home")) {
        return PRIORITY.MONEY;
    } else {
        return PRIORITY.RESPECT;
    }
}

/**
 * @param {NS} ns 
 */
function assignTasks(ns, priority = getPriority(ns)) {
    let topWeakestToTrain = 3;
    if (ns.gang.respectForNextRecruit() < Number.POSITIVE_INFINITY) {
        topWeakestToTrain = 1;
    }
    const memberTasks = new Map();
    const gangInfo = ns.gang.getGangInformation();
    let members = ns.gang.getMemberNames();

    members.sort((a, b) => {
        const memberA = ns.gang.getMemberInformation(a);
        const memberB = ns.gang.getMemberInformation(b);
        const statA = memberA.hack + memberA.str + memberA.def + memberA.dex + memberA.agi + memberA.cha;
        const statB = memberB.hack + memberB.str + memberB.def + memberB.dex + memberB.agi + memberB.cha;
        return statA - statB;
    });
    const topWeakest = members.slice(0, topWeakestToTrain);



    members.forEach((member) => {
        const memberInfo = ns.gang.getMemberInformation(member);
        let task = memberInfo.task;

        if (topWeakest.includes(member)) {
            task = "Train Combat";
        } else {

            switch (priority) {
                case PRIORITY.RESPECT:
                    task = getTaskMostRespect(ns, memberInfo);
                    break;
                case PRIORITY.MONEY:
                    task = getTaskMostMoney(ns, memberInfo);
                    break;
                case PRIORITY.POWER:
                    task = "Territory Warfare";
                    break;
                case PRIORITY.WANTED:
                    if (gangInfo.isHacking) {
                        task = "Ethical Hacking";
                    } else {
                        task = "Vigilante Justice";
                    }
                    break;
                default:
                    task = getTaskMostRespect(ns, memberInfo);
                    break;
            }
        }
        if (task !== memberInfo.task && (memberTaskMap.get(member) ?? 0) < Date.now()) {
            ns.gang.setMemberTask(member, task);
            memberTaskMap.set(member, Date.now() + 1 * 60 * 1000); // Don't reassign this member for another minute to avoid excessive task switching.
        }

    });
}

/**
 * @param {NS} ns 
 * @param {import("@/NetscriptDefinitions").GangMemberInfo} member
 * @returns {string} The name of the best task for this gang member to be assigned to, based on which one will yield the most respect gain.
 */
function getTaskMostRespect(ns, member) {
    let bestTaskValue = 0;
    let bestTaskName = "";
    const gangInfo = ns.gang.getGangInformation();
    ns.gang.getTaskNames().forEach((t) => {
        const task = ns.gang.getTaskStats(t);
        const respectGain = ns.formulas.gang.respectGain(gangInfo, member, task);
        if (respectGain > bestTaskValue) {
            bestTaskValue = respectGain;
            bestTaskName = t;
        }
    });
    if (bestTaskValue === 0) {
        return "Train Combat";
    }
    return bestTaskName;
}

/**
 * @param {NS} ns 
 * @param {import("@/NetscriptDefinitions").GangMemberInfo} member
 * @returns {string} The name of the best task for this gang member to be assigned to, based on which one will yield the most money gain.
 */
function getTaskMostMoney(ns, member) {
    let bestTaskValue = 0;
    let bestTaskName = "";
    const gangInfo = ns.gang.getGangInformation();
    ns.gang.getTaskNames().forEach((t) => {
        const task = ns.gang.getTaskStats(t);
        const moneyGain = ns.formulas.gang.moneyGain(gangInfo, member, task);
        if (moneyGain > bestTaskValue) {
            bestTaskValue = moneyGain;
            bestTaskName = t;

        }
    });
    if (bestTaskValue === 0) {
        return "Train Combat";
    }
    return bestTaskName;
}
/**
 * 
 * @param {NS} ns 
 */
function buyEquipment(ns) {
    ns.gang.getEquipmentNames().sort((a, b) => ns.gang.getEquipmentCost(b) - ns.gang.getEquipmentCost(a)).forEach((equipment) => {
        if (ns.gang.getEquipmentCost(equipment) < ns.getServerMoneyAvailable("home")) {
            ns.gang.getMemberNames().filter((member) => !ns.gang.getMemberInformation(member).upgrades.includes(equipment)).forEach((member) => {
                if (ns.gang.getEquipmentCost(equipment) < ns.getServerMoneyAvailable("home")) {
                    (ns.gang.purchaseEquipment(member, equipment))
                }
            });
        }
    });
}

/**
 * 
 * @param {NS} ns 
 * @param {string} member 
 * @param {number} [top=1]
 * @returns {boolean}
 */
function isTopWeakestMember(ns, member, top = 1) {
    // Returns true when member is among the N weakest gang members by combat stats.
    const members = ns.gang.getMemberNames();
    if (members.length === 0) {
        return false;
    }

    const clampedTop = Math.max(1, Math.min(top, members.length));
    const weakest = members
        .map((name) => {
            const info = ns.gang.getMemberInformation(name);
            return {
                name,
                combat: info.agi + info.def + info.dex + info.str,
            };
        })
        .sort((a, b) => a.combat - b.combat)
        .slice(0, clampedTop)
        .map((entry) => entry.name);

    return weakest.includes(member);
}

/**
 * 
 * @param {NS} ns 
 */
function ascendMembers(ns) {

    ns.gang.getMemberNames().forEach((memberName) => {

        const memberInfo = ns.gang.getMemberInformation(memberName);
        const hackMult = ns.formulas.gang.ascensionMultiplier(memberInfo.hack_asc_points + ns.formulas.gang.ascensionPointsGain(memberInfo.hack_exp)) / memberInfo.hack_asc_mult;
        const strMult = ns.formulas.gang.ascensionMultiplier(memberInfo.str_asc_points + ns.formulas.gang.ascensionPointsGain(memberInfo.str_exp)) / memberInfo.str_asc_mult;
        const defMult = ns.formulas.gang.ascensionMultiplier(memberInfo.def_asc_points + ns.formulas.gang.ascensionPointsGain(memberInfo.def_exp)) / memberInfo.def_asc_mult;
        const dexMult = ns.formulas.gang.ascensionMultiplier(memberInfo.dex_asc_points + ns.formulas.gang.ascensionPointsGain(memberInfo.dex_exp)) / memberInfo.dex_asc_mult;
        const agiMult = ns.formulas.gang.ascensionMultiplier(memberInfo.agi_asc_points + ns.formulas.gang.ascensionPointsGain(memberInfo.agi_exp)) / memberInfo.agi_asc_mult;
        const chaMult = ns.formulas.gang.ascensionMultiplier(memberInfo.cha_asc_points + ns.formulas.gang.ascensionPointsGain(memberInfo.cha_exp)) / memberInfo.cha_asc_mult;

        if ((hackMult + strMult + defMult + dexMult + agiMult + chaMult) / 6 > 1.8) {
            ns.gang.ascendMember(memberName);
        }
    });
}

/**
 * @param {NS} ns 
 */
function recruit(ns) {
    while (ns.gang.canRecruitMember()) {
        ns.gang.recruitMember(`gang-member-${ns.gang.getMemberNames().length}`);
    }
}

/**
 * 
 * @param {NS} ns 
 * @param {string} member 
 * @returns {number}
 */
function calculatePower(ns, member) {
    const memberInfo = ns.gang.getMemberInformation(member);
    const gangInfo = ns.gang.getGangInformation();
    let memberPower = (memberInfo.hack + memberInfo.str + memberInfo.def + memberInfo.dex + memberInfo.agi + memberInfo.cha) / 95;
    memberPower *= 0.015 * Math.max(0.002, gangInfo.territory);
    return memberPower;
}

/**
 * 
 * @param {NS} ns 
 * @param {string} member 
 * @returns {boolean}
 */
function shouldBuildPower(ns, member) {
    const memberInfo = ns.gang.getMemberInformation(member);
    const power = calculatePower(ns, member);
    const strongestGang = Object.entries(ns.gang.getAllGangInformation()).filter(gang => gang[0] !== ns.gang.getGangInformation().faction).sort((a, b) => b[1].power - a[1].power)[0];


    const timeFactor = 60 * 60 * 1000 / 20 * 1000;
    return power * 9 * timeFactor > strongestGang[1].power && ns.gang.getChanceToWinClash(strongestGang[0]) < 0.55 && memberInfo.def > 600;
}

/**
 * 
 * @param {NS} ns 
 * @returns {number}
 */
function getChanceToWinClash(ns) {
    const strongestGang = Object.entries(ns.gang.getAllGangInformation()).filter(gang => gang[0] !== ns.gang.getGangInformation().faction).sort((a, b) => b[1].power - a[1].power)[0];
    return ns.gang.getChanceToWinClash(strongestGang[0]);
}

/**
 * 
 * @param {NS} ns 
 */
function clash(ns) {
    const strongestGang = Object.entries(ns.gang.getAllGangInformation()).filter(gang => gang[0] !== ns.gang.getGangInformation().faction).sort((a, b) => b[1].power - a[1].power)[0];

    ns.gang.setTerritoryWarfare(ns.gang.getChanceToWinClash(strongestGang[0]) > 0.55);
}

//@ts-ignore
export function autocomplete(data) {
    return ["--tail"];
}

/**
 * 
 * @param {NS} ns 
 */
function getRespectPerSecond(ns) {
    const gangInfo = ns.gang.getGangInformation();
    const respectGain = ns.gang.getMemberNames().reduce((total, member) => {
        const memberInfo = ns.gang.getMemberInformation(member);
        const task = ns.gang.getTaskStats(memberInfo.task);
        return total + ns.formulas.gang.respectGain(gangInfo, memberInfo, task);
    }, 0);
    return respectGain * 5;
}
/**
 * 
 * @param {NS} ns 
 */
function getMoneyPerSecond(ns) {
    const gangInfo = ns.gang.getGangInformation();
    const moneyGain = ns.gang.getMemberNames().reduce((total, member) => {
        const memberInfo = ns.gang.getMemberInformation(member);
        const task = ns.gang.getTaskStats(memberInfo.task);
        return total + ns.formulas.gang.moneyGain(gangInfo, memberInfo, task);
    }, 0);
    return moneyGain * 5;
}

