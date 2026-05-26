/**
 * @param {NS} ns 
 */
export async function main(ns) {
    while (true) {
        recruit(ns);
        assignTasks(ns);
        await ns.gang.nextUpdate();
    }

}

/**
 * @param {NS} ns 
 */
function assignTasks(ns) {
    ns.gang.getMemberNames().forEach((memberName => {
        var member = ns.gang.getMemberInformation(memberName);
        var task = member.task;
        if (member.agi < 50 || member.def < 50 || member.dex < 50 || member.str < 50) {
            task = "Train Combat";
        } else if (ns.gang.getGangInformation().wantedLevel > 25) {
            task = "Vigilante Justice";
        } else if (ns.gang.getGangInformation().wantedLevel < 2 && member.task == "Vigilante Justice") {
            task = "Unassigned"
        } else if (member.task == "Unassigned" || member.task == "Train Combat") {
            task = "Mug People";
        }
        if(task != member.task) {
            ns.gang.setMemberTask(member.name, task);
        }

    }));
}

/**
 * @param {NS} ns 
 */
function calculateBestTask(ns, memberName) {
    var bestTaskValue = 0;
    var bestTaskName = "";
    ns.gang.getTaskNames().forEach((t) => {
        var task = ns.gang.getTaskStats(t);
        var member = ns.gang.getMemberInformation(memberName);
        var value = task.agiWeight * member.agi + task.dexWeight * member.dex + task.strWeight * member.str + task.defWeight * member.def + task.chaWeight * member.cha + task.hackWeight * member.hack;
        value = value / 100;
        ns.print(`Stats values for ${memberName} on Task ${t}: ${value}`);
        value = value * (task.baseRespect);
        if (value > bestTaskValue) {
            bestTaskName = task.name;
            bestTaskValue = value;
        }
    });
    return bestTaskName;
}

/**
 * @param {NS} ns 
 */
function recruit(ns) {
    while (ns.gang.canRecruitMember()) {
        ns.gang.recruitMember(`gang-member-${ns.gang.getMemberNames().length}`);
    }
}

export function autocomplete(data) {
    return ["--tail"];
}