var React = require('react');
var Immutable = require('immutable');
var Draft = require('draft-js');
var debounce = require('lodash.debounce');

var diff_word_mode = require('../lib/diff-word-mode');

var DWM = new diff_word_mode();

var DEBOUNCE_WAIT = 300; // ms
var DEBOUNCE_OPTS = {
    trailing: true // We want to update after the delay only
};

var DiffArea = React.createClass({

    propTypes: {
        left: React.PropTypes.string,
        right: React.PropTypes.string
    },

    getInitialState: function () {
        // Make a debounced diff update
        this.debouncedUpdateDiffs = debounce(this.updateDiffs, DEBOUNCE_WAIT, DEBOUNCE_OPTS);
        var left = this.props.left;
        var right = this.props.right;

        var state = {};

        // Create editors state
        state.leftState = editorStateFromText(left);
        state.rightState = editorStateFromText(right);

        // Compute diff on whole texts
        var diffs = computeDiff(left, right);
        var mappingLeft = mapDiffsToBlocks(diffs, diff_word_mode.DIFF_DELETE, state.leftState.getCurrentContent().getBlockMap());
        var mappingRight = mapDiffsToBlocks(diffs, diff_word_mode.DIFF_INSERT, state.rightState.getCurrentContent().getBlockMap());
        // Update the decorators
        state.leftState = Draft.EditorState.set(state.leftState, {
            decorator: createDiffsDecorator(mappingLeft, diff_word_mode.DIFF_DELETE)
        });
        state.rightState = Draft.EditorState.set(state.rightState, {
            decorator: createDiffsDecorator(mappingRight, diff_word_mode.DIFF_INSERT)
        });

        return state;
    },

    onRightChanged: function (rightState) {
        // Text changed ?
        var contentChanged = this.state.rightState.getCurrentContent()
                !== rightState.getCurrentContent();
        // Update diffs
        if (contentChanged) {
            this.debouncedUpdateDiffs();
        }
        // Update the EditorState
        this.setState({
            rightState: rightState
        });
    },

    onLeftChanged: function (leftState) {
        var contentChanged = this.state.leftState.getCurrentContent()
                !== leftState.getCurrentContent();
        // Update diffs
        if (contentChanged) {
            this.debouncedUpdateDiffs();
        }
        // Update the EditorState
        this.setState({
            leftState: leftState
        });
    },

    // We use a debounced version of it
    updateDiffs: function () {
        var newState = {};
        var left = this.state.leftState.getCurrentContent().getPlainText();
        var right = this.state.rightState.getCurrentContent().getPlainText();

        var diffs = computeDiff(left, right);

        var mappingLeft = mapDiffsToBlocks(diffs, diff_word_mode.DIFF_DELETE, this.state.leftState.getCurrentContent().getBlockMap());
        var mappingRight = mapDiffsToBlocks(diffs, diff_word_mode.DIFF_INSERT, this.state.rightState.getCurrentContent().getBlockMap());

        // Update the decorators
        newState.leftState = Draft.EditorState.set(this.state.leftState, {
            decorator: createDiffsDecorator(mappingLeft, diff_word_mode.DIFF_DELETE)
        });
        newState.rightState = Draft.EditorState.set(this.state.rightState, {
            decorator: createDiffsDecorator(mappingRight, diff_word_mode.DIFF_INSERT)
        });
        this.setState(newState);
    },

    render: function () {
        return <div className='diffarea'>
            <div className='left'>
                <Draft.Editor
                    editorState={this.state.leftState}
                    onChange={this.onLeftChanged}
                />
            </div>
            <div className='right'>
                <Draft.Editor
                    editorState={this.state.rightState}
                    onChange={this.onRightChanged}
                />
            </div>
        </div>;
    }
});

function editorStateFromText(text) {
    var content = Draft.ContentState.createFromText(text);
    return Draft.EditorState.createWithContent(content);
}

function computeDiff(txt1, txt2) {
    var diffs = DWM.diff_wordMode(txt1, txt2);
    return diffs;
}

/**
 * Returns the lists of highlighted ranges for each block of a blockMap
 * @returns {Immutable.Map} blockKey -> { text, ranges: Array<{start, end}}>
 */
function mapDiffsToBlocks(diffs, type, blockMap) {
    var charIndex = 0;
    var absoluteRanges = [];

    diffs.forEach(function (diff) {
        var diffType = diff[0];
        var diffText = diff[1];
        if (diffType === diff_word_mode.DIFF_EQUAL) {
            // No highlight. Move to next difference
            charIndex += diffText.length;
        } else if (diffType === type) {
            // Highlight, and move to next difference
            absoluteRanges.push({
                start: charIndex,
                end: charIndex + diffText.length
            });
            charIndex += diffText.length;
        } else {
            // The diff text should not be in the contentBlock, so skip.
            return;
        }
    });

    /**
     * @param {Array<Range>} ranges
     * @param {Number} start
     * @param {Number} end
     * @return {Array<Range>} All the ranges that overlapped
     * start-end, cropped and re-indexed to be relative to start.
     */
    function findRangesBetween(ranges, start, end) {
        var res = [];
        ranges.forEach(function (range) {
            if (range.start < end && range.end > start) {
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

    var blockStartIndex = 0;
    return blockMap.map(function (block) {
        var ranges = findRangesBetween(absoluteRanges, blockStartIndex, blockStartIndex + block.getLength());
        blockStartIndex += block.getLength() + 1; // Account for \n
        return {
            text: block.getText(),
            ranges: ranges
        };
    });
}

// Decorators

var InsertedSpan = function (props) {
    return <span {...props} className="inserted">{props.children}</span>;
};
var RemovedSpan = function (props) {
    return <span {...props} className="removed">{props.children}</span>;
};

/**
 * @param type The type of diff to highlight
 */
function createDiffsDecorator(mappedRanges, type) {
    return new Draft.CompositeDecorator([{
        strategy: findDiff.bind(undefined, mappedRanges, type),
        component: type === diff_word_mode.DIFF_INSERT ? InsertedSpan : RemovedSpan
    }]);
}

/**
 * Applies the decorator callback to all differences in the content block.
 * This needs to be cheap, because decorators are called often.
 */
function findDiff(mappedRanges, type, contentBlock, callback) {
    var mapping = mappedRanges.get(contentBlock.getKey());
    if (mapping && mapping.text === contentBlock.getText()) {
        mapping.ranges.forEach(function (range) {
            callback(range.start, range.end);
        });
    }
}

module.exports = DiffArea;
