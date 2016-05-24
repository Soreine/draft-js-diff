var diff_match_patch = require('diff-match-patch');

var DIFF = {
    DELETE: -1,
    INSERT: 1,
    EQUAL: 0
};

/**
 * Returns mappings between the block keys of diffed blockMaps,
 * indicating for each block, the block it needs to be diffed against
 * to have a deeper diff than a block level diff. A block with no
 * counterpart is mapped to undefined.
 * @param {Array<BlockDiff>} blockDiffs
 * @returns {[mapping1: Object, mapping2: Object]} Two mappings blockKey - { type, key }
 */
function blockDiffMapping(blockDiffs) {
    var mapping1 = {};
    var mapping2 = {};

    // Map all equals blocks together
    blockDiffs.forEach(function (diff) {
        if (diff.type === DIFF.EQUAL) {
            mapping1[diff.key1] = mappedDiff(DIFF.EQUAL, diff.key2);
            mapping2[diff.key2] = mappedDiff(DIFF.EQUAL, diff.key1);
        }
    });

    // Group consecutive changes together.
    var lastWasEqual = true;
    var groupedDiffs = blockDiffs.reduce(function (groupedDiffs, diff) {
        if (diff.type === DIFF.EQUAL) {
            lastWasEqual = true;
            return groupedDiffs; // skip
        }
        if (lastWasEqual) {
            groupedDiffs.push({insert: [], delete: []}); // push a new group
        }

        var group = groupedDiffs[groupedDiffs.length - 1];
        if (diff.type === DIFF.INSERT) {
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
                mapping1[del.key1] = mappedDiff(DIFF.DELETE, ins.key2);
                mapping2[ins.key2] = mappedDiff(DIFF.INSERT, del.key1);
            } else if (ins) {
                mapping2[ins.key2] = mappedDiff(DIFF.INSERT, undefined);
            } else {
                mapping1[del.key1] = mappedDiff(DIFF.DELETE, undefined);
            }
        }
    });

    return [
        mapping1,
        mapping2
    ];
}

function mappedDiff(type, key) {
    return {
        type: type,
        key: key
    };
}

module.exports = blockDiffMapping;
