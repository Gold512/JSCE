function mainPageInit() {
    let speed = new Speeder(parent);
    let rng = new RNG(parent);
    window.rng = rng;

    let speeder = {
        slider: document.getElementById('speeder-slider'),
        textbox: document.getElementById('speeder-textbox'),
        switch: document.getElementById('speeder-switch'),
        functionList: document.querySelectorAll('.speeder-function-list'),
        timeskip: document.getElementById('timeskip-duration'),
        timeskipBtn: document.getElementById('timeskip-btn')
    };

    let rngel = {
        input: document.getElementById('rng-input'),
        switch: document.getElementById('rng-switch')
    }

    let opacity = {
        slider: document.getElementById('opacity-slider'),
        textbox: document.getElementById('opacity-textbox')
    }

    // let autoclick = {
    //     switch: document.getElementById('autoclick-switch'),
    //     action: document.getElementById('autoclick-action'),
    //     key: document.getElementById('autoclick-key'),
    //     interval: document.getElementById('autoclick-interval'),
    //     elementSelect: document.getElementById('autoclick-element-select'),
    //     bubbles: document.getElementById('autoclick-key-bubbles')
    // }

    let output = document.getElementById('random-callstack-disp');

    function randomCall(stack, value) {
        let div = document.createElement('div');
        div.innerHTML = `<pre>generated ${value}\n${stack}</pre>`;
        div.dataset.stack = stack;
        div.addEventListener('click', function(e) {
            let stack = e.currentTarget.dataset.stack;

            let inp = prompt(`value (current: ${rng.overrides[stack]})`);
            if(inp === null) return;
            if(isNaN(Number(inp))) {
                alert('Invalid input');
                return;
            }
            let prevVal = rng.overrides[stack];
            rng.overrides[stack] = inp;
            let cont = document.getElementById('random-override-disp');
            let st = stack.replaceAll(/\n? +at/g, '@')
            if(prevVal === undefined) {
                let div = document.createElement('div');
                div.id = 'stack-'+st;
                div.dataset.stack = stack;
                div.innerHTML = `stack: <pre style='margin-bottom:0;padding-bottom:0'>${st}</pre><br>value: <span class="override-value">${inp}</span>`;
                
                div.addEventListener('click', function(e) {
                    let stack = e.currentTarget.dataset.stack;
                    let inp = prompt(`value (current: ${rng.overrides[stack]})`);
                    if(inp === null) return;
                    
                    rng.overrides[stack] = inp;
                    e.currentTarget.querySelector('span').innerText = inp;
                });

                cont.appendChild(div)
            } else {
                cont.querySelector(`[id="stack-${st}"] > span`).innerText = inp;
            }
        });

        output.appendChild(div)
    }

    function opacityChange(e) {
        let n = parseInt(e.currentTarget.value);
        opacity.textbox.value = n;
        opacity.slider.value = n;
        document.getElementById('jsce-container').style.backgroundColor = `rgb(0,0,0,${n/100})`;
    }

    opacity.slider.addEventListener('input', opacityChange)
    opacity.textbox.addEventListener('input', opacityChange)

    speeder.slider.addEventListener('input',  e => {
        speeder.textbox.value = parseRange(e.currentTarget.value);
        if(checkSpeedRange(speeder)) return;

        speed.setSpeed(Number(speeder.textbox.value));
    });

    speeder.textbox.addEventListener('input', e => {
        speeder.slider.value = e.currentTarget.value;
        if(checkSpeedRange(speeder)) return;

        speed.setSpeed(Number(speeder.textbox.value));
    });

    speeder.switch.addEventListener('input', e => {
        let disabled = !e.currentTarget.checked;
        speeder.textbox.disabled = disabled;
        speeder.slider.disabled = disabled;

        if(disabled) {
            speed.disable();
        } else {

            updateSpeederFunctionList();

            speed.enable();
        }
    });

    function parseDuration(time) {
        if(typeof time === 'number') return time;

        const symbols = {
            h: 60 * 60 * 1000,
            m: 60 * 1000,
            s: 1000,
            ms: 1
        }
    
        let tokens = [time[0]];
        let tokenType = 'number';
        for(let i = 1; i < time.length; i++) {
            const c = time[i];
            if(c === ' ') continue;
            const type = c.match(/(\d|-|\.)/) ? 'number' : 'string';
            if(type === tokenType) {
                tokens[tokens.length - 1] += c;
            } else {
                tokenType = type;
                tokens.push(c);
            }
        }

        let duration = 0;

        for(let i = 0; i < tokens.length; i += 2) {
            let unitValue = symbols[tokens[i+1]]
            if(unitValue === undefined) return NaN; // throw new Error(`Invalid unit '${tokens[i+1]}'`);
            duration += Number(tokens[i]) * unitValue;
        }

        return duration;
    }

    // speeder.timeskipBtn.addEventListener('click', () => {
    //     const duration = parseDuration(speeder.timeskip.value);
    //     if(isNaN(duration)) alert(`Invalid duration '${speeder.timeskip.value}'`);
    //     speed.timeskip(duration);
    // })

    // speeder.timeskip.addEventListener('input', ev => {
    //     let currentParsedDuration = parseDuration(ev.currentTarget.value);
    //     if(isNaN(currentParsedDuration)) {
    //         ev.currentTarget.classList.add('error');
    //     } else {
    //         ev.currentTarget.classList.remove('error');
    //     }
    // });

    function updateSpeederFunctionList() {
        let functionList = [];
        for(let i = 0; i < speeder.functionList.length; i++) {
            const e = speeder.functionList[i];
            if(!e.checked) continue;
            let functions = e.dataset.functionlist.split(',');
            functionList.push(...functions);
        }

        speed.setFunctions(functionList);
    }

    speeder.functionList.forEach(element => {
        element.addEventListener('change', updateSpeederFunctionList);
    })

    rngel.switch.addEventListener('input', e => {
        let state = e.currentTarget.checked;
        rngel.input.disabled = !state;
        if(!state) {
            rng.reset();
        } else {
            rng.set(parserngData(rngel.input), randomCall)
        }
    });

    rngel.input.addEventListener('input', e => {
        rng.set(parserngData(e.currentTarget), randomCall)
    });

    // floating btn 
    let floating_btn_init = false;
    document.getElementById('floating-btn-switch').addEventListener('input', e => {
        if(!floating_btn_init) {
            floating_btn_init = true;
            init_floating_btn();
            return;
        }
    })

    let freezeInput = document.getElementById('freeze-duration');

    document.getElementById('freeze-start').addEventListener('click', e => {
        e.currentTarget.innerText = 'Frozen';
        e.currentTarget.style.backgroundColor = 'rgb(45, 45, 45)';
        window.parent.postMessage({operation: 'jsce_freeze', time: Number(freezeInput.value)}, '*');
    })

    let initialState = window.parent.document.documentElement.contentEditable;

    document.getElementById('content-editable-switch').addEventListener('input', e => {
        console.log('a')
        window.parent.document.documentElement.contentEditable = e.currentTarget.checked ? 'true' : initialState; 
    })
}

function init_floating_btn() {
    const vw = Math.min(window.parent.document.documentElement.clientWidth || 0, window.parent.innerWidth || 0);
    const vh = Math.min(window.parent.document.documentElement.clientHeight || 0, window.parent.innerHeight || 0);
    const btnSize = 20;

    const freezeOnRightClick = document.getElementById('floating-btn-freeze');
    const freezeInput = document.getElementById('freeze-duration');

    let el = document.createElement('div');
    el.style.position = 'fixed';
    el.style.zIndex = '99999999999';
    el.style.opacity = '.5';
    el.style.backgroundColor = '#000';
    el.style.left = '10px';
    el.style.top = '10px';
    el.style.width = `${btnSize}px`;
    el.style.height = `${btnSize}px`;
    el.style.fontSize = '15px';
    el.style.borderRadius = `${btnSize/2}px`;
    el.style.userSelect = 'none';
    el.id = 'jsce-floating-btn';
    el.style.display = 'none';
    el.innerText = '🔧';  

    let moved = false;

    let xOffset = 10, yOffset = 10;
    let startX, startY;

    // Max mouse movement to still be considered a click 
    const maxClickOffset = 3;

    function updatePos(ev) {
        moved = true;

        let ticking = false;

        // Prevent DOM modifications from occouring too quickly
        if (!ticking) {
            window.requestAnimationFrame(() => {
                // Subtract width and height so that the element will
                // be in the middle 
                let x = ev.clientX - xOffset;
                let y = ev.clientY - yOffset;
                el.style.left = (x < 0 ? 0 : (x+btnSize) > vw ? vw-btnSize : x) + 'px';
                el.style.top = (y < 0 ? 0 : (y+btnSize) > vh ? vh-btnSize : y) + 'px';
            });
            ticking = true;
        }
    }

    function mouseUp(ev) {
        if(ev.button == 2 && freezeOnRightClick.checked) {
            return;
        }

        el.style.opacity = '.5';
        el.style.pointerEvents = '';
        el.style.transform = '';

        window.parent.document.removeEventListener('mouseup', mouseUp)
        window.parent.document.removeEventListener('mousemove', updatePos)

        if(moved && Math.abs(ev.clientX - startX) >= maxClickOffset && Math.abs(ev.clientY - startY) >= maxClickOffset) {
            moved = false;
            return;
        };

        // Move button back since it was a click 
        el.style.left = (startX - xOffset) + 'px';
        el.style.top = (startY - yOffset) + 'px';
        let element = window.parent.document.getElementById('jsce-container');
        element.style.display = 'block';
        el.style.display = 'none';
        element.children[0].focus();
    }

    el.addEventListener("contextmenu", e => {
        const floatingBtn = window.parent.document.getElementById('jsce-floating-btn');

        e.preventDefault();
        floatingBtn.innerText = '❄️';
        el.style.transform = 'scale(1.2)';
        el.style.opacity = '1';
        el.style.pointerEvents = 'none';
        window.parent.postMessage({operation: 'jsce_freeze', time: Number(freezeInput.value), floatingBtn: true}, '*');
        setTimeout(() => {
            el.style.opacity = '.5';
            el.style.pointerEvents = '';
            floatingBtn.innerText = '🔧';
            el.style.transform = '';
        }, 50)
    });

    el.addEventListener('mousedown', e => {
        if(e.button == 2 && freezeOnRightClick.checked) {
            return;
        }

        el.style.transform = 'scale(1.2)';
        el.style.opacity = '1';
        el.style.pointerEvents = 'none';

        let rect = e.currentTarget.getBoundingClientRect();
        xOffset = e.clientX - rect.left; //x position within the element.
        yOffset = e.clientY - rect.top;  //y position within the element.
        startX = e.clientX
        startY = e.clientY

        window.parent.document.addEventListener('mousemove', updatePos)
        window.parent.document.addEventListener('mouseup', mouseUp)
    })

    window.parent.document.documentElement.appendChild(el);
}

function* IDGenerator() {
    let i = 0;
    while(true) {
        i++;
        yield i.toString(36);
    }
}

function createAutoclicker() {
    let autoclicker_list = document.getElementById('autoclick-container');
    let autoclicker = new JSBot(window.parent, 'Click', 100);
    let template = document.getElementById('autoclicker-template');
    let container = template.content.cloneNode(true).children[0];
    autoclicker_list.appendChild(container);

    let autoclick = {
        switch: container.querySelector('#autoclick-switch'),
        action: container.querySelector('#autoclick-action'),
        key: container.querySelector('#autoclick-key'),
        interval: container.querySelector('#autoclick-interval'),
        elementSelect: container.querySelector('#autoclick-element-select'),
        bubbles: container.querySelector('#autoclick-key-bubbles'),

        clientX: container.querySelector('#autoclick-client-x'),
        clientY: container.querySelector('#autoclick-client-y'),
        clickButton: container.querySelector('#click-button'),
        clickButtonDropdown: container.querySelector('#click-button-dropdown')
    }

    function switchActionMenu(action) {
        container.querySelector('#autoclick-key-action').style.display = action == 'key' ? 'inline-block' : 'none';

        container.querySelector('#autoclick-canvas-action').style.display = (action == 'click' && autoclicker.target?.tagName == 'CANVAS') ? 'inline-block' : 'none';
        container.querySelector('#autoclick-click-action').style.display = action == 'click' ? 'inline-block' : 'none';

        container.querySelector('#autoclick-multi-action').style.display = (action == 'multi') ? 'inline-block' : 'none';
    }

    autoclick.switch.addEventListener('input', e => {
        if(e.currentTarget.checked) {
            autoclicker.interval = Number(autoclick.interval.value);
            let keyValue;
            try { keyValue = JSON.parse(autoclick.key.dataset.value) } catch(e) {
                keyValue = autoclick.key.dataset.value;
            }
            if(autoclick.action.dataset.value == 'key') {
                autoclicker.key = keyValue;
            
            } else if(autoclick.action.dataset.value == 'click' && autoclicker.target?.tagName == 'CANVAS') {
                let x = Number(autoclick.clientX.value);
                let y = Number(autoclick.clientY.value);
            
                autoclicker.key = {
                    x: x,
                    y: y,
                    code: 'click', 
                    button: Number(autoclick.clickButtonDropdown.dataset.value)
                }
            } else {
                autoclicker.key = 'Click';
            }
            
            autoclicker.bubbles = autoclick.bubbles.checked;
        
            autoclicker.start();
        } else {
            autoclicker.stop();
        }
    });
    
    autoclick.elementSelect.addEventListener('click', e => {
        window.parent.jsce_toggle();
    
        autoclicker.selectElement().then(event => {
            let el = event.target;
            window.parent.jsce_toggle();
            autoclick.elementSelect.value = `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.classList.value != '' ? ('.' + [...el.classList].join('.')).replace('.jsce-hover', '') : ''}`;
            switchActionMenu(autoclick.action.dataset.value);
            if(el.tagName == 'CANVAS') {
                autoclick.clientX.value = event.clientX
                autoclick.clientY.value = event.clientY
            }
        });
    });
    
    autoclick.key.addEventListener('keydown', e => {
        let el = e.currentTarget;
    
        el.dataset.value = JSON.stringify({
            keyCode: e.keyCode,
            code: e.code,
            key: e.key,
        
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            shiftKey: e.shiftKey
        });
    
        el.value = `${e.altKey ? 'Alt+' : ''}${e.ctrlKey ? 'Ctrl+' : ''}${e.metaKey ? 'Meta+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.code}`;
    
        e.preventDefault();
    });

    container.querySelector('#autoclick-action .dropdown-content').addEventListener('click', e => {
        switchActionMenu(e.currentTarget.parentElement.dataset.value)
    });

    container.querySelector('#close_instance').addEventListener('click', e => {
        if(autoclicker.active) autoclicker.stop();

        e.currentTarget.parentElement.remove();

        // destroy current autoclicker 
        autoclicker = undefined;
    })

    // mouse button selector 
    // clickButton.querySelector('.dropdown-content').addEventListener('click', ev => {
    //     if(!ev.target.dataset.value) return;
// 
    //     autoclick.clickButton.children[0].innerText = ev.target.innerText;
    //     autoclick.clickButton.dataset.value = ev.target.dataset.value;
    // })
}

function attemptUpdate() {
    if(window.parent.jsce_update) {
        window.parent.jsce_update();
    } else {
        alert('Please update userscript at https://github.com/Gold512/JSCE/blob/main/ext.js')
    }
}