/* eslint no-new-func: off */
'use strict'

import {serialize} from '../src/index.js';
import utils from '../src/internal/utils.js'
const world = utils.world

const isBrowser = (typeof window !== 'undefined')

if (!isBrowser) {
  // hacky import to work in browser and node
  globalThis["chai"] = (await import('../node_modules/chai/chai.js')).default
}
const assert = chai.assert
const expect = chai.expect

// Call requires the arguments to be passed in one-by-one, and apply takes the arguments as an array.


/**
 * This feels a bit bulky to be used as a quick way to log calls.
 */
function logCall(func, thisArg, argArray) {
  // console.assert(argArray.callee == null || argArray.callee === func)// not possible in strict mode
  const opts = {
    ignoreFunction: false,
    // objectsToLinkTo: {window},
    objectsToLinkTo: {world},
  };

  console.log(serialize(func, opts) + '(' + Array.from(argArray)
    .map(a => serialize(a, opts)) + ')');
}

describe("call test", () => {
  it("applyLog", () => {
    Function.prototype.applyOrig = Function.prototype.apply
    Function.prototype.apply = function applyLog(that, args) {
      // TODO check arguments length to avoid confusion between call and apply
      // console.assert(arguments.callee === applyLog) // not possible in strict mode
      logCall(this, that, args);
      // this refers to the function that needs to be called
      return this.applyOrig(that, args)
    }
    // Function.prototype.callOrig = Function.prototype.call
    // Function.prototype.call = function callLog(that, ...args) {
    //   return this.apply(that, args)
    // }

    function f() {
      return 5;
    }

    world.f = f

    const numbers = [5, 6, 2, 3, 7];
    f.apply(null, numbers);
    const max = Math.max.apply(null, numbers);
    delete world.f
    Function.prototype.apply = Function.prototype.applyOrig
  })

  it("simple values", () => {
    function call(value1, value2) {
      logCall(call, this, arguments)
      return null
    }

    world.call = call

    call("str", 42)

    delete world.call
  })

  it("object values", () => {
    world.fruitBasket = {
      orangeKey: "orangeValue"
    }

    function call(obj) {
      logCall(call, this, arguments)
      return null
    }

    world.call = call

    call(world.fruitBasket)

    delete world.fruitBasket
    delete world.call
  })
})
