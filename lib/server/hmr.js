"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let currentServers = {};
function setServerHmr(newServer) {
    let tag = newServer.opts.tag || "__default__";
    let currentServer = currentServers[tag];
    if (!currentServer) {
        currentServers[tag] = newServer;
    }
    else {
        newServer.nodeHttpServer = currentServer.nodeHttpServer;
        newServer._nextApp = currentServer._nextApp;
    }
}
exports.setServerHmr = setServerHmr;
//# sourceMappingURL=hmr.js.map