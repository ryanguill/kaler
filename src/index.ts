import * as _ from 'lodash';
import * as $ from 'jquery';
(<any>window).jQuery = $;

interface StateInterface {
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
}

interface Stats {
    inputCount: number,
    outputCount: number,
    isAllNumeric: boolean,
    ks: Object
}

function render (domElements) : void {
    let state = gatherState(domElements);
    let stats = {
        inputCount: 0,
        outputCount: 0,
        isAllNumeric: false,
        ks: {}
    }

    state = parse(state);
    stats.inputCount = state.acc.length;

    state = trimValues(state);
    state = ignoreEmptyValues(state);
    state = distinctValues(state);
    state = quoteValues(state);
    state = sort(state);

    stats.outputCount = state.acc.length;
    stats = gatherStatistics(state, stats);
    state = join(state);
    
    console.log(state, stats);
    console.log(stats.ks);
    
    domElements.$panelOutput.find("textarea").val(state.output);
    domElements.$inputCount.empty().text(countDisplay(stats.inputCount));
    domElements.$outputCount.empty().text(countDisplay(stats.outputCount));
}

function countDisplay (input : number) : string {
    return `( ${input} item${input === 1 ? '' : 's'} )`
}

function gatherState (domElements) : StateInterface {
    const [sort, sortDirection] = domElements.$panelOptions.find("#sortValues").val().trim().split('|');

    const state = {
        input: domElements.$panelInput.find("textarea.input").val(),
        acc: [],
        output: '',
        inputDelimiter: domElements.$panelOptions.find("#inputDelimiter").val().replace(/(\\r\\n|\\n|\\r)/gm, '\n'),
        outputDelimiter: domElements.$panelOptions.find("#outputDelimiter").val(),
        distinctValues: domElements.$panelOptions.find("#distinctValues").val(),
        sort,
        sortDirection: sortDirection || 'ASC',
        quoteValues: domElements.$panelOptions.find("#quoteValues").is(":checked"),
        trimValues: domElements.$panelOptions.find("#trimValues").is(":checked"),
        ignoreEmptyValues: domElements.$panelOptions.find("#ignoreEmptyValues").is(":checked"),
    };

    return state;
}

function parse (input : StateInterface) : StateInterface {
    const {...state} = input;
    state.acc = state.input.replace(/(\r\n|\n|\r)/gm, '\n').split(state.inputDelimiter);
    return state;
}

function ignoreEmptyValues (input : StateInterface) : StateInterface {
    const {...state} = input;
    state.acc = state.acc.filter(x => x.length !== 0);
    return state;
}

function trimValues (input : StateInterface) : StateInterface {
    const {...state} = input;
    if (state.trimValues) {
        state.acc = state.acc.map(x => x.trim());
    }    
    return state;
}

function quoteValues (input : StateInterface) : StateInterface {
    const {...state} = input;
    if (state.quoteValues) {
        state.acc = state.acc.map(x => `'${x}'`);
    }
    return state;
}

function distinctValues (input : StateInterface) : StateInterface {
    const {...state} = input;
    if (state.distinctValues === 'DISTINCT') {
        state.acc = _.uniq(state.acc);
    } else if (state.distinctValues === 'DISTINCT-CASE-INSENSITIVE') {
        state.acc = _.uniqWith(state.acc, (a, b) => a.toLowerCase() === b);
    }    
    return state;
}

function join (input : StateInterface) : StateInterface {
    const {...state} = input;
    state.output = state.acc.join(state.outputDelimiter);
    return state;
}

function sort (input : StateInterface) : StateInterface {
    const {...state} = input;
    if (state.sort === 'NUMERIC') {
        state.acc = state.acc.sort((a,b) => Number(a) - Number(b));
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

function gatherStatistics (_state : StateInterface, _stats : Stats) : Stats {
    const {...state} = _state;
    const {...stats} = _stats;

    const isNumeric = x => Number(x) === x;
    const acc = state.acc.map(x => Number(x));
    stats.isAllNumeric = acc.every(isNumeric);

    if (stats.isAllNumeric) {
        const accForward = acc.sort((a,b) => a -b);
        const accBackward = [...acc].reverse();
        stats.ks = {
            avg: _.mean(acc),
            min: Math.min(...acc),
            k99gt: kthPercentile(99, accBackward, true),
            k95gt: kthPercentile(95, accBackward, true),
            k90gt: kthPercentile(90, accBackward, true),
            k75gt: kthPercentile(75, accBackward, true),
            k50: kthPercentile(50, accForward, true),
            k75lt: kthPercentile(75, accForward, true),
            k90lt: kthPercentile(90, accForward, true),
            k95lt: kthPercentile(95, accForward, true),
            k99lt: kthPercentile(99, accForward, true),
            max: Math.max(...acc)
        };
    }

    return stats;
}


function kthPercentile (k : number, input : number[], assumeSorted: boolean = false) : number {
    if (k > 1) {
        k = k / 100;
    }
    if (!assumeSorted) {
        input = [...input].sort((a,b) => a -b);
    }    
    const kth = k * (input.length-1);
    
    if (kth == Math.ceil(kth)) {
        
        return input[kth+1];
    } else {
        
        let o = (input[Math.floor(kth)-1] + input[Math.ceil(kth)-1]) / 2;
        console.log(k, kth, input.length, Math.floor(kth)-1, Math.ceil(kth)-1, o, input.join(''));
    }
}

export default class Main {
    

    constructor() {
        const domElements = {
            $panelInput: $("div.panel-input"),
            $panelOptions: $("div.panel-options"),
            $panelOutput: $("div.panel-output"),
            $panelInfo: $("div.panel-info"),
            $inputCount: $(".input-count"),
            $outputCount: $(".output-count")
        };
        
        domElements.$panelInput.on("change keyup", e => render(domElements));
        domElements.$panelOptions.on("change keyup", e => render(domElements));

        domElements.$panelInput.find("textarea").val(`1
2
3
4
5
6
7
8
9
10`).change();
    }
}

let start = new Main();