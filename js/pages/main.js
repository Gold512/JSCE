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
            

        })
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

    speeder.slider.addEventListener('input', function(e) {
        speeder.textbox.value = parseRange(e.currentTarget.value);

        if(!checkSpeedRange(speeder)) return;

        speed.setSpeed(Number(speeder.textbox.value));
    })

    speeder.textbox.addEventListener('input', function(e) {
        speeder.slider.value = e.currentTarget.value;

        if(!checkSpeedRange(speeder)) return;

        speed.setSpeed(Number(speeder.textbox.value));
        
    })

    speeder.switch.addEventListener('input', function(e) {
        let disabled = !e.currentTarget.checked;
        speeder.textbox.disabled = disabled;
        speeder.slider.disabled = disabled;
        if(disabled) {
            speed.disable();
        } else {
            speed.enable();
        }
    })

    rngel.switch.addEventListener('input', function(e) {
        let state = e.currentTarget.checked;
        rngel.input.disabled = !state;
        if(!state) {
            rng.reset();
        } else {
            rng.set(parserngData(rngel.input), randomCall)
        }
    })

    rngel.input.addEventListener('input', function(e) {
        rng.set(parserngData(e.currentTarget), randomCall)
    })
}