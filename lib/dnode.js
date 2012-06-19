var protocol = require('dnode-protocol');
var parseArgs = require('./parse_args');
var Stream = require('stream');
var util = require('util');
var json = typeof JSON === 'object' ? JSON : require('jsonify');

module.exports = dnode;
util.inherits(dnode, Stream);

function dnode (cons, opts) {
    if (!opts) opts = {};
    
    var self = this;
    var proto = self.proto = protocol(cons).create();
    proto.on('remote', function (remote) {
        self.emit('remote', remote, self);
    });
    
    self.stack = [];
    self.readable = true;
    self.writable = true;
    
    self._line = '';
    
    proto.on('request', function (req) {
        if (!self.readable) return;
        
        if (opts.emit === 'object') {
            self.emit('data', req);
        }
        else self.emit('data', json.stringify(req) + '\n');
    });
    
    process.nextTick(function () {
        proto.start();
    });
}

dnode.prototype.use = function (middleware) {
    this.stack.push(middleware);
    return this;
};

dnode.prototype.write = function (buf) {
    var row;
    
    if (buf && typeof buf === 'object'
    && buf.constructor && buf.constructor.name === 'Buffer') {
        // treat like a buffer
        for (var i = 0; i < buf.length; i++) {
            if (buf[i] === 0x0a) {
                try { row = json.parse(this._line) }
                catch (err) { return this.end() }
                
                this.proto.handle(row);
                this._line = '';
            }
            else this._line += String.fromCharCode(buf[i])
        }
    }
    else if (buf && typeof buf === 'object') {
        // .isBuffer() without the Buffer
        // Use this to pipe JSONStream.parse() streams.
        this.proto.handle(buf);
        return;
    }
    else {
        if (typeof buf !== 'string') buf = String(buf);
        
        for (var i = 0; i < buf.length; i++) {
            if (buf.charCodeAt(i) === 0x0a) {
                try { row = json.parse(this._line) }
                catch (err) { return this.end() }
                
                this.proto.handle(row);
                this._line = '';
            }
            else this._line += buf.charAt(i)
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
