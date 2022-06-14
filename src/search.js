'use strict'

const utils = require('./internal/utils')
const Ref = require('./internal/reference')
const {slog} = require('./index')

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
    ...opts,
  }
  const results = [];

  const visitedRefs = new Map()
  visitedRefs.set(globalThis, {parent: null, acces: 'globalThis'})
  const queue = []
  queue.push(globalThis)

  while (queue.length > 0) {
    const source = queue.shift() // same as dequeue
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
        if (propDesc.get && !utils.isSimpleGetter(propDesc.get)) {
          continue
        }
        const acces = Ref.isSafeKey(key) ? `.${key}` : `[${utils.quote(key, opts)}]`;
        const child = source[key]

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
  if(opts.returnValue) {
    return results
  }

  // Easy to copy/paste from console:
  console.log(results.join("\n"))
}

module.exports = {
  search,
}

// store globally:
globalThis.search = search
