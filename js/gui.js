
/**
 * 
 * @param {HTMLElement} e input that is being read 
 * @returns 
 */
function parserngData(e) {
    let txt = e.value;
    txt = txt.split(',')
    for(let i = 0; i < txt.length; i++) {
        let t = txt[i].trim()
        if(t !== '*') {
            txt[i] = Number(t);
        } else {
            txt[i] = t;
        }

    }
    if(txt.includes(NaN)) {
        e.classList.add('error')
    } else {
        e.classList.remove('error');
    }
    return txt;
}

function checkSpeedRange(speeder) {
    if(Number(speeder.textbox.value) < 0) {
        speeder.textbox.classList.add('error')
        return
    }

    speeder.textbox.classList.remove('error');
}

function parseRange(n) {
    return Math.pow(2, parseInt(n))
}
let currentFocused = null;
window.onload = function() {
    


    let pages = {
        main: document.getElementById('main-page'),
        search: document.getElementById('search-page'),
        storage: document.getElementById('storage-page'),
        console: document.getElementById('console-page')
    }

    openPage('main')

    function openPage(page) {
        for(let i = 0, k = Object.keys(pages); i < k.length; i++) {
            if(k[i] === page) {
                pages[k[i]].style.display = 'block';
            } else {
                pages[k[i]].style.display = 'none';
            }
        }
    }

    document.getElementById('page').addEventListener('click', function(e) {
        if(!e.target.dataset.value) return;
        let page = e.target.dataset.value.toLowerCase();

        openPage(page);
    })

    function keydown(e) {
        if(window.parent == window) return;
        if(e.getModifierState("Alt") && e.getModifierState("Control") && e.getModifierState("Shift")) {
            if(e.code === 'KeyC') {
                parent.jsce_toggle()
            }
        }
        if(e.code === 'Escape') parent.jsce_toggle();
    }

    document.addEventListener('keydown', keydown);

    document.addEventListener('click', function(e) {
        if(!currentFocused) return;
        if(e.target !== currentFocused) currentFocused.classList.remove('show');
        return true;
    })

    mainPageInit();
    searchPageInit()
}

/* When the user clicks on the button,
toggle between hiding and showing the dropdown content */
function open_dropdown(e) {
    currentFocused = e;
    e.classList.toggle("show");
}

function radio_set(e) {
    let p = e.parentElement.parentElement;
    p.dataset.value = e.dataset.value;
    p.querySelector('button').innerText = e.innerText;
}

function clear_rnd_calls(e) {
    e.parentElement.children[1].innerHTML = '-- start --';
}