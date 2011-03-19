#!/usr/bin/env node
var DNode = require('../lib/dnode');

// server-side:
var server = DNode({
    moo : function (reply) { reply(100) },
}).listen(6060);

// client-side:
server.on('ready', function () {
    // The server might not be ready yet since client and server are in the same
    // file for this example.
    
    DNode.connect(6060, function (remote, conn) {
        remote.moo(function (x) {
            console.log(x);
            conn.end();
            server.close();
        });
    });
});
