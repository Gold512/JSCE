function mainPageInit() {
    let speed = new Speeder(parent);
    let rng = new RNG(parent);
    window.rng = rng;

    let speeder = {
        slider: document.getElementById('speeder-slider'),
        textbox: document.getElementById('speeder-textbox'),
        switch: document.getElementById('speeder-switch')
    };

    let rngel = {
        input: document.getElementById('rng-input'),
        switch: document.getElementById('rng-switch')
    }

    let opacity = {
        slider: document.getElementById('opacity-slider'),
        textbox: document.getElementById('opacity-textbox')
    }

    let autoclick = {
        switch: document.getElementById('autoclick-switch'),
        action: document.getElementById('autoclick-action'),
        key: document.getElementById('autoclick-key'),
        interval: document.getElementById('autoclick-interval'),
        elementSelect: document.getElementById('autoclick-element-select'),
        bubbles: document.getElementById('autoclick-key-bubbles')
    }

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

        if(!checkSpeedRange(speeder)) return;

        speed.setSpeed(Number(speeder.textbox.value));
    });

    speeder.textbox.addEventListener('input', e => {
        speeder.slider.value = e.currentTarget.value;

        if(!checkSpeedRange(speeder)) return;

        speed.setSpeed(Number(speeder.textbox.value));
        
    });

    speeder.switch.addEventListener('input', e => {
        let disabled = !e.currentTarget.checked;
        speeder.textbox.disabled = disabled;
        speeder.slider.disabled = disabled;
        if(disabled) {
            speed.disable();
        } else {
            speed.enable();
        }
    });

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
}

function init_floating_btn() {
    const vw = Math.min(window.parent.document.documentElement.clientWidth || 0, window.parent.innerWidth || 0);
    const vh = Math.min(window.parent.document.documentElement.clientHeight || 0, window.parent.innerHeight || 0);
    const btnSize = 20;

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

    el.addEventListener('mousedown', e => {
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
    }

    autoclick.switch.addEventListener('input', e => {
        if(e.currentTarget.checked) {
            autoclicker.interval = Number(autoclicker.interval.value);
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
                    code: 'click'
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
            container.querySelector('#autoclick-click-actions').style.display = (autoclick.action.dataset.value == 'click' && autoclicker.target.tagName == 'CANVAS') ? 'inline-block' : 'none';

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
        let action = e.currentTarget.parentElement.dataset.value
    
        container.querySelector('#autoclick-key-actions').style.display = action == 'key' ? 'inline-block' : 'none';
        container.querySelector('#autoclick-click-actions').style.display = (action == 'click' && autoclicker.target?.tagName == 'CANVAS') ? 'inline-block' : 'none';
    });

    container.querySelector('#close_instance').addEventListener('click', e => {
        if(autoclicker.active) autoclicker.stop();

        e.currentTarget.parentElement.remove();

        // destroy current autoclicker 
        autoclicker = undefined;
    })
}