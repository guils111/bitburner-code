import { readKnownServers } from "../lib/darknetHelper";

const DEFAULT_PASSWORDS = ["admin", "password", "0000", "12345"];
const COMMON_PASSWORDS = ["joshua", "cheese", "amanda", "summer", "love", "ashley", "6969", "nicole", "chelsea", "biteme", "matthew", "access", "yankees", "987654321", "dallas",
    "shadow", "master", "666666", "qwertyuiop", "123321", "mustang", "1234567890", "michael", "654321", "superman", "1qaz2wsx", "7777777", "121212", "0", "qazwsx"
];
const DOG_NAMES = ["fido", "spot", "rover", "max"];
const LOG_PORT = 1;
const PUBLISH_PASSWORD_PORT = 2;

/** @param {NS} ns */
export async function main(ns) {
    ns.clearLog();
    ns.disableLog("ALL");

    while (true) {
        // Get a list of all darknet hostnames directly connected to the current server
        const nearbyServers = ns.dnet.probe();

        const knownServers = readKnownServers(ns);

        if(!knownServers.includes("darkweb")) {
            publishPassword(ns, "darkweb", "");
        }

        // Attempt to authenticate with each of the nearby servers, and spread this script to them
        for (const hostname of nearbyServers) {
            ns.print(`Is server ${hostname} already knonw? ${knownServers.includes(hostname)}`);
            if (!knownServers.includes(hostname)) {
                const authenticationSuccessful = await serverSolver(ns, hostname);
                if (!authenticationSuccessful) {
                    continue; // If we failed to auth, just move on to the next server
                }
            }

        }

        await ns.sleep(5000);
    }
}

/** Attempts to authenticate with the specified server using the Darknet API.
 * @param {NS} ns
 * @param {string} hostname - the name of the server to attempt to authorize on
 */
export const serverSolver = async (ns, hostname) => {
    // Get key info about the server, so we know what kind it is and how to authenticate with it
    const details = ns.dnet.getServerAuthDetails(hostname);
    if (!details.isConnectedToCurrentServer || !details.isOnline) {
        ns.print(`Server ${hostname} is not online or not connected to this server.`);
        // If the server isn't connected or is offline, we can't authenticate
        return false;
    }
    // If you are already authenticated to that server with this script, you don't need to do it again
    if (details.hasSession) {
        ns.print(`Already has session with ${hostname}`);
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
    var auth = ns.dnet.getServerAuthDetails(hostname);
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
        }
    }
}

/** Attempts to authenticate with the specified server using the Darknet API.
 * @param {NS} ns
 * @param {string} hostname - the name of the server to attempt to authorize on
 */
async function authenticateByParsingRomanNumerals(ns, hostname) {
    var data = ns.dnet.getServerAuthDetails(hostname).data;
    var parsedData = parseRomanNumerals(ns, data);
    var result = await ns.dnet.authenticate(hostname, parsedData.toString());
    if (result.success) {
        publishPassword(ns, hostname, parsedData.toString());
    } else {
        log(ns, `Authentication failed on ${hostname}. Data was ${ns.dnet.getServerAuthDetails(hostname).data}. Attempted ${parsedData}`);
    }
    return result.success;
}

/** Attempts to authenticate with the specified server using the Darknet API.
 * @param {NS} ns
 * @param {string} hostname - the name of the server to attempt to authorize on
 */
async function authenticateByPermutatingData(ns, hostname) {
    var data = ns.dnet.getServerAuthDetails(hostname).data;
    var permutations = permutateValues(ns, data);
    for (var permutation of permutations) {
        var result = await ns.dnet.authenticate(hostname, permutation);
        if (result.success) {
            publishPassword(ns, hostname, permutation);
            return true;
        } else {
            log(ns, `Authentication failed on ${hostname}. Data was ${ns.dnet.getServerAuthDetails(hostname).data}. Attempted ${permutations}`);
        }
    }
    return result.success;
}

/** @param {NS} ns 
 * @param {string} value */
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
            break;
        }
    }
    if (result.success) {
        publishPassword(ns, hostname, password);
    } else {
        log(ns, `Authentication failed on ${hostname}. Attempted all known default passwords.`);
    }
    return result.success;
}


/** Authenticates on 'ZeroLogon' type servers, which always have an empty password.
 *  @param {NS} ns
 * @param {string} hostname - the name of the server to attempt to authorize on
 */
const authenticateWithNoPassword = async (ns, hostname) => {
    const result = await ns.dnet.authenticate(hostname, "");
    ns.print(`Autenthicate on ${hostname} with no password.`);
    publishPassword(ns, hostname, "");
    return result.success;
};
/** 
 *  @param {NS} ns
 * @param {string} hostname - the name of the server to attempt to authorize on
 */
const authenticateByTypingNumbersFromData = async (ns, hostname) => {
    var data = ns.dnet.getServerAuthDetails(hostname).data;
    data = [...data.matchAll("[0-9]")].join("");
    var result = await ns.dnet.authenticate(hostname, data);
    if (result.success) {
        publishPassword(ns, hostname, data);
    } else {
        log(ns, `Authentication failed on ${hostname}. Data was ${ns.dnet.getServerAuthDetails(hostname).data}. Attempted ${data}`);
    }
    return result.success;
}

/** 
 *  @param {NS} ns
 * @param {string} hostname - the name of the server to attempt to authorize on
 */
const authenticateByTypingNumbersFromHint = async (ns, hostname) => {
    var hint = ns.dnet.getServerAuthDetails(hostname).passwordHint;
    hint = [...hint.matchAll("[0-9]")].join("");
    var result = await ns.dnet.authenticate(hostname, hint);
    if (result.success) {
        publishPassword(ns, hostname, hint);
    } else {
        log(ns, `Authentication failed on ${hostname}. Hint was ${ns.dnet.getServerAuthDetails(hostname).data}. Attempted ${hint}`);
    }
    return result.success;
}

// This lets you tab-complete putting "--tail" on the run command so you can see the script logs as it runs, if you want
// If you add support to the script to take other arguments, you can add them here as well for convenience
export function autocomplete(data) {
    return ["--tail"];
}

/** @param {NS} ns */
function log(ns, data) {
    var msg = `${ns.getHostname()} - ${ns.getScriptName()}[${version}] - ${data}\n`;
    ns.writePort(LOG_PORT, msg);
}

/** @param {NS} ns */
function publishPassword(ns, server, password) {
    ns.print(`Publishing new password for ${server}`);
    ns.writePort(PUBLISH_PASSWORD_PORT, [server, password]);
}

/** @param {string} numeral */
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



