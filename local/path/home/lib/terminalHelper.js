import { getPathToServer } from "/lib/scanHelper.js";

/** @param {NS} ns */
export function getStringToConnectToServer(ns, target) {
    var result = "";
    for (var node of getPathToServer(ns, target)) {
        if (node == "home") {
            result += ` ${node};`;
        } else {
            result += ` connect ${node};`
        }
    }
    return result;
}