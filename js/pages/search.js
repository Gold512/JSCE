function searchPageInit() {
    let allBtn = document.getElementById('all-types');
    let boxes = document.querySelectorAll('.type-option');
    let operation = document.getElementById('search-operation');
    let opBtn = document.getElementById('search-op-btn');
    let searchBox = document.getElementById('search-value');
    let locationSelector = document.getElementById('search-location');

    allBtn.addEventListener('input', e => {
        for(let i = 0; i < boxes.length; i++) {
            boxes[i].disabled = allBtn.checked;
        }
    });

    searchBox.addEventListener('input', e => {
        if(operation.dataset.value != 'auto' || e.currentTarget.value == '') {
            e.currentTarget.classList.remove('error')
            return;
        }

        let v = autoOperation(e.currentTarget.value);
        if(!v) {
            e.currentTarget.classList.add('error')
        } else {
            e.currentTarget.classList.remove('error');
            opBtn.innerText = `auto (${v.operation})`
        }
    })

    let locationValueToIndex = {
        'global': 0,
        'localStorage': 1,
        'sessionStorage': 2
    }

    let indexToLocation = ['global', 'localStorage', 'sessionStorage']

    searchBox.addEventListener('keydown', e => {
        switch(e.code) {
            case 'Enter': 
                newSearch();
            break;
            // Change location with arrow keys 
            case 'ArrowUp': {
                let x = locationValueToIndex[locationSelector.dataset.value];
                x = x-1 < 0 ? indexToLocation.length-1 : x-1
                x = indexToLocation[x];
                locationSelector.dataset.value = x;
                locationSelector.children[0].innerText = x;
            }
            break;
            case 'ArrowDown': {
                let x = locationValueToIndex[locationSelector.dataset.value];
                x = x+1 > indexToLocation.length-1 ? 0 : x+1;
                x = indexToLocation[x];
                locationSelector.dataset.value = x;
                locationSelector.children[0].innerText = x;
            }
            break;
        }
    })
}

function autoOperation(input) {
    if(!input) return;

    input = input.trim();
    let m = input.replace('==', '=').match(/^((?:=|>|<)=?)(.+)/);
    let operation = '', value = '';
    if(m) {
        if(m[1] === '=' | m[1] === '==') m[1] += '=';
        if(m[1][0] != '=') {
            value = Number(m[2]);
            if(isNaN(value)) return;
        } else {
            value = m[2];
        }

        operation = m[1];

        // assign m to new match and check if it is true
    } else {
        m = input.match(/^(\?|\/|\+\-)(.+)/)
        if(m) {
            operation = m[1];
            value = m[2]
        } else {
            m = input.match(/^(\d+(?:\.\d+)?)(~~?)(\d+(?:\.\d+)?)/);
            if(!m) return;
            value = [Number(m[1]), Number(m[3])];
            operation = m[2];
        }
    }

    return {value: value, operation: operation}
}

function getTypes() {
    let allBtn = document.getElementById('all-types');
    let boxes = document.querySelectorAll('.type-option');
    let res = {};
    for(let i = 0; i < boxes.length; i++) {
        if(allBtn.checked || boxes[i].checked) res[boxes[i].dataset.value] = true;
    }

    return res;
}

function parseStorage(o) {
    let res = {};

    for(let i = 0, k = Object.keys(o); i < k.length; i++) {
        const element = o[k[i]];
        try {
            res[k[i]] = JSON.parse(element);
        } catch(e) {
            res[k[i]] = element;
        }
    } 
    return res;
}

function autoTypeCast(v) {
    const o = {"true": true, "false": false};
    const QUOTES = [`'`, `"`];

    v = v.trim();
    if(!isNaN(Number(v))) {
        v = Number(v);
    } else if(o[v] !== undefined) {
        v = o[v];
    } else if(QUOTES.includes(v[0]) && QUOTES.includes(v[v.length - 1])) {
        v = v.slice(1, -1);
    }
    
    return v;
}

function formatPath(str) {
    return str.replaceAll(/.(\d+)(?!\w)/g, '[$1]')
}

function displaySearchRes(s) {
    let output = document.getElementById('search-res');
    output.innerHTML = '';
    if(s.length > 120 || s.length === 0) {
        let div = document.createElement('div');
        div.style.textAlign = 'center';
        div.style.margin = '0 5px';
        div.innerText = s.length + ' results';
        output.appendChild(div);
        return;
    }

    for(let i = 0; i < s.length; i++) {
        const e = s[i];
        let div = document.createElement('div');
        div.classList.add('search-box');
        div.addEventListener('click', function(e) {
            if(div.dataset.active === 'true') return;
            val_container.classList.remove('search-val-string')

            let el = document.createElement('input');
            let originalValue = val.innerText;

            div.dataset.active = 'true';

            el.value = val.innerText;
            let closed = false;

            el.addEventListener('blur', e => {
                if(closed) return;
                val = document.createElement('span');
                val_container.innerText = '';

                val.innerText = originalValue;
                val_container.appendChild(val);

                val_container.dataset.type = div.dataset.type;
                div.dataset.active = null;

            
                if(div.dataset.type === 'string') val_container.classList.add('search-val-string');
            })

            el.addEventListener('keydown', e => {
                if(e.code != 'Enter') return;
                let v = el.value;
                if(v == '') return;

                closed = true;
                div.dataset.active = null;

                if(v === null) return;
                v = autoTypeCast(v);
                
                try {
                    objectIndex.set(e.currentTarget.parentElement.parentElement.dataset.path, v);
                    
                    if(typeof v === 'string') val_container.classList.add('search-val-string');

                    let parent = e.currentTarget.parentElement;
                    val = document.createElement('span');
                    val.innerText = v;

                    parent.innerHTML = '';
                    parent.appendChild(val);

                    div.dataset.type = typeof v;
                    val_container.dataset.type = typeof v;
                    originalValue = v;
                } catch(e) {
                    throw e;
                    alert(e);
                }
            })

            el.addEventListener('input', e => {
                let v = el.value.trim();
                if(v == '') {
                    val_container.dataset.type = 'undefined';
                    return;
                }
                v = autoTypeCast(v);
                
                val_container.dataset.type = typeof v;
            })

            val_container.innerHTML = '';
            val_container.appendChild(el);

            let v = originalValue;
            v = autoTypeCast(v);

            val_container.dataset.type = typeof v;

            el.focus();
        })

        let path = document.createElement('div');
        div.dataset.path = e[0];
        div.dataset.type = typeof e[1];

        path.innerText = formatPath(e[0]);

        let val_container = document.createElement('div');
        val_container.dataset.type = typeof e[1];
        if(typeof e[1] === 'string') {
            val_container.classList.add('search-val-string')
        } else {
            val_container.classList.remove('search-val-string')
        }

        let val = document.createElement('span');
        val.innerText = e[1];
        val_container.appendChild(val);

        div.appendChild(path);
        div.appendChild(val_container);
        output.appendChild(div);
    }
}

let objectIndex;

function newSearch() {
    try {
        let location = document.getElementById('search-location').dataset.value;
        let value = document.getElementById('search-value').value;
        let value2 = document.getElementById('search-value-2').value;
        let operation = document.getElementById('search-operation').dataset.value;
        let type = getTypes();
        let root, path, read, write;

        if(value.length == 0) return

        switch(location) {  
            case 'global':
                root = window.parent;
                path = 'window';
            break;
            case 'localStorage':
                root = parseStorage(window.parent.localStorage);
                read = function() {
                    return parseStorage(window.parent.localStorage);
                }
                write = function(o) {
                    for(let i = 0, k = Object.keys(o); i < k.length; i++) {
                        window.parent.localStorage.setItem(k[i], JSON.stringify(o[k[i]]));
                    }
                }
            break;
            case 'sessionStorage':
                root = parseStorage(window.parent.sessionStorage);
                read = function() {
                    return parseStorage(window.parent.sessionStorage);
                }
                write = function(o) {
                    for(let i = 0, k = Object.keys(o); i < k.length; i++) {
                        window.parent.sessionStorage.setItem(k[i], JSON.stringify(o[k[i]]));
                    }
                }
            break;
        }

        objectIndex = new IndexedObj(root);
        objectIndex.location = location;
        if(location === 'sessionStorage' || location === 'localStorage') {
            objectIndex.onUpdate(read, write)
        }

        
        switch (operation) {
            case '~':
            case '+-':
                value = [Number(value), Number(value2)];
            break;
        }
        
        if(operation == 'auto') {
            let v = autoOperation(value)
            value = v.value;
            operation = v.operation;
        }
        
        objectIndex.newSearch({value: value, operation: operation, type: type});
        displaySearchRes(objectIndex.search);
    } catch(err) {
        let output = document.getElementById('search-res');
        output.innerHTML = '';

        let div = document.createElement('div');
        div.style.textAlign = 'center';
        div.style.margin = '0 5px';
        div.innerText = `${err}\n${err.stack}`;
        output.appendChild(div);
        return;
    }
}

function refine() {
    let value = document.getElementById('search-value').value;
    let operation = document.getElementById('search-operation').dataset.value;
    let type = getTypes();
    objectIndex.refine({value: value, operation: operation, type: type});
    displaySearchRes(objectIndex.search);
}

function change_search_op(e) {
    if(!e.target.matches('button')) return;
    switch (e.target.dataset.value) {
        case '~':
        case '+-':
            document.getElementById('search-value-2-cont').style.display = 'inline-block';
            document.getElementById('search-value').style.width = '20%';
            document.getElementById('search-op-disp').innerText = e.target.dataset.value;
        break;

        default:
            document.getElementById('search-value-2-cont').style.display = 'none';
            document.getElementById('search-value').style.width = '40%';
        break;
    }
}

function saveAndReload() {
    // save search data and reload 
    let win = window.parent;
    objectIndex.update('read');
    win.sessionStorage.setItem('jsce-data', JSON.stringify({
        search: objectIndex.search,
        location: objectIndex.location,
        openOnReload: document.getElementById('open-on-reload').checked
    }));
    let url = new URL(win.location.href);
    if(document.getElementById('open-on-reload').checked) {
        url.searchParams.set('jsce', '2'); // tell the program to initiate jsce
    } else {
        url.searchParams.set('jsce', '2'); // tell the program to init and show jsce 
    }
    
    win.location.replace(url);
}