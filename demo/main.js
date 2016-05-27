var React = require('react');
var ReactDOM = require('react-dom');

var DiffEditor = require('../').DiffEditor;
var data = require('../test/data');

// ---- main


var before = {
    initial: data.text1
};
var after = {
    initial: data.text2
};

var Test = React.createClass({
    getInitialState: function () {
        return {
            beforeState: undefined,
            afterState: undefined
        }
    },

    onChange: function (afterState) {
        this.setState({
            afterState: afterState
        });
    },

    render: function () {
        var before = {
            initial: data.text1,
            state: this.state.beforeState
        };
        var after = {
            initial: data.text2,
            state: this.state.afterState,
            onChange: this.onChange
        };
        return <DiffEditor before={before}
                           after={after}
                           debounceWait={300}>
        </DiffEditor>;
    }
});

ReactDOM.render(
    <Test></Test>,
    document.getElementById('content')
);
