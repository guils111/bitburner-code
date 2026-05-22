import { deepScan } from "../lib/scanHelper.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.clearLog();
    while(true) {
        solveContracts(ns);
        await ns.sleep(60000);
    }
}

/** @param {NS} ns */
function findContracts(ns) {
    var contracts = new Map();
    deepScan(ns, "home").forEach((server) => {
        ns.ls(server).filter((file) => file.endsWith(".cct")).forEach((contract) => {
            contracts.set(contract, server);
        });
    });
    return contracts;
}


/** @param {NS} ns */
function solveContracts(ns) {
    var contracts = findContracts(ns);
    for (var [contractName, server] of contracts) {
        var contract = ns.codingcontract.getContract(contractName, server);
        var solution;
        switch (contract.type) {
            case ns.enums.CodingContractName.EncryptionICaesarCipher:
                solution = solveEncryptionICaesarCipher(contract);
                break;
            case ns.enums.CodingContractName.AlgorithmicStockTraderI:
                solution = solveAlgorithmicStockTraderI(contract);
                break;
            case ns.enums.CodingContractName.ArrayJumpingGame:
                solution = solveArrayJumpingGame(contract);
            default:
                //ns.print(`No solver for contract type ${contract.type} on server ${server}`);
                continue;
        }
        var attemptResult = ns.codingcontract.attempt(solution, contractName, server);
        ns.tprint(`Attempt result for contract ${contractName} on server ${server}: ${attemptResult}`);
    }
}

/** 
 * @param {CodingContractObject} contract
 * */
function solveArrayJumpingGame(contract) {
  var data = contract.data;
  var jump = data.shift(); 
  if (jumpArray(data, jump - 1)) {
    return 1;
  }
  return 0;
}
/**
 * @param {number[]} array 
 * @param {number} jump 
 */
function jumpArray(array, jump) {
  if (jump >= array.length) {
    return true;
  }
  for (var i = jump; i >= 0; i--) {
    if (jumpArray(array.slice(i + 1), array[i] - 1)) {
      return true;
    }
  }
  return false;
}

/** 
 * @param {CodingContractObject} contract
 * */
function solveEncryptionICaesarCipher(contract) {
  var data = contract.data;
  var shift = data[1];
  var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  var result = "";
  for (var char of data[0]) {
    if (alphabet.includes(char)) {
      var index = (alphabet.indexOf(char) - shift) % alphabet.length;
      if (index < 0) {
        index += alphabet.length;
      }
      result += alphabet[index];
    } else {
      result += char;
    }
  }
  return result;
}

/** 
 * @param {CodingContractObject} contract
 * */
function solveAlgorithmicStockTraderI(contract) {
  var data = contract.data;
  var maxProfit = 0;
  for (var i = 0; i < data.length; i++) {
    for (var j = i + 1; j < data.length; j++) {
      var profit = parseInt(data[j]) - parseInt(data[i]);
      if (profit > maxProfit) {
        maxProfit = profit; 
      }
    }
  }
  return maxProfit;
}

