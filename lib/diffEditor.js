var React = require('react');
var Draft = require('draft-js');
var debounce = require('just-debounce');

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
 * @prop {Object} [before] Props for the before editor (containing the old text)
 * @prop {Object} [after] Props for the after editor (containing the new text)
 * @prop {String} [before.initial=''] The initial before text
 * @prop {String} [after.initial=''] The initial after text
 * @prop {Boolean} [before.hidden=false] Whether to actually display an editor
 * @prop {Boolean} [after.hidden=false] Whether to actually display an editor
 * @prop {Boolean} [before.readOnly=false] Make the before editor read only.
 * @prop {Boolean} [after.readOnly=false] Make the after editor read only.
 * @prop {Function} [after.onChange] Callback called with the after EditorState changes.
 * @prop {Function} [before.onChange] Callback called when the before EditorState changes.
 * @prop {Draft.EditorState} [after.state] Be sure to pass back the
 * updated state if you listen to after.onChange.
 * @prop {Draft.EditorState} [before.state]  Be sure to pass back the
 * updated state if you listen to before.onChange.
 */
var DiffEditor = React.createClass({

    propTypes: {
        before: EDITOR_PROP_SHAPE,
        after: EDITOR_PROP_SHAPE,
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
            before: defaultEditorProps,
            after: defaultEditorProps,
            debounceWait: -1
        };
    },

    getInitialState: function () {
        // Anti-patterns everywhere...
        return this.createInitialState(this.props);
    },

    createInitialState: function (props) {
        // Make a debounced diff update
        if (props.debounceWait >= 0) {
            this.debouncedUpdateDiffs =
                debounce(this.updateDiffs,
                         props.debounceWait,
                         false, // trailing
                         true); // guarantee waiting time
        }

        var state = {
            beforeState: props.before.state || editorStateFromText(props.before.initial),
            afterState: props.after.state || editorStateFromText(props.after.initial)
        };

        return diffDecorateEditors(state);
    },

    componentWillReceiveProps: function (props) {
        // New initial state ?
        if (props.before.initial !== this.props.before.initial
         || props.after.initial !== this.props.after.initial) {
             return this.setState(this.createInitialState(props));
        } else {
            var newState = {
                beforeState: props.before.state || this.state.beforeState,
                afterState: props.after.state || this.state.afterState
            };
            if (this.props.debounceWait >= 0) {
                // Update diff later
                this.setState(newState);
                this.debouncedUpdateDiffs();
            } else {
                // Update diff now
                this.setState(diffDecorateEditors(newState));
            }
        }
    },

    updateDiffs: function () {
        this.setState(diffDecorateEditors(this.state));
    },

    onChange: function (beforeState, afterState) {
        // Texts changed ?
        var afterChanged = contentChanged(this.state.afterState, afterState);
        var beforeChanged = contentChanged(this.state.beforeState, beforeState);

        var newState = {
            beforeState: beforeState,
            afterState: afterState
        };
        if (beforeChanged || afterChanged) {
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

    onAfterChange: function (afterState) {
        var afterChanged = contentChanged(this.state.afterState, afterState);
        if (this.props.after.onChange && afterChanged) {
            this.props.after.onChange(afterState);
        } else {
            this.onChange(this.state.beforeState, afterState);
        }
    },

    onBeforeChange: function (beforeState) {
        var beforeChanged = contentChanged(this.state.beforeState, beforeState);
        if (this.props.before.onChange && beforeChanged) {
            this.props.before.onChange(beforeState);
        } else {
            this.onChange(beforeState, this.state.afterState);
        }
    },

    render: function () {
        var before;
        if (!this.props.before.hidden) {
            before = <div className='diff-before'>
                <Draft.Editor
                    readOnly={this.props.before.readOnly}
                    editorState={this.state.beforeState}
                    onChange={this.onBeforeChange}
                />
            </div>;
        }

        var after;
        if (!this.props.after.hidden) {
            after = <div className='diff-after'>
                <Draft.Editor
                    readOnly={this.props.after.readOnly}
                    editorState={this.state.afterState}
                    onChange={this.onAfterChange}
                />
                </div>;
        }

        return <div className='diff-editor'>
                    {before}
                    {after}
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
    var beforeState = state.beforeState;
    var afterState = state.afterState;

    var beforeContentState = beforeState.getCurrentContent();
    var afterContentState = afterState.getCurrentContent();

    var decorators = createDiffsDecorators(beforeContentState, afterContentState);

    return {
        beforeState: Draft.EditorState.set(beforeState, { decorator: decorators.before }),
        afterState: Draft.EditorState.set(afterState, { decorator: decorators.after })
    };
}

function createDiffsDecorators(beforeContentState, afterContentState) {
    // Compute diff on whole texts
    var before = beforeContentState.getPlainText();
    var after = afterContentState.getPlainText();
    var diffs = diffWordMode(before, after);

    // Create strategies
    var beforeStrategies = diffDecoratorStrategies(diffs, false, beforeContentState.getBlockMap());
    var afterStrategies = diffDecoratorStrategies(diffs, true, afterContentState.getBlockMap());

    return {
        before: diffDecorator(beforeStrategies),
        after: diffDecorator(afterStrategies)
    };
}

module.exports = DiffEditor;
