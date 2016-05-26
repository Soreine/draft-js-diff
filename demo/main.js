var React = require('react');
var ReactDOM = require('react-dom');

var DiffEditor = require('./diffEditor');
var data = require('../test/data');

// ---- main

left = data.text1;
right = data.text2;

ReactDOM.render(
    <DiffEditor left={left} right={right}></DiffEditor>,
    document.getElementById('content')
);
