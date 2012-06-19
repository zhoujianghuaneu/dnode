var dnode = require('../');
var net = require('net');
var test = require('tap').test;

test('stream', function (t) {
    t.plan(1);
    var port = Math.floor(Math.random() * 40000 + 10000);
    
    var server = net.createServer(function (stream) {
        var d = dnode({
            meow : function f (g) { g('cats') }
        });
        stream.pipe(d).pipe(stream);
    });
    server.listen(port);
    
    server.on('listening', function () {
        var d = dnode();
        d.on('remote', function (remote) {
            remote.meow(function (cats) {
                t.equal(cats, 'cats');
                server.close();
                d.end();
            });
        });
        
        var stream = net.connect(port);
        d.pipe(stream).pipe(d);
    });
});
