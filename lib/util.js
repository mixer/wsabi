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
