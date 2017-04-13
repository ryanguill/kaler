import * as _ from 'lodash';
import * as $ from 'jquery';
import * as Promise from 'bluebird';
import * as ss from 'simple-statistics';

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
    stats: Stats
}

interface Stats {
    inputCount: number,
    outputCount: number,
    isAllNumeric: boolean,
    ks: Object,
    accForward: number[]
    accBackward: number[]

}

function render (domElements) : void {
    Promise.resolve(gatherState(domElements))
        .then(parse)
        .then(trimValues)
        .then(ignoreEmptyValues)
        .then(distinctValues)
        .then(quoteValues)
        .then(sort)
        .then(gatherStatistics)
        .then(join)
        .then(domRender(domElements));
}

function domRender (domElements) {
    return function (state) {
        const {output, stats} = state;
        domElements.$panelOutput.find("textarea").val(output);
        domElements.$inputCount.empty().text(countDisplay(stats.inputCount));
        domElements.$outputCount.empty().text(countDisplay(stats.outputCount));

        if (stats.isAllNumeric) {
            domElements.$panelStats.closest(".row").show();
            
            domElements.$panelStats.find(".min").text(stats.ks["min"]);
            domElements.$panelStats.find(".k99gt").text(stats.ks["k99gt"]);
            domElements.$panelStats.find(".k95gt").text(stats.ks["k95gt"]);
            domElements.$panelStats.find(".k90gt").text(stats.ks["k90gt"]);
            domElements.$panelStats.find(".k75gt").text(stats.ks["k75gt"]);
            domElements.$panelStats.find(".k50").text(stats.ks["k50"]);
            domElements.$panelStats.find(".k75lt").text(stats.ks["k75lt"]);
            domElements.$panelStats.find(".k90lt").text(stats.ks["k90lt"]);
            domElements.$panelStats.find(".k95lt").text(stats.ks["k95lt"]);
            domElements.$panelStats.find(".k99lt").text(stats.ks["k99lt"]);
            domElements.$panelStats.find(".max").text(stats.ks["max"]);

            domElements.$panelStats.find(".avg").text(stats.ks["avg"]);
            domElements.$panelStats.find(".sum").text(stats.ks["sum"]);
            domElements.$panelStats.find(".variance").text(stats.ks["variance"]);
            domElements.$panelStats.find(".stddev").text(stats.ks["stddev"]);
            domElements.$panelStats.find(".mode").text(stats.ks["mode"]);

            drawCandlestickChart([stats.ks["min"], stats.ks["k75gt"], stats.ks["k75lt"], stats.ks["max"]]);
            drawHistogramChart(stats.accForward);
        } else {
            domElements.$panelStats.closest(".row").hide();
        }
    };
}

//expects 4 values
function drawCandlestickChart (input) {
    
    input.unshift('');
    var data = google.visualization.arrayToDataTable([
        input
    // Treat first row as data as well.
    ], true);

    var options = {
        legend:'none',
        colors: ['#444'],
        chartArea: {left:50, top:25, right:10, bottom:25, width:'100%', height: '100%' },
    };

    var chart = new google.visualization.CandlestickChart(document.getElementById('candlestick_chart'));

    chart.draw(data, options);
}

function drawHistogramChart (input) {
    
    const data = input.map(x => ['', x]);
    data.unshift(['Name', 'Amount']);
    var dataTable = google.visualization.arrayToDataTable(data);

    var options = {
        
        legend: { position: 'none' },
        colors: ['#444'],
        bar: { groupWidth: 0 },
        chartArea: {left:50, top:25, right:10, bottom:25, width:'100%', height: '100%' },
    };

    var chart = new google.visualization.Histogram(document.getElementById('histogram_chart'));

    chart.draw(dataTable, options);
}

function drawScatterChart (stats) {
    //aggregate the data
    const aggData = stats.accForward.reduce(function (acc, element) {
        const grouping = acc.data.find(x => x[0] === element);
        if (grouping) {
            const x = ++grouping[1];
            if (x > acc.max) {
                acc.max = x;
            }
        } else {
            acc.data.push([element, 1]);
        }
        return acc;
    }, {data:[], min:0, max:Infinity})

    aggData.data.unshift(["X", "Freq"]);
    var dataTable = google.visualization.arrayToDataTable(aggData.data);
    var options = {
          vAxis: {title: 'Freq', minValue: 0, maxValue: aggData.max},
          legend: 'none',
          colors: ['#333'],
          chartArea: {left:0, top:0, right:0, bottom:0, width:'100%', height: '100%' },
        }

    var chart = new google.visualization.ScatterChart(document.getElementById('scatter_chart'));
    chart.draw(dataTable, options);

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
        stats: {
            inputCount: 0,
            outputCount: 0,
            isAllNumeric: false,
            ks: {},
            accForward: [],
            accBackward: []
        }
    };

    return state;
}

function parse (input : StateInterface) : StateInterface {
    const {...state} = input;
    state.acc = state.input.replace(/(\r\n|\n|\r)/gm, '\n').split(state.inputDelimiter);
    state.stats.inputCount = state.acc.length;
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

function gatherStatistics (_state : StateInterface) : StateInterface {
    const {...state} = _state;
    const stats = state.stats;

    stats.outputCount = state.acc.length;

    const isNumeric = x => Number(x) === x;
    let acc = state.acc.map(x => Number(x.replace(/'/g, '')));
    stats.isAllNumeric = acc.every(isNumeric) && acc.length > 0;

    //if not numeric, see if its all numeric if we remove the first element (because of a header)
    if (!stats.isAllNumeric && acc.length > 0) {
       if (!isNumeric(acc[0])) {
           acc = acc.slice(1, acc.length);
           stats.isAllNumeric = acc.every(isNumeric) && acc.length > 0;
       }
    }

    if (stats.isAllNumeric) {
        stats.accForward = acc.sort((a,b) => a -b);
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
            sum: acc.reduce((a,b) => a+b, 0),
            variance: ss.variance(stats.accForward).toFixed(3),
            stddev: ss.standardDeviation(stats.accForward).toFixed(3),
            mode: ss.modeSorted(stats.accForward),
        };
    }

    state.stats = stats;
    return state;
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
        return (input[Math.floor(kth)] + input[Math.ceil(kth)]) / 2;
    }
}

function generateRandomNumbers (limit : number) : number[] {
    const output = [];
    for (let i = 0; i < limit; i++) {
        output.push(_.random(0, 1000, false));
    }
    return output;
}

export default class Main {
    

    constructor() {
        const domElements = {
            $panelInput: $("div.panel-input"),
            $panelOptions: $("div.panel-options"),
            $panelOutput: $("div.panel-output"),
            $panelStats: $("div.panel-stats"),
            $inputCount: $(".input-count"),
            $outputCount: $(".output-count")
        };
        
        domElements.$panelInput.on("change keyup", e => render(domElements));
        domElements.$panelOptions.on("change keyup", e => render(domElements));

        $("a.example-link").on("click", function(e) {
            const $target = $(e.target).closest('a');
            if ($target.data("example") === "random-numbers") {
                domElements.$panelInput.find("textarea").val(generateRandomNumbers(1000).join('\n')).change();
                window.scrollTo(0,0);
                domElements.$panelInput.find("textarea").focus(); 
            }
        });      

       domElements.$panelInput.find("textarea").focus(); 
    }
}

let start = new Main();