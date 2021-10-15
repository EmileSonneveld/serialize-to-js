/*
 * @copyright 2015- commenthol
 * @license MIT
 */

'use strict'

const utils = require('./utils')

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

  // https://www.measurethat.net/Benchmarks/ShowResult/224868
  this.visitedRefs = new Map()
  const setOrig = this.visitedRefs.set
  this.visitedRefs.set = function (key, val) {
    if (this.has(key)) {
      throw Error(`this object was already visited! old:${this.get(key)} new: ${breadcrumbs.join('')}`)
    }
    setOrig.call(this, key, val)
  }

  this.breadcrumbs = null
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
  return Ref.isSafeKey(key) ? key : utils.quote(key, opts)
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
