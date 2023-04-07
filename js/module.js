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

		fn(new Module(name, window.parent));
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

    }

    /**
     * Expose function to allow user to bind a hotkey to bind
     * @param {string} name
     * @param {function} fn the function to bind
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
            this.hotkeys[hotkeyStr] = [fn, paramInputs];
        }, true);

        hotkeyContainer.appendChild(hotkeyInput);

        const paramInputs = [];

        // format: NAME:TYPE or TYPE
        for(let i = 0; i < params.length; i++) {
            const s = params[i].split(':');
            s.reverse();
            const type = s[0];
            const name = s[1];

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
        let targetElement;
        if(bindingElement === 'document') {
            targetElement = this.document;
        } else if(bindingElement === 'auto') {
            targetElement = this._getTargetElement();
        } else if(typeof bindingElement === 'string') {
            targetElement = window.parent.document.querySelector(this.bindingElement);
        }
        
        const hotkeys = this.hotkeys;
        
        function onKeydown(ev) {
            const hotkeyStr = serializeHotkey(ev);
            if(!hotkeys.hasOwnProperty(hotkeyStr)) return;
            const fn = hotkeys[hotkeyStr][0];
            const params = hotkeys[hotkeyStr][1];

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
                    default:
                        paramValues[i] = element.value
                }
            }

            fn(...paramValues);
        }

        targetElement.addEventListener('keydown', onKeydown);

        this._changeStore.binding = [targetElement, onKeydown];
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
        }

        if(this._changeStore.moduleUI) {
            this._changeStore.moduleUI.remove();
        }
    }

    // helper functions 

    requestSpeeder() {
        if(this.speeder.enabled) return;
            
        let response = confirm(`Module '${this.name}' would like to request Speeder module, turn it on?`);
        if(response) document.getElementById('speeder-switch').click();

        return response;
    }

    sleep(ms) {
        return new Promise(resolve => {
            setTimeout(resolve, ms);
        })
    }
}