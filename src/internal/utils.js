'use strict'

const UNSAFE_CHARS_REGEXP = /[<>\u2028\u2029/\\\r\n\t"]/g
const CHARS_REGEXP = /[\\\r\n\t"]/g

const UNICODE_CHARS = {
  '"': '\\"',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
  // eval('"\\u005C"') == eval('"\\\\"')
  '\\': '\\u005C',
  // '\\': '\\\\', // Was needed before in serialise-javascript tests.
  '<': '\\u003C',
  '>': '\\u003E',
  '/': '\\u002F',
  //'/': '/',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029'
}

function safeString(str) {
  return str.replace(UNSAFE_CHARS_REGEXP, (unsafeChar) => {
    return UNICODE_CHARS[unsafeChar]
  })
}

function unsafeString(str) {
  str = str.replace(CHARS_REGEXP, (unsafeChar) => UNICODE_CHARS[unsafeChar])
  return str
}

function quote(str, opts) {
  const fn = opts.unsafe ? unsafeString : safeString
  return str ? `"${fn(str)}"` : '""'
}

function saferFunctionString(str, opts) {
  return opts.unsafe
    ? str
    : str.replace(/(<\/?)([a-z][^>]*?>)/ig, (m, m1, m2) => safeString(m1) + m2)
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null
}

/**
 * Only relevant in node
 * @param arg
 * @returns {boolean}
 */
function isBuffer(arg) {
  return typeof Buffer !== 'undefined' && arg instanceof Buffer
}

function isInvalidDate(arg) {
  return isNaN(arg.getTime())
}

function toType(o) {
  const _type = Object.prototype.toString.call(o)
  const type = _type.substring(8, _type.length - 1)
  if (type === 'Uint8Array' && isBuffer(o)) return 'Buffer'
  return type
}

function shouldBeCloneable(o) {
  const type = typeof o;
  if (
    type === "undefined" ||
    o === null ||
    type === "boolean" ||
    type === "number" ||
    type === "string" ||
    o instanceof Date ||
    o instanceof RegExp ||
    o instanceof ArrayBuffer
  ) {
    return true;
  }

  // Only in browser
  return (typeof window !== "undefined") && (
    o instanceof Blob ||
    o instanceof File ||
    o instanceof FileList ||
    o instanceof ImageData ||
    o instanceof ImageBitmap
  );
  // type === "string" is considered not clonable
  // o instanceof Array ||
  // o instanceof Map ||
  // o instanceof Set
}

/**
 * Very slow
 * @param obj
 * @returns {boolean}
 */
function isCloneable(obj) {
  try {
    postMessage(obj, "*");
  } catch (error) {
    if (error && error.code === 25) { // DATA_CLONE_ERR
      return false;
    }
  }

  return true;
}

function isProxy(obj) {
  const _shouldBeCloneable = shouldBeCloneable(obj);
  const _isCloneable = isCloneable(obj);

  if (_isCloneable) return false;
  if (!_shouldBeCloneable) return "maybe";

  return _shouldBeCloneable && !_isCloneable;
}


/**
 * a function that passes this test has a low chance of changing the state
 */
function isSimpleGetter(func, propName) {
  // Only gets function content when no arguments are required
  const tmp = (func + '').match(/^function\s*\(\)\s*\{([\s\S]*)\}/)
  if (!tmp || tmp.length < 1) {
    return false
  }
  const functContent = tmp[1]
  if (functContent.indexOf('=') !== -1) {
    return false
  }
  if (functContent.indexOf(' [native code] ') !== -1) {
    // This test could be narrowed down
    if (func.name === 'bound fetch') {
      return false;
    }
    // 'window.test = "value"' adds a getter and setter to 'window'
    return true
    // Before native code was not considered as a simple function.
    // Not sure what the dangers of that where.
  }
  if (functContent.indexOf('(') !== -1 && (func + '').indexOf(')') !== -1) {
    return false
  }
  if (functContent.indexOf('this') !== -1
    || functContent.indexOf('arguments') !== -1) {
    // It is possible to assign 'this' with func.apply(thisObj, args)
    // But not sure if it is possible to find the correct this.
    return false
  }
  // At this point, the function could still call other getters that are difficult to catch.
  // If the user experiences problems with this, she can always put opts.evaluateSimpleGetters on false.
  return true
  // Commented out code that relies more on semantics:
  //if (functContent.match(/^\s*return/)) {
  //  // first statement is return statement and not arguments needed
  //  return true
  //}
  //let name = propName
  //if (func.name != null && func.name !== '') {
  //  name = func.name
  //}
  //if (name == null) {
  //  return false
  //}
  //if (name.toLowerCase().indexOf('get') === 0) {
  //  if ((func + '').indexOf('return') !== -1) {
  //    return true
  //  }
  //}
  //return false
}

/**
 * https://stackoverflow.com/a/6969486/1448736
 * @param string
 * @returns {*}
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

if (!String.prototype.replaceAll) {
  String.prototype.replaceAll = function (str, newStr) {

    // If a regex pattern
    if (Object.prototype.toString.call(str).toLowerCase() === '[object regexp]') {
      return this.replace(str, newStr);
    }

    // If a string
    return this.replace(new RegExp(escapeRegExp(str), 'g'), newStr);
  };
}


// A naive globalThis shim. I assume the simple polyfill will be enough here.
// https://mathiasbynens.be/notes/globalthis
const getGlobalThis = () => {
  if (typeof globalThis !== 'undefined') return globalThis;
  if (typeof self !== 'undefined') return self;
  if (typeof window !== 'undefined') return window;
  if (typeof global !== 'undefined') return global;
  if (typeof this !== 'undefined') return this;
  throw new Error('Unable to locate global `this`');
};

// Note: `var` is used instead of `const` to ensure `globalThis`
// becomes a global variable (as opposed to a variable in the
// top-level lexical scope) when running in the global scope.
var world = getGlobalThis();

// Polyfill for node 8. Should be commented for webpack.
if (typeof URL === 'undefined') {
  world.URL = require('url').URL
}

module.exports = {
  safeString,
  unsafeString,
  quote,
  saferFunctionString,
  isBuffer,
  isObject,
  isInvalidDate,
  toType,
  shouldBeCloneable,
  isCloneable,
  isProxy,
  isSimpleGetter,
  world,
}
