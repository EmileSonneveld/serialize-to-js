'use strict'

const UNSAFE_CHARS_REGEXP = /[<>\u2028\u2029/\\\r\n\t"]/g
const CHARS_REGEXP = /[\\\r\n\t"]/g

const UNICODE_CHARS = {
  '"': '\\"',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
  '\\': '\\u005C',
  '<': '\\u003C',
  '>': '\\u003E',
  '/': '\\u002F',
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

function isBuffer(arg) {
  return arg instanceof Buffer
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
  let name = propName
  if (func.name != null && func.name !== '') {
    name = func.name
  }
  if ((func + '').indexOf('=') !== -1) {
    return false
  }
  if ((func + '').indexOf('this') !== -1
  || (func + '').indexOf('arguments') !== -1) {
    // It is possible to assign 'this' with func.apply(thisObj, args)
    // But not sure if it is possible to find the correct this.
    return false
  }
  if ((func + '').match(/^function\s*\(\)\s*{\s*return/)) {
    // first statement is return statement and not arguments needed
    return true
  }
  if (name == null) {
    return false
  }
  if (name.toLowerCase().indexOf('get') === 0) {
    if ((func + '').indexOf('return') !== -1) {
      return true
    }
  }
  return false
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
}
