/* eslint no-new-func: off */
'use strict'

// npm run test test/custom-eval.test.js

import {serialize} from '../src/index.js';
import {CustomEval} from '../src/custom-eval.js'
import utils from '../src/internal/utils.js'

const isBrowser = (typeof window !== 'undefined')

if (!isBrowser) {
  // hacky import to work in browser and node
  globalThis["chai"] = (await import('../node_modules/chai/chai.js')).default
  globalThis["acorn"] = (await import('../node_modules/acorn/dist/acorn.js')).default
}
const assert = chai.assert
const expect = chai.expect


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
  it("ignore comments", () => {
    // Comments are not even returned by acorn. How it should be.
    assert.equal(CustomEval("/*comment*/ 5 // more comment"), 5)
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
  it("Do not allow to modify objects outside of the interpreter", () => {
    expect(() => CustomEval("console.log = 5")).to.throw();
    expect(() => CustomEval("console = 5")).to.throw();
  })
  it("Ref to global variable within interpreter", () => {
    assert.equal(CustomEval("const obj = {}; obj.ref = console; obj.ref.log"), console.log);
    expect(() => CustomEval("const obj = {}; obj.ref = console; obj.ref.log = 5")).to.throw();
  })
  it("blend pure and non-pure", () => {
    assert.equal(CustomEval("const arr = new Array({}, console); arr").length, 2);
    expect(() => CustomEval("const arr = new Array({}, console); arr[1].log = 5")).to.throw();
    assert.equal(CustomEval("const arr = new Array({}, console); arr[0].val = 5; arr")[0].val, 5);
  })
  it("Not on the white list", () => {
    expect(() => CustomEval("new XMLHttpRequest()")).to.throw();
  })
  it("define function", () => {
    // interpreter can not return a function that was constructed from a string.
    // It can return an already existing function tough.
    CustomEval("let f = function(){return 5};")
  })
  it("define and call function", () => {
    assert.equal(CustomEval("let f = function(){return 5}; f();"), 5)
  })
  it("define and call double return function", () => {
    assert.equal(CustomEval("let f = function(){return 5; return 7}; f();"), 5)
  })
  it("define and call function using var", () => {
    assert.equal(CustomEval("let a = 5; let f = function(){return a}; f();"), 5)
  })
  it("define and call function. Reused variable name", () => {
    assert.equal(CustomEval("let a = 5; let f = function(){let a = 6; return a}; f();"), 6)
    assert.equal(CustomEval("let a = 5; let f = function(){let a = 6; return a}; f(); a"), 5)
    assert.equal(CustomEval("let a = 5; let f = function(){let a = 6; let f = function(){let a = 7; return a}; return f()}; f();"), 7)
    assert.equal(CustomEval("let a = 5; let f = function(){let a = 6; let f = function(){let a = 7; return a}; return f()}; f(); a"), 5)
  })
  it("define and call function using var", () => {
    assert.equal(CustomEval("let a = 5; let f = function(){return a}; f();"), 5)
  })
  it("map", () => {
    assert.equal(CustomEval("let m = new Map([['a',6], ['b',7]]); m").get('a'), 6)
  })
  it("member function", () => {
    assert.equal(CustomEval("let m = new Map([['a',6], ['b',7]]); m.get('a')"), 6)
  })
})
