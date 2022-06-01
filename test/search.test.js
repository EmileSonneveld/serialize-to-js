/* eslint no-new-func: off */
'use strict'

const assert = require('assert')
const src = require('../src')
const {search} = require('../src/search')
const {expect} = require("chai");
const {createServer} = require("http");
const {createReadStream} = require("fs");
const path = require("path");
const utils = require("../src/internal/utils");
const serialize = src.serialize

function log(arg) {
  console.log(arg)
  return arg
}

describe("search test", () => {
  it("should be empty", () => {
    assert.equal(log(search("!this sentence should not be found!")).length, 0)
  })
  it("find orange", () => {
    globalThis.orangeKey = "orangeValue"
    assert.equal(log(search("orangeValue"))[0], "globalThis.orangeKey")
    delete globalThis.orangeKey
  })
  it("find fruitBasket>orange", () => {
    globalThis.fruitBasket = {
      orangeKey: "orangeValue"
    }
    assert.equal(log(search("orangeValue"))[0], "globalThis.fruitBasket.orangeKey")
    delete globalThis.fruitBasket
  })
  it("find kitchen>fruitBasket>orange", () => {
    globalThis.kitchen = {
      fruitBasket: {
        orangeKey: "orangeValue"
      }
    }
    assert.equal(log(search("orangeValue"))[0], "globalThis.kitchen.fruitBasket.orangeKey")
    delete globalThis.kitchen
  })
  it("find fruitBasketRefersToTheSame>orange", () => {
    globalThis.fruitBasket = {
      orangeKey: "orangeValue"
    }
    globalThis.fruitBasketRefersToTheSame = globalThis.fruitBasket
    // TODO: Now the second reference does not get returned. But that is ok I think
    assert.equal(log(search("orangeValue")), "globalThis.fruitBasket.orangeKey")
    delete globalThis.fruitBasket
    delete globalThis.fruitBasketRefersToTheSame
  })
  it("find fruitBasket[]>orange", () => {
    globalThis.fruitBasket = [
      "orangeValue",
    ]
    assert.equal(log(search("orangeValue"))[0], "globalThis.fruitBasket[\"0\"]")
    delete globalThis.fruitBasket
  })
  it("find fruitBasket[(with banana)]>orange", () => {
    globalThis.fruitBasket = [
      "orangeValue",
      "randomBanana",
    ]
    assert.equal(log(search("orangeValue"))[0], "globalThis.fruitBasket[\"0\"]")
    delete globalThis.fruitBasket
  })
    // TODO: Map
    // it("find fruitMap>orange", () => {
    //     globalThis.fruitMap = new Map([
    //         ['orangeKey', "orangeValue"],
    //     ])
    //     assert.equal(log(search("orangeValue"))[0], "globalThis.fruitBasket.get(\"orangeKey\")")
    //     delete globalThis.fruitMap
    // })
  it("find kitchen>basketProperty(fresh)>orangeKey>orange", () => {
    globalThis.kitchen = {}
    Object.defineProperty(globalThis.kitchen, 'basketProperty', {
      enumerable: true,
      get: function () {
        return {
          orangeKey: "orangeValue"
        }
      },
    })
    assert.equal(log(search("orangeValue"))[0], "globalThis.kitchen.basketProperty.orangeKey")
    delete globalThis.kitchen
  })
  it("find kitchen>basketProperty(re-use)>orangeKey>orange", () => {
    globalThis.kitchen = {}
    const basket = {
      orangeKey: "orangeValue"
    };
    Object.defineProperty(globalThis.kitchen, 'basketProperty', {
      enumerable: true,
      get: function () {
        return basket
      },
    })
    assert.equal(log(search("orangeValue"))[0], "globalThis.kitchen.basketProperty.orangeKey")
    delete globalThis.kitchen
  })
})


