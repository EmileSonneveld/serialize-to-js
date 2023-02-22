/* eslint no-new-func: off */
'use strict'

import {serialize} from '../src/index.js';
import {search} from '../src/search.js';
import utils from '../src/internal/utils.js'

const isBrowser = (typeof window !== 'undefined')

if (!isBrowser) {
  // hacky import to work in browser and node
  globalThis["chai"] = (await import('../node_modules/chai/chai.js')).default
}
const assert = chai.assert
const expect = chai.expect

function search2(arg) {
  const arr = search(arg, {returnValue: true})
  console.log(arr)
  return arr;
}

if (typeof globalThis !== 'undefined') {
  // Don't run tests 'search' on older versions of node.

  describe("search test", () => {
    it("should be empty", () => {
      assert.equal(search2("!this sentence should not be found!").length, 0)
    })
    it("find orange", () => {
      globalThis.orangeKey = "orangeValue"
      assert.equal(search2("orangeValue")[0], "globalThis.orangeKey")
      delete globalThis.orangeKey
    })
    it("find fruitBasket>orange", () => {
      globalThis.fruitBasket = {
        orangeKey: "orangeValue"
      }
      assert.equal(search2("orangeValue")[0], "globalThis.fruitBasket.orangeKey")
      delete globalThis.fruitBasket
    })
    it("find fruitBasket>2 oranges", () => {
      globalThis.fruitBasket = {
        orangeKey0: "orangeValue",
        orangeKey1: "orangeValue",
      }
      const result = search2("orangeValue")
      assert.equal(result[0], "globalThis.fruitBasket.orangeKey0")
      assert.equal(result[1], "globalThis.fruitBasket.orangeKey1")
      delete globalThis.fruitBasket
    })
    it("find kitchen>fruitBasket>orange", () => {
      globalThis.kitchen = {
        fruitBasket: {
          orangeKey: "orangeValue"
        }
      }
      assert.equal(search2("orangeValue")[0], "globalThis.kitchen.fruitBasket.orangeKey")
      delete globalThis.kitchen
    })
    it("find fruitBasketRefersToTheSame>orange", () => {
      globalThis.fruitBasket = {
        orangeKey: "orangeValue"
      }
      globalThis.fruitBasketRefersToTheSame = globalThis.fruitBasket
      // TODO: Now the second reference does not get returned. But that is ok I think
      assert.equal(search2("orangeValue"), "globalThis.fruitBasket.orangeKey")
      delete globalThis.fruitBasket
      delete globalThis.fruitBasketRefersToTheSame
    })
    it("find fruitBasket[]>orange", () => {
      globalThis.fruitBasket = [
        "orangeValue",
      ]
      assert.equal(search2("orangeValue")[0], "globalThis.fruitBasket[\"0\"]")
      delete globalThis.fruitBasket
    })
    it("find fruitBasket[(with banana)]>orange", () => {
      globalThis.fruitBasket = [
        "orangeValue",
        "randomBanana",
      ]
      assert.equal(search2("orangeValue")[0], "globalThis.fruitBasket[\"0\"]")
      delete globalThis.fruitBasket
    })
    // TODO: Map
    // it("find fruitMap>orange", () => {
    //     globalThis.fruitMap = new Map([
    //         ['orangeKey', "orangeValue"],
    //     ])
    //     assert.equal(search2("orangeValue"))[0], "globalThis.fruitBasket.get(\"orangeKey\")")
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
      assert.equal(search2("orangeValue")[0], "globalThis.kitchen.basketProperty.orangeKey")
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
      assert.equal(search2("orangeValue")[0], "globalThis.kitchen.basketProperty.orangeKey")
      delete globalThis.kitchen
    })
    it("123 to find '123'", () => {
      globalThis.numbersStr = "123"
      assert.equal(search2(123)[0], "globalThis.numbersStr")
      delete globalThis.numbersStr
    })
    it("'123' to find 123", () => {
      globalThis.numbers = "123"
      assert.equal(search2('123')[0], "globalThis.numbers")
      delete globalThis.numbers
    })
    it("hacked toString", () => {
      globalThis.basket = {}
      // A problem like this was found on httpd://calendar.google.com
      basket.toString = function () {
        throw Error("got you!")
      }
      assert.equal(search2("!this sentence should not be found!").length, 0)
      delete globalThis.basket
    })
    it("simpleFunction", () => {
      globalThis.simpleFunction = function () {
        return "orangeValue"
      }
      assert.equal(search2("orangeValue")[0], "globalThis.simpleFunction()")
      delete globalThis.simpleFunction
    })
    it("simpleFunction returning object", () => {
      globalThis.simpleFunction = function () {
        return {
          orangeKey: "orangeValue"
        }
      }
      assert.equal(search2("orangeValue")[0], "globalThis.simpleFunction().orangeKey")
      delete globalThis.simpleFunction
    })
  })
}
