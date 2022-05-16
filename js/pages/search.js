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
        const e = o[k[i]];
        res[k[i]] = JSON.parse(e);
    } 
    return res;
}

function displaySearchRes(s) {
    let output = document.getElementById('search-res');
    output.innerHTML = '';
    if(s.length > 120) {
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
            if(!v) return;
            v = v.trim();
            if(Number(v) !== NaN) v = Number(v);
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
    let location = document.getElementById('search-location').dataset.value;
    let value = document.getElementById('search-value').value;
    let operation = document.getElementById('search-operation').dataset.value;
    let type = getTypes();
    let root, path;
    switch(location) {  
        case 'global':
            root = parent;
            path = 'window';
        break;
        case 'localStorage':
            root = parseStorage(localStorage);
            path = 'localStorage';
        break;
        case 'sessionStorage':
            root = parseStorage(sessionStorage);
            path = 'sessionStorage';
        break;
    }
    objectIndex = new IndexedObj(root)
    objectIndex.newSearch({value: value, operation: operation, type: type});
    displaySearchRes(objectIndex.search);
}

function refine() {
    let value = document.getElementById('search-value').value;
    let operation = document.getElementById('search-operation').dataset.value;
    let type = getTypes();
    objectIndex.refine({value: value, operation: operation, type: type});
    displaySearchRes(objectIndex.search);
}