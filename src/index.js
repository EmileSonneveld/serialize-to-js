/*
 * @copyright 2016- commenthol
 * @copyright 2021- EmileSonneveld
 * @license MIT
 */

'use strict'

const customEval = require('./custom-eval')
const utils = require('./internal/utils')
const world = utils.world
const Ref = require('./internal/reference')
const search = require('./search')

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

  const refs = new Ref([], opts)

  let objCounter = 0
  let absorbPhase = true


  function stringify(source, indent = 2) {
    let codeBefore = ""
    let codeMain = ""
    let codeAfter = ""

    const type = utils.toType(source)

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

module.exports = {
  serialize,
  slog,
}
// store globally:
world.serialize = serialize
world.slog = slog
