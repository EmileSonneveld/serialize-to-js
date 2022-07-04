/* eslint no-new-func: off */
'use strict'

const assert = require('assert')
const src = require('../src')
const {search} = require('../src/search')
const {expect} = require("chai");
const {createReadStream} = require("fs");
const path = require("path");
const utils = require("../src/internal/utils");
const serialize = src.serialize


// A naive globalThis shim.
const getGlobalThis = () => {
  if (typeof globalThis !== 'undefined') return globalThis;
  if (typeof self !== 'undefined') return self;
  if (typeof window !== 'undefined') return window;
  if (typeof global !== 'undefined') return global;
  if (typeof this !== 'undefined') return this;
  throw new Error('Unable to locate global `this`');
};

// Note: `var` is used instead of `const` to ensure `globalThis`
// becomes a global variable (as opposed to a variable in the
// top-level lexical scope) when running in the global scope.
var world = getGlobalThis();


/**
 * This feels a bit bulky to be used as a quick way to log calls.
 */
function logCall(func, thisArg, argArray) {
  const opts = {
    ignoreFunction: false,
    objectsToLinkTo: {world},
  };

  console.log(serialize(func, opts) + '(' + Array.from(argArray)
    .map(a => serialize(a, opts)) + ')');
}

describe("call test", () => {
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
