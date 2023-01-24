/**
 *
 * @param {Number} n layers of callstack to remove (defaults to only removing until the getCallstack function)
 * @returns {String} callstack
 */
function getCallstack(n = 0) {
	try {
		throw new Error("");
	} catch (e) {
		return e.stack
			.split("\n")
			.slice(2 + n)
			.join("\n");
	}
}

class IndexedObj {
	constructor(obj = {}, path = "") {
		this.obj = obj;
		this.search = [];
		this._update = () => {
			return this.obj;
		};
		this.path = path;
	}

	async set(path, value) {
		let readStatus = this._update("read");
		if (readStatus instanceof Promise) await readStatus;

		let success = this._set(path, value);

		let writeStatus = this._update("write");
		if (writeStatus instanceof Promise) await writeStatus;

		return success;
	}

	async get(path) {
		let writeStatus = this._update("write");
		if (writeStatus instanceof Promise) await writeStatus;

		return this._get(path);
	}

	export() {
		return {
			search: this.search,
		};
	}

	_get(path) {
		path = this._splitPath(path);
		let variable = this.obj;
		for (let i = 0; i < path.length; i++) {
			variable = variable[path[i]];
			if (variable === undefined) return undefined;
		}
		return variable;
	}

	_set(path, value) {
		path = this._splitPath(path);
		let variable = this.obj;
		for (let i = 0; i < path.length - 1; i++) {
			if (typeof variable[path[i]] != "object") return false;
			// throw new Error("variable at path'" + path.slice(0, i).join('.') + "' is not object'")
			variable = variable[path[i]];
		}
		variable[path[path.length - 1]] = value;
		return true;
	}

	_splitPath(s) {
		let res = [""];
		let idx = 0;

		for (let i = 0; i < s.length; i++) {
			if (s[i] === "\\") {
                if(s[i + 1] !== '.') {
                    res[idx] += '\\';
                    continue;
                }
                
				i++;
				res[idx] += s[i];
				continue;
			}

			if (s[i] === ".") {
				idx++;
				res[idx] = "";
				continue;
			}

			res[idx] += s[i];
		}

		return res;
	}

	/**
	 * Attach observer to an object, overwriting any previous observers
	 * Note: not compatible with this.update function currently
	 * Note 2: use with caution, may cause issues with pre-existing references to the object
	 * Note 3: Apply observers recursivly to the ROOT elements to prevent issues with references (only objects can be referenced)
	 * @param {String[]} observers list of observers to add ('read', 'write')
	 * @param {String} path
	 * @param {Function} callback
	 */
	addObserver(path, observers, callback) {
		let o = this._getRef(path);
		let v = o.parent[o.name];

		let object = {
			get() {
				return v;
			},
			set(value) {
				v = value;
			},

			enumerable: true,
			configurable: true,
		};

		if (typeof observers == "string") {
			if (observers == "*") {
				observers = ["read", "write"];
			} else {
				observers = [observers];
			}
		}

		if (observers.includes("read")) {
			object.get = function () {
				try {
					throw new Error("");
				} catch (e) {
					callback({
						stack: e.stack.split("\n").slice(2).join("\n"),
						value: v,
						operation: "read",
						path: path,
					});
				}
				return v;
			};
		}

		if (observers.includes("write")) {
			object.set = function (value) {
				try {
					throw new Error("");
				} catch (e) {
					callback({
						stack: e.stack.split("\n").slice(2).join("\n"),
						old: v,
						new: value,
						operation: "write",
						path: path,
					});
				}
				v = value;
			};
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

		Object.defineProperty(o.parent, o.name, object);
	}

	/**
	 * Start a new search
	 * @param {Object} search dictionary of search parameters
	 *  @arg {String|Number|Boolean} search.value value to search for
	 *  @arg {Object} search.type types to search for
	 *  @arg {String} search.operation operation to compare values with
	 *  @arg {Boolean} search.unsafe use if the object is not garunteed to be JSON stringifyable
	 *  @arg {Boolean} search.deepSearch search through non-enumerable properties as well (unsafe search only)
	 */
	newSearch(search) {
		this._update("read");
		if (search.unsafe) {
			this.search = this._unsafeSearchData(this.obj, this._parseSearch(search));
		} else {
			this.search = this._searchData(this.obj, this._parseSearch(search));
		}
	}

	refine(search) {
		let { value, type, operation } = this._parseSearch(search);

		let readStatus = this._update("read");
		if (readStatus instanceof Promise)
			if (!this.search) throw new Error("no search to refine");
		let res = [];

		for (let i = 0; i < this.search.length; i++) {
			let v = this._get(this.search[i][0]);
			if (v === undefined) continue;
			if (type[typeof v] && operation(v, value, this.search[i][1])) {
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
	 * @param {function(): object | function(): Promise<object>} read function to call when db is read, should return the this.updated object
	 * @param {function(object): void | function(object): Promise<void>} write function to call when db is written to, should return the this.updated object
	 */
	onUpdate(read, write) {
		this._update = async (op) => {
			switch (op) {
				case "read":
					this.obj = await read();
					break;
				case "write":
					let writeStatus = write(this.obj);
					if (writeStatus instanceof Promise) await writeStatus;

					break;
				default:
					throw new Error("invalid operation");
			}
		};
	}

	/**
	 * Edit the indexed object safely with automatic updates of sources if any
	 * @async
	 * @param {function(object): void} fn - function called with the object that was indexed
	 */
	async transform(fn) {
		let readStatus = this._update("read");
		if (readStatus instanceof Promise) await readStatus;

		fn(this.obj);

		let writeStatus = this._update("write");
		if (writeStatus instanceof Promise) await writeStatus;
	}

	/**
	 * Update the object from source if needed
	 * @async
	 */
	async read() {
		let readStatus = this._update("read");
		if (readStatus instanceof Promise) await readStatus;
	}

	_parseSearch(search) {
		let value = search.value;
		if (!isNaN(Number(value))) value = Number(value);

		let fn;

		// Params:
		// 1 - is the actual value
		// 2 - is the input value
		// 3 - is the old value (for refine operations)
		switch (search.operation) {
			case "*":
				fn = () => true;
				break;

			// path includes
			case ".":
				fn = (_0, b, _1, path) => path.includes(b);
				break;

			case "===":
				fn = (a, b) => a === b;
				break;

			case "==":
				fn = (a, b) => a == b;
				break;

			// Change operators a[0] is the old value, a[1] is the new value

			// Changed (can only be used in refine) [symbol /\]
			case "/\\":
				fn = (a, _, c) => a != c;
				break;

			// increased
			case "/\\>":
				fn = (a, _, c) => a > c;
				break;

			// decreased
			case "/\\<":
				fn = (a, _, c) => a < c;
				break;

			case "+-":
				fn = (a, b) => Math.abs(a - b[0]) < b[1];
				break;

			// Accurate to n significant figures
			// b[0] = value, b[1] = significant figures
			// The significant figures can be inferred by the amount of trailing zeros
			// ALL INPUTS ARE NUMBERS
			case "~~":
				function fixTo(n, places) {
					places = Math.pow(10, places);
					return Math.round((n + Number.EPSILON) * places) / places;
				}
				fn = (a, b) => fixTo(a, b[1]) == fixTo(b[0], b[1]);
				break;

			case "~":
				fn = (a, b) => b[0] <= a && a <= b[1];
				break;

			case ">=":
				fn = (a, b) => a >= b;
				break;

			case ">":
				fn = (a, b) => a > b;
				break;

			case "<=":
				fn = (a, b) => a <= b;
				break;

			case "<":
				fn = (a, b) => a < b;
				break;

			case "?":
				value = new String(value);
				fn = (a, b) => String(a).includes(b);
				break;

			case "/":
				value = new RegExp(value);
				fn = (a, b) => String(a).match(b);
				break;
		}

		return { value: value, operation: fn, type: search.type };
	}

	/**
	 * Search pre-sanitized data like parsed JSON
	 * @param {*} variable
	 * @param {*} search
	 * @param {*} path
	 * @param {*} depth
	 * @returns
	 */
	_searchData(variable, search, path = "", depth = 0) {
		let { value, type, operation } = search;
		let k = Object.keys(variable),
			res = [];

		for (let i = 0; i < k.length; i++) {
			let v = variable[k[i]];
			if (v === null || v === undefined) continue;

			const newPath =
				path + (path !== "" ? "." : "") + k[i].replaceAll(".", "\\.");

			if (typeof v === "object") {
				res.push(...this._searchData(v, search, newPath, depth + 1));
			} else if (type[typeof v] && operation(v, value, undefined, newPath)) {
				res.push([newPath, v]);
			}
		}

		return res;
	}

	/**
	 * Similar to searchData but works for direct object references, may be slower
	 * - handles functions
	 * - checks for cylic references
	 * - ignored accessor properties due to current lack of support for indexing them
	 *
	 * TODO:
	 */
	_unsafeSearchData(variable, search, path = "", depth) {
		let { value, type, operation, deepSearch } = search;
		let processed = new Set();
		let isNative = this._isNative;
		return deepSearch === true
			? deepSearchFn(variable, path, depth)
			: searchFn(variable, path, depth);

		function searchFn(variable, path, depth) {
			let k = Object.keys(variable),
				res = [];

			for (let i = 0; i < k.length; i++) {
				// MAY CAUSE ERROR: infinite recursion on accessor properties which are enumerable and return
				// a higher level object

				let v = variable[k[i]];

				if (
					v === null ||
					v === undefined ||
					isNative(v) ||
					v === window ||
					v === window.parent
				)
					continue;

				const newPath =
					path + (path !== "" ? "." : "") + k[i].replaceAll(".", "\\.");

				if (
					typeof v === "object" &&
					!(v instanceof Function) &&
					!processed.has(v)
				) {
					processed.add(v);
					res.push(...searchFn(v, newPath, depth + 1));
				} else if (type[typeof v] && operation(v, value, undefined, newPath)) {
					res.push([newPath, v]);
				}
			}

			return res;
		}

		// deeper, but slower search
		function deepSearchFn(variable, path, depth) {
			let k = Object.getOwnPropertyNames(variable),
				res = [];

			for (let i = 0; i < k.length; i++) {
				let descriptor = Object.getOwnPropertyDescriptor(variable, k[i]);
				let v = descriptor.value;

				if (
					v === null ||
					v === undefined ||
					isNative(v) ||
					v === window ||
					v === window.parent
				)
					continue;

				const newPath =
					path + (path !== "" ? "." : "") + k[i].replaceAll(".", "\\.");

				if (
					typeof v === "object" &&
					!(v instanceof Function) &&
					!processed.has(v)
				) {
					processed.add(v);
					res.push(...deepSearchFn(v, newPath, depth + 1));
				} else if (type[typeof v] && operation(v, value, undefined, newPath)) {
					res.push([newPath, v]);
				}
			}

			return res;
		}
	}

	_getRef(path) {
		path = this._splitPath(path, ".");
		let variable = this.obj;
		for (let i = 0; i < path.length - 1; i++) {
			if (typeof variable[path[i]] != "object")
				return new Error(
					"variable at path'" + path.slice(0, i).join(".") + "' is not object'"
				);
			variable = variable[path[i]];
		}
		return { parent: variable, name: path[path.length - 1] };
	}

	_isNative = (function () {
		// Used to resolve the internal `[[Class]]` of values
		var toString = Object.prototype.toString;

		// Used to resolve the decompiled source of functions
		var fnToString = Function.prototype.toString;

		// Used to detect host constructors (Safari > 4; really typed array specific)
		var reHostCtor = /^\[object .+?Constructor\]$/;

		// Compile a regexp using a common native method as a template.
		// We chose `Object#toString` because there's a good chance it is not being mucked with.
		var reNative = RegExp(
			"^" +
				// Coerce `Object#toString` to a string
				String(toString)
					// Escape any special regexp characters
					.replace(/[.*+?^${}()|[\]\/\\]/g, "\\$&")
					// Replace mentions of `toString` with `.*?` to keep the template generic.
					// Replace thing like `for ...` to support environments like Rhino which add extra info
					// such as method arity.
					.replace(
						/toString|(function).*?(?=\\\()| for .+?(?=\\\])/g,
						"$1.*?"
					) +
				"$"
		);

		function isNative(value) {
			var type = typeof value;
			return type == "function"
				? // Use `Function#toString` to bypass the value's own `toString` method
				  // and avoid being faked out.
				    reNative.test(fnToString.call(value))
				: // Fallback to a host object check because some environments will represent
				  // things like typed arrays as DOM methods which may not conform to the
				  // normal native pattern.
				    (value &&
						type == "object" &&
						reHostCtor.test(toString.call(value))) ||
						false;
		}

		// export however you want
		return isNative;
	})();
}

// UTF-8 binary decoder
// class Decoder {
//     constructor() {
//         this.LOWERCASE_START = 'a'.charCodeAt(0);
//         this.LOWERCASE_END = 'z'.charCodeAt(0);
//         this.UPPERCASE_START = 'A'.charCodeAt(0);
//         this.UPPERCASE_END = 'Z'.charCodeAt(0);
//     }

//     Uint8Decode(arr) {
//         let cache = [];
//         let idx = -1;
//         let lastChrType = null;

//         for(let i = 0; i < arr.length; i++) {
//             const byte = arr[i];

//             if(this.isEnglishLetter(byte)) {
//                 if(lastChrType === 'string') {
//                     cache[idx] += String.fromCharCode(byte);
//                 } else {
//                     idx += 1;
//                     cache[idx] = String.fromCharCode(byte);
//                     lastChrType = 'string'
//                 }
//             } else {
//                 if(lastChrType === 'int') {
//                     cache[idx].push(byte);
//                 } else {
//                     idx += 1;
//                     cache[idx] = [byte];
//                     lastChrType = 'int'
//                 }
//             }
//         }

//         let result = {};
//         for(let i = (typeof cache[0] === 'string' ? 0 : 1); i < cache.length; i+=2) {
//             result[cache[i]] = this.byteArrayToLong(cache[i+1]);
//         }

//         return result;
//     }

//     isEnglishLetter(byte) {
//         return (byte >= this.LOWERCASE_START && byte <= this.LOWERCASE_END) || (byte >= this.UPPERCASE_START && byte <= this.UPPERCASE_END);
//     }

//     /**
//      *
//      * @param {number[]} byteArray
//      * @returns {number}
//      */
//     byteArrayToLong(byteArray) {
//         var value = 0;
//         for ( var i = byteArray.length - 1; i >= 0; i--) {
//             value = (value * 256) + byteArray[i];
//         }

//         return value;
//     };
// }

// let dataDecoder = new Decoder();

// Decode/encode indexedDB data
class Decoder {
    constructor() {
        this.TYPE_OBJECT = Object.prototype.toString.call({});
        this.TYPE_ARRAY = Object.prototype.toString.call([]);
        this.TYPE_STRING = Object.prototype.toString.call('');
        this.TYPE_UINT8ARRAY = Object.prototype.toString.call(new Uint8Array);
        this.JSON_START = ['{', '['];
        this.JSON_START_CODE = ['{'.charCodeAt(0), '['.charCodeAt(0)];

        // store how to reverse the decoding
        this.JSON_STRING = 'JSONString';
        this.JSON_UINT8ARRAY = 'JSONUint8'

        this.TRANSFORM_STORAGE = Symbol('transform');
    }

    parse(data) {
        data = structuredClone(data);
        let transforms = this._parse(data, '');
        data[this.TRANSFORM_STORAGE] = transforms;
        return data;
    }

    _parse(variable, path) {
        let transforms = {};
        for(let i = 0, k = Object.keys(variable); i < k.length; i++) {
            let v = variable[k[i]];
			if (v === null || v === undefined) continue;

            let type = Object.prototype.toString.call(v);

            switch(type) {
                case this.TYPE_ARRAY:
                case this.TYPE_OBJECT:
                    const newPath = path + (path !== "" ? "." : "") + k[i].replaceAll(".", "\\.");
                    let transformList = this._parse(v, newPath);
                    transforms = Object.assign(transforms, transformList);
                    break;
                
                case this.TYPE_STRING:
                    // check if the string could be a JSON string
                    if(!this.JSON_START.includes(v[0])) break;

                    try {
                        let json = JSON.parse(v);

                        const newPath = path + (path !== "" ? "." : "") + k[i].replaceAll(".", "\\.");
                        transforms[newPath] = this.JSON_STRING;
                        variable[k[i]] = json;
                    } catch (e) {}
                    break;
                
                case this.TYPE_UINT8ARRAY:
                    // check if string could be a Uint8Array encoded JSON string
                    if(!this.JSON_START_CODE.includes(v[0])) break;

                    try {
                        let decoded = new TextDecoder().decode(v);
                        decoded = JSON.parse(decoded);

                        const newPath = path + (path !== "" ? "." : "") + k[i].replaceAll(".", "\\.");
                        transforms[newPath] = this.JSON_UINT8ARRAY;
                        variable[k[i]] = decoded;
                    } catch (e) {}
                    break;
            }
        }

        return transforms;
    }

	/**
	 * Attempt to parse all DB data into JS objects
	 * @param {object} db - db data from getAllDBs
	 */
	parseDBData(db) {
		db = structuredClone(db);
		for (let i in db) {
			let objStores = db[i];
			for (let j in objStores) {
				let keys = db[i][j];

				for (let k in keys) {
					let e = db[i][j][k];
					db[i][j][k] = this._attemptParse(e);
				}
			}
		}

		return db;
	}

	unparseDBData(db) {
		db = structuredClone(db);
		for (let i in db) {
			let objStores = db[i];
			for (let j in objStores) {
				let keys = db[i][j];

				for (let k in keys) {
					let e = db[i][j][k];
					db[i][j][k] = this._reverseParse(e);
				}
			}
		}

		return db;
	}

	_attemptParse(o) {
		if (typeof o == "string") {
			try {
				return ["json", JSON.parse(o)];
			} catch (e) {}
		}

		return ["none", o];
	}

	_reverseParse(o) {
		let type = o[0];
		let value = o[1];

		switch (type) {
			case "json":
				return JSON.stringify(value);

			case "none":
				return value;

			default:
				throw new Error("Invalid data type '" + type + "'");
		}
	}

    _splitPath(s) {
		let res = [""];
		let idx = 0;

		for (let i = 0; i < s.length; i++) {
			if (s[i] === "\\") {
                if(s[i + 1] !== '.') {
                    res[idx] += '\\';
                    continue;
                }
                
				i++;
				res[idx] += s[i];
				continue;
			}

			if (s[i] === ".") {
				idx++;
				res[idx] = "";
				continue;
			}

			res[idx] += s[i];
		}

		return res;
	}
}

let dataDecoder = new Decoder();