var React = require('react');
var Draft = require('draft-js');
var debounce = require('lodash.debounce');

var DraftDiff = require('../');

var diffDecorator = require('./diffDecorator');

var DEBOUNCE_WAIT = 300; // ms
var DEBOUNCE_OPTS = {
    trailing: true // We want to update after the delay only
};

var DiffEditor = React.createClass({

    propTypes: {
        left: React.PropTypes.string,
        right: React.PropTypes.string
    },

    getInitialState: function () {
        // Make a debounced diff update
        this.debouncedUpdateDiffs = debounce(this.updateDiffs, DEBOUNCE_WAIT, DEBOUNCE_OPTS);

        var left = this.props.left;
        var right = this.props.right;

        // Create editors state
        var state = {
            leftState: editorStateFromText(left),
            rightState: editorStateFromText(right)
        };

        return this.diffDecorateEditors(state);
    },

    updateDiffs: function () {
        this.setState(this.diffDecorateEditors(this.state));
    },

    diffDecorateEditors: function (state) {
        var leftState = state.leftState;
        var rightState = state.rightState;

        var leftContentState = leftState.getCurrentContent();
        var rightContentState = rightState.getCurrentContent();

        var decorators = createDiffsDecorators(leftContentState, rightContentState);

        return {
            leftState: Draft.EditorState.set(leftState, { decorator: decorators.left }),
            rightState: Draft.EditorState.set(rightState, { decorator: decorators.right })
        };
    },

    onChange: function (leftState, rightState) {
        // Texts changed ?
        var rightChanged = this.state.rightState.getCurrentContent()
                !== rightState.getCurrentContent();
        var leftChanged = this.state.leftState.getCurrentContent()
                !== leftState.getCurrentContent();
        // Update diffs
        if (leftChanged || rightChanged) {
            this.debouncedUpdateDiffs();
        }
        // Update the EditorState
        this.setState({
            leftState: leftState,
            rightState: rightState
        });
    },

    onRightChange: function (rightState) {
        this.onChange(this.state.leftState, rightState);
    },

    onLeftChange: function (leftState) {
        this.onChange(leftState, this.state.rightState);
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

function createDiffsDecorators(leftContentState, rightContentState) {
    // Compute diff on whole texts
    var left = leftContentState.getPlainText();
    var right = rightContentState.getPlainText();
    var diffs = DraftDiff.diffWordMode(left, right);

    // Create strategies
    var leftStrategies = DraftDiff.diffDecoratorStrategies(diffs, false, leftContentState.getBlockMap());
    var rightStrategies = DraftDiff.diffDecoratorStrategies(diffs, true, rightContentState.getBlockMap());

    return {
        left: diffDecorator(leftStrategies),
        right: diffDecorator(rightStrategies)
    };
}

module.exports = DiffEditor;
