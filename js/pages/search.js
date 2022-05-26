function searchPageInit() {
    let allBtn = document.getElementById('all-types');
    let boxes = document.querySelectorAll('.type-option');
    let operation = document.getElementById('search-operation');
    let opBtn = document.getElementById('search-op-btn');

    allBtn.addEventListener('input', function(e) {
        for(let i = 0; i < boxes.length; i++) {
            boxes[i].disabled = allBtn.checked;
        }
    });

    document.getElementById('search-value').addEventListener('input', function(e) {
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
            val.classList.remove('search-val-string')

            let el = document.createElement('input');
            let originalValue = val.innerText;

            div.dataset.active = 'true';

            el.value = val.innerText;
            let closed = false;

            el.addEventListener('blur', e => {
                if(closed) return;
                val.innerText = originalValue;
                val.dataset.type = '';
                div.dataset.active = null;
            })

            el.addEventListener('keydown', e => {
                if(e.code != 'Enter') return;
                let v = el.value;
                if(v == '') return;

                closed = true;
                div.dataset.active = null;

                if(v === null) return;
                v = v.trim();
                if(!isNaN(Number(v))) v = Number(v);

                if(v === 'bool true') v = true;
                if(v === 'bool false') v = false;
                try {
                    objectIndex.set(e.currentTarget.parentElement.parentElement.dataset.path, v);
                    
                    if(typeof v === 'string') val.classList.add('search-val-string');
                    e.currentTarget.parentElement.innerText = v;
                    val.dataset.type = '';
                } catch(e) {
                    throw e;
                    alert(e);
                }
            })

            el.addEventListener('input', e => {
                let v = el.value.trim();
                if(v == '') {
                    val.dataset.type = 'undefined';
                    return;
                }
                if(!isNaN(Number(v))) v = Number(v);
                val.dataset.type = typeof v;
            })

            val.innerHTML = '';
            val.appendChild(el);

            let v = originalValue;
            if(!isNaN(Number(v))) v = Number(v);

            val.dataset.type = typeof v;

            el.focus();
        })

        let path = document.createElement('div');
        div.dataset.path = e[0];
        path.innerText = formatPath(e[0]);

        let val = document.createElement('div');
        if(typeof e[1] === 'string') {
            val.classList.add('search-val-string')
        } else {
            val.classList.remove('search-val-string')
        }
        val.innerText = e[1];

        div.appendChild(path);
        div.appendChild(val);
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