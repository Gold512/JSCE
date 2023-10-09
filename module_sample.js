// simple sample script for modules

script.createToggleButton('currency grinder', {
    click() {
        alert(1)
    }
});

script.bindFunction('hotkey', msg => {
    alert(msg)
}, ['string']);
