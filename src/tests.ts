
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
	});
});