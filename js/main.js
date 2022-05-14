window.obj = {
    a: 2, 
    b: 5,
    player: {
        health: 200,
        money: 100, 
        coinsz: 10,
        coinsx: 10,
        coinsg: 10,
        coinsc: 10
    }
}

let o = new IndexedObj(window.obj);
o.addObserver('a', v => {
    let val = `${v.old} -> ${v.new}`;
    if(v.value !== undefined) val = `${v.value}`;
    console.info(`${v.operation} (${val})\n@ ${v.path}\n${v.stack}`)
});
function modify() {
    window.obj.a = 10
}
function mod2() {
    window.obj.b = 32;
    modify();
}

setTimeout(mod2, 150)