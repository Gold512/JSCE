let consoleContainer = null;
let MAX_CONSOLE_LINES = 100;

function logToConsole(msg) {
    if(typeof msg === 'string') msg = msg.split('\n');

    for(let i = 0; i < msg.length; i++) {
        let line = document.createElement('div');
        line.className = 'console-line';
        line.innerText = msg[i];
        consoleContainer.appendChild(line);
    }

    if(consoleContainer.childElementCount > MAX_CONSOLE_LINES) consoleContainer.children[0].remove();
    
}

// prerun message 
window.addEventListener('load', () => {
    consoleContainer = document.getElementById('console-page');
    logToConsole([
        'JSCE HTML Console',
        '  Max lines: ' + MAX_CONSOLE_LINES,
        '------------------------'
    ])
})
