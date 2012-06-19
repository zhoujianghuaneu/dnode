var protocol = require('dnode-protocol');
var Stream = require('stream');
var json = typeof JSON === 'object' ? JSON : require('jsonify');

module.exports = dnode;
dnode.prototype = {};
(function () { // browsers etc
    for (var key in Stream.prototype) {
        dnode.prototype[key] = Stream.prototype[key];
    }
})();

function dnode (cons, opts) {
    Stream.call(this);
    var self = this;
    
    if (!opts) opts = {};
    self.opts = opts;
    
    self.cons = typeof cons === 'function'
        ? cons
        : function () { return cons || {} }
    ;
    
    self.readable = true;
    self.writable = true;
    self._line = '';
    
    process.nextTick(function () {
        if (self._ended) return;
        self._start();
    });
}

dnode.prototype._start = function () {
    var self = this;
    
    var proto = self.proto = protocol(function (remote) {
        if (self._ended) return;
        
        var ref = self.cons.call(this, remote, self);
        if (typeof ref !== 'object') ref = this;
        
        self.emit('local', ref, self);
        
        return ref;
    }).create();
    
    proto.on('remote', function (remote) {
        self.emit('remote', remote, self);
        self.emit('ready'); // backwards compatability, deprecated
    });
    
    proto.on('request', function (req) {
        if (!self.readable) return;
        
        if (self.opts.emit === 'object') {
            self.emit('data', req);
        }
        else self.emit('data', json.stringify(req) + '\n');
    });
    
    proto.on('fail', function (err) {
        // errors that the remote end was responsible for
        self.emit('fail', err);
        self.end();
    });
    
    proto.on('error', function (err) {
        // errors that the local code was responsible for
        self.emit('error', err);
    });
    
    process.nextTick(function () {
        proto.start();
    });
};

dnode.prototype.write = function (buf) {
    var self = this;
    var row;
    
    if (buf && typeof buf === 'object'
    && buf.constructor && buf.constructor.name === 'Buffer') {
        // treat like a buffer
        for (var i = 0; i < buf.length; i++) {
            if (buf[i] === 0x0a) {
                try { row = json.parse(self._line) }
                catch (err) { return self.end() }
                
                self.proto.handle(row);
                self._line = '';
            }
            else self._line += String.fromCharCode(buf[i])
        }
    }
    else if (buf && typeof buf === 'object') {
        // .isBuffer() without the Buffer
        // Use self to pipe JSONStream.parse() streams.
        self.proto.handle(buf);
    }
    else {
        if (typeof buf !== 'string') buf = String(buf);
        
        for (var i = 0; i < buf.length; i++) {
            if (buf.charCodeAt(i) === 0x0a) {
                try { row = json.parse(self._line) }
                catch (err) { return self.end() }
                
                self.proto.handle(row);
                self._line = '';
            }
            else self._line += buf.charAt(i)
        }
    }
};

dnode.prototype.end = function () {
    if (this._ended) return;
    this._ended = true;
    this.writable = false;
    this.readable = false;
    this.emit('end');
};

dnode.prototype.destroy = function () {
    this.end();
};
