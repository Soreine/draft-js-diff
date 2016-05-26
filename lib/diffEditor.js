var React = require('react');
var Draft = require('draft-js');
var debounce = require('lodash.debounce');

var diffWordMode = require('./diffWordMode');
var diffDecoratorStrategies = require('./diffDecoratorStrategies');
var diffDecorator = require('./diffDecorator');

/**
 * Displays two Draft.Editor decorated with diffs.
 * @prop {String} [initialLeft=''] The initial left text (or old text)
 * @prop {String} [initialRight=''] The initial right text (or new text)
 * @prop {Number} [debounceWait=-1] Milliseconds. Delay for the
 * calculation of diffs. -1 to disable debouncing.
 * @prop {Function} [onRightChange] Callback called with the right EditorState changes.
 * @prop {Function} [onLeftChange] Callback called when the left EditorState changes.
 */
var DiffEditor = React.createClass({

    propTypes: {
        left: React.PropTypes.string,
        right: React.PropTypes.string,
        debounceWait: React.PropTypes.number,
        onRightChange: React.PropTypes.func,
        onLeftChange: React.PropTypes.func
    },

    getDefaultProps: function() {
        return {
            left: '',
            right: '',
            debounceWait: -1,
            onRightChange: NO_OP,
            onLeftChange: NO_OP
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

        var left = this.props.left;
        var right = this.props.right;

        // Create editors state
        var state = {
            leftState: editorStateFromText(left),
            rightState: editorStateFromText(right)
        };

        return diffDecorateEditors(state);
    },

    updateDiffs: function () {
        this.setState(diffDecorateEditors(this.state));
    },

    onChange: function (leftState, rightState) {
        // Texts changed ?
        var rightChanged = this.state.rightState.getCurrentContent()
                !== rightState.getCurrentContent();
        var leftChanged = this.state.leftState.getCurrentContent()
                !== leftState.getCurrentContent();

        var newState = {
            leftState: leftState,
            rightState: rightState
        };
        if (leftChanged || rightChanged) {
            // Update diffs
            if (this.props.debounceWait >= 0) {
                // Update diff later
                this.debouncedUpdateDiffs();
                this.setState(newState);
            } else {
                // Update diff now
                this.setState(diffDecorateEditors(newState));
            }
        } else {
            this.setState(newState);
        }
    },

    onRightChange: function (rightState) {
        this.onChange(this.state.leftState, rightState);
        this.props.onRightChange(rightState);
    },

    onLeftChange: function (leftState) {
        this.onChange(leftState, this.state.rightState);
        this.props.onLeftChange(leftState);
    },

    render: function () {
        return <div className='diffarea'>
            <div className='left'>
                <Draft.Editor
                    editorState={this.state.leftState}
                    onChange={this.onLeftChange}
                />
            </div>
            <div className='right'>
                <Draft.Editor
                    editorState={this.state.rightState}
                    onChange={this.onRightChange}
                />
            </div>
        </div>;
    }
});


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

function NO_OP() {}

module.exports = DiffEditor;
