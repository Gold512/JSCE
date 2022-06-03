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

    // let autoclicker = new JSBot(window.parent, 'Click', 100)

    // autoclick.switch.addEventListener('input', e => {
    //     if(e.currentTarget.checked) {
    //         autoclicker.interval = Number(autoclicker.interval.value);
    //         let keyValue;
    //         try { keyValue = JSON.parse(autoclick.key.dataset.value) } catch(e) {
    //             keyValue = autoclick.key.dataset.value;
    //         }
    //         if(autoclick.action.dataset.value == 'key') {
    //             autoclicker.key = keyValue;

    //         } else if(autoclick.action.dataset.value == 'click' && autoclicker.target?.tagName == 'CANVAS') {
    //             let x = Number(document.getElementById('autoclick-client-x').value);
    //             let y = Number(document.getElementById('autoclick-client-y').value);

    //             autoclicker.key = {
    //                 x: x,
    //                 y: y,
    //                 code: 'click'
    //             }
    //         } else {
    //             autoclicker.key = 'Click';
    //         }
            
    //         autoclicker.bubbles = autoclick.bubbles.checked;

    //         autoclicker.start();
    //     } else {
    //         autoclicker.stop();
    //     }
    // })

    // autoclick.elementSelect.addEventListener('click', e => {
    //     window.parent.jsce_toggle();

    //     autoclicker.selectElement().then(el => {
    //         window.parent.jsce_toggle();
    //         autoclick.elementSelect.value = `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.classList.value != '' ? ('.' + [...el.classList].join('.')).replace('.jsce-hover', '') : ''}`;
    //         document.getElementById('autoclick-click-actions').style.display = (autoclick.action.dataset.value == 'click' && autoclicker.target.tagName == 'CANVAS') ? 'inline-block' : 'none';

    //     })
    // })

    // autoclick.key.addEventListener('keydown', e => {
    //     let el = e.currentTarget;

    //     el.dataset.value = JSON.stringify({
    //         keyCode: e.keyCode,
    //         code: e.code,
    //         key: e.key,

    //         altKey: e.altKey,
    //         ctrlKey: e.ctrlKey,
    //         metaKey: e.metaKey,
    //         shiftKey: e.shiftKey
    //     });

    //     el.value = `${e.altKey ? 'Alt+' : ''}${e.ctrlKey ? 'Ctrl+' : ''}${e.metaKey ? 'Meta+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.code}`;

    //     e.preventDefault();
    // })
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
        console.log(action)
    
        document.getElementById('autoclick-key-actions').style.display = action == 'key' ? 'inline-block' : 'none';
        document.getElementById('autoclick-click-actions').style.display = (action == 'click' && autoclicker.target.tagName == 'CANVAS') ? 'inline-block' : 'none';
    });

    container.querySelector('#close_instance').addEventListener('click', e => {
        if(autoclicker.active) autoclicker.stop();

        e.currentTarget.parentElement.remove();

        // destroy current autoclicker 
        autoclicker = undefined;
    })
}