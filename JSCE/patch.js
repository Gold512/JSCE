class Speeder {
    constructor() {
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
                

                window.setTimeout = function(fn, t, ...args) { return timeout(fn, t/speed, ...args) }
                window.setInterval = function(fn, t, ...args) { return interval(fn, t/speed, ...args) }
                window.requestAnimationFrame = function(callback) {
                    return animationFrame(t => {
                        let elapsedTime = (t - start);
                        start = t - elapsedTime + elapsedTime*speed
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
        window.setTimeout = this.original.timeout;
        window.setInterval = this.original.interval;
        window.requestAnimationFrame = this.original.animationFrame;
    }

    setSpeed(speed) {
        this.speed = speed;
        this.ctx.next(speed)
    }
}

let RNG = {
    original: Math.random,
    set(v) {
        switch (Object.prototype.toString.call(v)) {
            case '[object GeneratorFunction]':
                let ctx = v();
                Math.random = function() { return ctx.next() }
                break;
            case '[object Array]':
                let index = -1;
                Math.random = function() { 
                    index++;
                    if(v[index] === undefined) index = 0;
                    return v[index];
                }

                break;
            default:
                Math.random = function() { return v }
                break;
        }
    },
    reset() {
        Math.random = this.original;
    }
}