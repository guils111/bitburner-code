import { execScript, getAvailableRam } from "./lib/execHelper";
import { clonePlayer, cloneServer, findBestPrepedTarget, findBestUnprepedTarget, simulateMegaBatch } from "./lib/hackingHelper";
import { getRunners } from "./lib/scanHelper";

const BATCHER_SCRIPT = "/continuousBatcher/continuousBatcher.js";
const PREP_SCRIPT = "/continousBatcher/prepTarget.js"
const HACK_SCRIPT = "/continousBatcher/workers/hack.js";
const WEAKEN_SCRIPT = "/continousBatcher/workers/weaken.js";
const GROW_SCRIPT = "/continousBatcher/workers/grow.js";

/** @param {NS} ns */
export async function main(ns) {
  ns.clearLog();
  ns.disableLog("ALL");

  const totalPower = ns.gang.getMemberNames().reduce((total, member) => {
    return total + calculatePower(ns, member);
  }, 0);
  ns.print(`INFO - Total gang power: ${totalPower}.`);
  ns.print(`Member will add ${calculatePower(ns, "gang-member-0")}. Should build power: ${shouldBuildPower(ns, "gang-member-0")}`);

  const strongestGang = Object.entries(ns.gang.getAllGangInformation()).filter(gang => gang[0] !== ns.gang.getGangInformation().faction).sort((a, b) => b[1].power - a[1].power)[0];


  ns.print(ns.gang.getChanceToWinClash(strongestGang[0]));

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
  const gangInfo = ns.gang.getGangInformation();
  const power = calculatePower(ns, member);
  const highestGangPower = Object.entries(ns.gang.getAllGangInformation()).reduce((maxPower, gang) => {
    const gangPower = gang[1].power;
    return gangPower > maxPower ? gangPower : maxPower;
  }, 0);
  const timeFactor = 60 * 60 * 1000 / 5 * 1000;
  return power * 12 * timeFactor > highestGangPower;
}
