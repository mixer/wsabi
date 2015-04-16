/**
 * Util function to bind a function in the context.
 * Native .bind is terribly slow.
 *
 * @access public
 * @param  {Function} fn
 * @param  {*}        context
 * @return {Function}
 */
module.exports.bind = function (fn, context) {
    return function () {
        fn.apply(context, arguments);
    };
};

/**
 * Makes all keys of the object lower-case, returning a new object.
 * This is used for header normalization; according to RFC 2616, HTTP
 * header names are case insensitive, so this is fine.
 *
 * @param  {Object} obj
 * @return {Object}
 */
module.exports.lowerKeys = function (obj) {
    var out = {};
    for (var key in obj) {
        out[key.toLowerCase()] = obj[key];
    }

    return out;
};
