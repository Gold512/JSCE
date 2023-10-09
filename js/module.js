// Allow execution of custom modules
function askForFile(ext) {
    if(ext && typeof Object.prototype.toString.call(ext) == '[object Array]') ext = ext.join(',');
    let e = document.createElement('input');
    e.setAttribute('type', 'file');

    if(ext) e.setAttribute('accept', ext);

    e.click();

    return new Promise(function(resolve, reject) {
        e.addEventListener('input', ev => {
            if(e.files) {
                resolve(e.files);
                return;
            }

            reject('no file selected');
        })
    })
}

async function getParsedFile() {
    const files = await askForFile('.js');
    const file = files[0];
    if(!file) return null;

    let text = await (new Blob([file])).text();
    let name = file.name;

    return {
        name,
        text
    }
}

function runModule(name, script) {
    if(executedModules.hasOwnProperty(name)) return;

    const prerun = 'const window = script.window, document = script.document'

	try {
		let fn = eval(`(function(script){${prerun};${script}})`);
        const scriptObj = new Module(name, window.parent)
		fn(scriptObj);
        
        // auto bind hotkeys if unbinded 
        if(!scriptObj.binded) scriptObj.bindHotkeysToElement();

	} catch (e) {
		alert(e);
	}
}

/**
 * Represent the hotkey as a string
 * @param {object} e - object describing the hotkey 
 * @param {Boolean} e.altKey - whether or not the alt 
 * @param {Boolean} e.ctrlKey - whether or not the ctrl key is held down 
 * @param {Boolean} e.metaKey - whether or not the meta key is held down
 * @param {Boolean} e.shiftKey - whether or not the shift key is held down 
 * @param {Boolean} e.code - the key code of the hotkey
 * @param {Boolean} name - whether to serialize the hotkey to a human-readable string 
 */
function serializeHotkey(e, name = false) {
    if(name) return `${e.altKey ? 'Alt+' : ''}${e.ctrlKey ? 'Ctrl+' : ''}${e.metaKey ? 'Meta+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.code}`; 
    return `${e.altKey ? '!' : ''}${e.ctrlKey ? '^' : ''}${e.metaKey ? '$' : ''}${e.shiftKey ? '+' : ''}${e.code}`;
}

const executedModules = {}

function* iterateParams(params) {
    if(typeof params !== 'object') throw new Error('invalid param of type ' + ({}).toString.call(params));
    if(Array.isArray(params)) {
        for (let i = 0; i < params.length; i++) {
            const s = params[i].split(':');
            s.reverse();
            yield s;
        }
        return;
    }

    for(let i in params) {
        yield [params[i], i];
    }
}

// allow construction of basic UI for the module 
class Module {
    constructor(name, ctx) {
        if(executedModules.hasOwnProperty(name)) {
            executedModules[name]._unload();
        }

        executedModules[name] = this;

        this.name = name;
        this.hotkeys = {};

        this.initialized = false;

        this._changeStore = {};

        // helper properties
        this.window = ctx;
        this.document = ctx.document;
		this.speeder = window.speederModule;
        this.JSBot = JSBot;
        this.ScreenReader = ScreenReader;

        this.binded = false;
    }

    /**
     * Expose function to allow user to bind a hotkey to bind
     * @param {string} name
     * @param {function|Object.<keyof HTMLElementEventMap>} fn the function(s) to bind
     * @param {string[]} params the parameters of the function
     */
    bindFunction(name, fn, params = []) {
        if(!this.initialized) this._createHotkeyElements();

        if(this.moduleHotkeys.childElementCount > 0) {
            let horizontal = document.createElement('div');
            horizontal.className = 'horizontal-divider';
            this.moduleHotkeys.appendChild(horizontal);
        }

        let hotkeyContainer = document.createElement('div');
        hotkeyContainer.className = 'hotkey-container';

        let hotkeyLabel = document.createElement('span');
        hotkeyLabel.innerText = name;
        hotkeyContainer.appendChild(hotkeyLabel);

        let divider = document.createElement('div');
        divider.classList.add('vertical-divider');
        divider.style.marginLeft = '5px';
        divider.style.marginRight = '5px';
        hotkeyContainer.appendChild(divider);

        let hotkeyInput = document.createElement('input');
        hotkeyInput.placeholder = 'Hotkey';
        hotkeyInput.style.width = '12em';

        let lastHotkey;

        let excludedKeys = ['Alt', 'Control', 'Shift', 'Meta'];

        hotkeyInput.addEventListener('keydown', ev => {
            ev.preventDefault();
            ev.stopPropagation();

            if(excludedKeys.includes(ev.key)) return;

            // escape to unbind 
            if(ev.key === 'Escape') {
                delete this.hotkeys[lastHotkey];
                ev.currentTarget.value = '';
                return;
            }

            let hotkeyStr = serializeHotkey(ev);

            // prevent from binding to jsce hotkey
            if(hotkeyStr === '!^+KeyC') return;

            // prevent from overwriting existing hotkeys
            if(this.hotkeys.hasOwnProperty(hotkeyStr)) {
                ev.currentTarget.classList.add('error');
                setTimeout(e => e.classList.remove('error'), 500, ev.currentTarget);
                return;
            }

            ev.currentTarget.value = serializeHotkey(ev, true);
            if(lastHotkey) delete this.hotkeys[lastHotkey];

            lastHotkey = hotkeyStr;

            this.hotkeys[hotkeyStr] = {params: paramInputs};

            if(typeof fn === 'function') {
                this.hotkeys[hotkeyStr].keydown = fn;
            } else {
                for(let i in fn) {
                    this.hotkeys[hotkeyStr][i] = fn[i];
                }
            }
            
        }, true);

        hotkeyContainer.appendChild(hotkeyInput);

        const paramInputs = [];

        // format: ['NAME:TYPE' or 'TYPE')[] or Record<string, 'TYPE'>
        for(const [type, name] of iterateParams(params)) {
            let input = document.createElement('input');
            input.dataset.type = type;
            input.placeholder = name ? `${name}(${type})` : type;
            input.style.marginLeft = '5px';

            switch(type) {
                case 'duration':
                    input.addEventListener('input', ev => {
                        let currentParsedDuration = parseDuration(ev.currentTarget.value);
                        if(isNaN(currentParsedDuration) && ev.currentTarget.value !== '') {
                            ev.currentTarget.classList.add('error');
                        } else {
                            ev.currentTarget.classList.remove('error');
                        }
                    });
                    input.type = 'text';
                    break;

                case 'number':
                    input.type = 'number';
                    break;

                case 'boolean':
                    const span = document.createElement('span');
                    span.innerText = name;
                    hotkeyContainer.appendChild(span);

                    input.type = 'checkbox';
                    break;
                
                default: 
                    input.type = 'text';
            }

            hotkeyContainer.appendChild(input);
            paramInputs.push(input);
        }

        this.moduleHotkeys.appendChild(hotkeyContainer);
    }

    /**
     * Bind hotkeys to the page so they can be used
     * @param {('document'|'auto')|string} [bindingElement] - 'document', 'auto' or a query selector string
     */
    bindHotkeysToElement(bindingElement = 'document') {
        if(this.binded) throw new Error('Cannot bind hotkeys twice');

        let targetElement;
        if(bindingElement === 'document') {
            targetElement = this.document;
        } else if(bindingElement === 'auto') {
            targetElement = this._getTargetElement();
        } else if(typeof bindingElement === 'string') {
            targetElement = window.parent.document.querySelector(this.bindingElement);
        }
        
        const hotkeys = this.hotkeys;

        function genericBinding(eventName, hotkeyStr) {
            const fn = hotkeys[hotkeyStr][eventName];
            const params = hotkeys[hotkeyStr].params;

            if(!fn) return;
            
            const paramValues = [];
            for(let i = 0; i < params.length; i++) {
                const element = params[i];
                switch(element.dataset.type) {
                    case 'number':
                        paramValues[i] = Number(element.value);
                        break;
                    case 'duration':
                        paramValues[i] = parseDuration(element.value);
                        break;
                    
                    case 'boolean':
                        paramValues[i] = element.checked;
                        break;

                    default:
                        paramValues[i] = element.value
                }
            }

            fn(...paramValues);
        }
        
        function onKeydown(ev) {
            const hotkeyStr = serializeHotkey(ev);
            if(!hotkeys.hasOwnProperty(hotkeyStr)) return;
            
            if(hotkeys[hotkeyStr].hasOwnProperty('keyup') && ev.repeat) return;
            genericBinding('keydown', hotkeyStr);
        }

        function onKeyup(ev) {
            const hotkeyStr = serializeHotkey(ev);
            if(!hotkeys.hasOwnProperty(hotkeyStr)) return;

            genericBinding('keyup', hotkeyStr);
        }

        targetElement.addEventListener('keydown', onKeydown);
        targetElement.addEventListener('keyup', onKeyup);

        this._changeStore.binding = [targetElement, onKeydown, onKeyup];
        this.binded = true;
    }

    createToggleButton(name, fn) {
        if(!this.initialized) this._createHotkeyElements();

        if(this.moduleHotkeys.childElementCount > 0) {
            let horizontal = document.createElement('div');
            horizontal.className = 'horizontal-divider';
            this.moduleHotkeys.appendChild(horizontal);
        }

        let hotkeyContainer = document.createElement('div');
        hotkeyContainer.className = 'hotkey-container';

        let hotkeyLabel = document.createElement('span');
        hotkeyLabel.innerText = name;
        hotkeyContainer.appendChild(hotkeyLabel);

        let btn = document.createElement('button');
        btn.style.marginLeft = '5px';
        btn.innerText = 'OFF'

        let state = false;
        btn.addEventListener('click', () => {
            state = !state;
            btn.innerText = state ? 'ON' : 'OFF';
            if(fn.click) fn.click();
            
            if(state) {
                if(fn.on) fn.on();
            } else if(fn.off) {
                fn.off();
            }
        });
        hotkeyContainer.appendChild(btn);

        this.moduleHotkeys.appendChild(hotkeyContainer);
    }

    // helper functions 

    requestSpeeder() {
        if(this.speeder.enabled) return true;

        let response = confirm(`Module '${this.name}' would like to request Speeder module, turn it on?`);
        if(response) document.getElementById('speeder-switch').click();

        return response;
    }

    sleep(ms) {
        return new Promise(resolve => {
            setTimeout(resolve, ms);
        })
    }

    /**
     * Log message to JSCE console 
     * @param {string} msg message to log
     */
    log(msg) {
        logToConsole(msg);
    }

    _createHotkeyElements() {
        this.initialized = true;
        const moduleContainer = document.getElementById('module-container');

        let foldable = document.createElement('div');
        foldable.classList.add('foldable');
        this._changeStore.moduleUI = foldable;

        let foldBtn = document.createElement('button');
        foldBtn.onclick = ev => {
            ev.currentTarget.classList.toggle('show')
        }
        foldBtn.innerText = this.name;
        foldable.appendChild(foldBtn);

        let moduleHotkeys = document.createElement('div');
        foldable.appendChild(moduleHotkeys);

        moduleContainer.appendChild(foldable);
        this.moduleHotkeys = moduleHotkeys;
    }

    _getTargetElement() {
        const doc = window.parent.document;
        return doc.getElementById('#canvas') ?? doc.getElementById('pixi-canvas') ?? doc.querySelector('canvas');
    }

    // remove changes caused by module object
    _unload() {
        if(this._changeStore.binding) {
            const binding = this._changeStore.binding;
            binding[0].removeEventListener('keydown', binding[1]);
            binding[0].removeEventListener('keyup', binding[2]);
        }

        if(this._changeStore.moduleUI) {
            this._changeStore.moduleUI.remove();
        }
    }
}