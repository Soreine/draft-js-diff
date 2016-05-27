var React = require('react');
var Draft = require('draft-js');
var debounce = require('lodash.debounce');

var diffWordMode = require('./diffWordMode');
var diffDecoratorStrategies = require('./diffDecoratorStrategies');
var diffDecorator = require('./diffDecorator');

var EDITOR_PROP_SHAPE = React.PropTypes.shape({
    hidden: React.PropTypes.bool,
    initial: React.PropTypes.string,
    onChange: React.PropTypes.func,
    readOnly: React.PropTypes.bool,
    state: React.PropTypes.instanceOf(Draft.EditorState)
});

/**
 * Displays two Draft.Editor decorated with diffs.
 * @prop {Number} [debounceWait=-1] Milliseconds. Delay for the
 * updating the diffs. -1 to disable debouncing.
 * @prop {Object} [left] Props for the left editor (containing the old text)
 * @prop {Object} [right] Props for the right editor (containing the new text)
 * @prop {String} [left.initial=''] The initial left text
 * @prop {String} [right.initial=''] The initial right text
 * @prop {Boolean} [left.hidden=false] Whether to actually display an editor
 * @prop {Boolean} [right.hidden=false] Whether to actually display an editor
 * @prop {Boolean} [left.readOnly=false] Make the left editor read only.
 * @prop {Boolean} [right.readOnly=false] Make the right editor read only.
 * @prop {Function} [right.onChange] Callback called with the right EditorState changes.
 * @prop {Function} [left.onChange] Callback called when the left EditorState changes.
 * @prop {Draft.EditorState} [right.state] Be sure to pass back the
 * updated state if you listen to right.onChange.
 * @prop {Draft.EditorState} [left.state]  Be sure to pass back the
 * updated state if you listen to left.onChange.
 */
var DiffEditor = React.createClass({

    propTypes: {
        left: EDITOR_PROP_SHAPE,
        right: EDITOR_PROP_SHAPE,
        debounceWait: React.PropTypes.number
    },

    getDefaultProps: function() {
        var defaultEditorProps = {
            hidden: false,
            initial: '',
            onChange: null,
            readOnly: false,
            state: null
        };
        return {
            left: defaultEditorProps,
            right: defaultEditorProps,
            debounceWait: -1
        };
    },

    getInitialState: function () {
        // Make a debounced diff update
        if (this.props.debounceWait >= 0) {
            this.debouncedUpdateDiffs =
                debounce(this.updateDiffs,
                         this.props.debounceWait,
                         { trailing: true });
        }

        var state = {
            leftState: this.props.left.state || editorStateFromText(this.props.left.initial),
            rightState: this.props.right.state || editorStateFromText(this.props.right.initial)
        };

        return diffDecorateEditors(state);
    },

    componentWillReceiveProps: function (props) {
        var newState = {
            leftState: props.left.state || this.state.leftState,
            rightState: props.right.state || this.state.rightState
        };
        if (this.props.debounceWait >= 0) {
            // Update diff later
            this.setState(newState);
            this.debouncedUpdateDiffs();
        } else {
            // Update diff now
            this.setState(diffDecorateEditors(newState));
        }
    },

    updateDiffs: function () {
        this.setState(diffDecorateEditors(this.state));
    },

    onChange: function (leftState, rightState) {
        // Texts changed ?
        var rightChanged = contentChanged(this.state.rightState, rightState);
        var leftChanged = contentChanged(this.state.leftState, leftState);

        var newState = {
            leftState: leftState,
            rightState: rightState
        };
        if (leftChanged || rightChanged) {
            // Update diffs
            if (this.props.debounceWait >= 0) {
                // Update diff later
                this.setState(newState);
                this.debouncedUpdateDiffs();
            } else {
                // Update diff now
                this.setState(diffDecorateEditors(newState));
            }
        } else {
            this.setState(newState);
        }
    },

    onRightChange: function (rightState) {
        var rightChanged = contentChanged(this.state.rightState, rightState);
        if (this.props.right.onChange && rightChanged) {
            this.props.right.onChange(rightState);
        } else {
            this.onChange(this.state.leftState, rightState);
        }
    },

    onLeftChange: function (leftState) {
        var leftChanged = contentChanged(this.state.leftState, leftState);
        if (this.props.left.onChange && leftChanged) {
            this.props.left.onChange(leftState);
        } else {
            this.onChange(leftState, this.state.rightState);
        }
    },

    render: function () {
        var left;
        if (!this.props.left.hidden) {
            left = <div className='diff-left'>
                <Draft.Editor
                    readOnly={this.props.left.readOnly}
                    editorState={this.state.leftState}
                    onChange={this.onLeftChange}
                />
            </div>;
        }

        var right;
        if (!this.props.right.hidden) {
            right = <div className='diff-right'>
                <Draft.Editor
                    readOnly={this.props.right.readOnly}
                    editorState={this.state.rightState}
                    onChange={this.onRightChange}
                />
                </div>;
        }

        return <div className='diff-editor'>
                    {left}
                    {right}
        </div>;
    }
});

function contentChanged(editorState1, editorState2) {
    return editorState1.getCurrentContent() !== editorState2.getCurrentContent();
}

function editorStateFromText(text) {
    var content = Draft.ContentState.createFromText(text);
    return Draft.EditorState.createWithContent(content);
}

function diffDecorateEditors(state) {
    var leftState = state.leftState;
    var rightState = state.rightState;

    var leftContentState = leftState.getCurrentContent();
    var rightContentState = rightState.getCurrentContent();

    var decorators = createDiffsDecorators(leftContentState, rightContentState);

    return {
        leftState: Draft.EditorState.set(leftState, { decorator: decorators.left }),
        rightState: Draft.EditorState.set(rightState, { decorator: decorators.right })
    };
}

function createDiffsDecorators(leftContentState, rightContentState) {
    // Compute diff on whole texts
    var left = leftContentState.getPlainText();
    var right = rightContentState.getPlainText();
    var diffs = diffWordMode(left, right);

    // Create strategies
    var leftStrategies = diffDecoratorStrategies(diffs, false, leftContentState.getBlockMap());
    var rightStrategies = diffDecoratorStrategies(diffs, true, rightContentState.getBlockMap());

    return {
        left: diffDecorator(leftStrategies),
        right: diffDecorator(rightStrategies)
    };
}

module.exports = DiffEditor;
