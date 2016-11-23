var React = require('react');
var Draft = require('draft-js');

/**
 * @param {Strategies} strategies
 * @returns {Draft.Decorator}
 */
function diffDecorator(strategies) {
    return new Draft.CompositeDecorator([
        {
            strategy: strategies.getEqualStrategy(),
            component: EqualSpan
        },
        {
            strategy: strategies.getDeleteStrategy(),
            component: DeleteSpan
        },
        {
            strategy: strategies.getInsertStrategy(),
            component: InsertSpan
        }
    ]);
}

// Decorators
var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var InsertSpan = function InsertSpan(props) {
    return React.createElement(
        "span",
        _extends({}, props, { className: "diff-insert" }),
        props.children
    );
};

var EqualSpan = function EqualSpan(props) {
    return React.createElement(
        "span",
        _extends({}, props, { className: "diff-equal" }),
        props.children
    );
};

var DeleteSpan = function DeleteSpan(props) {
    return React.createElement(
        "span",
        _extends({}, props, { className: "diff-delete" }),
        props.children
    );
};

module.exports = diffDecorator;
