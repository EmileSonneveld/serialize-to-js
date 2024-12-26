"use strict"

const searchButton = document.getElementById("searchButton");
const resultElement = document.getElementById("resultElement");
const searchText = document.getElementById("searchText");
const btnBefore = document.getElementById("btnBefore");
const btnAfter = document.getElementById("btnAfter");
const btnUnchanged = document.getElementById("btnUnchanged");
const resultElementChanged = document.getElementById("resultElementChanged");
const btnClear = document.getElementById("btnClear");

let stjState = {
  contentBefore: null,
  contentAfter: null,
  contentUnchanged: null,
}

function isPromise(p) {
  return typeof p === 'object' && typeof p.then === 'function';
}

function asyncButtonClick(buttonElement, asyncCallback) {
  buttonElement.addEventListener("click", function (evt) {
    buttonElement.disabled = true;
    const buttonElementOriginalInnerHtml = buttonElement.innerHTML
    buttonElement.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> ' + buttonElement.innerHTML

    setTimeout(() => {
      let returnedPromise = null;
      try {
        let p = asyncCallback(evt)
        returnedPromise = isPromise(p)
        if (returnedPromise) {
          p.catch((e) => {
            console.error(e);
            window.alert(e);
          }).finally(() => {
            // Would be nice if finally events are called LIFO
            buttonElement.disabled = false
            buttonElement.innerHTML = buttonElementOriginalInnerHtml;
          });
        }
      } catch (e) {
        console.error(e);
        window.alert(e);
      } finally {
        if (!returnedPromise) {
          buttonElement.disabled = false
          buttonElement.innerHTML = buttonElementOriginalInnerHtml;
        }
      }
    }, 40)
  });
}


let contentBeforeSet = null;
let contentAfterSet = null;
let contentUnchangedSet = null;

function updateChangeSearch() {
  btnBefore.classList.remove("btn-danger")
  if (!stjState.contentBefore) btnBefore.classList.add("btn-danger")
  btnAfter.classList.remove("btn-danger")
  if (!stjState.contentAfter) btnAfter.classList.add("btn-danger")
  btnUnchanged.classList.remove("btn-danger")
  if (!stjState.contentUnchanged) btnUnchanged.classList.add("btn-danger")

  if (stjState.contentBefore == null || stjState.contentAfter == null) {
    resultElementChanged.innerText = "Capture before and after to show something";
    return;
  }
  const result = []
  for (const line of contentAfterSet) {
    // The amount of times a line occurs is not taken into account.

    // Small example of possible inputs:
    //         B A U
    // noise = 5 6 7
    // signl = 1 2 2
    if (!contentBeforeSet.has(line)) {
      if (contentUnchangedSet == null || contentUnchangedSet.has(line)) {
        result.push(line)
      }
    }
  }
  if (result.length === 0) {
    resultElementChanged.innerText = "Nothing to show";
  } else {
    resultElementChanged.innerHTML = result.map(str => `<tr><th>${str}</th></tr>`).join("\n");
  }
}


// The body of this function will be execuetd as a content script inside the
// current page
function callStjFunction(functionName, arg, opts) {
  // console.log(...arguments)
  const capture = {};
  // Paste "main.js" content here and adapt:
  // (this is to avid needing 'eval')

  /// BEGIN of modified main.js
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });


const UNSAFE_CHARS_REGEXP = /[<>\u2028\u2029/\\\r\n\t\x00"]/g
const CHARS_REGEXP = /[\\\r\n\t\x00"]/g

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
  '\0': '\\x00', // null byte in source code did not cause problems. But it feels dangerous
  '\u2028': '\\u2028', // LINE SEPARATOR
  '\u2029': '\\u2029', // PARAGRAPH SEPARATOR
  // TODO, Convert all non printable characters in source? What about zero width white space?
}

function safeString(s) {
  return s.replace(UNSAFE_CHARS_REGEXP, (unsafeChar) => {
    return UNICODE_CHARS[unsafeChar]
  })
}

function unsafeString(s) {
  s = s.replace(CHARS_REGEXP, (unsafeChar) => UNICODE_CHARS[unsafeChar])
  return s
}

function quote(s, opts) {
  const fn = opts.unsafe ? unsafeString : safeString
  return s ? `"${fn(s)}"` : '""'
}

function saferFunctionString(s, opts) {
  return opts.unsafe
    ? s
    : s.replace(/(<\/?)([a-z][^>]*?>)/ig, (m, m1, m2) => safeString(m1) + m2)
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
  const tmp = (func + '').match(/^function ?\(\)\s*\{([\s\S]*)\}/)
  if (!tmp || tmp.length < 1) {
    return false
    // tmp = (func + '').match(/^get\(\)\s*\{([\s\S]*)\}/) TODO: getter
  }
  const functContent = tmp[1]
  if (functContent.indexOf('=') !== -1) {
    return false
  }
  if (functContent.indexOf(' [native code]') !== -1) {
    // This test could be narrowed down
    if (func.name.indexOf('bound ') === 0) {
      // 'bound ' when running search.test.js in Chrome
      // 'bound e' encountered in frontend webpack code
      return false;
    }
    // 'window.test = "value"' adds a getter and setter to 'window'
    return true // TODO: Whitelist native functions
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
  String.prototype.replaceAll = function (s, newStr) {

    // If a regex pattern
    if (Object.prototype.toString.call(s).toLowerCase() === '[object regexp]') {
      return this.replace(s, newStr);
    }

    // If a string
    return this.replace(new RegExp(escapeRegExp(s), 'g'), newStr);
  };
}

function isArgumentsObject(obj) {
  return Object.prototype.toString.call(obj) === '[object Arguments]';
}


// A naive globalThis shim. I assume the simple polyfill will be enough here.
// https://mathiasbynens.be/notes/globalthis
const getGlobalThis = () => {
  if (typeof globalThis !== 'undefined') return globalThis;
  if (typeof self !== 'undefined') return self;
  if (typeof window !== 'undefined') return window;
  if (typeof global !== 'undefined') return global;
  if (typeof undefined !== 'undefined') return undefined;
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

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({
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
  isArgumentsObject,
  world,
  escapeRegExp,
});


/***/ }),
/* 2 */
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/*
 * @copyright 2015- commenthol
 * @license MIT
 */



;

const safeKeyRegex = /^[a-zA-Z$_][a-zA-Z$_0-9]*$/

/**
 * handle references
 * @constructor
 * @param {Object} references
 * @param opts
 * @param {boolean} opts.unsafe
 */
function Ref(references, opts) {
  this.opts = opts || {}
  this.breadcrumbs = null
  const self = this

  // https://www.measurethat.net/Benchmarks/ShowResult/224868
  this.visitedRefs = new Map()
  const setOrig = this.visitedRefs.set
  this.visitedRefs.set = function (key, val) {
    if (this.has(key)) {
      throw Error(`this object was already visited! old:${this.get(key)} new: ${self.breadcrumbs.join('')}`)
    }
    setOrig.call(this, key, val)
  }

}

Ref.isSafeKey = function (key) {
  return (key !== "") && safeKeyRegex.test(key)
}

/**
 * wrap an object key
 * @api private
 * @param {String} key - objects key
 * @param opts
 * @return {String} wrapped key in quotes if necessary
 */
Ref.wrapkey = function (key, opts) {
  return (opts.alwaysQuote === false && Ref.isSafeKey(key)) ? key : _utils_js__WEBPACK_IMPORTED_MODULE_0__.default.quote(key, opts)
}

Ref.prototype = {
  markAsVisited(source) {
    this.visitedRefs.set(source, this.join())
  },

  unmarkVisited(source) {
    // What does the return value mean?
    return this.visitedRefs.delete(source)
  },

  isVisited(value) {
    return this.visitedRefs.has(value)
  },

  getStatementForObject(source) {
    if (!this.isVisited(source)) {
      throw Error("Object should be visited first")
    }
    return this.visitedRefs.get(source)
  },


  /**
   * @param {String} gettingStatement
   */
  push: function (gettingStatement) {
    this.breadcrumbs.push(gettingStatement)
  },
  /**
   * remove the last key from internal array
   */
  pop: function () {
    this.breadcrumbs.pop()
  },

  /**
   * join the keys
   */
  join: function () {
    return this.breadcrumbs.join('')
  },

}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Ref);


/***/ }),
/* 3 */
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "search": () => (/* binding */ search),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _internal_utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* harmony import */ var _internal_reference_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2);


;


/**
 * Figuratively search a needle in the haystack.
 * Breath first traversal to have the smallest possible paths:
 * https://en.wikipedia.org/wiki/Breadth-first_search#Pseudocode
 * @param {*} needle
 * @param {*} opts
 */
function search(needle, opts = null) {
  opts = {
    returnValue: false,
    root: globalThis,
    ...opts,
  }
  const results = [];

  const visitedRefs = new Map()
  visitedRefs.set(opts.root, {parent: null, access: 'globalThis'})
  const queue = []
  queue.push(opts.root)

  while (queue.length > 0) {
    let source = queue.shift() // same as dequeue
    try {
      if (source.toString == null) {
        // Avoid "TypeError: Cannot convert object to primitive value"
        continue
      }
    } catch (e) {
      // Probably: DOMException: Blocked a frame with origin "https://..." from accessing a cross-origin frame.
      continue
    }
    // console.log(source+'')

    const descs = Object.getOwnPropertyDescriptors(source) // empty list for number type
    for (const key in descs) {
      // TODO: Wrap with try-catch
      if (Object.prototype.hasOwnProperty.call(descs, key)) {
        const propDesc = descs[key]
        if (propDesc.get && !(_internal_utils_js__WEBPACK_IMPORTED_MODULE_0__.default.isSimpleGetter(propDesc.get) || (propDesc.get + '').indexOf(' [native code]') !== -1)) {
          continue
        }
        if (_internal_utils_js__WEBPACK_IMPORTED_MODULE_0__.default.isArgumentsObject(source) && key === "callee") {
          // Avoid error with Google Analytics object:
          // "TypeError: 'caller', 'callee', and 'arguments' properties may not be accessed on strict mode functions or the arguments objects for calls to them"
          continue
        }
        let access = _internal_reference_js__WEBPACK_IMPORTED_MODULE_1__.default.isSafeKey(key) ? `.${key}` : `[${_internal_utils_js__WEBPACK_IMPORTED_MODULE_0__.default.quote(key, opts)}]`;
        let child = source[key]

        if (opts.objectsToLinkTo) {
          // Just skip certain objects.
          let cont = false
          for (const key in opts.objectsToLinkTo) {
            if (child == opts.objectsToLinkTo[key]) cont = true
          }
          if (cont) continue
        }
        if (typeof child == "function"
          && _internal_utils_js__WEBPACK_IMPORTED_MODULE_0__.default.isSimpleGetter(child)
          && (child + '').indexOf(' [native code]') === -1) {
          visitedRefs.set(child, {parent: source, access})
          // jump inside the function
          access = "()";
          source = child;
          child = child();
        }
        if(child == null) {
          continue
        }

        try {
          // noinspection BadExpressionStatementJS
          child.toString == null
        } catch (e) {
          // Probably: DOMException: Blocked a frame with origin "https://..." from accessing a cross-origin frame.
          continue
        }
        // noinspection EqualityComparisonWithCoercionJS
        if (child === needle ||
          (child
            && child.toString // avoid "TypeError: Cannot convert object to primitive value"
            && (_internal_utils_js__WEBPACK_IMPORTED_MODULE_0__.default.isSimpleGetter(child.toString) || (child.toString + '').indexOf(' [native code]') !== -1)
            && !(child.length === 1) // avoid '(['a'] == 'a')===true' weirdness
            && child == needle // sloppy compare can be handy for '5'==5
          ) || (
            typeof child == "string"
            && child.indexOf(needle) !== -1
            )
        ) {
          let el = visitedRefs.get(source)
          let breadcrumbs = access;
          while (true) {
            breadcrumbs = el.access + breadcrumbs
            if (el.parent == null) {
              break;
            }
            el = visitedRefs.get(el.parent)
          }
          results.push(breadcrumbs)
          continue; // no need to go deeper in this object
        }
        if (
          typeof child !== 'object' ||
          child == null
        ) {
          continue;
        }

        if (visitedRefs.has(child)) {
          // nothing to do
        } else {
          visitedRefs.set(child, {parent: source, access})
          queue.push(child)
        }
      }
    }
  }
  if (opts.returnValue) {
    return results
  }

  // Easy to copy/paste from console:
  console.log(results.join("\n"))
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({
  search,
});

// store globally:
_internal_utils_js__WEBPACK_IMPORTED_MODULE_0__.default.world.search = search;
capture.search = search;


/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "serialize": () => (/* binding */ serialize),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _internal_utils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* harmony import */ var _internal_reference_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2);
/* harmony import */ var _search_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(3);
/*
 * @copyright 2016- commenthol
 * @copyright 2021- EmileSonneveld
 * @license MIT
 */



;



class ObjectIsDirectlyLinkableError extends Error {
  constructor(message, directLink) {
    super(message);
    this.name = "ObjectIsDirectlyLinkableError";
    this.directLink = directLink;
  }
}

/**
 * serializes an object to javascript code
 *
 * @param {*} src - source to serialize
 * @param {?Object} [opts] - options
 * @param {Boolean} [opts.unsafe] - do not escape chars `<>/`
 * @param {Boolean} [opts.ignoreFunction]
 * @param {*} [opts.objectsToLinkTo]
 * @param {Boolean} [opts.evaluateSimpleGetters]
 * @param {Number} [opts.maxDepth]
 * @param {*} [opts.space]
 * @return {String} serialized representation of `source`
 */
function serialize(src, opts = null) {
  if (src === "magic value that will resort to globalThis object") {
    src = globalThis;
  }
  opts = {
    maxDepth: Infinity,
    evaluateSimpleGetters: true,
    unsafe: false,
    space: '  ',
    alwaysQuote: false,
    fullPaths: false,
    needle: null,
    objectsToLinkTo: null,
    ...opts,
  }
  if (typeof opts.space === 'number') {
    opts.space = ' '.repeat(opts.space)
  } else if (!opts.space) {
    opts.space = ''
  }
  const newline = opts.space ? "\n" : ""

  const refs = new _internal_reference_js__WEBPACK_IMPORTED_MODULE_1__.default([], opts)

  let objCounter = 0
  let absorbPhase = true


  function stringify(source, indent = 2) {
    let codeBefore = ""
    let codeMain = ""
    let codeAfter = ""

    const type = _internal_utils_js__WEBPACK_IMPORTED_MODULE_0__.default.toType(source)

    if (absorbPhase && source === src) {
      if (typeof source === "object" || typeof source === "function") {
        throw new ObjectIsDirectlyLinkableError("", refs.join())
      } else {
        return {codeBefore, codeMain, codeAfter}
      }
    }
    if (indent > opts.maxDepth) {
      codeMain += "undefined /* >maxDepth */"
      return {codeBefore, codeMain, codeAfter}
    }

    function appendDirtyProps(source) {
      const descs = Object.getOwnPropertyDescriptors(source)
      for (const key in descs) {
        if (Object.prototype.hasOwnProperty.call(descs, key)) {
          const propDesc = descs[key]
          if (propDesc.get || propDesc.set) {
            codeAfter += `  Object.defineProperty(${refs.join()}, ${_internal_utils_js__WEBPACK_IMPORTED_MODULE_0__.default.quote(key, opts)}, {`
            if (propDesc.get) {
              codeAfter += `get: () => {}, `
            }
            if (propDesc.set) {
              codeAfter += `set: (val) => {}, `
            }
            codeAfter += `}); /* get/set not supported */\n`
          } else {
            if (_internal_reference_js__WEBPACK_IMPORTED_MODULE_1__.default.isSafeKey(key)) {
              refs.breadcrumbs.push(`.${key}`)
            } else {
              refs.breadcrumbs.push(`[${_internal_utils_js__WEBPACK_IMPORTED_MODULE_0__.default.quote(key, opts)}]`)
            }
            if (refs.isVisited(source[key])) {
              codeAfter += `  ${refs.join()} = ${refs.getStatementForObject(source[key])};\n`
            } else {
              const ret = stringify(source[key])

              if (opts.needle == null
                || ret.codeBefore.includes(opts.needle)
                || ret.codeMain.includes(opts.needle)
                || ret.codeAfter.includes(opts.needle)
              ) {
                codeBefore += ret.codeBefore
                codeAfter += `  ${refs.join()} = ${ret.codeMain};\n`
                codeAfter += ret.codeAfter
              }
            }
            refs.breadcrumbs.pop()
          }
        }
      }
    }

    try {

      // https://levelup.gitconnected.com/pass-by-value-vs-pass-by-reference-in-javascript-31e79afe850a
      // TODO: Save getters and setters as functions
      //       make it an option to get the value behind getters.
      // TODO: Check if capturing local scope is possible. Maybe isolate a function call, and generate minimal code to reproduce the function call
      // Could make it more user friendly by only using late linking when needed.
      switch (type) {
        case 'Null':
          codeMain += 'null'
          break
        case 'String':
          codeMain += _internal_utils_js__WEBPACK_IMPORTED_MODULE_0__.default.quote(source, opts) || '""'
          break
        case 'AsyncFunction':
        case 'GeneratorFunction':
        case 'Function': { // TODO: Assign the name of the function (`const someName = ()=>{}` can do that)
          refs.markAsVisited(source)
          if (opts.ignoreFunction === true) {
            codeMain += `undefined /* ignoreFunction */`
          } else {
            let tmp = source.toString()
            tmp = opts.unsafe ? tmp : _internal_utils_js__WEBPACK_IMPORTED_MODULE_0__.default.saferFunctionString(tmp, opts)
            tmp = tmp.replace('[native code]', '/*[native code] Avoid this by allowing to link to globalThis object*/')
            if (tmp.indexOf('function') !== 0) {
              const firstBrace = tmp.indexOf('(')
              if (firstBrace !== 0 && firstBrace !== -1) {
                const firstSpace = tmp.indexOf(' ')
                if (firstBrace < firstSpace) {
                  tmp = 'function ' + tmp
                }
              }
            }
            codeMain += tmp
            // append function to es6 function within obj
            // codeMain += /^\s*((async)?\s?function|\(?[^)]*?\)?\s*=>)/m.test(tmp) ? tmp : 'function ' + tmp
            if (source.prototype) {
              refs.breadcrumbs.push(".prototype")
              refs.markAsVisited(source.prototype) // TODO: test with function constructors (class is already tested)
              refs.breadcrumbs.pop()
            }
          }
          if (!absorbPhase && opts.evaluateSimpleGetters && _internal_utils_js__WEBPACK_IMPORTED_MODULE_0__.default.isSimpleGetter(source)) {
            codeMain += `/* val: ${source()}*/`
          }
          // TODO, can also have dirty props!
          // For example the cancel property of the lodash throttle function
          // f = _.throttle((a)=>console.log(a), 2)
          // f("a");f("a");f("a");f("a"); f.cancel()
          break
        }
        case 'RegExp':
          refs.markAsVisited(source)
          codeMain += `new RegExp(${_internal_utils_js__WEBPACK_IMPORTED_MODULE_0__.default.quote(source.source, opts)}, "${source.flags}")`
          break
        case 'Date':
          refs.markAsVisited(source)
          if (_internal_utils_js__WEBPACK_IMPORTED_MODULE_0__.default.isInvalidDate(source)) codeMain += 'new Date("Invalid Date")'
          else codeMain += `new Date(${_internal_utils_js__WEBPACK_IMPORTED_MODULE_0__.default.quote(source.toJSON(), opts)})`
          break
        case 'Error':
          refs.markAsVisited(source)
          codeMain += `new Error(${_internal_utils_js__WEBPACK_IMPORTED_MODULE_0__.default.quote(source.message, opts)})`
          break
        case 'Buffer':
          refs.markAsVisited(source)
          codeMain += `Buffer.from("${source.toString('base64')}", "base64")`
          break
        case 'Array': {
          refs.markAsVisited(source)
          const tmp = []
          let counter = 0
          let mutationsFromNowOn = false
          for (const key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
              if (Object.getOwnPropertyDescriptor(source, key).get) {
                tmp.push(`${opts.space.repeat(indent)}undefined /* Getters not supported*/`) // They could be statefull. try-catch might be not enough
              } else if (Object.getOwnPropertyDescriptor(source, key).set) {
                tmp.push(`${opts.space.repeat(indent)}undefined /* Setters not supported*/`) // They could be statefull. try-catch might be not enough
              } else {
                if (_internal_reference_js__WEBPACK_IMPORTED_MODULE_1__.default.isSafeKey(key)) {
                  refs.breadcrumbs.push(`.${key}`)
                } else {
                  refs.breadcrumbs.push(`[${_internal_utils_js__WEBPACK_IMPORTED_MODULE_0__.default.quote(key, opts)}]`)
                }
                if (refs.isVisited(source[key]) || mutationsFromNowOn || String(counter) !== String(key)) {
                  if (refs.isVisited(source[key])) {
                    tmp.push(`${opts.space.repeat(indent)}undefined /* Linked later*/`)
                    codeAfter += `  ${refs.join()} = ${refs.getStatementForObject(source[key])};\n`
                  } else {
                    // TODO: keep adding undefined for later elements that are still on the good count.
                    const ret = stringify(source[key], indent + 1)
                    codeBefore += ret.codeBefore
                    codeAfter += `  ${refs.join()} = ${ret.codeMain};\n`
                    codeAfter += ret.codeAfter
                  }
                  mutationsFromNowOn = true
                } else {
                  const ret = stringify(source[key], indent + 1)
                  codeBefore += ret.codeBefore
                  codeAfter += ret.codeAfter
                  tmp.push(`${opts.space.repeat(indent)}${ret.codeMain}`)
                }
                refs.breadcrumbs.pop()
              }
              counter += 1
            }
          }
          codeMain += `[${newline}${tmp.join(`,${newline}`)}${newline}${opts.space.repeat(indent - 1)}]`
          break
        }
        case 'Int8Array':
        case 'Uint8Array':
        case 'Uint8ClampedArray':
        case 'Int16Array':
        case 'Uint16Array':
        case 'Int32Array':
        case 'Uint32Array':
        case 'Float32Array':
        case 'Float64Array': {
          refs.markAsVisited(source)
          const tmp = []
          for (let i = 0; i < source.length; i++) {
            tmp.push(source[i])
          }

          // appendDirtyProps(source) // TODO: Check if numerical properties are not double logged.
          codeMain += `new ${type}([${tmp.join(', ')}])`
          break
        }
        case 'Set': {
          // Adding cyclic references can be added after everything. Even empty initial objects would be fine

          refs.markAsVisited(source)
          const tmp = []
          let mutationsFromNowOn = false
          Array.from(source).forEach(item => {
            let safeItem
            if (refs.isVisited(item)) {
              safeItem = refs.getStatementForObject(item)
              mutationsFromNowOn = true
            } else if (_internal_utils_js__WEBPACK_IMPORTED_MODULE_0__.default.isObject(item)) {
              objCounter += 1
              safeItem = "obj" + objCounter
              const breadcrumbsOrig = refs.breadcrumbs
              refs.breadcrumbs = [safeItem]
              const ret = stringify(item)
              codeBefore += ret.codeBefore
              codeBefore += `  const ${safeItem} = ${ret.codeMain};\n`
              codeAfter += ret.codeAfter
              refs.breadcrumbs = breadcrumbsOrig
            } else {
              const ret = stringify(item, indent + 1)
              codeBefore += ret.codeBefore // probably not needed here
              safeItem = ret.codeMain
              codeAfter += ret.codeAfter // probably not needed here
            }
            if (mutationsFromNowOn) {
              codeAfter += `  ${refs.join()}.add(${safeItem});\n`
            } else {
              tmp.push(opts.space.repeat(indent) + safeItem)
            }
          })

          appendDirtyProps(source)

          codeMain += `new ${type}([\n${tmp.join(',\n')}\n${opts.space.repeat(indent - 1)}])`
          break
        }
        case 'Map': {
          refs.markAsVisited(source)
          const tmp = []
          let mutationsFromNowOn = false
          for (const [mapKey, mapValue] of source.entries()) {
            let safeKey
            if (refs.isVisited(mapKey)) {
              safeKey = refs.getStatementForObject(mapKey)
            } else if (_internal_utils_js__WEBPACK_IMPORTED_MODULE_0__.default.isObject(mapKey)) {
              objCounter += 1
              safeKey = "obj" + objCounter
              const breadcrumbsOrig = refs.breadcrumbs
              refs.breadcrumbs = [safeKey]
              const ret = stringify(mapKey)
              codeBefore += ret.codeBefore
              codeBefore += `  const ${safeKey} = ${ret.codeMain};\n`
              codeAfter += ret.codeAfter
              refs.breadcrumbs = breadcrumbsOrig
            } else {
              const ret = stringify(mapKey, indent + 1)
              codeBefore += ret.codeBefore // probably not needed here
              safeKey = ret.codeMain
              codeAfter += ret.codeAfter // probably not needed here
            }

            const thisBreadcrumb = refs.join()
            refs.breadcrumbs.push(`.get(${safeKey})`)
            if (refs.isVisited(mapKey) || refs.isVisited(mapValue) || mutationsFromNowOn) {
              mutationsFromNowOn = true

              if (refs.isVisited(mapValue)) {
                tmp.push(`${opts.space.repeat(indent)}[${safeKey}, undefined /* Linked later*/]`)
                codeAfter += `  ${thisBreadcrumb}.set(${safeKey}, ${refs.getStatementForObject(mapValue)});\n`
              } else {
                const ret = stringify(mapValue, indent + 1)
                codeBefore += ret.codeBefore
                codeAfter += `  ${thisBreadcrumb}.set(${safeKey}, ${ret.codeMain});\n`
                codeAfter += ret.codeAfter
              }
            } else {
              const ret = stringify(mapValue, indent + 1)
              codeBefore += ret.codeBefore
              tmp.push(opts.space.repeat(indent) + `[${safeKey}, ${ret.codeMain}]`)
              codeAfter += ret.codeAfter
            }
            refs.breadcrumbs.pop()
          }

          appendDirtyProps(source)

          codeMain += `new ${type}([${newline}${tmp.join(`,${newline}`)}${newline}${opts.space.repeat(indent - 1)}])`
          break
        }
        case 'Window':
        case 'global':
        case 'console':
        case 'Math':
        case 'Object': {
          refs.markAsVisited(source)
          if (!opts.fullPaths) {
            const tmp = []

            // Nothing is enumerable in Math object, so can't use naive for-in-loop
            const descs = Object.getOwnPropertyDescriptors(source)
            for (const key in descs) {
              if (Object.prototype.hasOwnProperty.call(source, key)) {
                if (Object.getOwnPropertyDescriptor(source, key).get) {
                  tmp.push(`${opts.space.repeat(indent) + _internal_reference_js__WEBPACK_IMPORTED_MODULE_1__.default.wrapkey(key, opts)}: undefined /* Getters not supported*/`) // They could be statefull. try-catch might be not enough
                } else if (Object.getOwnPropertyDescriptor(source, key).set) {
                  tmp.push(`${opts.space.repeat(indent) + _internal_reference_js__WEBPACK_IMPORTED_MODULE_1__.default.wrapkey(key, opts)}: undefined /* Setters not supported*/`) // They could be statefull. try-catch might be not enough
                } else {
                  if (_internal_reference_js__WEBPACK_IMPORTED_MODULE_1__.default.isSafeKey(key)) {
                    refs.breadcrumbs.push(`.${key}`)
                  } else {
                    refs.breadcrumbs.push(`[${_internal_utils_js__WEBPACK_IMPORTED_MODULE_0__.default.quote(key, opts)}]`)
                  }
                  if (refs.isVisited(source[key])) {
                    tmp.push(`${opts.space.repeat(indent) + _internal_reference_js__WEBPACK_IMPORTED_MODULE_1__.default.wrapkey(key, opts)}: undefined /* Linked later*/`)
                    codeAfter += `  ${refs.join()} = ${refs.getStatementForObject(source[key])};\n`
                  } else {
                    const ret = stringify(source[key], indent + 1)
                    codeBefore += ret.codeBefore
                    tmp.push(`${opts.space.repeat(indent) + _internal_reference_js__WEBPACK_IMPORTED_MODULE_1__.default.wrapkey(key, opts)}:${ret.codeMain}`)
                    codeAfter += ret.codeAfter
                  }
                  refs.breadcrumbs.pop()
                }
              }
            }
            codeMain += `{${newline}${tmp.join(`,${newline}`)}${newline}${opts.space.repeat(indent - 1)}}`
          } else {
            // This option would be more compatible with python
            appendDirtyProps(source)
            codeMain += "{}"
          }

          // Potential: DOMException: Blocked a frame with origin "https://..." from accessing a cross-origin frame.
          if (source.__proto__ && source.__proto__ !== ({}).__proto__ && source.__proto__.constructor) {
            if (!refs.isVisited(source.__proto__.constructor)) {
              objCounter += 1
              const safeKey = "obj" + objCounter
              const breadcrumbsOrig = refs.breadcrumbs
              refs.breadcrumbs = [safeKey]
              const ret = stringify(source.__proto__.constructor)
              codeBefore += ret.codeBefore
              codeBefore += `  const ${safeKey} = ${ret.codeMain};\n`
              codeAfter += ret.codeAfter
              refs.breadcrumbs = breadcrumbsOrig
            }
            if (refs.isVisited(source.__proto__)) {
              // TODO: This is delicate and can throw bad errors
              codeAfter += `  ${refs.join()}.__proto__ = ${refs.getStatementForObject(source.__proto__)};\n`
            } else {
              codeAfter += `  /* ${refs.join()}.__proto__ = not supported yet */\n`
            }
          }
          break
        }
        case 'Undefined':
        case 'Boolean':
        case 'Number':
          if (Object.is(source, -0)) {
            codeMain += '-0' // 0 === -0, so this is probably not important.
          } else {
            codeMain += '' + source
          }
          break
        case 'URL':
          codeMain += `new URL(${_internal_utils_js__WEBPACK_IMPORTED_MODULE_0__.default.quote(source.toString(), opts)})`
          break
        case 'BigInt':
          codeMain += `BigInt(${_internal_utils_js__WEBPACK_IMPORTED_MODULE_0__.default.quote(source.toString(), opts)})`
          break
        case 'Symbol':
          refs.markAsVisited(source)
          const str = String(source)
          const symbolName = str.substring(7, str.length - 1)
          // Symbol can not have dirty props
          codeMain += `Symbol(${_internal_utils_js__WEBPACK_IMPORTED_MODULE_0__.default.quote(symbolName, opts)})`
          break
        default: {
          // One can find many exotic object types by running: console.log(serialize(window))
          if (!absorbPhase) {
            // console.warn(`Unknown type: ${type} source: ${source}`)
            codeMain += `undefined /* not supported: ${source.toString().replaceAll('*/', '* /')}*/`
          }
          break
        }
      }
    } catch (error) {
      if (error instanceof ObjectIsDirectlyLinkableError) {
        throw error;
      }
      if (refs.unmarkVisited(source)) {
        console.warn('Dirty error.', error.message)
      }
      // codeMain can have /**/ comments in it already.
      codeMain = `undefined /* ${codeMain.replaceAll('*/', '* /')} ${errorToValue(error)} */`
    }
    return {codeBefore, codeMain, codeAfter}
  }

  function errorToValue(error) {
    let message = error.message
    if (message.indexOf('\n') !== -1) {
      message = error.message.substring(0, error.message.indexOf('\\n'))
    }
    return `Error: ${message}. Breadcrumb: ${refs.join()}`
  }

  // First absorb all objects to link to
  try {
    if (opts.objectsToLinkTo) {
      for (const key in opts.objectsToLinkTo) {
        if (Object.prototype.hasOwnProperty.call(opts.objectsToLinkTo, key)) {
          refs.breadcrumbs = [key]
          stringify(opts.objectsToLinkTo[key])
        }
      }
    }
  } catch (error) {
    if (error instanceof ObjectIsDirectlyLinkableError) {
      return error.directLink
    }
  }

  // Now reset, and go over the real object
  objCounter = 0
  refs.breadcrumbs = ['root']
  absorbPhase = false

  const ret = stringify(src, 2)
  if (ret.codeBefore === '' && ret.codeAfter === '') {
    // Keep compatibility with default JSON
    // TODO: Check for compatibility with example library.
    return ret.codeMain.replaceAll("\n" + opts.space, "\n")
  }
  return `(function(){
${ret.codeBefore}
  const root = ${ret.codeMain};
${ret.codeAfter}
  return root;
})()`
}

function slog(src, opts = null) {
  if (src == null) {
    src = window
  }
  opts = {
    ignoreFunction: true,
    ...opts,
  }
  let iframe = null;
  if (typeof document !== 'undefined') {
    iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    window.console = iframe.contentWindow.console;
  }
  console.log(serialize(src, opts))

  if (iframe) {
    // with Chrome 60+ only remove the childNode when log is no longer needed
    iframe.parentNode.removeChild(iframe);
  }
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({
  serialize,
  slog,
});
// store globally:
_internal_utils_js__WEBPACK_IMPORTED_MODULE_0__.default.world.serialize = serialize;
capture.serialize = serialize;
_internal_utils_js__WEBPACK_IMPORTED_MODULE_0__.default.world.slog = slog;
capture.slog = slog;

})();

/******/ })()
;
  /// END of modified main.js


  return capture[functionName](arg, opts);
}

async function callStjFunctionWrapped(functionName, arg, opts) {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  let result = await chrome.scripting.executeScript({
    target: {tabId: tab.id},
    world: "MAIN",
    function: callStjFunction,
    args: [functionName, arg, opts],
  });
  return result[0].result;
}

function updateSets() {
  if (stjState.contentBefore) {
    contentBeforeSet = new Set(stjState.contentBefore.split('\n'))
  }
  if (stjState.contentAfter) {
    contentAfterSet = new Set(stjState.contentAfter.split('\n'))
  }
  if (stjState.contentUnchanged) {
    contentUnchangedSet = new Set(stjState.contentUnchanged.split('\n'))
  }
}

// onunhandledrejection should never be triggered. I prefer to manage rejections explicitly.
// window.onunhandledrejection = (e)=>{console.log("onunhandledrejection", e)}
// window.onerror = (e)=>{console.log("onerror", e)}

const init = (async () => {
  // const tmp = JSON.parse(localStorage.getItem('stjState'))
  const tmp = await indexedDbStorage.getItem('stjState')

  if (tmp) {
    // For debugging: localStorage.removeItem('stjState')
    stjState = tmp
    updateSets()
  } else {
    // Keep the folowing blob in sync with the content of save()
    stjState.searchTextValue = searchText.value
    stjState.selectedTab = document.querySelector('[aria-selected="true"]').id
  }
  // window.onunload = save // in standard chrome
  window.onblur = save


  asyncButtonClick(searchButton, async () => {
    resultElement.innerText = "Loading...";
    const result = await callStjFunctionWrapped("search", searchText.value, {returnValue: true})
    console.log(result);
    if (result.length) {
      resultElement.innerHTML = result.map(str => `<tr><th>${str}</th></tr>`).join("\n");
    } else {
      resultElement.innerText = "nothing found";
    }
  });

  updateChangeSearch();

  asyncButtonClick(btnBefore, async () => {
    stjState.contentBefore = await callStjFunctionWrapped("serialize",
      "magic value that will resort to globalThis object",
      {fullPaths: true, ignoreFunction: true,})
    contentBeforeSet = new Set(stjState.contentBefore.split('\n'))
    updateChangeSearch()
    await save()
  });
  asyncButtonClick(btnAfter, async () => {
    stjState.contentAfter = await callStjFunctionWrapped("serialize",
      "magic value that will resort to globalThis object",
      {fullPaths: true, ignoreFunction: true,})
    contentAfterSet = new Set(stjState.contentAfter.split('\n'))
    updateChangeSearch()
    await save()
  });
  asyncButtonClick(btnUnchanged, async () => {
    stjState.contentUnchanged = await callStjFunctionWrapped("serialize",
      "magic value that will resort to globalThis object",
      {fullPaths: true, ignoreFunction: true,})
    contentUnchangedSet = new Set(stjState.contentUnchanged.split('\n'))
    updateChangeSearch()
    await save()
  });
  asyncButtonClick(btnClear, async () => {
    stjState.contentBefore = null
    stjState.contentAfter = null
    stjState.contentUnchanged = null
    updateSets()
    updateChangeSearch();
  });


  async function save() { // in popup
    // Could give:
    // "DOMException: Failed to execute 'setItem' on 'Storage': Setting the value of 'stjState' exceeded the quota."
    stjState.searchTextValue = searchText.value;
    stjState.selectedTab = document.querySelector('[aria-selected="true"]').id

    // localStorage.setItem('stjState', JSON.stringify(stjState));

    // IndexedDB is a strange thing.
    indexedDbStorage.setItem("stjState", stjState)

    // Async is a bit harder to work with, this API is less standard and needs "storage" permission:
    // chrome.storage.sync.set("searchTextValue", searchText.value);
  }

  document.getElementById(stjState.selectedTab).click()
  searchText.value = stjState.searchTextValue
  searchText.focus();
  searchText.select();
  searchText.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      searchButton.click();
    }
  });

});
init().catch((e) => {
  console.error(e);
  window.alert(e);
})
