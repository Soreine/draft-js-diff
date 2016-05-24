var diff_match_patch = require('diff-match-patch');
var DMP = new diff_match_patch();

// BlockDiff = {
//     type: 1 | -1 | 0,
//     key1: blockKey1 | undefined,
//     key2: blockKey2 | undefined
// };

/**
 * Find the differences between two Draft.EditorState, at a block level
 * @param {Draft.BlockMap} blockMap1
 * @param {Draft.BlockMap} blockMap2
 * @returns {Array<BlockDiff>} Array of block diff tuples
 */
function contentBlockDiff(blockMap1, blockMap2) {
    // Convert blocks to unique chars, to allow diffing at a block level
    var a = _blockMapToChars_(blockMap1, blockMap2);
    var lineText1 = a.chars1;
    var lineText2 = a.chars2;

    var diffs = DMP.diff_main(lineText1, lineText2, false);
    // Now find again the block keys
    return charDiffToBlockDiff(diffs, blockMap1, blockMap2);
};

/**
 * @param {Diff} diffs With each character corresponding to a block
 * @param {Draft.BlockMap} blockMap1
 * @param {Draft.BlockMap} blockMap2
 * @returns {Array<BlockDiff>} Array of block diff tuples
 */
function charDiffToBlockDiff(diffs, blockMap1, blockMap2) {
    var blockDiffs = [];
    var index1 = 0; // we are going to iterate through block maps
    var index2 = 0;
    var blockKeys1 = blockMap1.keySeq();
    var blockKeys2 = blockMap2.keySeq();

    diffs.forEach(function (diff) {
        var type = diff[0];
        var blockChars = diff[1];

        for (var i = 0; i < blockChars.length; ++i) {
            if (type === diff_match_patch.DIFF_EQUAL) {
                blockDiffs.push({
                    type: type,
                    key1: blockKeys1.get(index1),
                    key2: blockKeys2.get(index2)
                });
                index1++;
                index2++;
            } else if (type === diff_match_patch.DIFF_DELETE) {
                blockDiffs.push({
                    type: type,
                    key1: blockKeys1.get(index1),
                    key2: undefined
                });
                index1++;
            } else {
                blockDiffs.push({
                    type: type,
                    key1: undefined,
                    key2: blockKeys2.get(index2)
                });
                index2++;
            }
        }
    });
    return blockDiffs;
}

/**
 * Split two block maps into an array of blocks. Reduce the blocks to a string of
 * hashes where each Unicode character represents a unique block text.
 * @param {Draft.BlockMap} blockMap1
 * @param {Draft.BlockMap} blockMap2
 * @return {{chars1: string, chars2: string, blockArray: !Array.<string>}}
 *     An object containing the encoded text1, the encoded text2 and
 *     the array of unique blocks.
 *     The zeroth element of the array of unique strings is intentionally blank.
 * @private
 */
function _blockMapToChars_(blockMap1, blockMap2) {
    var blockArray = [];  // e.g. blockArray[4] == blockText
    var blockHash = {};   // e.g. blockHash[blockText] == 4

    // '\x00' is a valid character, but various debuggers don't like it.
    // So we'll insert a junk entry to avoid generating a null character.
    blockArray[0] = '';

    /**
     * Split a blockMap into an array of strings. Reduce the blockMap to a string of
     * hashes where each Unicode character represents one block's text.
     * Modifies blockarray and blockhash through being a closure.
     * @param {blockMap} blockMap BlockMap to encode.
     * @return {string} Encoded string.
     * @private
     */
    function diff_blocksToCharsMunge_(blockMap) {
        var chars = '';
        var blockArrayLength = blockArray.length;
        blockMap.forEach(function (block) {
            var text = block.getText();
            if (blockHash.hasOwnProperty ? blockHash.hasOwnProperty(text) :
                (blockHash[text] !== undefined)) {
                chars += String.fromCharCode(blockHash[text]);
            } else {
                chars += String.fromCharCode(blockArrayLength);
                blockHash[text] = blockArrayLength;
                blockArray[blockArrayLength++] = text;
            }
        });
        return chars;
    }

    var chars1 = diff_blocksToCharsMunge_(blockMap1);
    var chars2 = diff_blocksToCharsMunge_(blockMap2);
    return {chars1: chars1, chars2: chars2, blockArray: blockArray};
}

module.exports = contentBlockDiff;
