var DIFF_TYPE = require('./diffType');

/**
 * Structure to hold the three types of strategies together
 */
function Strategies(strategies) {
    this.del = strategies.delete;
    this.equal = strategies.equal;
    this.insert = strategies.insert;
}

/**
 * @param {DiffType} type
 * @returns {Draft.DecoratorStrategy} The strategy for the given type of diff
 */
Strategies.prototype.getStrategy = function (type) {
    switch (type) {
    case DIFF_TYPE.EQUAL :
        return this.equal;
    case DIFF_TYPE.INSERT :
        return this.insert;
    case DIFF_TYPE.DELETE :
        return this.del;
    default:
        throw new Error('Unknown diff type ' + type);
    }
};

Strategies.prototype.getEqualStrategy = function () {
    return this.equal;
};

Strategies.prototype.getDeleteStrategy = function () {
    return this.del;
};

Strategies.prototype.getInsertStrategy = function () {
    return this.insert;
};

module.exports = Strategies;
