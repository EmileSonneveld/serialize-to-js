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
  it("console log", () => {
    CustomEval("console.log('hello')")
  })
  it("new Array", () => {
    assert.equal(CustomEval("new Array()").length, 0)
  })
  it("new Array indirect", () => {
    assert.equal(CustomEval("var type = Array; new type()").length, 0)
  })
  it("create object", () => {
    assert.equal(CustomEval("var obj = {key: 'value'}; obj").key, 'value')
  })
  it("set object property", () => {
    assert.equal(CustomEval("let obj = {key1: {key2: 4}}; obj.key1.key2 = 5; obj").key1.key2, 5)
  })
  it("example from readme", () => {
    const obj = CustomEval(`
const reusedObject = { key: 'value' }
reusedObject.cyclicSelf = reusedObject
const obj = {
  str: 'hello world!',
  num: 3.1415,
  bool: true,
  nil: null,
  undef: undefined,
  obj: { foo: 'bar', reusedObject },
  arr: [1, '2', reusedObject],
  regexp: /^test?$/,
  date: new Date(),
  buffer: new Uint8Array([1, 2, 3]),
  set: new Set([1, 2, 3]),
  map: new Map([['a', 1], ['b', reusedObject]])
}
obj
`);
    assert.equal(obj.str, 'hello world!');
  })
  //it("define and call function", () => {
  //  assert.equal(CustomEval("let f = function(){return 5}; f();"), 5)
  //})
})
