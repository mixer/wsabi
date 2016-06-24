'use strict';

const Cookie = require('cookiejar');

/**
 * Extremely minimalist wrapper of a cookie jar to
 * store multiple domain/path agnostic cookies.
 */
function Jar() {
    this.cookies = {};
}

/**
 * Removes all existing cookies from the jar.
 */
Jar.prototype.clear = function () {
    this.cookies = {};
};

/**
 * Adds a cookie string, with optional semicolon-delimited pairs.
 * @param {String} cookies
 */
Jar.prototype.setCookies = function (cookies) {
    cookies = Array.isArray(cookies) ? cookies : cookies.split('; ');

    for (let i = 0; i < cookies.length; i++) {
        const cookie = new Cookie.Cookie(cookies[i].trim());
        this.cookies[cookie.name] = cookie;
    }
};

/**
 * Returns a cookie string for cookies in the jar.
 * @return {String}
 */
Jar.prototype.getCookies = function () {
    return Object.keys(this.cookies)
        .map((key) => this.cookies[key].toValueString())
        .join('; ');
};

module.exports = Jar;
