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