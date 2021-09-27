/*
 * @copyright 2016- commenthol
 * @license MIT
 */

'use strict'

// dependencies
const utils = require('./internal/utils')
const Ref = require('./internal/reference')

/**
 * serializes an object to javascript
 *
 * @example <caption>serializing regex, date, buffer, ...</caption>
 * const serialize = require('serialize-to-js')
 * const obj = {
 *   str: '<script>var a = 0 > 1</script>',
 *   num: 3.1415,
 *   bool: true,
 *   nil: null,
 *   undef: undefined,
 *   obj: { foo: 'bar' },
 *   arr: [1, '2'],
 *   regexp: /^test?$/,
 *   date: new Date(),
 *   buffer: new Buffer('data'),
 *   set: new Set([1, 2, 3]),
 *   map: new Map([['a': 1],['b': 2]])
 * }
 * console.log(serialize(obj))
 * //> '{str: "\u003Cscript\u003Evar a = 0 \u003E 1\u003C\u002Fscript\u003E",
 * //>   num: 3.1415, bool: true, nil: null, undef: undefined,
 * //>   obj: {foo: "bar"}, arr: [1, "2"], regexp: new RegExp("^test?$", ""),
 * //>   date: new Date("2019-12-29T10:37:36.613Z"),
 * //>   buffer: Buffer.from("ZGF0YQ==", "base64"), set: new Set([1, 2, 3]),
 * //>   map: new Map([["a", 1], ["b", 2]])}'
 *
 * @example <caption>serializing while respecting references</caption>
 * const serialize = require('serialize-to-js')
 * const obj = { object: { regexp: /^test?$/ } };
 * obj.reference = obj.object;
 * const opts = { reference: true };
 * console.log(serialize(obj, opts));
 * //> {object: {regexp: /^test?$/}}
 * console.log(opts.references);
 * //> [ [ '.reference', '.object' ] ]
 *
 * @param {Object|Array|Function|*} source - source to serialize
 * @param {?Object} [opts] - options
 * @param {Boolean} opts.ignoreCircular - ignore circular objects
 * @param {Boolean} opts.reference - reference instead of a copy (requires post-processing of opts.references)
 * @param {Boolean} opts.unsafe - do not escape chars `<>/`
 * @return {String} serialized representation of `source`
 */
function serialize(src, opts = null) {
  opts = opts || {}

  const visitedRefs = new Map()
  const setOrig = visitedRefs.set
  visitedRefs.set = function (key, val) {
    if (this.has(key)) {
      throw Error(`this object was already visited! old:${this.get(key)} new: ${breadcrumbs.join('')}`)
    }
    setOrig.call(this, key, val)
  }

  let breadcrumbs = null
  let codeBefore = ""
  let objCounter = 0
  let codeAfter = ""
  let absorbPhase = true

  function stringify(source, indent = 2) {
    if (absorbPhase && source === src) {
      return
    }
    try {
      // if (utils.isProxy(source) === true) {
      //   return `undefined /* Proxy not supported*/`
      // }
      const type = utils.toType(source)

      // https://levelup.gitconnected.com/pass-by-value-vs-pass-by-reference-in-javascript-31e79afe850a
      // TODO: consider almost everything 'object'. Search for Array, Error, Date, ... in proto
      // TODO: learn about proto
      // TODO: Check if capturing local scope is possible. Maybe isolate a function call, and generate minimal code to reproduce the function call
      // Could make it more user friendly by only using late linking when needed.
      switch (type) {
        case 'Null':
          return 'null'
        case 'String':
          return utils.quote(source, opts) || '""'
        case 'AsyncFunction': // TODO: Test
        case 'Function': {
          visitedRefs.set(source, breadcrumbs.join(''))
          if (opts.ignoreFunctions === true) {
            return `undefined /* ignoreFunctions */`
          }
          let tmp = source.toString()
          tmp = opts.unsafe ? tmp : utils.saferFunctionString(tmp, opts)
          tmp = tmp.replace('[native code]', '/*[native code] Avoid this by allowing to link to globalThis object*/')
          // append function to es6 function within obj
          return /^\s*((async)?\s?function|\(?[^)]*?\)?\s*=>)/m.test(tmp) ? tmp : 'function ' + tmp
        }
        case 'RegExp':
          visitedRefs.set(source, breadcrumbs.join(''))
          return `new RegExp(${utils.quote(source.source, opts)}, "${source.flags}")`
        case 'Date':
          visitedRefs.set(source, breadcrumbs.join(''))
          if (utils.isInvalidDate(source)) return 'new Date("Invalid Date")'
          return `new Date(${utils.quote(source.toJSON(), opts)})`
        case 'Error':
          visitedRefs.set(source, breadcrumbs.join(''))
          return `new Error(${utils.quote(source.message, opts)})`
        case 'Buffer':
          visitedRefs.set(source, breadcrumbs.join(''))
          return `Buffer.from("${source.toString('base64')}", "base64")`
        case 'Array': {
          visitedRefs.set(source, breadcrumbs.join(''))
          const tmp = []
          let counter = 0
          let mutationsFromNowOn = false
          for (const key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
              if (Object.getOwnPropertyDescriptor(source, key).get) {
                tmp.push(`${"  ".repeat(indent)}undefined /* Getters not supported*/`) // They could be statefull. try-catch might be not enough
              } else {
                if (Ref.isSafeKey(key)) {
                  breadcrumbs.push(`.${key}`)
                } else {
                  breadcrumbs.push(`[${utils.quote(key, opts)}]`)
                }
                if (visitedRefs.has(source[key]) || mutationsFromNowOn || String(counter) !== String(key)) {
                  if (visitedRefs.has(source[key])) {
                    tmp.push(`${"  ".repeat(indent)}undefined /* Linked later*/`)
                    codeAfter += `  ${breadcrumbs.join('')} = ${visitedRefs.get(source[key])};\n`
                  } else {
                    // TODO: keep adding undefined for later elements that are still on the good count.
                    codeAfter += `  ${breadcrumbs.join('')} = ${stringify(source[key], indent + 1)};\n`
                  }
                  mutationsFromNowOn = true
                } else {
                  tmp.push(`${"  ".repeat(indent)}${stringify(source[key], indent + 1)}`)
                }
                breadcrumbs.pop()
              }
              counter += 1
            }
          }
          return `[\n${tmp.join(',\n')}\n${"  ".repeat(indent - 1)}]`
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
          visitedRefs.set(source, breadcrumbs.join(''))
          const tmp = []
          for (let i = 0; i < source.length; i++) {
            tmp.push(source[i])
          }
          return `new ${type}([${tmp.join(', ')}])`
        }
        case 'Set': {
          // Adding cyclic references can be added after everything. Even empty initial objects would be fine

          visitedRefs.set(source, breadcrumbs.join(''))
          const tmp = []
          let mutationsFromNowOn = false
          Array.from(source).forEach(item => {
            let safeItem
            if (visitedRefs.has(item)) {
              safeItem = visitedRefs.get(item)
              mutationsFromNowOn = true
            } else if (utils.isObject(item)) {
              objCounter += 1
              safeItem = "obj" + objCounter
              const breadcrumbsOrig = breadcrumbs
              breadcrumbs = [safeItem]
              codeBefore += `  const ${safeItem} = ${stringify(item)};\n`
              breadcrumbs = breadcrumbsOrig
            } else {
              safeItem = stringify(item, indent + 1)
            }
            if (mutationsFromNowOn) {
              codeAfter += `  ${breadcrumbs.join('')}.add(${safeItem});\n`
            } else {
              tmp.push("  ".repeat(indent) + safeItem)
            }
          })

          // Dirty object properties:
          for (const key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
              if (Object.getOwnPropertyDescriptor(source, key).get) {
                tmp.push(`${"  ".repeat(indent) + Ref.wrapkey(key, opts)}: undefined /* Getters not supported*/`) // They could be statefull. try-catch might be not enough
              } else {
                if (Ref.isSafeKey(key)) {
                  breadcrumbs.push(`.${key}`)
                } else {
                  breadcrumbs.push(`[${utils.quote(key, opts)}]`)
                }
                if (visitedRefs.has(source[key])) {
                  codeAfter += `  ${breadcrumbs.join('')} = ${visitedRefs.get(source[key])};\n`
                } else {
                  codeAfter += `  ${breadcrumbs.join('')} = ${stringify(source[key], indent + 1)};\n`
                }
                breadcrumbs.pop()
              }
            }
          }
          return `new ${type}([\n${tmp.join(',\n')}\n${"  ".repeat(indent - 1)}])`
        }
        case 'Map': {
          visitedRefs.set(source, breadcrumbs.join(''))
          const tmp = []
          let mutationsFromNowOn = false
          for (const [mapKey, mapValue] of source.entries()) {
            let safeKey
            if (visitedRefs.has(mapKey)) {
              safeKey = visitedRefs.get(mapKey)
            } else if (utils.isObject(mapKey)) {
              objCounter += 1
              safeKey = "obj" + objCounter
              const breadcrumbsOrig = breadcrumbs
              breadcrumbs = [safeKey]
              codeBefore += `  const ${safeKey} = ${stringify(mapKey)};\n`
              breadcrumbs = breadcrumbsOrig
            } else {
              safeKey = stringify(mapKey, indent + 1)
            }

            const thisBreadcrumb = breadcrumbs.join('')
            breadcrumbs.push(`.get(${safeKey})`)
            if (visitedRefs.has(mapKey) || visitedRefs.has(mapValue) || mutationsFromNowOn) {
              mutationsFromNowOn = true

              if (visitedRefs.has(mapValue)) {
                tmp.push(`${"  ".repeat(indent)}[${safeKey}, undefined /* Linked later*/]`)
                codeAfter += `  ${thisBreadcrumb}.set(${safeKey}, ${visitedRefs.get(mapValue)});\n`
              } else {
                codeAfter += `  ${thisBreadcrumb}.set(${safeKey}, ${stringify(mapValue, indent + 1)});\n`
              }
            } else {
              tmp.push("  ".repeat(indent) + `[${safeKey}, ${stringify(mapValue, indent + 1)}]`)
            }
            breadcrumbs.pop()
          }

          // Dirty object properties:
          for (const key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
              if (Object.getOwnPropertyDescriptor(source, key).get) {
                tmp.push(`${"  ".repeat(indent) + Ref.wrapkey(key, opts)}: undefined /* Getters not supported*/`) // They could be statefull. try-catch might be not enough
              } else {
                if (Ref.isSafeKey(key)) {
                  breadcrumbs.push(`.${key}`)
                } else {
                  breadcrumbs.push(`[${utils.quote(key, opts)}]`)
                }
                if (visitedRefs.has(source[key])) {
                  codeAfter += `  ${breadcrumbs.join('')} = ${visitedRefs.get(source[key])};\n`
                } else {
                  codeAfter += `  ${breadcrumbs.join('')} = ${stringify(source[key], indent + 1)};\n`
                }
                breadcrumbs.pop()
              }
            }
          }
          return `new ${type}([\n${tmp.join(',\n')}\n${"  ".repeat(indent - 1)}])`
        }
        case 'Window':
        case 'global':
        case 'Object': {
          visitedRefs.set(source, breadcrumbs.join(''))
          // TODO: Figure out how prototype works. For example, vtkActor logs many non-instance-specific functions..
          // TODO: When serialising 'window.store' in complex page, some vue components fail:
          // root._vm._renderProxy._watchers["0"].deps["0"].subs["2"] = root._vm._renderProxy._watchers["0"].deps["0"].subs["0"].deps["1"].subs["1"].deps["2"].subs["1"]
          // TypeError: Cannot read property 'deps' of undefined
          const tmp = []
          for (const key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
              if (Object.getOwnPropertyDescriptor(source, key).get) {
                tmp.push(`${"  ".repeat(indent) + Ref.wrapkey(key, opts)}: undefined /* Getters not supported*/`) // They could be statefull. try-catch might be not enough
              } else {
                if (Ref.isSafeKey(key)) {
                  breadcrumbs.push(`.${key}`)
                } else {
                  breadcrumbs.push(`[${utils.quote(key, opts)}]`)
                }
                try {
                  if (visitedRefs.has(source[key])) {
                    tmp.push(`${"  ".repeat(indent) + Ref.wrapkey(key, opts)}: undefined /* Linked later*/`)
                    codeAfter += `  ${breadcrumbs.join('')} = ${visitedRefs.get(source[key])};\n`
                  } else {
                    tmp.push(`${"  ".repeat(indent) + Ref.wrapkey(key, opts)}: ${stringify(source[key], indent + 1)}`)
                  }
                } catch (error) {
                  tmp.push(`${"  ".repeat(indent) + Ref.wrapkey(key, opts)}:${errorToValue(error)}`)
                }
                breadcrumbs.pop()
              }
            }
          }
          return `{\n${tmp.join(',\n')}\n${"  ".repeat(indent - 1)}}`
        }
        case 'Undefined':
        case 'Boolean':
        case 'Number':
          return '' + source
        case 'Symbol':
          // TODO: Test
          visitedRefs.set(source, breadcrumbs.join(''))
          const str = String(visitedRefs)
          const symbolName = str.substring(7, str.length - 1)
          return `Symbol(${utils.quote(symbolName, opts)}) /*TODO: Test!*/`
        default: {
          // One can find many exotic object types by running: console.log(serialize(window))
          console.warn(`Unknown type: ${type} source: ${source}`)
          // throw Error('Unknown type: ' + type)
          return `undefined /* not supported: ${source}*/`
        }
      }
    } catch (error) {
      if (visitedRefs.delete(source)) {
        console.warn('Dirty error.')
      }
      return errorToValue(error)
    }
  }

  function errorToValue(error) {
    let message = error.message
    if (message.indexOf('\n') !== -1) {
      message = error.message.substring(0, error.message.indexOf('\\n'))
    }
    return `undefined /* Error: ${message}. Breadcrumb: ${breadcrumbs.join('')} */`
  }

  // First absorb all objects to link to
  if (opts.objectsToLinkTo) {
    for (const key in opts.objectsToLinkTo) {
      if (Object.prototype.hasOwnProperty.call(opts.objectsToLinkTo, key)) {
        breadcrumbs = [key]
        stringify(opts.objectsToLinkTo[key])
      }
    }
  }

  // Now reset, and go over the real object
  // console.log('visitedRefs', visitedRefs)
  codeBefore = ""
  objCounter = 0
  codeAfter = ""
  breadcrumbs = ['root']
  absorbPhase = false

  const codeMiddle = stringify(src, 2)
  return `(function(){
${codeBefore}
  const root = ${codeMiddle};
${codeAfter}
  return root;
})()`
}

function slog(...args) {
  console.log(serialize(...args))
}

module.exports = {
  serialize,
  slog,
}

if (typeof window !== "undefined") {
  window.serialize = serialize
  window.slog = slog
  window.utils = utils
}
