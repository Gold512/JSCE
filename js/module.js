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

	try {
		let fn = eval(`(function(script){${script}})`);

		const scriptBuiltIn = {
            window: window.parent,
            document: window.parent.document,
			speeder: window.speederModule,
            JSBot: JSBot,
            module: new Module(name),
            requestSpeeder() {
                let response = confirm(`Module '${name}' would like to request Speeder module, turn it on?`);
                if(response) document.getElementById('speeder-switch').click();

                return response;
            },
            sleep(ms) {
                return new Promise(resolve => {
                    setTimeout(resolve, ms);
                })
            }
		}

		fn(scriptBuiltIn);
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
    constructor(name) {
        this.name = name;
        executedModules[this.name] = true;

        this.hotkeys = {};

        this.initialized = false;
    }

    /**
     * Expose function to allow user to bind a hotkey to bind
     * @param {function} fn the function to bind
     */
    bindFunction(name, fn) {
        if(!this.initialized) this._createHotkeyElements();

        let hotkeyContainer = document.createElement('div');

        let hotkeyLabel = document.createElement('span');
        hotkeyLabel.innerText = name;
        hotkeyContainer.appendChild(hotkeyLabel);

        let hotkeyInput = document.createElement('input');
        hotkeyInput.style.width = '15em';

        let lastHotkey;

        hotkeyInput.addEventListener('keydown', ev => {
            let hotkeyStr = serializeHotkey(ev);
            ev.currentTarget.value = serializeHotkey(ev, true);
            if(lastHotkey) {
                delete this.hotkeys[lastHotkey];
            }

            lastHotkey = hotkeyStr;
            this.hotkeys[hotkeyStr] = fn;
        });

        hotkeyContainer.appendChild(hotkeyInput);

        this.moduleHotkeys.appendChild(hotkeyContainer);
    }

    /**
     * 
     * @param {string} [bindingElement]
     */
    bindHotkeysToElement(bindingElement = 'auto') {
        let targetElement;
        if(bindingElement === 'auto') {
            targetElement = this._getTargetElement();
        } else if(typeof bindingElement === 'string') {
            targetElement = window.parent.document.querySelector(this.bindingElement);
        }
        
        const hotkeys = this.hotkeys;
        targetElement.addEventListener('keydown', ev => {
            const hotkeyStr = serializeHotkey(ev);
            const fn = hotkeys[hotkeyStr];
            if(!fn) return;
            fn();
        });
    }

    _createHotkeyElements() {
        const moduleContainer = document.getElementById('module-container');

        let foldable = document.createElement('div');
        foldable.classList.add('foldable');

        let foldBtn = document.createElement('button');
        foldBtn.onclick = ev => {
            ev.currentTarget.classList.toggle('show')
        }
        foldBtn.innerText = this.name;
        foldable.appendChild(foldBtn);

        let moduleHotkeys = document.createElement('div');
        foldable.appendChild(moduleHotkeys);

        this.moduleHotkeys = moduleHotkeys;
    }

    _getTargetElement() {
        const doc = window.parent.document;
        return doc.getElementById('#canvas') ?? doc.getElementById('pixi-canvas') ?? doc.querySelector('canvas');
    }
}