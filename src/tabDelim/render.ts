
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

	};
}