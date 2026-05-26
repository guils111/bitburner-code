import { getPathToServer } from "../lib/scanHelper.js";

/** @param {NS} ns */
export async function main(ns) {
  const targets = ["CSEC"
    , "avmnite-02h"
    , "I.I.I.I"
    , "run4theh111z"
    , "w0r1d_d43m0n"
  ];
  var result = "";
  for (var target of targets) {
    
    if (ns.serverExists(target) && ns.hasRootAccess(target) && !ns.getServer(target).backdoorInstalled) {
      result += `alias bk${target.replaceAll(".", "-")}=\"`;
      for (var node of getPathToServer(ns, target)) {
        if (node == "home") {
          result += ` ${node};`;
        } else {
          result += ` connect ${node};`
        }
      }
      result += " backdoor;\";"

    }
  }
  ns.tprint(result);

}
