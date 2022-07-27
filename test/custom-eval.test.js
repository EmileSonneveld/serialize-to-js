/* eslint no-new-func: off */
'use strict'

// npm run test test/custom-eval.test.js

const assert = require('assert')
const src = require('../src')
const {search} = require('../src/search')
const {expect} = require("chai");
const {createReadStream} = require("fs");
const path = require("path");
const {CustomEval} = require("../src/custom-eval");
const serialize = src.serialize

describe("customEval test", () => {
  it("simple math", () => {
    assert.equal(CustomEval("2+3"), 5)
  })
  it("declare and return", () => {
    assert.equal(CustomEval("var test = 4; test;"), 4)
  })
  it("declare and return. const", () => {
    assert.equal(CustomEval("const test = 4; test;"), 4)
  })
  it("declare, change and return", () => {
    assert.equal(CustomEval("var test = 4; test = 5; test;"), 5)
  })
  it("simple math", () => {
    CustomEval("console.log('hello')")
  })
})
