class JSBot {
    constructor(windowCtx, key, interval) {
        this.window = windowCtx;
        this.document = windowCtx.document;
        this.active = false;
        this.interval = interval;
        
        if(typeof key === 'string') {
            key = {
                code: key
            }
        }

        this.key = key;

        // Clicking data 
        this.targets = [];
        this.actions = []; // List of actions to perform 
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
        overlay.style.backgroundColor = 'rgba(255, 0, 0, .3)';
        overlay.style.transition = 'all .12s ease-in';
        overlay.classList.add('element-select-overlay');
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

    /**
     * Trigger single click event
     * @param {[number, number]} postion The position of the element that was clicked
     * @param {number|('main'|'middle'|'secondary')} button which mouse button was pressed (see https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button)
     */
    click(postion = [0, 0], button = 0) {
        this._click(this.target, {
            x: postion[0],
            y: postion[1],
            button: button
        });
    }

    start() {
        if(!this.target) throw new Error('no target element set')
        if(this.active) return;
        this._startInterval(this.key, this.interval);
        this.active = true;
    }

    stop() {
        this.active = false;
        clearTimeout(this.id);
    }

    toggle() {
        if(this.active) {
            this.stop();
        } else {
            this.start();
        }
    }

    _startInterval(key, interval) {
        this.id = setInterval(() => {
            if(key.code == 'click') {
                this._click(this.target, key);
            } else {
                key.bubbles = this.bubbles;
                key.repeat = this.repeats;
                this.__pressKey(this.target, key);
            }
        }, interval)
    }

    newAction(type) {
        if(!this.constructor[type + 'Event']) throw new Error("Invalid type (can only be click, press or type)")
        return new this.constructor[type + 'Event'];
    }

    _click(element, key) {
        let eventList = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click'];
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
                    get: () => key.x ?? 0
                },
                'clientY': {
                    get: () => key.y ?? 0
                },

                'button': {
                    get: () => key.button ?? 0
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

    _press(elements, key) {
        if(!elements instanceof Array) elements = [elements];
        for(let i = 0; i < elements.length; i++) {
            this.__pressKey(elements[i], key);
        }
    }

    /**
     * Type a string (with events triggered)
     * @param {HTMLElement|HTMLElement[]} elements The html element(s) to click
     * @param {String} text The text to type into the element(s)
     * @param {Number} delay The amount of time in milliseconds between each character typed
     * @returns {Promise} A promise which is resolved when the operation is completed
     */
    _type(elements, text, delay) {
        if(!elements instanceof Array) elements = [elements];
        let promise = this._promiseFactory();

        !function f(i) {
            try {
                for(let j = 0; j < elements.length; j++) {
                    this.__pressKey(elements[j], text[i]);
                    if(elements[j].value) elements[j].value += text[i];
                }

                if(i < text.length) { setTimeout(f, delay, i + 1); }
                else { promise.resolve(); } // Resolve the promise on the last iteration

            } catch(e) { 
                promise.reject(e); // Type operation encountered fatal error 
            }
        }(0)

        return promise.object;
    }

    _promiseFactory() {
        let resolve, reject;
        let promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        return {object: promise, resolve: resolve, reject: reject};
    }

    /**
     * An even lower level function handling generation of the common keyboard
     * Events used by _press and _type functions
     * @param {HTMLElement} element 
     * @param {Object} ev Event/key object to use for event 
     */
    __pressKey(element, ev) {
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

    // Helper class for generating click events 
    static clickEvent = class {
        constructor() {
            this.action = 'click';
            this.button = 0;

            this.altKey = false;
            this.ctrlKey = false;
            this.metaKey = false;
            this.shiftKey = false;
        }

        setPos = (x, y) => {
            this.x = x;
            this.y = y;

            return this;
        }

        setButton = (button) => {
            if(typeof button == 'number') {
                this.button = button;
                return this;
            }

            switch(button) {
                case 'left': 
                    this.button = 0;
                    break;
                
                case 'middle': 
                    this.button = 1;
                    break;
                
                case 'right': 
                    this.button = 2;
                    break;
            }

            return this;
        }

        setModifierState = (key, state = true) => {
            if(!this[key + 'Key']) throw new Error(`modifier key '${key}' does not exist`);
            this[key + 'Key'] = state;
            return this;
        }
    }
}

// Sample function for action list iteration
function iterate(actions) {
    let a = this;
    !function f(i) {
        a.id = setTimeout(f, actions[i].delay, i + 1)
    }(0)
}