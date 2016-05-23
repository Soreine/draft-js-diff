/* globals React, ReactDOM, Draft, diff_match_patch */

var DMP = new diff_match_patch();

// diff_match_patch codes
var DIFF = {
    REMOVED: -1,
    INSERTED: 1,
    EQUAL: 0
};

var DiffArea = React.createClass({

    propTypes: {
        left: React.PropTypes.string,
        right: React.PropTypes.string
    },

    getInitialState: function () {
        console.log('getInitialState');
        var left = this.props.left;
        var right = this.props.right;

        var state = {};

        // Compute diff on whole texts
        var diffs = DMP.diff_main(left, right);

        // Make decorators
        var removedDecorator = createDiffsDecorator(diffs, DIFF.REMOVED);
        var insertedDecorator = createDiffsDecorator(diffs, DIFF.INSERTED);

        // Create editors state
        state.leftState = editorStateFromText(props.left, removedDecorator);
        state.rightState = editorStateFromText(props.right, insertedDecorator);

        return state;
    },

    onChange: function (rightState) {
        console.log('onChange');
        var newState = {};

        // Text changed ?
        var contentChanged = this.state.rightState.getCurrentContent() !== rightState.getCurrentContent();

        // Update diffs
        if (contentChanged) {
            var right = rightState.getCurrentContent().getPlainText();
            var left = this.props.left;

            var diffs = DMP.diff_main(left, right);

            // Update the decorators
            newState.leftState = Draft.EditorState.set(this.state.leftState, {
                decorator: createDiffsDecorator(diffs, DIFF.REMOVED)
            });
            newState.rightState = Draft.EditorState.set(rightState, {
                decorator: createDiffsDecorator(diffs, DIFF.INSERTED)
            });
        } else {
            // Just update the EditorState
            newState.rightState = rightState;
        }

        this.setState(newState);
    },

    render: function () {
        console.log('render');
        return <div className='diffarea'>
            <div style={{display: inline-block, width:'50%'}}>
                <Draft.Editor
                    readOnly={true}
                    editorState={this.state.rightState}
                />
            </div>
            <div style={{display: inline-block, width:'50%'}}>
                <Draft.Editor
                    editorState={this.state.leftState}
                    onChange={this.onChange}
                />
            </div>
        </div>;
    }
});

function editorStateFromText(text, decorator) {
    // For now, we can only work on a single content block.
    var content = Draft.convertFromRaw({
        blocks: [
            {
                text: text,
                type: 'unstyled'
            }
        ],
        entityMap: {}
    });
    return Draft.EditorState.createWithContent(content, decorator);
}

// Check for changes
function contentStateHasChanged(oldEditorState, newEditorState) {
    return (!oldEditorState || !newEditorState)
        || oldEditorState.getCurrentContent() !== newEditorState.getCurrentContent();
}

// Decorators

var InsertedSpan = function (props) {
    return <span {...props} style={{backgroundColor: '#ffecec'}}>{props.children}</span>;
};
var RemovedSpan = function (props) {
    return <span {...props} style={{backgroundColor: '#eaffea'}}>{props.children}</span>;
};

/**
 * @param diffs The diff_match_patch result.
 * @param type The type of diff to highlight
 */
function createDiffsDecorator(diffs, type) {
    return new Draft.CompositeDecorator([{
        strategy: findDiff.bind(undefined, diffs, type),
        component: type === DIFF.INSERTED ? InsertedSpan : RemovedSpan
    }]);
}

/**
 * Applies the decorator callback to all differences in the single content block.
 * This needs to be cheap, because decorators are called often.
 */
function findDiff(diffs, type, contentBlock, callback) {
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
