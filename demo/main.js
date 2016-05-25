var React = require('react');
var ReactDOM = require('react-dom');

var DiffArea = require('./diff-area');
var data = require('../test/data');

// ---- main

left = data.text1;
right = data.text2;

ReactDOM.render(<DiffArea left={left} right={right}></DiffArea>,
    document.getElementById('content')
);
