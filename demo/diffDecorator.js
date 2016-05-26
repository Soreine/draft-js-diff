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

var InsertSpan = function (props) {
    return <span {...props} className="diff-insert">{props.children}</span>;
};

var EqualSpan = function (props) {
    return <span {...props} className="diff-equal">{props.children}</span>;
};

var DeleteSpan = function (props) {
    return <span {...props} className="diff-delete">{props.children}</span>;
};

module.exports = diffDecorator;
