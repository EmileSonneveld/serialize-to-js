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
    ...opts,
  }
  const results = [];

  const visitedRefs = new Map()
  visitedRefs.set(globalThis, {parent: null, acces: 'globalThis'})
  const queue = []
  queue.push(globalThis)

  while (queue.length > 0) {
    const source = queue.shift() // same as dequeue
    try{
    if(source.toString == null){
      // Avoid "TypeError: Cannot convert object to primitive value"
      continue
    }
    }catch(e){
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

        try{
          // noinspection BadExpressionStatementJS
          child.toString == null
        }catch(e){
          // Probably: DOMException: Blocked a frame with origin "https://..." from accessing a cross-origin frame.
          continue
        }
        if (child === needle ||
            (child
                && child.toString // avoid "TypeError: Cannot convert object to primitive value"
                && (!child.length === 1)) // avoid '(['a'] == 'a')===true' weirdness
                && child == needle // sloppy compare can be handy
        ) { // todo, sloppy equals
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
          continue; // TODO: remove to get multiple paths to same object?
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
  return results;
}

module.exports = {
  search,
}

if (typeof window !== "undefined") {
  window.search = search
}