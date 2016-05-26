var Strategies = require('./strategies');
var DIFF_TYPE = require('./diffType');

var EMPTY_STRATEGY = function () {};

/**
 * @param {Array<diff_match_patch.Diff>} diffs
 * @param {Boolean} forNewText True if the text in blockMap is the new text.
 * @param {DraftJS.BlockMap} blockMap The BlockMap of the ContentState to decorate
 * @return {Strategies} Three strategies that identify ranges of text for each type of diff.
 * Only two of them will actually be relevant (equal and insert for
 * new text, or equal and delete for old text).
 */
function diffDecoratorStrategies(diffs, forNewText, blockMap) {
    var absoluteRanges = diffToAbsoluteRanges(diffs, forNewText);

    var modifiedMapping = mapRangesToBlocks(absoluteRanges.modified, blockMap);
    var equalMapping = mapRangesToBlocks(absoluteRanges.equal, blockMap);

    var modifiedStrategy = strategyFromMapping(modifiedMapping, blockMap);
    var equalStrategy = strategyFromMapping(equalMapping, blockMap);

    if (forNewText) {
        return new Strategies({
            delete: EMPTY_STRATEGY,
            equal: equalStrategy,
            insert: modifiedStrategy
        });
    } else {
        return new Strategies({
            delete: modifiedStrategy,
            equal: equalStrategy,
            insert: EMPTY_STRATEGY
        });
    }
}

/**
 * Returns the absolute ranges for equal and modified (insert or delete) texts.
 * @param {Array<diff_match_patch.Diff>} diffs
 * @param {Boolean} forNewText
 * @returns {Object<Array<Range>>} Two list of ranges (equal and modified)
 */
function diffToAbsoluteRanges(diffs, forNewText) {
    var absoluteRanges = {
        equal: [],
        modified: []
    };
    var typeToIgnore = forNewText ? DIFF_TYPE.DELETE : DIFF_TYPE.INSERT;

    var charIndex = 0;
    diffs.forEach(function (diff) {
        var diffType = diff[0];
        var diffText = diff[1];

        if (diffType === typeToIgnore) {
            return;
        }

        var range = {
            start: charIndex,
            end: charIndex + diffText.length
        };
        if (diffType === DIFF_TYPE.EQUAL) {
            absoluteRanges.equal.push(range);
        } else {
            absoluteRanges.modified.push(range);
        }
        // Progress in the text
        charIndex += diffText.length;
    });

    return absoluteRanges;
}

/**
 * @param {Array<Range>} absoluteRanges The ranges for the whole text
 * @param {DraftJS.BlockMap} blockMap The BlockMap of the ContentState to decorate
 * @returns {Immutable.Map<BlockKey, Array<Range>>} Ranges are relative to each block.
 */
function mapRangesToBlocks(absoluteRanges, blockMap) {
    var blockStartIndex = 0;
    return blockMap.map(function (block) {
        var ranges = findRangesBetween(absoluteRanges,
                                       blockStartIndex,
                                       blockStartIndex + block.getLength());
        blockStartIndex += block.getLength() + 1; // Account for possible '\n'
        return ranges;
    });
}

/**
 * @param {Array<Range>} ranges
 * @param {Number} start
 * @param {Number} end
 * @returns {Array<Range>} All the ranges that overlapped
 * start-end, cropped and re-indexed to be relative to start.
 */
function findRangesBetween(ranges, start, end) {
    var res = [];
    ranges.forEach(function (range) {
        if (range.start < end && range.end > start) {
            // Crop the range
            var intersectionStart = Math.max(range.start, start);
            var intersectionEnd = Math.min(range.end, end);
            // Push relative range
            res.push({
                start: intersectionStart - start,
                end: intersectionEnd - start
            });
        }
    });
    return res;
}

/**
 * @returns {Immutable.Map<BlockKey, Array<Range>>} mappedRanges
 * @returns {DraftJS.BlockMap} blockMap
 * @returns {DraftJS.DecoratorStrategy} A strategy applying to the
 * ranges provided for each block. Once the block's content change, the
 * block will not be decorated anymore.
 */
function strategyFromMapping(mappedRanges, blockMap) {
    // Save the original blockMap's content for later comparison
    return function (contentBlock, callback) {
        var key = contentBlock.getKey();
        var ranges = mappedRanges.get(key);
        if (!ranges) {
            return;
        }
        var oldContent = blockMap.get(key).getText();
        var newContent = contentBlock.getText();
        // If the content is still the same
        if (oldContent === newContent) {
            ranges.forEach(function (range) {
                callback(range.start, range.end);
            });
        }
    };
}

module.exports = diffDecoratorStrategies;
