const version = 30;
const LOGGER_SCRIPT = "darknet/logger.js";
const PASSWORD_SCRIPT = "darknet/passwordHandler.js";
const DEFAULT_PASSWORDS = ["admin", "password", "0000", "12345"];
const COMMON_PASSWORDS = ["joshua", "cheese", "amanda", "summer", "love", "ashley", "6969", "nicole", "chelsea", "biteme", "matthew", "access", "yankees", "987654321", "dallas",
  "shadow", "master", "666666", "qwertyuiop", "123321", "mustang", "1234567890", "michael", "654321", "superman", "1qaz2wsx", "7777777", "121212", "0", "qazwsx"
];
const DOG_NAMES = ["fido", "spot", "rover", "max"];
const PRIME_NUMBERS = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271, 277, 281, 283, 293, 307, 311, 313, 317, 331, 337, 347, 349, 353, 359, 367, 373, 379, 383, 389, 397, 401, 409, 419, 421, 431, 433, 439, 443, 449, 457, 461, 463, 467, 479, 487, 491, 499, 503, 509, 521, 523, 541, 547, 557, 563, 569, 571, 577, 587, 593, 599, 601, 607, 613, 617, 619, 631, 641, 643, 647, 653, 659, 661, 673, 677, 683, 691, 701, 709, 719, 727, 733, 739, 743, 751, 757, 761, 769, 773, 787, 797, 809, 811, 821, 823, 827, 829, 839, 853, 857, 859, 863, 877, 881, 883, 887, 907, 911, 919, 929, 937, 941, 947, 953, 967, 971, 977, 983, 991, 997];


/** @param {NS} ns */
export async function main(ns) {
  ns.clearLog();
  ns.disableLog("ALL");

  if (!ns.scriptRunning(LOGGER_SCRIPT, "home")) {
    ns.exec(LOGGER_SCRIPT, "home");
  }

  if (!ns.scriptRunning(PASSWORD_SCRIPT, "home")) {
    //ns.exec(PASSWORD_SCRIPT, "home");
  }
  while (true) {
    updateScript(ns);
    findPrograms(ns);
    convertLitToTxt(ns);
    moveTxtFilesHome(ns);
    // Get a list of all darknet hostnames directly connected to the current server
    const nearbyServers = ns.dnet.probe();

    // Attempt to authenticate with each of the nearby servers, and spread this script to them
    for (const hostname of nearbyServers) {
      const authenticationSuccessful = await serverSolver(ns, hostname);
      if (!authenticationSuccessful) {
        continue; // If we failed to auth, just move on to the next server
      }

      // If we have successfully authenticated, we can now copy and run this script on the target server
      exec(ns, hostname);
    }

    // TODO: free up blocked ram on this server using ns.dnet.memoryReallocation
    if (ns.dnet.isDarknetServer() && ns.dnet.getBlockedRam() > 0) {
      await ns.dnet.memoryReallocation();
    }


    // TODO: look for .cache files on this server and open them with ns.dnet.openCache
    openCacheFiles(ns);

    // TODO: take advantage of the extra ram on darknet servers to run ns.dnet.phishingAttack calls for money

    await ns.sleep(5000);
  }
}

/** @param {NS} ns */
function findPrograms(ns) {
  if (ns.dnet.isDarknetServer()) {
    var files = ns.ls(ns.getHostname(), ".exe");
    if (files.length > 0) {
      ns.tprint(`Found an .exe file!!! ${files} --- ${getPathToServer(ns, ns.getHostname()).join(";connect ").slice(0, -8)}`);
    } else {
      return;
    }

  }
}

/** @param {NS} ns */
function moveTxtFilesHome(ns) {
  if (ns.dnet.isDarknetServer()) {
    var files = ns.ls(ns.getHostname()).filter((a) => a.endsWith(".txt"));
    for (var file of files) {
      file = file.split("/").pop() || "";
      var newFile = "/darknet/files/" + file;
      ns.mv(ns.getHostname(), file, newFile);
      if (ns.scp(newFile, "home")) {
        ns.rm(newFile);
      }

    }
  }
}

/** @param {NS} ns */
function convertLitToTxt(ns) {
  if (ns.dnet.isDarknetServer()) {
    var files = ns.ls(ns.getHostname()).filter((a) => a.endsWith(".lit"));
    for (var file of files) {
      ns.write(file + ".txt", ns.read(file), "w");
      ns.rm(file);

    }
  }
}

/** @param {NS} ns */
function openCacheFiles(ns) {
  var files = ns.ls(ns.getHostname(), ".cache").filter((a) => a.endsWith(".cache"));
  for (var file of files) {
    ns.dnet.openCache(file);
  }
}

/** Attempts to authenticate with the specified server using the Darknet API.
 * @param {NS} ns
 * @param {string} hostname - the name of the server to attempt to authorize on
 */
export const serverSolver = async (ns, hostname) => {
  // Get key info about the server, so we know what kind it is and how to authenticate with it
  const details = ns.dnet.getServerDetails(hostname);
  if (!details.isConnectedToCurrentServer || !details.isOnline) {
    // If the server isn't connected or is offline, we can't authenticate
    return false;
  }
  // If you are already authenticated to that server with this script, you don't need to do it again
  if (details.hasSession) {
    return true;
  }

  switch (details.modelId) {
    case "ZeroLogon":
      return authenticateWithNoPassword(ns, hostname);
    case "CloudBlare(tm)":
      return authenticateByTypingNumbersFromData(ns, hostname);
    case "DeskMemo_3.1":
      return authenticateByTypingNumbersFromHint(ns, hostname);
    case "FreshInstall_1.0":
      return authenticateWithDefaultPasswords(ns, hostname);
    case "PHP 5.4":
      return authenticateByPermutatingData(ns, hostname);
    case "BellaCuore":
      return authenticateByParsingRomanNumerals(ns, hostname);
    case "NIL":
      return authenticateBasedOnFailedMessage(ns, hostname);

    // TODO: handle other models of darknet servers here

    // TODO: get recent server logs with `await ns.dnet.heartbleed(hostname)` for more detailed logging on failed auth attempts

    default:
      return false;
  }
};

/** Attempts to authenticate with the specified server using the Darknet API.
 * @param {NS} ns
 * @param {string} hostname - the name of the server to attempt to authorize on
 */
async function authenticateBasedOnFailedMessage(ns, hostname) {
  var auth = ns.dnet.getServerDetails(hostname);
  if (auth.passwordFormat == "numeric") {
    var password = [];
    for (var i = 0; i < auth.passwordLength; i++) {
      password.push(0);
    }
    var result;
    while (!result?.success) {
      result = await ns.dnet.authenticate(hostname, password.join(""));
      if (result.success) {
        publishPassword(ns, hostname, password.join(""));
        return result.success;
      } else {
        var heartbleedData = await ns.dnet.heartbleed(hostname, { logsToCapture: 20, peek: true });
        var message;
        for (var log of heartbleedData.logs) {
          if (log.includes("passwordAttempted")) {
            var logData = typeof log === "string" ? JSON.parse(log) : log;
            if (logData.passwordAttempted == password.join("")) {
              message = logData.data.split(",");
              break;
            }
          }
        }
        if (typeof message === "undefined") {
          ns.print(`Could not find log of password attempt in heartbleed data for ${hostname}. Data was: ${JSON.stringify(heartbleedData)}`);
          return false;
        }
        for (var i = 0; i < message.length; i++) {
          if (message[i] != "yes") {
            password[i] = (password[i] + 1) % 10;
          }
        }
      }
      await ns.sleep(0);
    }
  }
}
/** Attempts to authenticate with the specified server using the Darknet API.
 * @param {NS} ns
 * @param {string} hostname - the name of the server to attempt to authorize on
 */
async function authenticateByTestingDivisibleNumbers(ns, hostname) {
  var serverDetails = ns.dnet.getServerDetails(hostname);
  var passwordLength = serverDetails.passwordLength;
  var divisors = []
  var nonDivisors = []
  var result;
  for (var i = 1; i <= 9; i++) {
    result = await ns.dnet.authenticate(hostname, i.toString());
    if (result.success) {
      return true;
    }

    var heartbleedData = await ns.dnet.heartbleed(hostname, { logsToCapture: 20, peek: true });
    for (var hbLog of heartbleedData.logs) {
      if (hbLog.includes("passwordAttempted")) {
        var logData = typeof hbLog === "string" ? JSON.parse(hbLog) : hbLog;
        if (logData.passwordAttempted == i) {
          if (logData.data) {
            divisors.push(i);
          } else {
            nonDivisors.push(i);
          }
          break;
        }
      }
    }
  }
  if (divisors.length > 0 && nonDivisors.length > 0) {
    var start = parseInt("1".padEnd(passwordLength, "0"));
    var end = parseInt("9".padEnd(passwordLength, "9"));
    for (var i = start; i <= end; i++) {
      var isDivisible = true;
      var isNonDivisible = true;
      for (var div of divisors) {
        if (i % div != 0) {
          isDivisible = false;
          break;
        }
      }
      for (var div of nonDivisors) {
        if (i % div == 0) {
          isNonDivisible = false;
          break;
        }
      }
      if (isDivisible && isNonDivisible) {
        result = await ns.dnet.authenticate(hostname, i.toString());
        if (result.success) {
          return true;
        }
      }

    }
  } else {
    //prime numbers
  }

  log(ns, `Authentication failed. Password is divisible by ${divisors}`);
  return false;
}

/** Attempts to authenticate with the specified server using the Darknet API.
 * @param {NS} ns
 * @param {string} hostname - the name of the server to attempt to authorize on
 */
async function authenticateByParsingRomanNumerals(ns, hostname) {
  var data = ns.dnet.getServerDetails(hostname).data;
  var parsedData = parseRomanNumerals(ns, data);
  var result = await ns.dnet.authenticate(hostname, parsedData.toString());
  if (result.success) {
    publishPassword(ns, hostname, parsedData.toString());
  } else {
    log(ns, `Authentication failed on ${hostname}. Data was ${ns.dnet.getServerDetails(hostname).data}. Attempted ${parsedData}`);
  }
  return result.success;
}

/** Attempts to authenticate with the specified server using the Darknet API.
 * @param {NS} ns
 * @param {string} hostname - the name of the server to attempt to authorize on
 */
async function authenticateByPermutatingData(ns, hostname) {
  var data = ns.dnet.getServerDetails(hostname).data;
  var permutations = permutateValues(ns, data);
  var result;
  for (var permutation of permutations) {
    result = await ns.dnet.authenticate(hostname, permutation);
    if (result.success) {
      publishPassword(ns, hostname, permutation);
      return true;
    } else {
      log(ns, `Authentication failed on ${hostname}. Data was ${ns.dnet.getServerDetails(hostname).data}. Attempted ${permutations}`);
    }
  }
  return result?.success;
}

/** 
 * @param {NS} ns 
 * @param {string} value
 * @returns {string[]}
*/
function permutateValues(ns, value) {
  //permutate the value so that an input of "abc" would return ["abc", "acb", "bac", "bca", "cab", "cba"]
  if (value.length <= 1) {
    return [value];
  }
  var permutations = [];
  for (var i = 0; i < value.length; i++) {
    var char = value[i];
    var remainingChars = value.slice(0, i) + value.slice(i + 1);
    var remainingPermutations = permutateValues(ns, remainingChars);
    for (var permutation of remainingPermutations) {
      permutations.push(char + permutation);
    }
  }
  return permutations;
}

/** 
 *  @param {NS} ns
 * @param {string} hostname - the name of the server to attempt to authorize on
 */
async function authenticateWithDefaultPasswords(ns, hostname) {
  var result;
  var password;
  for (var pass of DEFAULT_PASSWORDS) {
    result = await ns.dnet.authenticate(hostname, pass);
    if (result.success) {
      password = pass;
      publishPassword(ns, hostname, password);
      break;
    }
  }
  if (!result?.success) {
    log(ns, `Authentication failed on ${hostname}. Attempted all known default passwords.`);
  }
  return result?.success;
}


/** Authenticates on 'ZeroLogon' type servers, which always have an empty password.
 *  @param {NS} ns
 * @param {string} hostname - the name of the server to attempt to authorize on
 */
const authenticateWithNoPassword = async (ns, hostname) => {
  const result = await ns.dnet.authenticate(hostname, "");
  if (!result.success) {
    ns.print(`Failed to authenticated with no password to ${hostname}.`);
  }
  return result.success;
};
/** 
 *  @param {NS} ns
 * @param {string} hostname - the name of the server to attempt to authorize on
 */
const authenticateByTypingNumbersFromData = async (ns, hostname) => {
  var data = ns.dnet.getServerDetails(hostname).data;
  data = [...data.matchAll(/[0-9]/g)].map(m => m[0]).join("");
  var result = await ns.dnet.authenticate(hostname, data);
  if (result.success) {
    publishPassword(ns, hostname, data);
  } else {
    log(ns, `Authentication failed on ${hostname}. Data was ${ns.dnet.getServerDetails(hostname).data}. Attempted ${data}`);
  }
  return result.success;
}

/** 
 *  @param {NS} ns
 * @param {string} hostname - the name of the server to attempt to authorize on
 */
const authenticateByTypingNumbersFromHint = async (ns, hostname) => {
  var hint = ns.dnet.getServerDetails(hostname).passwordHint;
  hint = [...hint.matchAll(/[0-9]/g)].join("");
  var result = await ns.dnet.authenticate(hostname, hint);
  if (result.success) {
    publishPassword(ns, hostname, hint);
  } else {
    log(ns, `Authentication failed on ${hostname}. Hint was ${ns.dnet.getServerDetails(hostname).data}. Attempted ${hint}`);
  }
  return result.success;
}

// This lets you tab-complete putting "--tail" on the run command so you can see the script logs as it runs, if you want
// If you add support to the script to take other arguments, you can add them here as well for convenience
// @ts-ignore
export function autocomplete(data) {
  return ["--tail"];
}

/** 
 * @param {NS} ns 
 * @param {string} target 
 */
function exec(ns, target) {
  if (!ns.scp(ns.getScriptName(), target, "home")) {
    ns.print(`Failed to copy script to ${target}`);
  };
  ns.print(`Script requires ${ns.format.ram(ns.getScriptRam(ns.getScriptName(), "home"))} of RAM. Server has ${ns.format.ram(ns.getServerMaxRam(target) - ns.getServerUsedRam(target))} available.`);
  var pid = ns.exec(ns.getScriptName(), target, { preventDuplicates: true }, version);
  if (pid == 0) {
    ns.print(`Failed to start script on ${target}`);
  }
}

/** 
 * @param {NS} ns
 * @param {string} data 
 */
function log(ns, data) {
  var msg = `${ns.getHostname()} - ${ns.getScriptName()}[${version}] - ${data}\n`;
  ns.writePort(1, msg);
}

/** @param {NS} ns */
function updateScript(ns) {
  ns.scp(ns.getScriptName(), ns.getHostname(), "home");
  var latest = Number.parseInt(ns.read(ns.getScriptName()).split("\n")[0].replace("const version = ", "").replace(";", "").trim());
  if (latest > version) {
    log(ns, `Current version is ${version}, latest is ${latest}. Starting new version.`);
    ns.spawn(ns.getScriptName(), { spawnDelay: 1000 }, latest);
  }
}

/** 
 * @param {NS} ns 
 * @param {string} password 
 * @param {string} server 
 */
function publishPassword(ns, server, password) {
  //ns.writePort(2, [server, password]);
}

/** 
 * @param {string} numeral 
 * @param {NS} ns 
 */
function parseRomanNumerals(ns, numeral) {
  var result = 0;
  var values = [];
  for (var n of numeral) {
    switch (n) {
      case "I":
        values.push(1);
        break;
      case "V":
        values.push(5);
        break;
      case "X":
        values.push(10);
        break;
      case "L":
        values.push(50);
        break;
      case "C":
        values.push(100);
        break;
      case "D":
        values.push(500);
        break;
      case "M":
        values.push(1000);
        break;
    }
  }
  while (values.length > 0) {
    var cur = values.shift();
    if (typeof cur === "undefined") {
      break;
    }
    var next = values.shift();
    if (typeof next === "undefined") {
      next = 0;
    }
    if (cur >= next) {
      result += cur + next;
    } else {
      result += next - cur;
    }
  }

  return result;

}

/** 
 * @param {NS} ns 
 * @param {string} target
 * @return {string[]} path from home to the target server
 */
function getPathToServer(ns, target) {
  if (typeof ns != "object" || typeof ns.getServerMaxRam != "function") {
    throw new Error(`ns is not of type NS: ${ns}`);
  }
  if (typeof target != "string") {
    throw new Error(`target is not a string: ${target}`);
  }
  var result = [target];
  var node = target;
  while (node != "home") {
    var parent = ns.scan(node)[0];
    result.unshift(parent);
    node = parent;

  }
  return result;
}