class JSBot {
    constructor(documentRef, key, interval) {
        this.document = documentRef;
        if(key === 'Click') {
            this._startInterval = () => {
                this.id = setInterval(() => target.click(), interval);
            }
            return;
        }

        this.target = null;

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

        this._startInterval = () => {
            this.id = setInterval(() => {
                let eventTypes = ['keydown', 'keypress', 'keyup']
                if(this.target instanceof HTMLInputElement) eventTypes.push('input');
                for(let i = 0; i < eventTypes.length; i++) {
                    let event = new Event(eventTypes[i]);
                    event.keyCode = keyCodeDict[key] || key.charCodeAt(0);
                    event.which = keyCodeDict[key] || key.charCodeAt(0);
                    event.code = code;
                    event.key = key;
                    Object.defineProperty(event, 'target', {
                        get: () => this.target
                    })
                    Object.defineProperty(event, 'currentTarget', {
                        get: () => this.target
                    })

                    console.log(event.target);

                    if(i == 0 ) console.log(event)
                    
                    this.target.dispatchEvent(event);
                }
            }, interval)
        }
    }

    setElement(element) {
        this.target = element;
    }

    selectElement() {
        let resolve, reject;

        let promise = new Promise(function(_resolve, _reject) {
            resolve = _resolve;
            reject = _reject;
        });

        try {
            let style = this.document.createElement('style');
            style.innerHTML = '.jsce-hover { background-color: rgba(255, 0, 0, 0.32) !important; cursor: pointer !important; }';
            style.id = 'jsce-element-selector';
            this.document.body.appendChild(style);

            let onclick = e => {
                style.remove();
                this.target = e.target;
                this.document.removeEventListener('click', onclick)
                this.document.removeEventListener('mouseover', mouseover)
                this.document.removeEventListener('mouseout', mouseout)
                resolve(e.target);
            }

            let mouseover = e => {
                e.stopPropagation();

                let prevHover = this.document.querySelector(".jsce-hover")
                if(prevHover) prevHover.classList.remove("jsce-hover");     
                e.target.classList.add("jsce-hover");
            }

            let mouseout = e => {
                e.target.classList.remove("jsce-hover");
            }

            this.document.addEventListener('click', onclick)

            let el = this.document.querySelector('body')

            el.addEventListener('mouseover', mouseover)
            el.addEventListener('mouseout', mouseout);
        } catch(e) {
            reject(e);
        }

        return promise;
    }

    start() {
        if(!this.target) throw new Error('no target element set')
        this._startInterval();
    }

    stop() {
        clearTimeout(this.id);
    }
}