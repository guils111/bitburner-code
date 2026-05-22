import { readKnownServers, parseStringToPasswordsMap } from "../lib/darknetHelper.js";

const READ_PASSWORDS_PORT = 4;
const KNOWN_SERVERS_PORT = 3;
const PASSWORD_BREAKER_SCRIPT = "darknet/passwordBreaker.js";
const LOGGER_SCRIPT = "darknet/logger.js";
const PASSWORD_SCRIPT = "darknet/passwordHandler.js";

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.clearLog();

    if (!ns.scriptRunning(LOGGER_SCRIPT, "home")) {
        ns.exec(LOGGER_SCRIPT, "home");
    }

    if (!ns.scriptRunning(PASSWORD_SCRIPT, "home")) {
        ns.exec(PASSWORD_SCRIPT, "home");
    }

    await ns.sleep(2000);

    while (true) {
        var knownServers = [];
        var knownPasswords = new Map();
        if (ns.peek(KNOWN_SERVERS_PORT) != "NULL PORT DATA") {
            knownServers = readKnownServers(ns);
            knownPasswords = readKnownPasswords(ns);

            connectToOnlineServers(ns, knownServers, knownPasswords);
            openCacheFiles(ns, knownServers);
        }

        startPasswordBreaker(ns, knownServers);

        await ns.sleep(1000);
    }
}
/**
 * @param {NS} ns 
 * @param {string[]} servers 
 */
function killAllRunningScripts(ns, servers) {
    servers.filter((server) => ns.dnet.getServerAuthDetails(server).hasSession)
        .forEach((server) => {
            ns.killall(server);
        });
}

/**
 * @param {NS} ns 
 * @param {string[]} servers 
 * @param {Map} passwords
 */
function connectToOnlineServers(ns, servers, passwords) {
    servers.filter((a) => ns.dnet.getServerAuthDetails(a).isOnline && !ns.dnet.getServerAuthDetails(a).hasSession)
        .forEach((a) => {
            var result = ns.dnet.connectToSession(a, passwords.get(a));
            if (!result.success) {
                ns.print(`ERROR - Failed to connect to ${a} using password ${passwords.get(a)}`);
            }
        });
}

/**
 *  @param {NS} ns 
 * @param {string[]} servers
*/
function openCacheFiles(ns, servers) {
    servers.filter((a) => ns.dnet.getServerAuthDetails(a).hasSession)
        .forEach((a) => {
            ns.ls(a).filter((file) => file.endsWith(".cache"))
                .forEach((file) => {
                    var result = ns.dnet.openCache(file);
                    if (!result.success) {
                        ns.print(`ERROR - Could not open cache ${file} at ${a}`);
                    }
                })
        });
}
/**
 * 
 * @param {NS} ns 
 * @param {string[]} servers 
 */
function startPasswordBreaker(ns, servers) {
    servers?.filter((server) => ns.dnet.getServerAuthDetails(server).hasSession && !ns.isRunning(PASSWORD_BREAKER_SCRIPT, server))
        .forEach((server) => {
            if (!ns.scp(PASSWORD_BREAKER_SCRIPT, server, "home")) {
                ns.print(`ERROR - Could not copy ${PASSWORD_BREAKER_SCRIPT} to ${server}.`)
            } else {
                var pid = ns.exec(PASSWORD_BREAKER_SCRIPT, server, { preventDuplicates: true });
                if (pid == 0) {
                    ns.print(`ERROR - Could not start ${PASSWORD_BREAKER_SCRIPT} at ${server}`);
                }
            }
        });
    ns.exec(PASSWORD_BREAKER_SCRIPT, "home", { preventDuplicates: true });
}

/**
 * @param {NS} ns 
 * @returns {Map}
 */
function readKnownPasswords(ns) {
    var passwordsString = ns.peek(READ_PASSWORDS_PORT);
    return parseStringToPasswordsMap(passwordsString);
}