'use strict'

import utils from './internal/utils.js'
import Ref from './internal/reference.js'

/**
 * Figuratively search a needle in the haystack.
 * Breath first traversal to have the smallest possible paths:
 * https://en.wikipedia.org/wiki/Breadth-first_search#Pseudocode
 * @param {*} needle
 * @param {*} opts
 */
export function search(needle, opts = null) {
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
        if (propDesc.get && !(utils.isSimpleGetter(propDesc.get) || (propDesc.get + '').indexOf(' [native code]') !== -1)) {
          continue
        }
        if (utils.isArgumentsObject(source) && key === "callee") {
          // Avoid error with Google Analytics object:
          // "TypeError: 'caller', 'callee', and 'arguments' properties may not be accessed on strict mode functions or the arguments objects for calls to them"
          continue
        }
        let access = Ref.isSafeKey(key) ? `.${key}` : `[${utils.quote(key, opts)}]`;
        let child = source[key]
        if (typeof child == "function" && utils.isSimpleGetter(child)) {
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
            && (utils.isSimpleGetter(child.toString) || (child.toString + '').indexOf(' [native code]') !== -1)
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

export default {
  search,
}

// store globally:
utils.world.search = search
