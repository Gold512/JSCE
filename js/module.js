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

		const scriptBuiltIn = Object.freeze({
            window: window.parent,
            document: window.parent.document,
			speeder: window.speederModule,
            JSBot: JSBot,
            Module: new Module(name),
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
		});

		fn(scriptBuiltIn);
	} catch (e) {
		alert(e);
	}
}

const executedModules = {}

// allow construction of basic UI for the module 
class Module {
    constructor(name) {
        this.name = name;
        executedModules[this.name] = true;

        this.bindingElement = 'auto';
        this.hotkeys = {};

        this.initialized = false;
    }

    /**
     * Expose function to allow user to bind a hotkey to bind
     * @param {function} fn the function to bind
     */
    bindFunction(name, fn) {
        if(!this.initialized) this._createHotkeyElements();

        let hotkeyInput = document.createElement('input');

        
    }

    bindHotkeysToElement() {
        let targetElement;
        if(this.bindingElement === 'auto') {
            targetElement = this._getTargetElement();
        } else if(this.bindingElement) {
            targetElement = window.parent.document.querySelector(this.bindingElement);
        }
        
        targetElement.addEventListener('keydown', () => {
            
        })
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