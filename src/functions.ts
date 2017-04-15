import * as ss from 'simple-statistics';
import * as _ from 'lodash';

export interface StateInterface {
    input: string,
    acc: string[],
    output: string,
    inputDelimiter: string,
    outputDelimiter: string,
    distinctValues: 'FALSE' | 'DISTINCT' | 'DISTINCT-CASE-INSENSITIVE',
    sort: 'FALSE' | 'NUMERIC' | 'TEXT' | 'TEXT-CASE-INSENSITIVE',
    sortDirection: 'ASC' | 'DESC',
    quoteValues: boolean,
    trimValues: boolean
    stats: Stats
}

export interface Stats {
    inputCount: number,
    outputCount: number,
    isAllNumeric: boolean,
    ks: Object,
    acc: number[]

}

export function parse (input : StateInterface) : StateInterface {
    const {...state} = input;
    state.acc = state.input.replace(/(\r\n|\n|\r)/gm, '\n').split(state.inputDelimiter);
    state.stats.inputCount = state.acc.length;
    return state;
}

export function ignoreEmptyValues (input : StateInterface) : StateInterface {
    const {...state} = input;
    state.acc = state.acc.filter(x => x.length !== 0);
    return state;
}

export function trimValues (input : StateInterface) : StateInterface {
    const {...state} = input;
    if (state.trimValues) {
        state.acc = state.acc.map(x => x.trim());
    }
    return state;
}

export function quoteValues (input : StateInterface) : StateInterface {
    const {...state} = input;
    if (state.quoteValues) {
        state.acc = state.acc.map(x => `'${x}'`);
    }
    return state;
}

export function distinctValues (input : StateInterface) : StateInterface {
    const {...state} = input;
    if (state.distinctValues === 'DISTINCT') {
        state.acc = _.uniq(state.acc);
    } else if (state.distinctValues === 'DISTINCT-CASE-INSENSITIVE') {
        state.acc = _.uniqWith(state.acc, (a, b) => a.toLowerCase() === b);
    }
    return state;
}

export function join (input : StateInterface) : StateInterface {
    const {...state} = input;
    state.output = state.acc.join(state.outputDelimiter);
    return state;
}

export function sort (input : StateInterface) : StateInterface {
    const {...state} = input;
    if (state.sort === 'NUMERIC') {
        state.acc = state.acc.sort((a, b) => Number(a) - Number(b));
    } else if (state.sort === 'TEXT') {
        state.acc = state.acc.sort(function (a, b) {
            if (a < b) {
                return -1;
            }
            if (a > b) {
                return 1;
            }
            return 0;
        });
    } else if (state.sort === 'TEXT-CASE-INSENSITIVE') {
        state.acc = state.acc.sort(function (a, b) {
            a = a.toLowerCase();
            b = b.toLowerCase();
            if (a < b) {
                return -1;
            }
            if (a > b) {
                return 1;
            }
            return 0;
        });
    }

    if (state.sort !== 'FALSE' && state.sortDirection === 'DESC') {
        state.acc = state.acc.reverse();
    }

    return state;

}

export function gatherStatistics (_state : StateInterface) : StateInterface {
    const {...state} = _state;
    const stats = state.stats;

    stats.outputCount = state.acc.length;

    const isNumeric = x => Number(x) === x;
    let acc = state.acc.map(x => Number(x.replace(/'/g, '')));
    stats.isAllNumeric = acc.every(isNumeric) && acc.length > 0;

    // if not numeric, see if its all numeric if we remove the first element (because of a header)
    if (!stats.isAllNumeric && acc.length > 0) {
       if (!isNumeric(acc[0])) {
           acc = acc.slice(1, acc.length);
           stats.isAllNumeric = acc.every(isNumeric) && acc.length > 0;
       }
    }

    if (stats.isAllNumeric && acc.length > 0) {
        stats.acc = acc.sort((a, b) => a - b);
        stats.ks = {
            avg: sigFigs(_.mean(acc), 3),
            min: Math.min(...acc),
            k99gt: sigFigs(ss.quantileSorted(stats.acc, 0.01), 3),
            k95gt: sigFigs(ss.quantileSorted(stats.acc, 0.05), 3),
            k90gt: sigFigs(ss.quantileSorted(stats.acc, 0.1), 3),
            k75gt: sigFigs(ss.quantileSorted(stats.acc, 0.25), 3),
            k50: sigFigs(ss.quantileSorted(stats.acc, 0.5), 3),
            k75lt: sigFigs(ss.quantileSorted(stats.acc, 0.75), 3),
            k90lt: sigFigs(ss.quantileSorted(stats.acc, 0.9), 3),
            k95lt: sigFigs(ss.quantileSorted(stats.acc, 0.95), 3),
            k99lt: sigFigs(ss.quantileSorted(stats.acc, 0.99), 3),
            max: Math.max(...acc),
            sum: sigFigs(ss.sum(stats.acc), 3),
            variance: sigFigs(ss.variance(stats.acc).toFixed(3), 3),
            stddev: sigFigs(ss.standardDeviation(stats.acc).toFixed(3), 3),
            mode: sigFigs(ss.modeSorted(stats.acc), 3),
        };
    }

    state.stats = stats;
    return state;
}

function sigFigs(n : number, sig : number) : number {
    if (n === 0) {
        return n;
    }
    const mult = Math.pow(10, sig - Math.floor(Math.log(n) / Math.LN10) - 1);
    return Math.round(n * mult) / mult;
}

export function generateRandomNumbers (limit : number) : number[] {
    const output = [];
    for (let i = 0; i < limit; i++) {
        output.push(_.random(0, 1000, false));
    }
    return output;
}