var React = require('react');
var ReactDOM = require('react-dom');

var DiffEditor = require('../').DiffEditor;
var data = require('../test/data');

// ---- main


var left = {
    initial: data.text1
};
var right = {
    initial: data.text2
};

ReactDOM.render(
    <DiffEditor left={left}
                right={right}
                debounceWait={300}>
    </DiffEditor>,
    document.getElementById('content')
);
