var should = require('should');

var data = require('./data');

var contentBlockDiff = require('../lib/contentBlockDiff');

var msg = {
    '-1': 'REMOVED',
    '1' : 'ADDED',
    '0' : 'EQUAL'
};

describe('contentBlockDiff', function() {

    var editor1 = data.editorStateFromText(data.text1);
    var editor2 = data.editorStateFromText(data.text2);

    it('should do a diff accross blocks, and return original block keys', function() {
        var blockMap1 = editor1.getCurrentContent().getBlockMap();
        var blockMap2 = editor2.getCurrentContent().getBlockMap();
        var diffs = contentBlockDiff(blockMap1, blockMap2);
        // Print the result good
        diffs.map(function (diff) {
            return {
                type: msg['' + diff.type],
                text: diff.key1 ? blockMap1.get(diff.key1).getText()
                    : blockMap2.get(diff.key2).getText()
            };
        }).should.deepEqual([
            { type: 'REMOVED', text: 'Hello, this is a first block.' },
            { type: 'ADDED', text: 'Hello, this is a splitted,' },
            { type: 'EQUAL', text: '' },
            { type: 'REMOVED', text: 'This is second block.' },
            { type: 'ADDED', text: 'first block.' },
            { type: 'ADDED', text: '' },
            { type: 'ADDED', text: 'This is second modified block.' },
            { type: 'EQUAL', text: '' },
            { type: 'EQUAL', text: 'Here is a third block.' }
        ]);
    });
});
