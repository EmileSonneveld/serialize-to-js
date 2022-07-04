/* global describe, it, beforeEach */
/*
Copyright 2014 Yahoo! Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.

    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

    * Neither the name of the Yahoo! Inc. nor the
      names of its contributors may be used to endorse or promote products
      derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL YAHOO! INC. BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
// This test file is adapted from here: https://github.com/yahoo/serialize-javascript/blob/main/test/unit/serialize.js
'use strict';


// temporarily monkeypatch `crypto.randomBytes` so we'll have a
// predictable UID for our tests
let crypto = require('crypto');
let oldRandom = crypto.randomBytes;
crypto.randomBytes = function(len, cb) {
  let buf = Buffer.alloc(len);
  buf.fill(0x00);
  if (cb)
    cb(null, buf);
  return buf;
};

const s = require('../src/index').serialize
const chai = require('chai')
const expect = chai.expect

if (typeof URL === 'undefined') {
  URL = require('url').URL
}

const serialize = function (src, opts = null) {
  opts = {
    space: '',
    alwaysQuote: true,
    evaluateSimpleGetters: false,
    unsafe: true,
    ...opts,
  }
  return s(src,opts)
}

function strip(str) {
  return str.replace(/[\s;]/g, '');
}

crypto.randomBytes = oldRandom;

describe('serialize( obj )', function () {
  it('should be a function', function () {
    expect(serialize).to.be.a('function');
  });

  describe('undefined', function () {
    it('should serialize `undefined` to a string', function () {
      expect(serialize()).to.be.a('string').equal('undefined');
      expect(serialize(undefined)).to.be.a('string').equal('undefined');
    });

    it('should deserialize "undefined" to `undefined`', function () {
      expect(eval(serialize())).to.equal(undefined);
      expect(eval(serialize(undefined))).to.equal(undefined);
    });
  });

  describe('null', function () {
    it('should serialize `null` to a string', function () {
      expect(serialize(null)).to.be.a('string').equal('null');
    });

    it('should deserialize "null" to `null`', function () {
      expect(eval(serialize(null))).to.equal(null);
    });
  });

  describe('JSON', function () {
    let data;

    function JsonEqual(){
      JSON.parse(JSON.stringify(object))
    }

    beforeEach(function () {
      data = {
        str : 'string',
        num : 0,
        obj : {foo: 'foo'},
        arr : [1, 2, 3],
        bool: true,
        nil : null
      };
    });

    it('should serialize JSON to a JSON string', function () {
      expect(serialize(data)).to.equal(JSON.stringify(data));
    });

    it('should deserialize a JSON string to a JSON object', function () {
      expect(JSON.parse(serialize(data))).to.deep.equal(data);
    });

    it('should serialize weird whitespace characters correctly', function () {
      let ws = String.fromCharCode(8232);
      expect(eval(serialize(ws))).to.equal(ws);
    });

    it('should serialize undefined correctly', function () {
      let obj;
      let str = '{"undef":undefined,"nest":{"undef":undefined}}';
      eval('obj = ' + str);
      expect(serialize(obj)).to.equal(str);
    });
  });

  describe('functions', function () {
    it('should serialize annonymous functions', function () {
      let fn = function () {};
      expect(serialize(fn)).to.be.a('string').equal('function () {}');
    });

    it('should deserialize annonymous functions', function () {
      let fn; eval('fn = ' + serialize(function () {}));
      expect(fn).to.be.a('function');
    });

    it('should serialize named functions', function () {
      function fn() {}
      expect(serialize(fn)).to.be.a('string').equal('function fn() {}');
    });

    it('should deserialize named functions', function () {
      let fn; eval('fn = ' + serialize(function fn() {}));
      expect(fn).to.be.a('function');
      expect(fn.name).to.equal('fn');
    });

    it('should serialize functions with arguments', function () {
      function fn(arg1, arg2) {}
      expect(serialize(fn)).to.equal('function fn(arg1, arg2) {}');
    });

    it('should deserialize functions with arguments', function () {
      let fn; eval('fn = ' + serialize(function (arg1, arg2) {}));
      expect(fn).to.be.a('function');
      expect(fn.length).to.equal(2);
    });

    it('should serialize functions with bodies', function () {
      function fn() { return true; }
      expect(serialize(fn)).to.equal('function fn() { return true; }');
    });

    it('should deserialize functions with bodies', function () {
      let fn; eval('fn = ' + serialize(function () { return true; }));
      expect(fn).to.be.a('function');
      expect(fn()).to.equal(true);
    });

    // Is not a problem for serialise-to-js
    // it('should throw a TypeError when serializing native built-ins', function () {
    //     let err;
    //     expect(Number.toString()).to.equal('function Number() { [native code] }');
    //     try { serialize(Number); } catch (e) { err = e; }
    //     expect(err).to.be.an.instanceOf(TypeError);
    // });

    it('should serialize enhanced literal objects', function () {
      let obj = {
        foo() { return true; },
        *bar() { return true; },
      };

      const expected = '{"foo":function foo() { return true; },"bar":function *bar() { return true; }}'
      expect(serialize(obj)).to.equal(expected)
    });

    it('should deserialize enhanced literal objects', function () {
      let obj;
      eval('obj = ' + serialize({ hello() { return true; } }));

      expect(obj.hello()).to.equal(true);
    });

    it('should serialize functions that contain dates', function () {
      function fn(arg1) {return new Date('2016-04-28T22:02:17.156Z')};
      expect(serialize(fn)).to.be.a('string').equal('function fn(arg1) {return new Date(\'2016-04-28T22:02:17.156Z\')}');
    });

    it('should deserialize functions that contain dates', function () {
      let fn; eval('fn = ' + serialize(function () { return new Date('2016-04-28T22:02:17.156Z') }));
      expect(fn).to.be.a('function');
      expect(fn().getTime()).to.equal(new Date('2016-04-28T22:02:17.156Z').getTime());
    });

    it('should serialize functions that return other functions', function () {
      function fn() {return function(arg1) {return arg1 + 5}};
      expect(serialize(fn)).to.be.a('string').equal('function fn() {return function(arg1) {return arg1 + 5}}');
    });

    it('should deserialize functions that return other functions', function () {
      let fn; eval('fn = ' + serialize(function () { return function(arg1) {return arg1 + 5} }));
      expect(fn).to.be.a('function');
      expect(fn()(7)).to.equal(12);
    });
  });

  describe('arrow-functions', function () {
    it('should serialize arrow functions', function () {
      let fn = () => {};
      expect(serialize(fn)).to.be.a('string').equal('() => {}');
    });

    it('should deserialize arrow functions', function () {
      let fn; eval('fn = ' + serialize(() => true));
      expect(fn).to.be.a('function');
      expect(fn()).to.equal(true);
    });

    it('should serialize arrow functions with one argument', function () {
      let fn = arg1 => {}
      expect(serialize(fn)).to.be.a('string').equal('arg1 => {}');
    });

    it('should deserialize arrow functions with one argument', function () {
      let fn; eval('fn = ' + serialize(arg1 => {}));
      expect(fn).to.be.a('function');
      expect(fn.length).to.equal(1);
    });

    it('should serialize arrow functions with multiple arguments', function () {
      let fn = (arg1, arg2) => {}
      expect(serialize(fn)).to.equal('(arg1, arg2) => {}');
    });

    it('should deserialize arrow functions with multiple arguments', function () {
      let fn; eval('fn = ' + serialize( (arg1, arg2) => {}));
      expect(fn).to.be.a('function');
      expect(fn.length).to.equal(2);
    });

    it('should serialize arrow functions with bodies', function () {
      let fn = () => { return true; }
      expect(serialize(fn)).to.equal('() => { return true; }');
    });

    it('should deserialize arrow functions with bodies', function () {
      let fn; eval('fn = ' + serialize( () => { return true; }));
      expect(fn).to.be.a('function');
      expect(fn()).to.equal(true);
    });

    it('should serialize enhanced literal objects', function () {
      let obj = {
        foo: () => { return true; },
        bar: arg1 => { return true; },
        baz: (arg1, arg2) => { return true; }
      };

      expect(serialize(obj)).to.equal('{"foo":() => { return true; },"bar":arg1 => { return true; },"baz":(arg1, arg2) => { return true; }}');
    });

    it('should deserialize enhanced literal objects', function () {
      let obj;
      // noinspection JSAnnotator
      eval('obj = ' + serialize({                foo: () => { return true; },
        foo: () => { return true; },
        bar: arg1 => { return true; },
        baz: (arg1, arg2) => { return true; }
      }));

      expect(obj.foo()).to.equal(true);
      expect(obj.bar('arg1')).to.equal(true);
      expect(obj.baz('arg1', 'arg1')).to.equal(true);
    });

    it('should serialize arrow functions with added properties', function () {
      let fn = () => {};
      fn.property1 = 'a string'
      expect(serialize(fn)).to.be.a('string').equal('() => {}');
    });

    it('should deserialize arrow functions with added properties', function () {
      let fn; eval('fn = ' + serialize( () => { this.property1 = 'a string'; return 5 }));
      expect(fn).to.be.a('function');
      expect(fn()).to.equal(5);
    });

    it('should serialize arrow functions that return other functions', function () {
      let fn = arg1 => { return arg2 => arg1 + arg2 };
      expect(serialize(fn)).to.be.a('string').equal('arg1 => { return arg2 => arg1 + arg2 }');
    });

    it('should deserialize arrow functions that return other functions', function () {
      let fn; eval('fn = ' + serialize(arg1 => { return arg2 => arg1 + arg2 } ));
      expect(fn).to.be.a('function');
      expect(fn(2)(3)).to.equal(5);
    });
  });

  describe('regexps', function () {
    it('should serialize constructed regexps', function () {
      let re = new RegExp('asdf');
      expect(serialize(re)).to.be.a('string').equal('new RegExp("asdf", "")');
    });

    it('should deserialize constructed regexps', function () {
      let re = eval(serialize(new RegExp('asdf')));
      expect(re).to.be.a('RegExp');
      expect(re.source).to.equal('asdf');
    });

    it('should serialize literal regexps', function () {
      let re = /asdf/;
      expect(serialize(re)).to.be.a('string').equal('new RegExp("asdf", "")');
    });

    it('should deserialize literal regexps', function () {
      let re = eval(serialize(/asdf/));
      expect(re).to.be.a('RegExp');
      expect(re.source).to.equal('asdf');
    });

    it('should serialize regexps with flags', function () {
      let re = /^asdf$/gi;
      expect(serialize(re)).to.equal('new RegExp("^asdf$", "gi")');
    });

    it('should deserialize regexps with flags', function () {
      let re = eval(serialize(/^asdf$/gi));
      expect(re).to.be.a('RegExp');
      expect(re.global).to.equal(true);
      expect(re.ignoreCase).to.equal(true);
      expect(re.multiline).to.equal(false);
    });

    it('should serialize regexps with escaped chars', function () {
      expect(serialize(/\..*/)).to.equal('new RegExp("\\u005C..*", "")');
      expect(serialize(new RegExp('\\..*'))).to.equal('new RegExp("\\u005C..*", "")');
    });

    it('should deserialize regexps with escaped chars', function () {
      let re = eval(serialize(/\..*/));
      expect(re).to.be.a('RegExp');
      expect(re.source).to.equal('\\..*');
      re = eval(serialize(new RegExp('\\..*')));
      expect(re).to.be.a('RegExp');
      expect(re.source).to.equal('\\..*');
    });

    it('should serialize dangerous regexps', function () {
      let re = /[<\/script><script>alert('xss')\/\/]/
      expect(serialize(re, {unsafe: false})).to.be.a('string').equal('new RegExp("[\\u003C\\u005C\\u002Fscript\\u003E\\u003Cscript\\u003Ealert(\'xss\')\\u005C\\u002F\\u005C\\u002F]", "")');
    });
  });

  describe('dates', function () {
    it('should serialize dates', function () {
      let d = new Date('2016-04-28T22:02:17.156Z');
      expect(serialize(d)).to.be.a('string').equal('new Date("2016-04-28T22:02:17.156Z")');
      expect(serialize({t: [d]})).to.be.a('string').equal('{"t":[new Date("2016-04-28T22:02:17.156Z")]}');
    });

    it('should deserialize a date', function () {
      let d = eval(serialize(new Date('2016-04-28T22:02:17.156Z')));
      expect(d).to.be.a('Date');
      expect(d.toISOString()).to.equal('2016-04-28T22:02:17.156Z');
    });

    it('should deserialize a string that is not a valid date', function () {
      let d = eval(serialize('2016-04-28T25:02:17.156Z'));
      expect(d).to.be.a('string');
      expect(d).to.equal('2016-04-28T25:02:17.156Z');
    });

    it('should serialize dates within objects', function () {
      let d = {foo: new Date('2016-04-28T22:02:17.156Z')};
      expect(serialize(d)).to.be.a('string').equal('{"foo":new Date("2016-04-28T22:02:17.156Z")}');
      expect(serialize({t: [d]})).to.be.a('string').equal('{"t":[{"foo":new Date("2016-04-28T22:02:17.156Z")}]}');
    });
  });

  describe('maps', function () {
    it('should serialize maps', function () {
      let regexKey = /.*/;
      let m = new Map([
        ['a', 123],
        // [regexKey, 456],
        [Infinity, 789]
      ]);
      expect(strip(serialize(m))).to.be.a('string').equal(strip('new Map([["a",123],[Infinity,789]])'));
      expect(strip(serialize({t: [m]}))).to.be.a('string').equal(strip('{"t":[new Map([["a",123],[Infinity,789]])]}'));
    });

    it('should deserialize a map', function () {
      let m = eval(serialize(new Map([
        ['a', 123],
        [null, 456],
        [Infinity, 789]
      ])));
      expect(m).to.be.a('Map');
      expect(m.get(null)).to.equal(456);
    });
  });

  describe('sets', function () {
    it('should serialize sets', function () {
      let m = new Set([
        'a',
        123,
        Infinity
      ]);
      expect(strip(serialize(m))).to.be.a('string').equal(strip('new Set(["a",123,Infinity])'));
      expect(strip(serialize({t: [m]}))).to.be.a('string').equal(strip('{"t":[new Set(["a",123,Infinity])]}'));
    });

    it('should deserialize a set', function () {
      let m = eval(serialize(new Set([
        'a',
        123,
        null,
        Infinity
      ])));
      expect(m).to.be.a('Set');
      expect(m.has(null)).to.equal(true);
    });
  });

  describe('sparse arrays', function () {
    // 2022-02-15 ES: No idea why this complicated slice call is here
    // it('should serialize sparse arrays', function () {
    //     let a = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    //     delete a[0];
    //     a.length = 3;
    //     a[5] = "wat"
    //     expect(serialize(a)).to.be.a('string').equal('Array.prototype.slice.call({"1":2,"2":3,"5":"wat","length":6})');
    //     expect(serialize({t: [a]})).to.be.a('string').equal('{"t":[Array.prototype.slice.call({"1":2,"2":3,"5":"wat","length":6})]}');
    // });

    it('should deserialize a sparse array', function () {
      let a = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      delete a[0];
      a.length = 3;
      a[5] = "wat"
      let b = eval(serialize(a));
      expect(b).to.be.a('Array').deep.equal([ , 2, 3, , , 'wat' ]);
    });
  });

  describe('Infinity', function () {
    it('should serialize Infinity', function () {
      expect(serialize(Infinity)).to.equal('Infinity');
      expect(serialize({t: [Infinity]})).to.be.a('string').equal('{"t":[Infinity]}');
    });

    it('should deserialize Infinity', function () {
      let d = eval(serialize(Infinity));
      expect(d).to.equal(Infinity);
    });

    it('should serialize -Infinity', function () {
      expect(serialize(-Infinity)).to.equal('-Infinity');
      expect(serialize({t: [-Infinity]})).to.be.a('string').equal('{"t":[-Infinity]}');
    });

    it('should deserialize -Infinity', function () {
      let d = eval(serialize(-Infinity));
      expect(d).to.equal(-Infinity);
    });
  });

  if (typeof BigInt !== 'undefined') {
    describe('BigInt', function () {
      it('should serialize BigInt', function () {
        let b = BigInt(9999);
        expect(serialize(b)).to.equal('BigInt("9999")');
        expect(serialize({t: [b]})).to.be.a('string').equal('{"t":[BigInt("9999")]}');
      });

      it('should deserialize BigInt', function () {
        let d = eval(serialize(BigInt(9999)));
        expect(d).to.be.a('BigInt');
        expect(d.toString()).to.equal('9999');
      });

      it('should throw error for invalid bigint', function () {
        expect(() => serialize(BigInt('abc'))).to.throw(Error);
      });
    });
  }

  describe('URL', function () {
    it('should serialize URL', function () {
      let u = new URL('https://x.com/')
      expect(serialize(u)).to.equal('new URL("https://x.com/")');
      expect(serialize({t: [u]})).to.be.a('string').equal('{"t":[new URL("https://x.com/")]}');
    });

    it('should deserialize URL', function () {
      let d = eval(serialize(new URL('https://x.com/')));
      expect(d).to.be.a('URL');
      expect(d.toString()).to.equal('https://x.com/');
    });
  });

  describe('XSS', function () {
    it('should encode unsafe HTML chars to Unicode', function () {
      // TODO: why does the test sometimes want the forward slash to be encoded, and sometimes not?
      expect(serialize('</script>', {unsafe: false})).to.equal('"\\u003C\\u002Fscript\\u003E"');
      expect(JSON.parse(serialize('</script>'))).to.equal('</script>');
      expect(eval(serialize('</script>'))).to.equal('</script>');
    });
  });

  describe('options', function () {
    it('should accept options as the second argument', function () {
      expect(serialize('foo', {})).to.equal('"foo"');
    });

    it('should accept a `space` option', function () {
      expect(serialize([1], {space: 0})).to.equal('[1]');
      expect(serialize([1], {space: ''})).to.equal('[1]');
      expect(serialize([1], {space: undefined})).to.equal('[1]');
      expect(serialize([1], {space: null})).to.equal('[1]');
      expect(serialize([1], {space: false})).to.equal('[1]');

      expect(serialize([1], {space: 1})).to.equal('[\n 1\n]');
      expect(serialize([1], {space: ' '})).to.equal('[\n 1\n]');
      expect(serialize([1], {space: 2})).to.equal('[\n  1\n]');
    });

    it('should accept a `isJSON` option', function () {
      expect(serialize('foo', {isJSON: true})).to.equal('"foo"');
      expect(serialize('foo', {isJSON: false})).to.equal('"foo"');

      function fn() { return true; }

      expect(serialize(fn)).to.equal('function fn() { return true; }');
      expect(serialize(fn, {isJSON: false})).to.equal('function fn() { return true; }');

      // isJSON not supported in serialise-to-js
      // expect(serialize(fn, {isJSON: true})).to.equal('undefined');
      // expect(serialize([1], {isJSON: true, space: 2})).to.equal('[\n  1\n]');
    });

    it('should accept a `unsafe` option', function () {
      expect(serialize('foo', {unsafe: true})).to.equal('"foo"');
      expect(serialize('foo', {unsafe: false})).to.equal('"foo"');

      function fn() { return true; }

      expect(serialize(fn)).to.equal('function fn() { return true; }');
      expect(serialize(fn, {unsafe: false})).to.equal('function fn() { return true; }');
      expect(serialize(fn, {unsafe: undefined})).to.equal('function fn() { return true; }');
      expect(serialize(fn, {unsafe: "true"})).to.equal('function fn() { return true; }');

      expect(serialize(fn, {unsafe: true})).to.equal('function fn() { return true; }');
      expect(serialize(["1"], {unsafe: false, space: 2})).to.equal('[\n  "1"\n]');
      expect(serialize(["1"], {unsafe: true, space: 2})).to.equal('[\n  "1"\n]');
      expect(serialize(["<"], {space: 2, unsafe: false})).to.equal('[\n  "\\u003C"\n]');
      expect(serialize(["<"], {unsafe: true, space: 2})).to.equal('[\n  "<"\n]');
    });

    it("should accept a `ignoreFunction` option", function() {
      function fn() { return true; }
      let obj = {
        fn: fn,
        fn_arrow: () => {
          return true;
        }
      };
      let obj2 = {
        num: 123,
        str: 'str',
        fn: fn
      }
      // case 1. Pass function to serialize
      expect(serialize(fn, { ignoreFunction: true })).to.not.contain('return true');
      // case 2. Pass function(arrow) in object to serialze
      //expect(serialize(obj, { ignoreFunction: true })).to.equal('{}');
      // case 3. Other features should work
      expect(serialize(obj2, { ignoreFunction: true })).to.contain(
        '"num":123'
      );
    });
  });

  describe('placeholders', function() {
    it('should not be replaced within string literals', function () {
      // Since we made the UID deterministic this should always be the placeholder
      let fakePlaceholder = '"@__R-0000000000000000-0__@';
      let serialized = serialize({bar: /1/i, foo: fakePlaceholder}, {uid: 'foo'});
      let obj = eval('(' + serialized + ')');
      expect(obj).to.be.a('Object');
      expect(obj.foo).to.be.a('String');
      expect(obj.foo).to.equal(fakePlaceholder);
    });
  });

});
