const KNOWN_SERVERS_PORT = 3;
const SEPARATOR = " --- ";
/**
 * @param {string} string
 * @returns {string[]}
 */
export function parseStringToKnownServersArray(string) {
    return string.split(",");
}

/**
 * @param {string[]} servers
 * @returns {string}
 */
export function parseKnownServersArrayToString(servers) {
    return servers.join(",");
}

/**
 * @param {string} passwordsString 
 * @returns {Map}
 */
export function parseStringToPasswordsMap(passwordsString) {
    var passwordsMap = new Map();
    var split = passwordsString.split("\n");
    for (var pass of split) {
        if (pass.includes(SEPARATOR)) {
            var values = pass.split(SEPARATOR);
            passwordsMap.set(values[0], values[1]);
        }
    }
    return passwordsMap;
}

/** @param {Map} passwords */
export function parsePasswordsMapToString(passwords) {
    var data = "";
    passwords.forEach((v, k) => data += k + SEPARATOR + v + "\n");
    return data;
}

/** @param {NS} ns 
 * @returns {string[]}
*/
export function readKnownServers(ns) {
    if (ns.peek(KNOWN_SERVERS_PORT) == "NULL PORT DATA") {
        return [];
    }
    var serversString = ns.peek(KNOWN_SERVERS_PORT);
    ns.print(`Known servers: ${serversString}`);
    return parseStringToKnownServersArray(serversString);
}