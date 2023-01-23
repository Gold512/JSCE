function searchPageInit() {
    let allBtn = document.getElementById('all-types');
    let boxes = document.querySelectorAll('.type-option');
    let operation = document.getElementById('search-operation');
    let opBtn = document.getElementById('search-op-btn');
    let searchBox = document.getElementById('search-value');
    let locationSelector = document.getElementById('search-location');
    let clearStorageBtn = document.getElementById('clear-storage');

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
        'sessionStorage': 2,
        'indexedDB': 3
    }

    let indexToLocation = [
        'global', 
        'localStorage', 
        'sessionStorage', 
        'indexedDB'
    ]

    searchBox.addEventListener('keydown', e => {
        switch(e.code) {
            case 'Enter':
                let shift = e.getModifierState('Shift');
                // check if length is not 0 and location is unchanged
                if(!shift && objectIndex && objectIndex?.search?.length && (objectIndex.location === locationSelector.dataset.value)) {
                    refine()
                    break;
                }

                newSearch();
            break;
            // Change location with arrow keys 
            case 'ArrowUp': {
                e.preventDefault();
                let x = locationValueToIndex[locationSelector.dataset.value];
                x = x-1 < 0 ? indexToLocation.length-1 : x-1
                x = indexToLocation[x];
                locationSelector.dataset.value = x;
                locationSelector.children[0].innerText = x;
            }
            break;
            case 'ArrowDown': {
                e.preventDefault();
                let x = locationValueToIndex[locationSelector.dataset.value];
                x = x+1 > indexToLocation.length-1 ? 0 : x+1;
                x = indexToLocation[x];
                locationSelector.dataset.value = x;
                locationSelector.children[0].innerText = x;
            }
            break;
        }
    });

    clearStorageBtn.addEventListener('click', async ev => {
        let self = ev.currentTarget;
        if(self.dataset.confirm) {
            await clearAllStorage();
            window.parent.location.reload();
            return;
        }

        let originalText = self.innerText;
        self.innerText = 'Confirm';

        self.dataset.confirm = setTimeout(self => {
            self.dataset.confirm = '';
            self.innerText = originalText;
        }, 2000, self);
    });
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
    } else if(input.match(/^\/\\(?:>|<)?/)) {
        operation = input.match(/^\/\\(?:>|<)?/)[0]
    } else {
        m = input.match(/^(\?|\/|\*|\.|\+\-)(.+)/)
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

function formatPath(s) {
    //return str.replaceAll(/(?<!\\)\.(\d+)(?!\w)/g, '[$1]')

    let res = [''];
    let idx = 0;
    
    for(let i = 0; i < s.length; i++) {
        if(s[i] == '\\') {
            i++;
            res[idx] += s[i];
            continue;
        }

        if(s[i] == '.') {
            idx++;
            res[idx] = '';
            continue;
        }

        res[idx] += s[i];
    }

    for(let i = 1; i < res.length; i++) {
        if(res[i].match(/^\d+$/)) {
            res[i] = `<span style="color:white">[</span><span style="color:rgb(117, 255, 172)">${res[i]}</span><span style="color:white">]</span>`;
        } else {
            res[i] = '<span style="color:white">.</span>' + res[i];
        }
    }

    return `<span style="color:rgb(117, 214, 255)">${res.join('')}</span>`;
}

async function refreshSearchResults() {
    let elements = document.querySelector('#search-res').children;
    await objectIndex.read()

    for(let i = 0; i < elements.length; i++) {
        const e = elements[i];
        let value = objectIndex._get(e.dataset.path);
        e.querySelector('div[data-type]').dataset.type = typeof value;
        e.querySelector('div[data-type] > span').innerText = value;
    }
}

async function editSelectedResults() {
    let elements = document.querySelectorAll('#search-res > .selected');
    if(elements.length === 0) {
        alert('No results selected');
        return;
    }

    let input = await editSelectedPrompt('Editing ' + elements.length + ' results');
    if(input === null || (input === '')) return;
    input = autoTypeCast(input);

    objectIndex.transform(() => {
        let errs = 0;

        for(let i = 0; i < elements.length; i++) {
            const e = elements[i];
            e.querySelector('div[data-type]').dataset.type = typeof input;
            try{
                objectIndex._set(e.dataset.path, input);
                objectIndex.search[Number(e.dataset.index)][1] = input;
                e.querySelector('div[data-type] > span').innerText = input;
            } catch(e) { errs++; }
        }

        if(errs > 1) alert(`Modified ${elements.length} items (${errs} Errors)`)
    });
}

async function editSelectedPrompt(title) {
    let resolve, promise = new Promise(res => { resolve = res });
    
    let container = document.createElement('div');
    container.id = 'edit-prompt-container';

    function removePrompt() {
        container.remove();
    }

    container.addEventListener('click', ev => {
        if(ev.currentTarget !== ev.target) return;
        removePrompt();
        resolve(null);
    });

    let box = document.createElement('div');
    box.classList.add('box');
    container.appendChild(box);
    
    let titleElement = document.createElement('div');
    titleElement.classList.add('box-header');
    titleElement.innerText = title;
    box.appendChild(titleElement);

    let val_container = document.createElement('div');
    val_container.classList.add('search-val-string');
    val_container.dataset.type = 'undefined';
    box.appendChild(val_container);

    let input = document.createElement('input');
    input.type = 'text';
    input.style.margin = 'auto';
    input.addEventListener('input', e => {
        let v = input.value.trim();
        if(v == '') {
            val_container.dataset.type = 'undefined';
            return;
        }
        v = autoTypeCast(v);
        
        val_container.dataset.type = typeof v;
    });

    input.addEventListener('keydown', e => {
        if(e.code != 'Enter') return;
        let v = input.value;
        removePrompt();
        resolve(v);
    });

    val_container.appendChild(input);

    document.body.appendChild(container);
    
    input.focus()
    return promise;
}

async function clearAllStorage() {
    let win = window.parent;
    win.localStorage.clear();
    win.sessionStorage.clear();
    await clearAllDBs(window.parent);
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
        output.classList.remove('dynamic-scrollable'); // output only same size as output text
        return;
    }

    let selectedElements = new Set();
    let prevSelection = null;
    let prevEndState = null;
    let selectionWithCtrl = null;

    function deSelectElements() {
        for(let i of selectedElements.values()) {
            selectedElements.delete(i);
            output.children[i].classList.remove('selected');
        }
    }

    for(let i = 0; i < s.length; i++) {
        const e = s[i];
        let div = document.createElement('div');
        div.classList.add('search-box');
        div.addEventListener('click', e => {
            const alt = e.getModifierState('Alt') || e.getModifierState('Shift');
            const ctrl = e.getModifierState('Control');

            if(alt || ctrl) {
                e.preventDefault();

                // multi-select code 

                const idx = Number(e.currentTarget.dataset.index);
                const endState = !e.currentTarget.classList.contains('selected');

                const setOperation = endState ? 'add' : 'delete';
                const classOperation = endState ? 'add' : 'remove';

                if(ctrl && alt && selectionWithCtrl !== null) {
                    const min = Math.min(idx, selectionWithCtrl);
                    const max = Math.max(idx, selectionWithCtrl);

                    const setOperation = prevEndState ? 'add' : 'delete';
                    const classOperation = prevEndState ? 'add' : 'remove';

                    for(let i = min; i <= max; i++) {
                        selectedElements[setOperation](i);
                        output.children[i].classList[classOperation]('selected');
                    }

                    selectionWithCtrl = null;
                } else if((selectedElements.size === 0) || ctrl) {
                    selectedElements[setOperation](idx);
                    output.children[idx].classList[classOperation]('selected');

                    prevSelection = idx;
                    prevEndState = endState;
                    if(ctrl && alt) selectionWithCtrl = idx;
                } else if(!ctrl && (prevSelection !== null)) {
                    // multi selection without ctrl
                    // select from prevSelection to this selection

                    const min = Math.min(idx, prevSelection);
                    const max = Math.max(idx, prevSelection);

                    deSelectElements();

                    for(let i = min; i <= max; i++) {
                        output.children[i].classList.add('selected');
                        selectedElements.add(i);
                    }
                }

                return;
            }

            if(div.dataset.active === 'true') return;
            
            // just de-select all on normal click 
            deSelectElements();

            val_container.classList.remove('search-val-string');

            let el = document.createElement('input');
            let originalValue = val.innerText;

            div.dataset.active = 'true';

            el.value = val.innerText;
            let closed = false;

            el.addEventListener('blur', e => {
                if(closed) return;
                val = document.createElement('span');
                val_container.innerText = '';

                if(div.dataset.type === 'boolean') {
                    let bool = originalValue === 'true' ? true : false;
                    boolEdit = createBooleanCheckbox(bool, val, div);
                    val_container.appendChild(boolEdit);
                }

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

                    if(typeof v === 'boolean') {
                        boolEdit = createBooleanCheckbox(v, val, div);
                        parent.appendChild(boolEdit);
                    }

                    parent.appendChild(val);

                    div.dataset.type = typeof v;
                    val_container.dataset.type = typeof v;
                    originalValue = v;

                    // Update search result database
                    objectIndex.search[Number(div.dataset.index)][1] = v;

                    
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

            val_container.dataset.type = v ? typeof v : 'undefined';

            el.focus();
        })

        let path = document.createElement('div');
        div.dataset.path = e[0];
        div.dataset.type = typeof e[1];
        div.dataset.index = i;

        path.innerHTML = formatPath(e[0]);

        let val_container = document.createElement('div');
        val_container.dataset.type = typeof e[1];
        if(typeof e[1] === 'string') {
            val_container.classList.add('search-val-string')
        } else {
            val_container.classList.remove('search-val-string')
        }

        let boolEdit = null;

        

        let val = document.createElement('span');
        val.innerText = e[1];

        // checkbox for quick boolean edit
        if(div.dataset.type === 'boolean') {
            boolEdit = createBooleanCheckbox(e[1], val, div);
            val_container.appendChild(boolEdit)
        }
        
        val_container.appendChild(val);

        div.appendChild(path);
        div.appendChild(val_container);
        output.appendChild(div);
    }
    output.classList.add('dynamic-scrollable'); // TAKE UP ALL AVAILABLE SPACE

    function createBooleanCheckbox(state, val, div) {
        let el = document.createElement('input')
        el.type = 'checkbox';
        el.classList.add('boolean-checkbox');
        el.checked = state;
        el.addEventListener('click', ev => {
            ev.stopPropagation()

            let path = ev.currentTarget.parentElement.parentElement.dataset.path;

            let v = ev.currentTarget.checked;
            objectIndex.set(path, v);
            val.innerText = v;

            // Update search result database
            objectIndex.search[Number(div.dataset.index)][1] = v;
        });

        return el;
    }
}

let objectIndex;

async function newSearch() {
    try {
        let location = document.getElementById('search-location').dataset.value;
        let value = document.getElementById('search-value').value;
        let value2 = document.getElementById('search-value-2').value;
        let operation = document.getElementById('search-operation').dataset.value;
        let searchHidden = document.getElementById('search-hidden').checked;
        let type = getTypes();

        if(value.length == 0) return

        let { root, read, write } = await createObjectReference(location);

        objectIndex = new IndexedObj(root);
        objectIndex.location = location;
        let unsafe = true;
        if((read !== null) && (write !== null)) {
            objectIndex.onUpdate(read, write);
            unsafe = false;
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
        
        objectIndex.newSearch({value: value, operation: operation, type: type, unsafe: unsafe, deepSearch: searchHidden});
        displaySearchRes(objectIndex.search);
    } catch(err) {
        throw err;
        // let output = document.getElementById('search-res');
        // output.innerHTML = '';

        // let div = document.createElement('div');
        // div.style.textAlign = 'center';
        // div.style.margin = '0 5px';
        // div.innerText = `${err}\n${err.stack}`;
        // output.appendChild(div);
        // return;
    }
}

async function createObjectReference(location) {
    let root, read = null, write = null;
    switch(location) {
        case 'global':
            root = window.parent;
            break;
            
        case 'localStorage':
            root = parseStorage(window.parent.localStorage);

            read = function () {
                return parseStorage(window.parent.localStorage);
            };

            write = function (o) {
                for (let i = 0, k = Object.keys(o); i < k.length; i++) {
                    window.parent.localStorage.setItem(k[i], JSON.stringify(o[k[i]]));
                }
            };

            break;
        case 'sessionStorage':
            root = parseStorage(window.parent.sessionStorage);

            read = function () {
                return parseStorage(window.parent.sessionStorage);
            }

            write = function (o) {
                for (let i = 0, k = Object.keys(o); i < k.length; i++) {
                    window.parent.sessionStorage.setItem(k[i], JSON.stringify(o[k[i]]));
                }
            }

            break;
        case 'indexedDB':
            let db = await getAllDBs(window.parent);
            root = parseDBData(db);

            read = async () => {
                let db = await getAllDBs(window.parent);
                return parseDBData(db)
            }

            write = async (o) => {
                let db = unparseDBData(o);
                await setAllDBs(db, window.parent);
            }

            break;
    }
    return { root, read, write };
}

/**
 * Attempt to parse all DB data into JS objects
 * @param {object} db - db data from getAllDBs
 */
function parseDBData(db) {
    db = JSON.parse(JSON.stringify(db));
    for(let i in db) {
        let objStores = db[i];
        for(let j in objStores) {
            let keys = db[i][j]

            for(let k in keys) {
                let e = db[i][j][k];
                db[i][j][k] = _attemptParse(e);
            }
        }
    }

    return db;
}

function unparseDBData(db) {
    db = JSON.parse(JSON.stringify(db));
    for(let i in db) {
        let objStores = db[i];
        for(let j in objStores) {
            let keys = db[i][j]

            for(let k in keys) {
                let e = db[i][j][k];
                db[i][j][k] = _reverseParse(e);
            }
        }
    }

    return db;
}

function _attemptParse(o) {
    if(typeof o == 'string') {
        try {
            return ['json', JSON.parse(o)];
        } catch (e) {}
    }

    return ['none', o];
}

function _reverseParse(o) {
    let type = o[0];
    let value = o[1];

    switch(type) {
        case 'json':
            return JSON.stringify(value);

        case 'none':
            return value;
        
        default: throw new Error("Invalid data type '" + type + "'");
    }
}

/**
 * 
 * @param {Window} win - the window to search in
 * @returns {object} - the found data in indexed databases
 */
async function getAllDBs(win = window) {
    let dbList = await win.indexedDB.databases();
    let processes = [];
    let res = {};

    for(let i = 0; i < dbList.length; i++) {
        const dbInfo = dbList[i];
        const name = dbInfo.name;
        const db = win.indexedDB.open(name);
        res[name] = {};

        processes.push(new Promise((resolve, reject) => {
            db.onsuccess = () => {
                let database = db.result;
                let objectStores = database.objectStoreNames;
                let transaction = database.transaction(objectStores, "readonly");

                for(let j = 0; j < objectStores.length; j++) {
                    let objectStore = transaction.objectStore(objectStores[j]);
                    res[name][objectStores[j]] = {};
                    request = objectStore.openCursor();

                    request.onerror = function(event) {
                        reject("unable to create object store cursor for '" + objectStores[j] + "'")
                    }

                    request.onsuccess = function(event) {
                        let cursor = event.target.result;
                        if (cursor) {
                            let key = cursor.primaryKey;
                            let value = cursor.value;
                            res[dbInfo.name][objectStores[j]][key] = value;

                            cursor.continue();
                        }
                        resolve();
                    }
                }
            }

            db.onerror = () => {
                reject(`failed to open database '${name}'`)
            }
        }));
    }

    await Promise.all(processes);
    return res;
}

// obj format: obj[databaseName][objectStores][key]
/**
 * Set all indexed databases to object definition
 * @param {Object} obj - the object to set
 * @param {Window} win - the window to search in
 * @returns {object} - the found data in indexed databases
 */
async function setAllDBs(obj, win = window) {
    let processes = [];

    // write into all databases and overwrite them with the new object
    for(let databaseName in obj) {
        const db = win.indexedDB.open(databaseName);

        processes.push(new Promise((resolve, reject) => {
            db.onerror = () => {
                reject(`failed to open database '${databaseName}'`);
            }

            db.onsuccess = () => {
                let database = db.result;
                let transaction = database.transaction(Object.keys(obj[databaseName]), "readwrite");

                for(let objectStoreNames in obj[databaseName]) {
                    let objectStore = transaction.objectStore(objectStoreNames);
                    
                    // set the values of all the key value pairs
                    // adding them if they dont already exist
                    let objectStoreIndex = obj[databaseName][objectStoreNames];
                    for(let key in objectStoreIndex) {
                        // put has the item param before the key
                        objectStore.put(objectStoreIndex[key], key);
                    }
                }
                
                resolve();
            }
        }));
    }

    // wait until all operations are complete
    await Promise.all(processes);
}

async function clearAllDBs(win) {
    const dbs = await win.indexedDB.databases()
    dbs.forEach(db => { win.indexedDB.deleteDatabase(db.name) })
}

function refine() {
    let value = document.getElementById('search-value').value;
    let operation = document.getElementById('search-operation').dataset.value;
    let type = getTypes();

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

async function saveAndReload() {
    // save search data and reload 
    let win = window.parent;
    
    if(objectIndex !== undefined) {
        await objectIndex.read();
        win.sessionStorage.setItem('jsce-data', JSON.stringify({
            search: objectIndex.search,
            location: objectIndex.location,
            openOnReload: document.getElementById('open-on-reload').checked
        }));
    } else {
        win.sessionStorage.setItem('jsce-data', JSON.stringify({
            openOnReload: document.getElementById('open-on-reload').checked
        }));
    }

    let state = '';

    if(document.getElementById('open-on-reload').checked) {
        state = '1'; // tell the program to initiate jsce only
    } else {
        state = '2'; // tell the program to init and show jsce 
    }

    win.sessionStorage.setItem('jsce-startup', state);
    win.location.reload();
}