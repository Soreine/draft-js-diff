// var diff_match_patch = require('diff-match-patch');

// Adapted from
// https://code.google.com/p/google-diff-match-patch/wiki/LineOrWordDiffs

/**
 * Find the differences between two texts, word-wise.
 * @param {string} text1
 * @param {string} text2
 * @returns {Array<diff_match_patch.Diff>} Array of diff tuples
 */
diff_match_patch.prototype.diff_wordMode = function (text1, text2) {
    return this.diff_groupMode(text1, text2, /\s/);
};

/**
 * Find the differences between two texts, grouping characters according to a regex
 * @param {string} text1
 * @param {string} text2
 * @param {RegExp} groupDelimiter
 * @returns {Array<diff_match_patch.Diff>} Array of diff tuples
 */
diff_match_patch.prototype.diff_groupMode = function (text1, text2, groupDelimiter) {
    // Convert groups to unique chars, to allow diffing at a group level
    var a = _diff_groupsToChars_(text1, text2, groupDelimiter);
    var lineText1 = a.chars1;
    var lineText2 = a.chars2;
    var groupArray = a.groupArray;

    var diffs = this.diff_main(lineText1, lineText2, false);

    this.diff_charsToLines_(diffs, groupArray);
    return diffs;
};

/**
 * Split two texts into an array of strings. Reduce the texts to a string of
 * hashes where each Unicode character represents a unique group.
 * @param {string} text1 First string.
 * @param {string} text2 Second string.
 * @param {regex} delimiter
 * @return {{chars1: string, chars2: string, groupArray: !Array.<string>}}
 *     An object containing the encoded text1, the encoded text2 and
 *     the array of unique strings.
 *     The zeroth element of the array of unique strings is intentionally blank.
 * @private
 */
// Copied from diff_match_patch.linesToChars. Adapted to accept a
// delimiter, in order to make groups of line/words/anything.
function _diff_groupsToChars_(text1, text2, delimiter) {
    var groupArray = [];  // e.g. groupArray[4] == 'Hello\n' for a line delimiter /\n/
    var lineHash = {};   // e.g. lineHash['Hello\n'] == 4

    // '\x00' is a valid character, but various debuggers don't like it.
    // So we'll insert a junk entry to avoid generating a null character.
    groupArray[0] = '';

    /**
     * Split a text into an array of strings. Reduce the texts to a string of
     * hashes where each Unicode character represents one line.
     * Modifies linearray and linehash through being a closure.
     * @param {string} text String to encode.
     * @return {string} Encoded string.
     * @private
     */
    function diff_groupsToCharsMunge_(text) {
        var chars = '';
        // Walk the text, pulling out a substring for each line.
        // text.split() would temporarily double our memory footprint.
        // Modifying text would create many large strings to garbage collect.
        var lineStart = 0;
        var lineEnd = -1;
        // Keeping our own length variable is faster than looking it up in JS
        var groupArrayLength = groupArray.length;
        while (lineEnd < text.length - 1) {
            lineEnd = regexIndexOf(text, delimiter, lineStart);
            if (lineEnd == -1) {
                lineEnd = text.length - 1;
            }
            var line = text.substring(lineStart, lineEnd + 1);
            lineStart = lineEnd + 1;

            if (lineHash.hasOwnProperty ? lineHash.hasOwnProperty(line) :
                (lineHash[line] !== undefined)) {
                chars += String.fromCharCode(lineHash[line]);
            } else {
                chars += String.fromCharCode(groupArrayLength);
                lineHash[line] = groupArrayLength;
                groupArray[groupArrayLength++] = line;
            }
        }
        return chars;
    }

    var chars1 = diff_groupsToCharsMunge_(text1);
    var chars2 = diff_groupsToCharsMunge_(text2);
    return {chars1: chars1, chars2: chars2, groupArray: groupArray};
}

/**
 * Same as String.indexOf, but uses RegExp
 */
function regexIndexOf(str, regex, startpos) {
    var indexOf = str.substring(startpos || 0).search(regex);
    return (indexOf >= 0) ? (indexOf + (startpos || 0)) : indexOf;
}


