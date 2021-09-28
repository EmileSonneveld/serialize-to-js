/*
 * @copyright 2016- commenthol
 * @license MIT
 */

'use strict'

const utils = require('./internal/utils')
const Ref = require('./internal/reference')

/**
 * serializes an object to javascript
 *
 * @param {Object|Array|Function|*} src - source to serialize
 * @param {?Object} [opts] - options
 * @param {Boolean} opts.ignoreCircular - ignore circular objects
 * @param {Boolean} opts.reference - reference instead of a copy (requires post-processing of opts.references)
 * @param {Boolean} opts.unsafe - do not escape chars `<>/`
 * @param {Boolean} opts.ignoreFunctions
 * @param {Boolean} opts.objectsToLinkTo
 * @return {String} serialized representation of `source`
 */
function serialize(src, opts = null) {
  opts = opts || {}

  const refs = new Ref([], opts)

  let codeBefore = ""
  let objCounter = 0
  let codeAfter = ""
  let absorbPhase = true

  /**
   * TODO: Fix. Test with indented dirty objects
   */
  function appendDirtyProps(source) {
    const descs = Object.getOwnPropertyDescriptors(source)
    for (const key in descs) {
      if (Object.prototype.hasOwnProperty.call(descs, key)) {
        const propDesc = descs[key]
        if (propDesc.get || propDesc.set) {
          codeAfter += `  Object.defineProperty(${refs.join()}, ${stringify(key)}, {`
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
            const nestedCode = stringify(source[key])
            codeAfter += `  ${refs.join()} = ${nestedCode};\n` // TODO: keep order of properties. Fix cases where 'codeAfter+=' loses information.
          }
          refs.breadcrumbs.pop()
        }
      }
    }
  }

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
      // TODO: Save getters and setters as functions
      //       make it an option to get the value behind getters.
      //       Determine safty by checking the function content on '=' and "(" and if it starts with "return"
      // TODO: Check if capturing local scope is possible. Maybe isolate a function call, and generate minimal code to reproduce the function call
      // Could make it more user friendly by only using late linking when needed.
      switch (type) {
        case 'Null':
          return 'null'
        case 'String':
          return utils.quote(source, opts) || '""'
        case 'AsyncFunction': // TODO: Test
        case 'Function': { // TODO: Assign the name of the function (`const someName = ()=>{}` can do that)
          refs.markAsVisited(source)
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
          refs.markAsVisited(source)
          return `new RegExp(${utils.quote(source.source, opts)}, "${source.flags}")`
        case 'Date':
          refs.markAsVisited(source)
          if (utils.isInvalidDate(source)) return 'new Date("Invalid Date")'
          return `new Date(${utils.quote(source.toJSON(), opts)})`
        case 'Error':
          refs.markAsVisited(source)
          return `new Error(${utils.quote(source.message, opts)})`
        case 'Buffer':
          refs.markAsVisited(source)
          return `Buffer.from("${source.toString('base64')}", "base64")`
        case 'Array': {
          refs.markAsVisited(source)
          const tmp = []
          let counter = 0
          let mutationsFromNowOn = false
          for (const key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
              if (Object.getOwnPropertyDescriptor(source, key).get) {
                tmp.push(`${"  ".repeat(indent)}undefined /* Getters not supported*/`) // They could be statefull. try-catch might be not enough
              } else if (Object.getOwnPropertyDescriptor(source, key).set) {
                tmp.push(`${"  ".repeat(indent)}undefined /* Setters not supported*/`) // They could be statefull. try-catch might be not enough
              } else {
                if (Ref.isSafeKey(key)) {
                  refs.breadcrumbs.push(`.${key}`)
                } else {
                  refs.breadcrumbs.push(`[${utils.quote(key, opts)}]`)
                }
                if (refs.isVisited(source[key]) || mutationsFromNowOn || String(counter) !== String(key)) {
                  if (refs.isVisited(source[key])) {
                    tmp.push(`${"  ".repeat(indent)}undefined /* Linked later*/`)
                    codeAfter += `  ${refs.join()} = ${refs.getStatementForObject(source[key])};\n`
                  } else {
                    // TODO: keep adding undefined for later elements that are still on the good count.
                    codeAfter += `  ${refs.join()} = ${stringify(source[key], indent + 1)};\n`
                  }
                  mutationsFromNowOn = true
                } else {
                  tmp.push(`${"  ".repeat(indent)}${stringify(source[key], indent + 1)}`)
                }
                refs.breadcrumbs.pop()
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
          refs.markAsVisited(source)
          const tmp = []
          for (let i = 0; i < source.length; i++) {
            tmp.push(source[i])
          }

          appendDirtyProps(source)
          return `new ${type}([${tmp.join(', ')}])`
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
              codeBefore += `  const ${safeItem} = ${stringify(item)};\n`
              refs.breadcrumbs = breadcrumbsOrig
            } else {
              safeItem = stringify(item, indent + 1)
            }
            if (mutationsFromNowOn) {
              codeAfter += `  ${refs.join()}.add(${safeItem});\n`
            } else {
              tmp.push("  ".repeat(indent) + safeItem)
            }
          })

          appendDirtyProps(source)

          return `new ${type}([\n${tmp.join(',\n')}\n${"  ".repeat(indent - 1)}])`
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
              const nestedCode = stringify(mapKey)
              codeBefore += `  const ${safeKey} = ${nestedCode};\n`
              refs.breadcrumbs = breadcrumbsOrig
            } else {
              safeKey = stringify(mapKey, indent + 1)
            }

            const thisBreadcrumb = refs.join()
            refs.breadcrumbs.push(`.get(${safeKey})`)
            if (refs.isVisited(mapKey) || refs.isVisited(mapValue) || mutationsFromNowOn) {
              mutationsFromNowOn = true

              if (refs.isVisited(mapValue)) {
                tmp.push(`${"  ".repeat(indent)}[${safeKey}, undefined /* Linked later*/]`)
                codeAfter += `  ${thisBreadcrumb}.set(${safeKey}, ${refs.getStatementForObject(mapValue)});\n`
              } else {
                const nestedCode = stringify(mapValue, indent + 1)
                codeAfter += `  ${thisBreadcrumb}.set(${safeKey}, ${nestedCode});\n`
              }
            } else {
              tmp.push("  ".repeat(indent) + `[${safeKey}, ${stringify(mapValue, indent + 1)}]`)
            }
            refs.breadcrumbs.pop()
          }

          appendDirtyProps(source)

          return `new ${type}([\n${tmp.join(',\n')}\n${"  ".repeat(indent - 1)}])`
        }
        case 'Window':
        case 'global':
        case 'Object': {
          refs.markAsVisited(source)
          // TODO: Figure out how prototype works. For example, vtkActor logs many non-instance-specific functions..
          // TODO: When serialising 'window.store' in complex page, some vue components fail:
          // root._vm._renderProxy._watchers["0"].deps["0"].subs["2"] = root._vm._renderProxy._watchers["0"].deps["0"].subs["0"].deps["1"].subs["1"].deps["2"].subs["1"]
          // TypeError: Cannot read property 'deps' of undefined
          const tmp = []
          if (true) {
            for (const key in source) {
              if (Object.prototype.hasOwnProperty.call(source, key)) {
                if (Object.getOwnPropertyDescriptor(source, key).get) {
                  tmp.push(`${"  ".repeat(indent) + Ref.wrapkey(key, opts)}: undefined /* Getters not supported*/`) // They could be statefull. try-catch might be not enough
                } else if (Object.getOwnPropertyDescriptor(source, key).set) {
                  tmp.push(`${"  ".repeat(indent) + Ref.wrapkey(key, opts)}: undefined /* Setters not supported*/`) // They could be statefull. try-catch might be not enough
                } else {
                  if (Ref.isSafeKey(key)) {
                    refs.breadcrumbs.push(`.${key}`)
                  } else {
                    refs.breadcrumbs.push(`[${utils.quote(key, opts)}]`)
                  }
                  try {
                    if (refs.isVisited(source[key])) {
                      tmp.push(`${"  ".repeat(indent) + Ref.wrapkey(key, opts)}: undefined /* Linked later*/`)
                      codeAfter += `  ${refs.join()} = ${refs.getStatementForObject(source[key])};\n`
                    } else {
                      tmp.push(`${"  ".repeat(indent) + Ref.wrapkey(key, opts)}: ${stringify(source[key], indent + 1)}`)
                    }
                  } catch (error) {
                    tmp.push(`${"  ".repeat(indent) + Ref.wrapkey(key, opts)}:${errorToValue(error)}`)
                  }
                  refs.breadcrumbs.pop()
                }
              }
            }
          } else {
            appendDirtyProps(source) // TODO: Fix order of properties before this is usable.
          }
          return `{\n${tmp.join(',\n')}\n${"  ".repeat(indent - 1)}}`
        }
        case 'Undefined':
        case 'Boolean':
        case 'Number':
          if (Object.is(source, -0)) {
            return '-0' // 0 === -0, so this is probably not important.
          }
          return '' + source
        case 'Symbol':
          refs.markAsVisited(source)
          const str = String(source)
          const symbolName = str.substring(7, str.length - 1)
          // This will never be the same as the original.
          // Can not have dirty props
          return `Symbol(${utils.quote(symbolName, opts)})`
        default: {
          // One can find many exotic object types by running: console.log(serialize(window))
          console.warn(`Unknown type: ${type} source: ${source}`)
          // throw Error('Unknown type: ' + type)
          return `undefined /* not supported: ${source}*/`
        }
      }
    } catch (error) {
      if (refs.unmarkVisited(source)) {
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
    return `undefined /* Error: ${message}. Breadcrumb: ${refs.join()} */`
  }

  // First absorb all objects to link to
  if (opts.objectsToLinkTo) {
    for (const key in opts.objectsToLinkTo) {
      if (Object.prototype.hasOwnProperty.call(opts.objectsToLinkTo, key)) {
        refs.breadcrumbs = [key]
        stringify(opts.objectsToLinkTo[key])
      }
    }
  }

  // Now reset, and go over the real object
  // console.log('visitedRefs', refs.visitedRefs)
  codeBefore = ""
  objCounter = 0
  codeAfter = ""
  refs.breadcrumbs = ['root']
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
