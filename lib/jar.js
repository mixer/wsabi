var Cookie = require('cookiejar');

/**
 * Extremely minimalist wrapper of a cookie jar to
 * store multiple domain/path agnostic cookies.
 */
function Jar () {
    this.cookies = {};
}

/**
 * Adds a cookie string, with optional semicolon-delimited pairs.
 * @param {String} cookie
 */
Jar.prototype.setCookies = function (cookie) {
    cookies = Array.isArray(cookie) ? cookie : cookie.split(';');

    for (var i = 0; i < cookies.length; i++) {
        var cookie = new Cookie.Cookie(cookies[i].trim());
        this.cookies[cookie.name] = cookie;
    }
};

/**
 * Returns a cookie string for cookies in the jar.
 * @return {String}
 */
Jar.prototype.getCookies = function () {
    var out = [];
    for (var key in this.cookies) {
        out.push(this.cookies[key].toValueString());
    }
    return out.join('; ');
};

module.exports = Jar;
