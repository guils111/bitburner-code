import {parseStringToPasswordsMap, parsePasswordsMapToString, parseKnownServersArrayToString} from "../lib/darknetHelper";

const READ_PASSWORDS_PORT = 2;
const PUBLISH_PASSWORDS_PORT = 4;
const FILE = "darknet/passwords.txt"
const PUBLISH_SERVERS_PORT = 3;


/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.clearLog();
    var knowPasswords = new Map();
    ns.clearPort(PUBLISH_PASSWORDS_PORT);
    ns.clearPort(PUBLISH_SERVERS_PORT);
    while (true) {
        knowPasswords = new Map([...knowPasswords].filter((password, server) => ns.dnet.getServerAuthDetails(server).isOnline));
        var newPassword = false;
        var data = ns.readPort(READ_PASSWORDS_PORT);
        while (data != "NULL PORT DATA") {
            newPassword = true;
            knowPasswords.set(data[0], data[1]);
            data = ns.readPort(READ_PASSWORDS_PORT);
        }
        if (newPassword) {
            publishPasswords(ns, knowPasswords);
            publishServers(ns, knowPasswords);
        }
        await ns.sleep(1000);
    }
}


/** @param {NS} ns 
 * @returns {Map}
*/
function readFile(ns) {
    var fileData = ns.read(FILE);
    var passMap = parseStringToPasswordsMap(fileData);
    return passMap;
}



/** @param {NS} ns 
 * @param {Map} passwords
*/
function writeFile(ns, passwords) {
    ns.write(FILE, parsePasswordsMapToString(passwords), "w");
}


/** @param {NS} ns 
 * @param {Map} passwords
*/
function publishPasswords(ns, passwords) {
    ns.readPort(PUBLISH_PASSWORDS_PORT);
    ns.writePort(PUBLISH_PASSWORDS_PORT, parsePasswordsMapToString(passwords));
    
}

/** @param {NS} ns 
 * @param {Map} passwords
*/
function publishServers(ns, passwords) {
    var servers = passwords.keys().toArray();
    ns.readPort(PUBLISH_SERVERS_PORT);
    ns.writePort(PUBLISH_SERVERS_PORT, parseKnownServersArrayToString(servers));
    ns.print(`Published updated list of servers.`);
}