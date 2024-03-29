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
        return true;
    }

    speeder.textbox.classList.remove('error');
}

// speeder slider speeds
const speederSpeeds = [0.0001, 0.001, 0.005, 0.0075, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.7, 0.8, 0.9, 1, 1.25, 1.5, 2, 3, 5, 10, 15, 25, 50, 75, 100, 200, 500, 1000];
function parseRange(n) {
    return speederSpeeds[(speederSpeeds.length-1)/2 + parseInt(n)]
}

let currentFocused = null;
let pages;

function openPage(page) {
    for(let i = 0, k = Object.keys(pages); i < k.length; i++) {
        if(k[i] === page) {
            pages[k[i]].style.display = 'block';
        } else {
            pages[k[i]].style.display = 'none';
        }
    }
}

window.onload = async function() {
    pages = {
        main: document.getElementById('main-page'),
        search: document.getElementById('search-page'),
        storage: document.getElementById('storage-page'),
        console: document.getElementById('console-page')
    }

    openPage('main')

    document.getElementById('page').addEventListener('click', function(e) {
        if(!e.target.dataset.value) return;
        let page = e.target.dataset.value.toLowerCase();

        openPage(page);
    })

    function keydown(e) {
        if(window.parent == window) return;
        if(e.getModifierState("Alt") && e.getModifierState("Control") && e.getModifierState("Shift")) {
            // Note: add this check to the parent window script 
            if(e.code === 'KeyC') {
                let shown = window.parent.document.getElementById('jsce-container');
                parent.jsce_toggle()
                let btn = document.getElementById('jsce-floating-btn') || window.parent.document.getElementById('jsce-floating-btn');
                if(btn) {
                    if(shown && shown.style.display == 'none') {
                        btn.style.display = 'none';
                    } else {
                        btn.style.display = document.getElementById('floating-btn-switch').checked ? 'block' : 'none';
                    }
                }
            }
        }
        if(e.code === 'Escape') {
            let btn = window.parent.document.getElementById('jsce-floating-btn');
            if(btn) btn.style.display = document.getElementById('floating-btn-switch').checked ? 'block' : 'none';
            parent.jsce_toggle()
        };
    }

    document.addEventListener('keydown', keydown);

    document.addEventListener('click', function(e) {
        if(!currentFocused) return;
        if(e.target !== currentFocused) currentFocused.classList.remove('show');
        return true;
    })

    mainPageInit();
    searchPageInit();

    let startupState = window.parent.sessionStorage.getItem('jsce-startup');
    if(startupState != null) {
        // now restore jsce to the previous state 
        let data = JSON.parse(window.parent.sessionStorage.getItem('jsce-data'));
        if(data.search) displaySearchRes(data.search);
        window.parent.sessionStorage.removeItem('jsce-data');

        if(startupState == '2') {
            document.getElementById('open-on-reload').checked = true;
        }

        window.parent.sessionStorage.removeItem('jsce-startup');

        openPage('search');
        document.getElementById('sc-1-1-2').checked = true;

        // setup object index from reload
        let location = data.location;
        if(!location) return;

        // update location control
        let locationSelector = document.getElementById('search-location');
        locationSelector.dataset.value = location;
        locationSelector.querySelector('button').innerText = location;

        let { root, read, write } = await createObjectReference(location);

        objectIndex = new IndexedObj(root);
        objectIndex.location = location;
        objectIndex.search = data.search;
        if(location === 'sessionStorage' || location === 'localStorage') {
            objectIndex.onUpdate(read, write);
        }
    }

    let pkginput = document.getElementById('packagefile'), pkgfnamedisp = document.getElementById('selectedpkg');

	pkginput.addEventListener('change', function() {
		pkgfnamedisp.innerText = pkginput.files[0]?.name || "No File Selected";
	})
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

function runJSFile() {
	let file = document.getElementById("packagefile").files[0]
	if(!file) return;
	(new Blob([file])).text().then(async function(v) {
		try {
            eval(v)
        } catch (e) {
            alert(e.message);
        }
	});
}