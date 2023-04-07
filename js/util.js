function parseDuration(time) {
    if(typeof time === 'number') return time;

    const symbols = {
        h: 60 * 60 * 1000,
        m: 60 * 1000,
        s: 1000,
        ms: 1
    }

    let tokens = [time[0]];
    let tokenType = 'number';
    for(let i = 1; i < time.length; i++) {
        const c = time[i];
        if(c === ' ') continue;
        const type = c.match(/(\d|-|\.)/) ? 'number' : 'string';
        if(type === tokenType) {
            tokens[tokens.length - 1] += c;
        } else {
            tokenType = type;
            tokens.push(c);
        }
    }

    let duration = 0;

    for(let i = 0; i < tokens.length; i += 2) {
        let unitValue = symbols[tokens[i+1]]
        if(unitValue === undefined) return NaN; // throw new Error(`Invalid unit '${tokens[i+1]}'`);
        duration += Number(tokens[i]) * unitValue;
    }

    return duration;
}