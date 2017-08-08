import * as $ from 'jquery';
import {render, exampleHandler, navigate} from './render';

(<any>window).jQuery = $;

export default class Main {


    constructor() {

        const domElements = {
            $panelInput: $("div.panel-input"),
            $panelOptions: $("div.panel-options"),
            $panelOutput: $("div.panel-output"),
            $panelStats: $("div.panel-stats"),
            $inputCount: $(".input-count"),
            $outputCount: $(".output-count"),
            $nav: $("ul.nav"),
            $changeDelim: $("div.change-delim"),
            $tabDelim: $("div.tab-delim"),
        };

        domElements.$panelInput.on("change keyup", e => render(domElements));
        domElements.$panelOptions.on("change keyup", e => render(domElements));

        $("a.example-link").on("click", exampleHandler(domElements));

        domElements.$panelInput.find("textarea").focus();
        domElements.$nav.find("li a").on("click", navigate(domElements));
    }
}


const start = new Main();