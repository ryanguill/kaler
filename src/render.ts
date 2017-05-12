
import * as Promise from 'bluebird';
import * as $ from 'jquery';

import {
	StateInterface,
	Stats,
	parse,
	ignoreEmptyValues,
	trimValues,
	quoteValues,
	distinctValues,
	join,
	sort,
	gatherStatistics,
	generateRandomNumbers
} from './functions';

export function exampleHandler (domElements) {
	return function (e) {
		const $target = $(e.target).closest('a');
		if ($target.data("example") === "random-numbers") {
			domElements.$panelInput.find("textarea").val(generateRandomNumbers(1000).join('\n')).change();
			window.scrollTo(0, 0);
			domElements.$panelInput.find("textarea").focus();
		}
	};
}

export function navigate (domElements) {
	return function (e) {
		const $target = $(e.target).closest('a');
		const targetPage = $target.data("target");

		domElements.$changeDelim.hide();
		domElements.$tabDelim.hide();
		domElements.$nav.find("li a").removeClass("active");
		$target.addClass("active");
		
		if (targetPage === "change-delim") {
			domElements.$changeDelim.show();
		} else if (targetPage === "tab-delim") {
			domElements.$tabDelim.show();
		}
	};
}

export function gatherState (domElements) : StateInterface {
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
			acc: []
		}
	};

	return state;
}

export function render (domElements) : void {
	Promise.resolve(gatherState(domElements))
		.then(parse)
		.then(trimValues)
		.then(ignoreEmptyValues)
		.then(distinctValues)
		.then(quoteValues)
		.then(sort)
		.then(gatherStatistics)
		.then(join)
		.then(domRender(domElements))
		.catch(console.error);
}

function domRender (domElements) {
	return function (state : StateInterface ) {
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

			if (stats.ks["k75gt"] && stats.ks["k75lt"]) {
				drawCandlestickChart([stats.ks["min"], stats.ks["k75gt"], stats.ks["k75lt"], stats.ks["max"]]);
			}
			drawHistogramChart(stats.acc);
		} else {
			domElements.$panelStats.closest(".row").hide();
		}
	};
}

// expects 4 values
function drawCandlestickChart (input) {
	input.unshift('');
	const data = google.visualization.arrayToDataTable([
		input
	], true);

	const options = {
		legend: 'none',
		colors: ['#444'],
		chartArea: {left: 50, top: 25, right: 10, bottom: 25, width: '100%', height: '100%' },
	};

	const chart = new google.visualization.CandlestickChart(document.getElementById('candlestick_chart'));

	chart.draw(data, options);
}

function drawHistogramChart (input) {
	const data = input.map(x => ['', x]);
	data.unshift(['Name', 'Amount']);
	const dataTable = google.visualization.arrayToDataTable(data);

	const options = {
		legend: { position: 'none' },
		colors: ['#444'],
		bar: { groupWidth: 0 },
		chartArea: {left: 50, top: 25, right: 10, bottom: 25, width: '100%', height: '100%' },
	};

	const chart = new google.visualization.Histogram(document.getElementById('histogram_chart'));

	chart.draw(dataTable, options);
}

function drawScatterChart (stats) {
	// aggregate the data
	const aggData = stats.acc.reduce(function (acc, element) {
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
	}, {data: [], min: 0, max: Infinity})

	aggData.data.unshift(["X", "Freq"]);
	const dataTable = google.visualization.arrayToDataTable(aggData.data);
	const options = {
		  vAxis: {title: 'Freq', minValue: 0, maxValue: aggData.max},
		  legend: 'none',
		  colors: ['#333'],
		  chartArea: {left: 0, top: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
		}

	const chart = new google.visualization.ScatterChart(document.getElementById('scatter_chart'));
	chart.draw(dataTable, options);

}

function countDisplay (input : number) : string {
	return `( ${input} item${input === 1 ? '' : 's'} )`
}