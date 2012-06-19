module.exports = function (argv) {
    var params = {};
    
    forEach([].slice.call(argv), function (arg) {
        if (typeof arg === 'string') {
            if (arg.match(/^\d+$/)) {
                params.port = parseInt(arg, 10);
            }
            else if (arg.match('^/')) {
                params.path = arg;
            }
            else {
                params.host = arg;
            }
        }
        else if (typeof arg === 'number') {
            params.port = arg;
        }
        else if (typeof arg === 'function') {
            params.block = arg;
        }
        else if (typeof arg === 'object') {
            if (arg && typeof arg.listen === 'function') {
                // servers can .listen()
                params.server = arg;
            }
            else if (arg && typeof arg.write === 'function') {
                // streams can .write()
                params.stream = arg;
            }
            else {
                // merge vanilla objects into params
                forEach(objectKeys(arg), function (key) {
                    params[key] = key === 'port'
                        ? parseInt(arg[key], 10)
                        : arg[key]
                    ;
                });
            }
        }
        else if (typeof arg === 'undefined') {
            // ignore
        }
        else {
            throw new Error('Not sure what to do about '
                + typeof arg + ' objects');
        }
    });
    
    return params;
};
