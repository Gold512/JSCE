class Speeder {
    constructor(win) {
        this.original = {
            timeout:setTimeout,
            interval:setInterval,
            animationFrame:requestAnimationFrame
        }

        let {
            timeout, interval, animationFrame
        } = this.original;

        let start = performance.now();

        let ctx = (function* g() {
            while(true) {
                let speed = yield null;

                win.setTimeout = function(fn, t, ...args) { return timeout(fn, t/speed, ...args) }
                win.setInterval = function(fn, t, ...args) { return interval(fn, t/speed, ...args) }
                win.requestAnimationFrame = function(callback) {
                    return animationFrame(t => {
                        let elapsedTime = (t - start);
                        start += elapsedTime*speed
                        callback(start); 
                    })
                }
            }
        })();

        // go to the yield statement 
        ctx.next();

        this.ctx = ctx;
    }

    enable() {
        this.ctx.next(this.speed)
    }

    disable() {
        win.setTimeout = this.original.timeout;
        win.setInterval = this.original.interval;
        win.requestAnimationFrame = this.original.animationFrame;
    }

    setSpeed(speed) {
        this.speed = speed;
        this.ctx.next(speed)
    }
}

class RNG {
    constructor(win) {
        let original = Math.random;
        this.original = Math.random;
        this.Math = win.Math;
        let callstackOverrides = true;
        this.overrides = {};
        let overrides = this.overrides;

        
        this.set = function(v, callback = function() {}) {
            switch (Object.prototype.toString.call(v)) {
                // case '[object GeneratorFunction]':
                    // let ctx = v();
                    // this.Math.random = function() { return ctx.next() }
                    // break;
                case '[object Array]':
                    let index = -1;
                    this.Math.random = function() { 
                        let stack = getCallstack();
                        
                        if(callstackOverrides && overrides[stack]) { 
                            let val = overrides[stack]; 
                            callback(stack, val);
                            return val;
                        }

                        index++;
                        if(v[index] === undefined) index = 0;
                        let val = v[index] === '*' ? original() : v[index];
                        callback(stack, val);
                        return val;
                    }

                    break;
                default:
                    this.Math.random = function() {
                        if(callstackOverrides && overrides[stack]) { 
                            let val = overrides[stack]; 
                            callback(stack, val);
                            return val;
                        }

                        let val = v === '*' ? original() : v;
                        callback(getCallstack(), val)
                        return  
                    }
                    break;
            }
        }
    }
    
    reset() {
        this.Math.random = this.original;
    }
}