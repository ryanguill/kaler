
import * as mocha from 'mocha';
import * as chai from 'chai';
import {
    StateInterface,
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

let expect = chai.expect;
let assert = chai.assert;

function mockState () : StateInterface {
	return {
        input: `1\n\2\n3\n4\n5\n6\n7\n8\n9\n10`,
        acc: [],
        output: '',
        inputDelimiter: '\n',
        outputDelimiter: ',',
        distinctValues: 'FALSE',
        sort: 'FALSE',
        sortDirection: 'ASC',
        quoteValues: false,
        trimValues: false,
        stats: {
            inputCount: 0,
            outputCount: 0,
            isAllNumeric: false,
            ks: {},
            accForward: [],
            accBackward: []
        }
    };
}

suite(' tests', function () {
	test('parse', async function () {
		assert.deepEqual(parse(mockState()).acc, [ '1', '2', '3', '4', '5', '6', '7', '8', '9', '10' ]);

        // \r\n should be treated just like \n
        let state = mockState();
        let expected = ['1','2','3','4','5'];
        state.input = expected.join("\r\n");
        assert.deepEqual(parse(state).acc, expected);

        state.input = expected.join(",");
        state.inputDelimiter = ",";
        assert.deepEqual(parse(state).acc, expected);
	});

    test('trimValues', async function () {
        let state = mockState();
        let expected = ['a','b','c','d','e'];
        state.input = expected.join("\n");
        state = parse(state);
        assert.deepEqual(trimValues(state).acc, expected, "should be the same because trimValues is false");

        state.trimValues = true;
        assert.deepEqual(trimValues(state).acc, expected, "should be the same because theres nothing to trim");

        state.input = expected.map(x => ` ${x} `).join("\n");
        state = parse(state);
        
        assert.deepEqual(trimValues(state).acc, expected, "padding should be trimmed");
    });

    test('quoteValues', async function () {
        let state = mockState();
        let expected = ['a','b','c','d','e'];
        state.input = expected.join("\n");
        state = parse(state);
        assert.deepEqual(quoteValues(state).acc, expected, "should be the same because quoteValues is false");

        state.quoteValues = true;
        assert.deepEqual(quoteValues(state).acc, ["'a'", "'b'", "'c'", "'d'", "'e'"], "values should be quoted with single quotes.");
    });
});