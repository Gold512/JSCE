class Speeder {
    constructor(win) {
        this.original = {
            timeout:setTimeout,
            interval:setInterval,
            animationFrame:requestAnimationFrame,
            cancelAnimationFrame:cancelAnimationFrame,

            // these functions may be contextual to their parent object
            // use function.call() to execute them
            date: win.Date.now,
            performance: win.performance.now
        }

        let {
            timeout, interval, animationFrame, date, performance
        } = this.original;


        this.speed = 1;

        let ctx = (function* g() {
            let speed = 1;
            let start = win.document.timeline.currentTime || win.performance.now();
            let prevTime = win.document.timeline.currentTime || win.performance.now();

            let startDate = date.call(win.Date);
            let prevDate = date.call(win.Date);
            
            let startPerfNow = performance.call(win.performance);
            let prevPerfNow = performance.call(win.performance);

            let changeFramerate = false;
            let fps = null;
            let _frameInterval;
            while(true) {
                let input = yield null;

                if(typeof input?.speed === 'number') {
                    speed = input.speed;
                    continue;
                }

                if(typeof input?.changeFramerate === 'boolean') {
                    changeFramerate = input.changeFramerate;
                    continue;
                }
                
                if(input === true) {
                    win.setTimeout = function(fn, t, ...args) { return timeout(fn, t/speed, ...args) }
                    win.setInterval = function(fn, t, ...args) { return interval(fn, t/speed, ...args) }

                    if(changeFramerate) {
                        // if fps is set then use it else scale the fps based on speed
                        _frameInterval = fps ? (1 / fps) : (1000 / 60 / speed);
                        
                        win.requestAnimationFrame = callback => {
                            return setTimeout(t => {
                                
                            }, _frameInterval);
                        }

                        // patch cancelAnimationFrame so it cancels the call to requestAnimationFrame
                    }

                    win.requestAnimationFrame = callback => {
                        return animationFrame(t => {
                            let elapsedTime = (t - start);
                            start = t;
                            prevTime += elapsedTime * speed;
                            callback(prevTime); 
                        })
                    }

                    win.Date.now = () => {
                        let realDate = date.call(win.Date)
                        let elapsed = (realDate - startDate) * speed;
                        
                        startDate = realDate;
                        prevDate += elapsed;
                        return Math.floor(prevDate);
                    }

                    win.performance.now = () => {
                        let realPerfNow = performance.call(win.performance);
                        let elapsed = (realPerfNow - startPerfNow) * speed;

                        startPerfNow = realPerfNow;
                        prevPerfNow += elapsed;
                        return prevPerfNow;
                    }
                }

                
            }
        })();

        // go to the yield statement 
        ctx.next();

        this.ctx = ctx;
        this.win = win;
    }

    enable() {
        this.ctx.next({speed:this.speed})
        this.ctx.next(true);
    }

    disable() {
        this.win.setTimeout = this.original.timeout;
        this.win.setInterval = this.original.interval;
        this.win.requestAnimationFrame = this.original.animationFrame;
        this.win.Date.now = this.original.date;
        this.win.performance.now = this.original.performance;
    }

    setSpeed(speed) {
        this.speed = speed;
        this.ctx.next({speed})
    }

    /** 
     * change framerate of requestAnimationFrame
     */
    setFramerate(bool) {
        this.ctx.next({changeFramerate:bool});
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