/**
 * 
 * @param {Number} n layers of callstack to remove (defaults to only removing until the getCallstack functino)
 * @returns {String} callstack 
 */
function getCallstack(n = 0) {
    try { throw new Error('') } catch (e) {
        return e.stack.split('\n').slice(2+n).join('\n');
    }
}

class IndexedObj {
    constructor(obj, path) {
        this.obj = obj;
        this.search = [];
        this.update = () => { return this.obj; };
        this.path = path;
    }

    set(path, value) {
        this.update('read');
        path = path.split('.');
        let variable = this.obj;
        for(let i = 0; i < path.length-1; i++) {
            if(typeof variable[path[i]] != 'object') return new Error("variable at path'" + path.slice(0, i).join('.') + "' is not object'")
            variable = variable[path[i]];
        }
        variable[path[path.length-1]] = value;
        this.update('write');
        return true;
    }
    
    get(path) {
        this.update('read');
        path = path.split('.'); 
        let variable = this.obj;
        for(let i = 0; i < path.length; i++) {
            variable = variable[path[i]];
            if(variable === undefined) return undefined;
        }
        return variable;
    }
    
    /**
     * Attach observer to an object, overwriting any previous observers 
     * Note: not compatible with this.update function currently
     * @param {String[]} observers list of observers to add ('read', 'write')
     * @param {String} path 
     * @param {Function} callback 
     */
    addObserver(path, observers, callback) {
        let o = this._getRef(path);
        let v = o.parent[o.name];

        let object = {
            get() { return v },
            set(value) { v = value },
            
            enumerable: true,
            configurable: true
        }

        if(typeof observers == 'string') {
            if(observers == '*') {
                observers = ['read', 'write'];
            } else {
                observers = [observers];
            }
        }

        if(observers.includes('read')) {
            object.get = function() {
                try { throw new Error('') } catch (e) {
                    callback({
                        stack:e.stack.split('\n').slice(2).join('\n'),
                        value: v,
                        operation: 'read',
                        path: path
                    });
                }
                return v
            }
        }

        if(observers.includes('write')) {
            object.set = function(value) {
                try { throw new Error('') } catch (e) {
                    callback({
                        stack:e.stack.split('\n').slice(2).join('\n'),
                        old: v,
                        new: value,
                        operation: 'write',
                        path: path
                    });
                }
                v = value;
            }
        }

        // experimental feature, will not be available for now (might cause errors as it mutates the object)
        //if(observers.includes('call')) {
        //    if(typeof v !== 'function') throw new Error('cannot attach call observer to uncallable object');
        //    let fn = v;
        //    v = function(...args) {
        //        try { throw new Error('') } catch (e) {
        //            callback({
        //                stack:e.stack.split('\n').slice(2).join('\n'),
        //                args: args,
        //                operation: 'call',
        //                path: path
        //            });
        //        }
        //        fn(...args)
        //    }
        //}

        Object.defineProperty(o.parent, o.name, object)
    }

    /**
     * 
     * @param {Object} search dictionary of search parameters
     *  @arg {String|Number|Boolean} search.value value to search for 
     *  @arg {Object} search.type types to search for
     *  @arg {String} search.operation operation to compare values with 
     */
    newSearch(search) {
        this.update('read');
        this.search = this._searchData(this.obj, this._parseSearch(search));
    }

    refine(search) {
        let {value, type, operation} = this._parseSearch(search);
        this.update('read');
        if(!this.search) throw new Error('no search to refine');
        let res = [];        

        for(let i = 0; i < this.search.length; i++) {
            let v = this.get(this.search[i][0])
            if(v === undefined) continue;
            if(operation(v, value) && type[typeof v]) {
                this.search[i][1] = v; // ensure that the result list is accurate
                res.push(this.search[i]);
            } 
        }

        this.search = res;
    }

    removeObserver(path) {
        let o = this._getRef(path);
        let v = o.parent[o.name];

        o.parent[o.name] = v;
    }

    /**
     * set this.update function for things that do not this.update automatically like storage
     * @param {Function} read function to call when db is read, should return the this.updated object 
     * @param {Function} write function to call when db is written to, should return the this.updated object 
     */
    onUpdate(read, write) {
        this.update = (op) => {
            switch (op) {
                case 'read':
                    this.obj = read();
                    break;
                case 'write':
                    write(this.obj);
                    break;
                default:
                    throw new Error('invalid operation')
                    break;
            }
            
        }
    }

    _parseSearch(search) {
        let value = search.value;
        if(isNaN(Number(value))) value = Number(value);

        let fn;

        // a is the actual value
        // b is the input value
        switch(search.operation) {
            case '===':
                fn = (a, b) => a === b;
            break;

            case '==':
                fn = (a, b) => a == b;
            break;

            case '+-':
                fn = (a, b) => Math.abs(a - b[0]) < b[1];
            break;

            case '~~':
            break;

            case '~':
                fn = (a, b) => b[0] <= a && a <= b[1];
            break;


            case '>=':
                fn = (a, b) => a >= b;
            break;

            case '>':
                fn = (a, b) => a > b;
            break;

            case '<=':
                fn = (a, b) => a <= b;
            break;

            case '<':
                fn = (a, b) => a < b;
            break;

            case '?':
                value = new String(value);
                fn = (a, b) => String(a).includes(b);
            break;

            case '/':
                value = new RegExp(value);
                fn = (a, b) => String(a).match(b);
            break;
        }

        return {value: value, operation: fn, type: search.type};
    }

    _searchData(variable, search, path = '', depth=0) {
        if(depth == 100) return [];
        let {value, type, operation} = search;
        let k = Object.keys(variable), res = [];
        for(let i = 0; i < k.length; i++) {
            let v = variable[k[i]];
            if(variable === v || v == null || v == undefined || v === window || v === self || this._isNative(v)) continue;
            if(typeof v === 'object' && !(v instanceof Function)) {
                res.push(...this._searchData(v, search, path + (path !== '' ? '.' : '') + k[i], depth+1));
            } else if(type[typeof v] && operation(v, value)) {
                res.push([path + (path !== '' ? '.' : '') + k[i], v]);
            }
        }
    
        return res;
    }

    _getRef(path) {
        path = path.split('.');
        let variable = this.obj;
        for(let i = 0; i < path.length-1; i++) {
            if(typeof variable[path[i]] != 'object') return new Error("variable at path'" + path.slice(0, i).join('.') + "' is not object'")
            variable = variable[path[i]];
        }
        return {parent: variable, name: path[path.length-1]};
    }

    _isNative = (function() {

        // Used to resolve the internal `[[Class]]` of values
        var toString = Object.prototype.toString;
        
        // Used to resolve the decompiled source of functions
        var fnToString = Function.prototype.toString;
        
        // Used to detect host constructors (Safari > 4; really typed array specific)
        var reHostCtor = /^\[object .+?Constructor\]$/;
    
        // Compile a regexp using a common native method as a template.
        // We chose `Object#toString` because there's a good chance it is not being mucked with.
        var reNative = RegExp('^' +
          // Coerce `Object#toString` to a string
            String(toString)
          // Escape any special regexp characters
            .replace(/[.*+?^${}()|[\]\/\\]/g, '\\$&')
          // Replace mentions of `toString` with `.*?` to keep the template generic.
          // Replace thing like `for ...` to support environments like Rhino which add extra info
          // such as method arity.
            .replace(/toString|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
        );
        
        function isNative(value) {
            var type = typeof value;
            return type == 'function'
            // Use `Function#toString` to bypass the value's own `toString` method
            // and avoid being faked out.
            ? reNative.test(fnToString.call(value))
            // Fallback to a host object check because some environments will represent
            // things like typed arrays as DOM methods which may not conform to the
            // normal native pattern.
            : (value && type == 'object' && reHostCtor.test(toString.call(value))) || false;
        }
        
        // export however you want
        return isNative;
    }());
}