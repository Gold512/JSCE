class JSBot {
    constructor(windowCtx, key, interval) {
        this.window = windowCtx;
        this.document = windowCtx.document;
        this.active = false;
        this.interval = interval;
        this.target = null;
        this.key = key;
        this.bubbles = true;
        this.repeats = false;

        this._startInterval = (key, interval) => {
            if(key === 'Click') {
                this.id = setInterval(() => this.target.click(), interval);
                return;
            } 
            
            if(typeof key === 'object' && key.code == 'click') {
                this.id = setInterval(() => {
                    this._click(this.target, key)
                }, interval);
                return
            }

            let ev = {
                altKey: false,
                ctrlKey: false,
                metaKey: false,
                shiftKey: false
            };

            if(typeof key === 'string') {
                // modifier key detection
                let keyDict = {
                    'Space': ' '
                }

                if(keyDict[key] !== undefined) key = keyDict[key];

                // event.code
                let keyCodeDict = {
                    'Enter': 13,
                    'Backspace': 8,
                    'ArrowLeft': 37,
                    'ArrowUp': 38,
                    'ArrowRight': 39,
                    'ArrowDown': 40
                };

                let code = key;
                if(key.length === 1) {
                    if(key.match(/^\w$/)) {
                        code = `Key${key.toUpperCase()}`;
                    } else if(key.match(/^\d$/)) {
                        code = `Digit${key}`;
                    }
                }

                ev.keyCode = keyCodeDict[key] || key.charCodeAt(0);
                ev.code = code;
                ev.key = key;
            } else {
                ev = Object.assign(ev, key);
            }

            ev.bubbles = this.bubbles;
            ev.repeats = this.repeats;
            
            this.id = setInterval(() => {
                this._press(this.target, ev);
            }, interval)
        }
        JSBot._global.push(this);
    }

    /**
     * Define a criteria to find the target element 
     * @param {HTMLElement|String|Function} element a reference to the element, a string containing a css selector to get the element or a function that returns the element 
     */
    setElement(element) {
        if(element instanceof HTMLElement) {
            this.target = element;
        } else if(element instanceof Function) {
            Object.defineProperty(this, 'target', {
                get: () => element(),
                set: v => {
                    Object.defineProperty(this, 'target', {value: v})
                }
            });
        } else if(typeof element === 'string') {
            Object.defineProperty(this, 'target', {
                get: () => this.document.querySelector(element),
                set: v => {
                    Object.defineProperty(this, 'target', {value: v})
                }
            });
        } else {
            throw new Error('invalid element')
        }
        
    }

    selectElement() {
        let resolve, reject;

        let promise = new Promise(function(_resolve, _reject) {
            resolve = _resolve;
            reject = _reject;
        });

        let overlay = document.createElement('div');
        overlay.style.position = 'absolute';
        overlay.style.zIndex = '99999999999';
        overlay.style.pointerEvents = 'none';
        overlay.style.backgroundColor = 'rgba(255, 0, 0, .3)'
        overlay.style.transition = 'all .12s ease-in'
        this.document.documentElement.appendChild(overlay);

        let removeEvents = () => {
            this.document.removeEventListener('click', onclick);
            this.document.removeEventListener('mouseover', mouseover);
            this.document.removeEventListener('scroll', scroll);
            this.document.removeEventListener('keypress', keypress);
        }

        let onclick = e => {
            overlay.remove();
            this.target = e.target;
            removeEvents()
            resolve(e);
        }

        let mouseover = e => {
            e.stopPropagation();

            let rect = e.target.getBoundingClientRect();

            this.lastPos = [e.clientX, e.clientY];

            overlay.style.left = (rect.left + this.window.scrollX) + "px";
            overlay.style.top = (rect.top + this.window.scrollY) + "px";
            overlay.style.width = rect.width + "px";
            overlay.style.height = rect.height + "px";
        }

        let scroll = e => {
            if(!this.lastPos) return;

            let ticking = false;

            // Prevent DOM modifications from occouring too quickly
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    let el = this.document.elementFromPoint(this.lastPos[0], this.lastPos[1]);

                    let rect = el.getBoundingClientRect();                        
                    overlay.style.left = (rect.left + this.window.scrollX) + "px";
                    overlay.style.top = (rect.top + this.window.scrollY) + "px";
                    overlay.style.width = rect.width + "px";
                    overlay.style.height = rect.height + "px";
                    ticking = false;
                });
            
                ticking = true;
            }
        }

        let keypress = e => {
            if(e.code != 'Enter') return;
            overlay.remove();
            this.target = this.document.elementFromPoint(this.lastPos[0], this.lastPos[1]);
            removeEvents();
            resolve({target: this.target, clientX:this.lastPos[0], clientY: this.lastPos[1]});
        }

        try {
            this.document.addEventListener('click', onclick)
            this.document.addEventListener('scroll', scroll)
            this.document.addEventListener('keypress', keypress)

            let el = this.document.querySelector('body')
            el.addEventListener('mouseover', mouseover)
        } catch(e) {
            removeEvents()
            reject(e);
        }

        return promise;
    }

    start() {
        if(!this.target) throw new Error('no target element set')
        this._startInterval(this.key, this.interval);
        this.active = true;
    }

    stop() {
        this.active = false;
        clearTimeout(this.id);
    }

    _click(element, key) {
        let eventList = ['mousedown', 'mouseup', 'click'];
        key.button = key.button == undefined ? 0 : key.button;
        
        for(let i = 0; i < eventList.length; i++) {
            let event = new Event(eventList[i], {bubbles: true});
            Object.defineProperties(event, {
                'target': {
                    get: () => element
                },
                'currentTarget': {
                    get: () => element
                },
                'clientX': {
                    get: () => key.x
                },
                'clientY': {
                    get: () => key.y
                },

                'button': {
                    get: () => key.button
                },
                'altKey': {
                    get: () => false
                },
                'ctrlKey': {
                    get: () => false
                },
                'metaKey': {
                    get: () => false
                },
                'shiftKey': {
                    get: () => false
                },
                'getModifierState': {
                    value: () => false
                }
            });
            
            element.dispatchEvent(event);
        }
    }

    _press(element, ev) {
        let eventTypes = ['keydown', 'keyup', 'keypress']
        if(element instanceof HTMLInputElement) eventTypes.push('input');
        for(let i = 0; i < eventTypes.length; i++) {
            let event = new Event(eventTypes[i], {bubbles: ev.bubbles, repeats: ev.repeats});
            Object.defineProperties(event, {
                'keyCode': {
                    get: () => ev.keyCode
                },
                'code': {
                    get: () => ev.code
                },
                'which': {
                    get: () => ev.keyCode
                },
                'key': {
                    get: () => ev.key
                },
                'target': {
                    get: () => element
                },
                'currentTarget': {
                    get: () => element
                },
                
                'altKey': {
                    get: () => ev.altKey
                },
                'ctrlKey': {
                    get: () => ev.ctrlKey
                },
                'metaKey': {
                    get: () => ev.metaKey
                },
                'shiftKey': {
                    get: () => ev.shiftKey
                }
            
            });

            event.getModifierState = (state) => {
                switch (state) {
                    case "Alt": return ev.altKey
                    case "Ctrl": return ev.ctrlKey
                    case "Shift": return ev.shiftKey
                    case "Meta": return ev.metaKey
                }
            }
            
            element.dispatchEvent(event);
        }
    }

    _type(element, text, delay) {
        !function f(i) {
            this._press(element, text[i]);
            element.value += text[i];
            if(i < text.length) setTimeout(f, delay, i + 1);
        }(0)
    }

    static _global = [];
}

// Sample function for action list iteration
function iterate(actions) {
    let a = this;
    !function f(i) {
        a.id = setTimeout(f, actions[i].delay, i + 1)
    }(0)
}