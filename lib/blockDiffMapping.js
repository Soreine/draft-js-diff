var diff_match_patch = require('diff-match-patch');

/**
 * Returns mappings between the block keys of diffed blockMaps,
 * indicating for each block, the block it needs to be diffed against
 * to have a deeper diff than a block level diff. A block with no
 * counterpart is mapped to undefined.
 * @param {Array<BlockDiff>} blockDiffs
 * @returns {[mapping1: Object, mapping2: Object]} Two mappings blockKey - blockKey
 */
function blockDiffMapping(blockDiffs) {
    var mapping1 = {};
    var mapping2 = {};

    // Map all equals blocks together
    blockDiffs.forEach(function (diff) {
        if (diff.type === diff_match_patch.DIFF_EQUAL) {
            mapping1[diff.key1] = diff.key2;
            mapping2[diff.key2] = diff.key1;
        }
    });

    // Group consecutive changes together.
    var lastWasEqual = true;
    var groupedDiffs = blockDiffs.reduce(function (groupedDiffs, diff) {
        if (diff.type === diff_match_patch.DIFF_EQUAL) {
            lastWasEqual = true;
            return groupedDiffs; // skip
        }
        if (lastWasEqual) {
            groupedDiffs.push({insert: [], delete: []}); // push a new group
        }

        var group = groupedDiffs[groupedDiffs.length - 1];
        if (diff.type === diff_match_patch.DIFF_INSERT) {
            group.insert.push(diff);
        } else {
            group.delete.push(diff);
        }
        lastWasEqual = false;
        return groupedDiffs;
    }, []);

    // Map as much INSERT/DELETE together as possible. The remaining are mapped to undefined.
    groupedDiffs.forEach(function (diffGroup) {
        var max = Math.max(diffGroup.insert.length, diffGroup.delete.length);
        for (var i = 0; i < max; ++i) {
            var ins = diffGroup.insert[i];
            var del = diffGroup.delete[i];
            if (ins && del) {
                mapping1[del.key1] = ins.key2;
                mapping2[ins.key2] = del.key1;
            } else if (ins) {
                mapping2[ins.key2] = undefined;
            } else {
                mapping1[del.key1] = undefined;
            }
        }
    });

    return [
        mapping1,
        mapping2
    ];
}

module.exports = blockDiffMapping;
