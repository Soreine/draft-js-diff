var diff_match_patch = require('diff-match-patch');

var DIFF_TYPE = {
    EQUAL: diff_match_patch.DIFF_EQUAL,
    INSERT: diff_match_patch.DIFF_INSERT,
    DELETE: diff_match_patch.DIFF_DELETE
};

module.exports = DIFF_TYPE;
