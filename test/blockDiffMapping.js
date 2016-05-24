var should = require('should');

var data = require('./data');

var contentBlockDiff = require('../lib/contentBlockDiff');
var blockDiffMapping = require('../lib/blockDiffMapping');

describe('blockDiffMapping', function() {

    var editor1 = data.editorStateFromText(data.text1);
    var editor2 = data.editorStateFromText(data.text2);

    it('should map diffed block together to allow deeper diffing', function() {
        var blockMap1 = editor1.getCurrentContent().getBlockMap();
        var blockMap2 = editor2.getCurrentContent().getBlockMap();
        var blockDiffs = contentBlockDiff(blockMap1, blockMap2);
        var mappings = blockDiffMapping(blockDiffs);

        // Map to block's texts
        blockMap1.map(function (block, key) {
            var mappedKey = mappings[0][key].key;
            var mappedText = mappedKey ? blockMap2.get(mappedKey).getText() : undefined;
            return [block.getText(), mappedText];
        }).toArray().should.deepEqual([
            [ 'Hello, this is a first block.', 'Hello, this is a splitted,' ],
            [ '', '' ],
            [ 'This is second block.', 'first block.' ],
            [ '', '' ],
            [ 'Here is a third block.', 'Here is a third block.' ]
        ]);

        blockMap2.map(function (block, key) {
            var mappedKey = mappings[1][key].key;
            var mappedText = mappedKey ? blockMap1.get(mappedKey).getText() : undefined;
            return [block.getText(), mappedText];
        }).toArray().should.deepEqual([
            ['Hello, this is a splitted,', 'Hello, this is a first block.' ],
            [ '', '' ],
            [ 'first block.', 'This is second block.' ],
            [ '', undefined ],
            [ 'This is second modified block.', undefined ],
            [ '', '' ],
            [ 'Here is a third block.', 'Here is a third block.' ]
        ]);
    });
});
