module.exports = {
    arrayToObject: function (arr, keyField) {
        return Object.assign({}, ...arr.map(item => ({[item[keyField]]: item})));
    }
};