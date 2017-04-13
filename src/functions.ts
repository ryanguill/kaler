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
    accForward: number[]
    accBackward: number[]

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

    if (stats.isAllNumeric) {
        stats.accForward = acc.sort((a, b) => a - b);
        stats.accBackward = [...acc].reverse();
        stats.ks = {
            avg: _.mean(acc).toFixed(3),
            min: Math.min(...acc),
            k99gt: kthPercentile(99, stats.accBackward, true),
            k95gt: kthPercentile(95, stats.accBackward, true),
            k90gt: kthPercentile(90, stats.accBackward, true),
            k75gt: kthPercentile(75, stats.accBackward, true),
            k50: kthPercentile(50, stats.accForward, true),
            k75lt: kthPercentile(75, stats.accForward, true),
            k90lt: kthPercentile(90, stats.accForward, true),
            k95lt: kthPercentile(95, stats.accForward, true),
            k99lt: kthPercentile(99, stats.accForward, true),
            max: Math.max(...acc),
            sum: acc.reduce((a, b) => a + b, 0),
            variance: ss.variance(stats.accForward).toFixed(3),
            stddev: ss.standardDeviation(stats.accForward).toFixed(3),
            mode: ss.modeSorted(stats.accForward),
        };
    }

    state.stats = stats;
    return state;
}


export function kthPercentile (k : number, input : number[], assumeSorted: boolean = false) : number {
    if (k > 1) {
        k = k / 100;
    }
    if (!assumeSorted) {
        input = [...input].sort((a, b) => a - b);
    }
    const kth = k * (input.length - 1);

    if (kth === Math.ceil(kth)) {
        return input[kth + 1];
    } else {
        return (input[Math.floor(kth)] + input[Math.ceil(kth)]) / 2;
    }
}

export function generateRandomNumbers (limit : number) : number[] {
    const output = [];
    for (let i = 0; i < limit; i++) {
        output.push(_.random(0, 1000, false));
    }
    return output;
}