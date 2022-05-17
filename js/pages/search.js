function searchPageInit() {
    let allBtn = document.getElementById('all-types');
    let boxes = document.querySelectorAll('.type-option');
    allBtn.addEventListener('input', function(e) {
        for(let i = 0; i < boxes.length; i++) {
            boxes[i].disabled = allBtn.checked;
        }
    })
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

            let v = prompt('value (use bool keyword for bool example "bool true")')
            if(v === null) return;
            v = v.trim();
            if(Number(v) != NaN) v = Number(v);
            if(v === 'bool true') v = true;
            if(v === 'bool false') v = false;
            try {
                objectIndex.set(e.currentTarget.children[0].innerText, v)
                e.currentTarget.children[1].innerText = v;
            } catch(e) {
                alert(e);
            }
        })

        let path = document.createElement('div');
        path.innerText = e[0];

        let val = document.createElement('div');
        if(typeof e[1] === 'string') e[1] = `'${e[1]}'`;
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
        let operation = document.getElementById('search-operation').dataset.value;
        let type = getTypes();
        let root, path, read, write;
        if(location === objectIndex?.location) {
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
        }
        objectIndex.newSearch({value: value, operation: operation, type: type});
        displaySearchRes(objectIndex.search);
    } catch(err) {
        let output = document.getElementById('search-res');
        output.innerHTML = '';

        let div = document.createElement('div');
        div.style.textAlign = 'center';
        div.style.margin = '0 5px';
        div.innerText = err;
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