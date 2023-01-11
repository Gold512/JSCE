// ==UserScript==
// @name         Cloud JSCE
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Pulls JSCE from github to make it always up to date and also reduces memory usage (github: https://gold512)
// @author       Gold512
// @match        *://*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    let initialised = false;
    let frame;

    /* src: https://betterprogramming.pub/how-to-fetch-files-from-github-in-javascript-e0ed2c72aeb4 */
    async function getgit (owner, repo, path) {
        let data = await fetch (
            `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
        )
        .then (d => d.json ())
        .then (d =>
                fetch (
            `https://api.github.com/repos/${owner}/${repo}/git/blobs/${d.sha}`
        )
                )
        .then (d => d.json ())
        .then (d => atob (d.content));

        return data;
    }

    async function init() {
        let html = await getgit('Gold512','JSCE','jsce.min.html');
        let el = document.createElement('div');
        el.setAttribute('id', 'jsce-container');
        el.style.display = 'none';
        el.style.border = 'none';
        el.style.width = '100%';
        el.style.height = '100%';
        el.style.position = 'fixed';
        el.style.zIndex = '99999999';
        el.style.left = '0';
        el.style.top = '0';

        let iframe = document.createElement('iframe');

        iframe.srcdoc = html;
        iframe.style.border = 'none';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.position = 'absolute';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.left = '0';
        iframe.style.top = '0';

        el.appendChild(iframe);

        document.body.appendChild(el);

        frame = iframe;
    }

    window.jsce_toggle = function() {
        let el = document.getElementById('jsce-container');

        if(el.style.display == 'none') {
            el.style.display = 'block'
            frame.focus();
        } else {
            el.style.display = 'none'
        }
    }

    async function keydown(e) {
        let el = document.getElementById('jsce-container');
        if(e.getModifierState("Alt") && e.getModifierState("Control") && e.getModifierState("Shift")) {
            if(e.code === 'KeyC') {
                if(!initialised) {
                    await init();
                    initialised = true;
                }
                window.jsce_toggle()
            }
        }
    }

    document.addEventListener('keydown', keydown);

    // Check if it is a jsce triggered reload
    let state = window.sessionStorage.getItem('jsce-startup');
    if(state != null) {
        // reload triggered by jsce
        init();
        initialised = true;

        if(state == '2') {
            window.jsce_toggle()
        }

        // will be removed by JSCE itself when read after loading
        // window.sessionStorage.removeItem('jsce-startup');
    }

    window.addEventListener('message', e => {
        let data = e.data;
        if(data.operation != 'jsce_freeze') return;
        // let checkbox = frame.contentWindow.document.getElementById('frozen-checkbox');
        let startBtn = frame.contentWindow.document.getElementById('freeze-start');
        // freeze javascript until the checkbox is unchecked
        let end = performance.now() + data.time;
        while(performance.now() < end) {};
        startBtn.innerText = 'Freeze';
    });
})();