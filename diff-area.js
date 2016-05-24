var React = require('react');
var Immutable = require('immutable');
var Draft = require('draft-js');

var contentBlockDiff = require('./lib/contentBlockDiff');
var blockDiffMapping = require('./lib/blockDiffMapping');
var diff_word_mode = require('./lib/diff-word-mode');

var DWM = new diff_word_mode();

// diff_match_patch codes
var DIFF = {
    DELETE: -1,
    INSERT: 1,
    EQUAL: 0
};

var DiffArea = React.createClass({

    propTypes: {
        left: React.PropTypes.string,
        right: React.PropTypes.string
    },

    getInitialState: function () {
        var left = this.props.left;
        var right = this.props.right;

        var state = {};

        // Create editors state
        state.leftState = editorStateFromText(left);
        state.rightState = editorStateFromText(right);

        // Compute diff at block level
        var blockMapLeft = state.leftState.getCurrentContent().getBlockMap();
        var blockMapRight = state.rightState.getCurrentContent().getBlockMap();
        var blockDiffs = contentBlockDiff(blockMapLeft, blockMapRight);

        var mappings = blockDiffMapping(blockDiffs);

        // Make decorators
        state.leftState = Draft.EditorState.set(state.leftState, {
            decorator: createDiffsDecorator(toTextMapping(mappings[0], blockMapRight), DIFF.DELETE)
        });
        state.rightState = Draft.EditorState.set(state.rightState, {
            decorator: createDiffsDecorator(toTextMapping(mappings[1], blockMapLeft), DIFF.INSERT)
        });

        return state;
    },

    onChange: function (rightState) {
        var newState = {};

        // Text changed ?
        var contentChanged = this.state.rightState.getCurrentContent()
                !== rightState.getCurrentContent();

        // Update diffs
        if (contentChanged) {

            // Compute diff at block level
            var blockMapLeft = this.state.leftState.getCurrentContent().getBlockMap();
            var blockMapRight = rightState.getCurrentContent().getBlockMap();
            var blockDiffs = contentBlockDiff(blockMapLeft, blockMapRight);

            var mappings = blockDiffMapping(blockDiffs);

            // Update the decorators
            newState.leftState = Draft.EditorState.set(this.state.leftState, {
                decorator: createDiffsDecorator(toTextMapping(mappings[0], blockMapRight), DIFF.DELETE)
            });
            newState.rightState = Draft.EditorState.set(rightState, {
                decorator: createDiffsDecorator(toTextMapping(mappings[1], blockMapLeft), DIFF.INSERT)
            });
        } else {
            // Just update the EditorState
            newState.leftState = this.state.leftState;
            newState.rightState = rightState;
        }

        this.setState({
            rightState: rightState
        });
    },

    render: function () {
        return <div className='diffarea'>
            <div className='left'>
                <Draft.Editor
                    editorState={this.state.leftState}
                    readOnly={true}
                />
            </div>
            <div className='right'>
                <Draft.Editor
                    editorState={this.state.rightState}
                    onChange={this.onChange}
                />
            </div>
        </div>;
    }
});

function toTextMapping(blockMapping, blockMap) {
    return new Immutable.Map(blockMapping).map(function (mappedDiff, blockKey) {
        return {
            type: mappedDiff.type,
            mappedText: mappedDiff.key ? blockMap.get(mappedDiff.key).getText() : undefined
        };
    }).toObject();
}

function editorStateFromText(text) {
    var content = Draft.ContentState.createFromText(text);
    return Draft.EditorState.createWithContent(content);
}

// Decorators

var InsertedSpan = function (props) {
    return <span {...props} className="inserted">{props.children}</span>;
};
var RemovedSpan = function (props) {
    return <span {...props} className="removed">{props.children}</span>;
};

/**
 * @param textMapping
 * @param type The type of diff to highlight
 */
function createDiffsDecorator(textMapping, type) {
    return new Draft.CompositeDecorator([{
        strategy: findDiff.bind(undefined, textMapping, type),
        component: type === DIFF.INSERT ? InsertedSpan : RemovedSpan
    }]);
}

/**
 * Applies the decorator callback to all differences in the content block.
 * This needs to be cheap, because decorators are called often.
 */
function findDiff(textMapping, type, contentBlock, callback) {
    var key = contentBlock.getKey();
    var blockDiff = textMapping[key];
    if (!blockDiff) {
        return;
    }
    if (blockDiff.type === type) {
        var text1;
        var text2;
        if (type === DIFF.INSERT) {
            text1 = blockDiff.mappedText || '';
            text2 = contentBlock.getText();
        } else {
            text1 = contentBlock.getText();
            text2 = blockDiff.mappedText || '';
        }
        var diffs = DWM.diff_wordMode(text1, text2);

        var charIndex = 0;
        diffs.forEach(function (diff) {
            var diffType = diff[0];
            var diffText = diff[1];
            if (diffType === DIFF.EQUAL) {
                // No highlight. Move to next difference
                charIndex += diffText.length;
            } else if (diffType === type) {
                // Highlight, and move to next difference
                callback(charIndex, charIndex + diffText.length);
                charIndex += diffText.length;
            } else {
                // The diff text should not be in the contentBlock, so skip.
                return;
            }
        });
    }
}

module.exports = DiffArea;
