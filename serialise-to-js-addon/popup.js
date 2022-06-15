"use strict"

const searchButton = document.getElementById("searchButton");
const resultElement = document.getElementById("resultElement");
const searchText = document.getElementById("searchText");
const btnBefore = document.getElementById("btnBefore");
const btnAfter = document.getElementById("btnAfter");
const btnUnchanged = document.getElementById("btnUnchanged");
const resultElementChanged = document.getElementById("resultElementChanged");

window.onblur = function () {
    // IndexedDB is quite bad compared to localStorage.
    localStorage.setItem('searchTextValue', searchText.value);
}
searchText.value = localStorage.getItem('searchTextValue');
searchText.focus();
searchText.select();
searchText.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        searchButton.click();
    }
});

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
        }, 10)
    });
}

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

let contentBefore = null
let contentAfter = null
let contentUnchanged = null

function updateChangeSearch() {
    btnBefore.classList.remove("btn-danger")
    if (!contentBefore) btnBefore.classList.add("btn-danger")
    btnAfter.classList.remove("btn-danger")
    if (!contentAfter) btnAfter.classList.add("btn-danger")
    btnUnchanged.classList.remove("btn-danger")
    if (!contentUnchanged) btnUnchanged.classList.add("btn-danger")

    if (contentBefore == null || contentAfter == null) {
        resultElementChanged.innerText = "Capture before and after to show something";
        return;
    }
    const result = []
    for (const line of contentBefore) {
        // The amount of times a line occurs is not taken into account.
        if (contentAfter.has(line)) {
        } else {
            result.push(line)
        }
    }
    if (result.length === 0) {

        resultElementChanged.innerText = "Nothing to show";
    } else {
        resultElementChanged.innerHTML = result.map(str => `<tr><th>${str}</th></tr>`).join("\n");
    }
}

updateChangeSearch();

asyncButtonClick(btnBefore, async () => {
    const tmp = await callStjFunctionWrapped("serialize",
        "magic value that will resort to globalThis object",
        {fullPaths: true})
    contentBefore = new Set(tmp.split('\n'))
    updateChangeSearch()
});
asyncButtonClick(btnAfter, async () => {
    const tmp = await callStjFunctionWrapped("serialize",
        "magic value that will resort to globalThis object",
        {fullPaths: true})
    contentAfter = new Set(tmp.split('\n'))
    updateChangeSearch()
});
asyncButtonClick(btnUnchanged, async () => {
    const tmp = await callStjFunctionWrapped("serialize",
        "magic value that will resort to globalThis object",
        {fullPaths: true})
    contentUnchanged = new Set(tmp.split('\n'))
    updateChangeSearch()
});


// The body of this function will be execuetd as a content script inside the
// current page
function callStjFunction(functionName, arg, opts) {
    // console.log(...arguments)
    const capture = {};
    // Paste "main.js" content here and adapt:
    // (this is to avid needing 'eval')


    /******/
    (() => { // webpackBootstrap
        /******/
        "use strict";
        /******/
        var __webpack_modules__ = ([
            /* 0 */
            /***/ ((module, __unused_webpack_exports, __webpack_require__) => {

                /*
                 * @copyright 2016- commenthol
                 * @copyright 2021- EmileSonneveld
                 * @license MIT
                 */


                const utils = __webpack_require__(1)
                const Ref = __webpack_require__(2)
                const search = __webpack_require__(3)

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
                        ...opts,
                    }
                    if (typeof opts.space === 'number') {
                        opts.space = ' '.repeat(opts.space)
                    } else if (!opts.space) {
                        opts.space = ''
                    }
                    const newline = opts.space ? "\n" : ""

                    const refs = new Ref([], opts)

                    let objCounter = 0
                    let absorbPhase = true


                    function stringify(source, indent = 2) {
                        let codeBefore = ""
                        let codeMain = ""
                        let codeAfter = ""

                        const type = utils.toType(source)

                        if (absorbPhase && source === src) {
                            if (typeof source === "object") {
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
                                        codeAfter += `  Object.defineProperty(${refs.join()}, ${utils.quote(key, opts)}, {`
                                        if (propDesc.get) {
                                            codeAfter += `get: () => {}, `
                                        }
                                        if (propDesc.set) {
                                            codeAfter += `set: (val) => {}, `
                                        }
                                        codeAfter += `}); /* get/set not supported */\n`
                                    } else {
                                        if (Ref.isSafeKey(key)) {
                                            refs.breadcrumbs.push(`.${key}`)
                                        } else {
                                            refs.breadcrumbs.push(`[${utils.quote(key, opts)}]`)
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
                            //       Determine safty by checking the function content on '=' and "(" and if it starts with "return"
                            // TODO: Check if capturing local scope is possible. Maybe isolate a function call, and generate minimal code to reproduce the function call
                            // Could make it more user friendly by only using late linking when needed.
                            switch (type) {
                                case 'Null':
                                    codeMain += 'null'
                                    break
                                case 'String':
                                    codeMain += utils.quote(source, opts) || '""'
                                    break
                                case 'AsyncFunction':
                                case 'GeneratorFunction':
                                case 'Function': { // TODO: Assign the name of the function (`const someName = ()=>{}` can do that)
                                    refs.markAsVisited(source)
                                    if (opts.ignoreFunction === true) {
                                        codeMain += `undefined /* ignoreFunction */`
                                    } else {
                                        let tmp = source.toString()
                                        tmp = opts.unsafe ? tmp : utils.saferFunctionString(tmp, opts)
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
                                    if (!absorbPhase && opts.evaluateSimpleGetters && utils.isSimpleGetter(source)) {
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
                                    codeMain += `new RegExp(${utils.quote(source.source, opts)}, "${source.flags}")`
                                    break
                                case 'Date':
                                    refs.markAsVisited(source)
                                    if (utils.isInvalidDate(source)) codeMain += 'new Date("Invalid Date")'
                                    else codeMain += `new Date(${utils.quote(source.toJSON(), opts)})`
                                    break
                                case 'Error':
                                    refs.markAsVisited(source)
                                    codeMain += `new Error(${utils.quote(source.message, opts)})`
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
                                                if (Ref.isSafeKey(key)) {
                                                    refs.breadcrumbs.push(`.${key}`)
                                                } else {
                                                    refs.breadcrumbs.push(`[${utils.quote(key, opts)}]`)
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
                                        } else if (utils.isObject(item)) {
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
                                        } else if (utils.isObject(mapKey)) {
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
                                case 'Object': {
                                    refs.markAsVisited(source)
                                    if (!opts.fullPaths) {
                                        const tmp = []
                                        for (const key in source) {
                                            if (Object.prototype.hasOwnProperty.call(source, key)) {
                                                if (Object.getOwnPropertyDescriptor(source, key).get) {
                                                    tmp.push(`${opts.space.repeat(indent) + Ref.wrapkey(key, opts)}: undefined /* Getters not supported*/`) // They could be statefull. try-catch might be not enough
                                                } else if (Object.getOwnPropertyDescriptor(source, key).set) {
                                                    tmp.push(`${opts.space.repeat(indent) + Ref.wrapkey(key, opts)}: undefined /* Setters not supported*/`) // They could be statefull. try-catch might be not enough
                                                } else {
                                                    if (Ref.isSafeKey(key)) {
                                                        refs.breadcrumbs.push(`.${key}`)
                                                    } else {
                                                        refs.breadcrumbs.push(`[${utils.quote(key, opts)}]`)
                                                    }
                                                    if (refs.isVisited(source[key])) {
                                                        tmp.push(`${opts.space.repeat(indent) + Ref.wrapkey(key, opts)}: undefined /* Linked later*/`)
                                                        codeAfter += `  ${refs.join()} = ${refs.getStatementForObject(source[key])};\n`
                                                    } else {
                                                        const ret = stringify(source[key], indent + 1)
                                                        codeBefore += ret.codeBefore
                                                        tmp.push(`${opts.space.repeat(indent) + Ref.wrapkey(key, opts)}:${ret.codeMain}`)
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
                                    codeMain += `new URL(${utils.quote(source.toString(), opts)})`
                                    break
                                case 'BigInt':
                                    codeMain += `BigInt(${utils.quote(source.toString(), opts)})`
                                    break
                                case 'Symbol':
                                    refs.markAsVisited(source)
                                    const str = String(source)
                                    const symbolName = str.substring(7, str.length - 1)
                                    // Symbol can not have dirty props
                                    codeMain += `Symbol(${utils.quote(symbolName, opts)})`
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
                    opts = {
                        ignoreFunction: true,
                        ...opts,
                    }
                    console.log(serialize(src, opts))
                }

                module.exports = {
                    serialize,
                    slog,
                }
// store globally:
                capture.serialize = serialize
                capture.slog = slog


                /***/
            }),
            /* 1 */
            /***/ ((module) => {


                const UNSAFE_CHARS_REGEXP = /[<>\u2028\u2029/\\\r\n\t"]/g
                const CHARS_REGEXP = /[\\\r\n\t"]/g

                const UNICODE_CHARS = {
                    '"': '\\"',
                    '\n': '\\n',
                    '\r': '\\r',
                    '\t': '\\t',
                    '\\': '\\u005C', // needed to pass index.test.js
                    // '\\': '\\\\', // Needed to pass serialise-javascript tests.
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
                    return globalThis.Buffer && arg instanceof Buffer
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
                        return false
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


                /***/
            }),
            /* 2 */
            /***/ ((module, __unused_webpack_exports, __webpack_require__) => {

                /*
                 * @copyright 2015- commenthol
                 * @license MIT
                 */


                const utils = __webpack_require__(1)

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
                    return (opts.alwaysQuote === false && Ref.isSafeKey(key)) ? key : utils.quote(key, opts)
                }

                Ref.prototype = {
                    markAsVisited(source) {
                        this.visitedRefs.set(source, this.join())
                    },

                    unmarkVisited(object) {
                        return this.visitedRefs.delete(object)
                    },

                    isVisited(value) {
                        return this.visitedRefs.has(value)
                    },

                    getStatementForObject(object) {
                        if (!this.isVisited(object)) {
                            throw Error("Object should be visited first")
                        }
                        return this.visitedRefs.get(object)
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

                module.exports = Ref


                /***/
            }),
            /* 3 */
            /***/ ((module, __unused_webpack_exports, __webpack_require__) => {


                const utils = __webpack_require__(1)
                const Ref = __webpack_require__(2)
                const {slog} = __webpack_require__(0)

                /**
                 * Figuratly search a needle in the haystack.
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
                    visitedRefs.set(opts.root, {parent: null, acces: 'globalThis'})
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
                            if (Object.prototype.hasOwnProperty.call(descs, key)) {
                                const propDesc = descs[key]
                                if (propDesc.get && !(utils.isSimpleGetter(propDesc.get) || (propDesc.get + '').indexOf(' [native code] ') !== -1)) {
                                    continue
                                }
                                let acces = Ref.isSafeKey(key) ? `.${key}` : `[${utils.quote(key, opts)}]`;
                                let child = source[key]
                                if (typeof child == "function" && utils.isSimpleGetter(child)) {
                                    visitedRefs.set(child, {parent: source, acces})
                                    acces = "()";
                                    source = child;
                                    child = child(); // specify 'this'?
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
                                        && (utils.isSimpleGetter(child.toString) || (child.toString + '').indexOf(' [native code] ') !== -1)
                                        && !(child.length === 1) // avoid '(['a'] == 'a')===true' weirdness
                                        && child == needle // sloppy compare can be handyfor '5'==5
                                    )
                                ) {
                                    let el = visitedRefs.get(source)
                                    let breadcrumbs = acces;
                                    while (true) {
                                        breadcrumbs = el.acces + breadcrumbs
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
                                    visitedRefs.set(child, {parent: source, acces})
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

                module.exports = {
                    search,
                }

// store globally:
                capture.search = search


                /***/
            })
            /******/]);
        /************************************************************************/
        /******/ 	// The module cache
        /******/
        var __webpack_module_cache__ = {};
        /******/
        /******/ 	// The require function
        /******/
        function __webpack_require__(moduleId) {
            /******/ 		// Check if module is in cache
            /******/
            var cachedModule = __webpack_module_cache__[moduleId];
            /******/
            if (cachedModule !== undefined) {
                /******/
                return cachedModule.exports;
                /******/
            }
            /******/ 		// Create a new module (and put it into the cache)
            /******/
            var module = __webpack_module_cache__[moduleId] = {
                /******/ 			// no module.id needed
                /******/ 			// no module.loaded needed
                /******/            exports: {}
                /******/
            };
            /******/
            /******/ 		// Execute the module function
            /******/
            __webpack_modules__[moduleId](module, module.exports, __webpack_require__);
            /******/
            /******/ 		// Return the exports of the module
            /******/
            return module.exports;
            /******/
        }

        /******/
        /************************************************************************/
        /******/
        /******/ 	// startup
        /******/ 	// Load entry module and return exports
        /******/ 	// This entry module is referenced by other modules so it can't be inlined
        /******/
        var __webpack_exports__ = __webpack_require__(0);
        /******/
        /******/
    })()
    ;


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