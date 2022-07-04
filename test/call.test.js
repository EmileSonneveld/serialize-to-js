/* eslint no-new-func: off */
'use strict'

const assert = require('assert')
const src = require('../src')
const {search} = require('../src/search')
const {expect} = require("chai");
const {createReadStream} = require("fs");
const path = require("path");
const utils = require("../src/internal/utils");
const world = utils.world
const serialize = src.serialize





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
