/* eslint no-new-func: off */
'use strict'

// npm run test test/index.test.js

import {serialize} from '../src/index.js';
import utils from '../src/internal/utils.js'

const isBrowser = (typeof window !== 'undefined')

if (!isBrowser) {
  // hacky import to work in browser and node
  globalThis["chai"] = (await import('../node_modules/chai/chai.js')).default
}
const assert = chai.assert
const expect = chai.expect

//const {describe} = require('mocha') // Redundant, but nice to have

if(!isBrowser){
  if (typeof assert.deepStrictEqual === 'undefined') {
    assert.deepStrictEqual = assert.deepEqual // eslint-disable-line
  }
}
describe.node = isBrowser ? describe.skip : describe

function jsonLog(arg) {
  console.log(JSON.stringify(arg))
}

const fakeGlobal = {jsonLog} // to find as reference

async function myAsyncFunction() {
  return Promise.resolve("Hello")
}

const isLessV12 = isBrowser ? null : parseInt(process.versions.node.split('.')[0]) < 12
const isLessV10 = isBrowser ? null : parseInt(process.versions.node.split('.')[0]) < 10


function looseJsonParse(objStr) {
  const content = '"use strict"; const fakeGlobal = {}; return (' + objStr + ')'
  if(objStr.indexOf("class") == -1 && objStr.indexOf("fakeGlobal") == -1){
    // TODO: const ob = CustomEval('(function(){'+content+'})();')
  }
  return Function(content)()
}

function strip(s) {
  return s.replace(/[\s;]/g, '');
}

function serialise_test(name, inp, expSubstring=null, unsafe=null, objectsToLinkTo=null, deepStrictEqual = true) {
  it(name, function () {

    console.log("------------ test -------------")
    // console.log("objectsToLinkTo", objectsToLinkTo)
    const codeStr = serialize(inp, {unsafe, objectsToLinkTo})
    console.log("codeStr:")
    console.log(codeStr)
    if (isLessV10 && codeStr.indexOf("\u2028") !== -1) return
    const res = looseJsonParse(codeStr)

    console.log("instance:")
    console.log(inp)
    console.log("res:")
    console.log(res)
    if (expSubstring) {
      expSubstring = strip(expSubstring)
      console.log("exp:")
      console.log(expSubstring)
      const strCopy = strip(codeStr)
      console.log("strCopy:")
      console.log(strCopy)
      expect(strCopy).to.contain(expSubstring);
    }
    // assert.ok(deepCompare(inp, res))
    console.log('typeof inp', typeof inp)
    if (deepStrictEqual) {
      // This check fails on functions and Invalid dates
      if (!(isLessV10 && (isNaN(res) && isNaN(inp)))) {
        assert.deepStrictEqual(res, inp)
      }
    }
  })
}

describe('test JavaScript applePropertyNameInGlobal', function () {
  {
    const apple = {appleKey: "appleValue"}
    const fakeGlobal = {}
    fakeGlobal.applePropertyNameInGlobal = apple

    serialise_test(
      'global ref fakeGlobal singleStatement',
      apple,
      'fakeGlobal.applePropertyNameInGlobal',
      null,
      {fakeGlobal},
      false
    )
  }
})

describe('test JavaScript', function () {
  it('test +=', function () {
    let s = "1"

    function add() {
      s += "Added"
      return "Ret"
    }

    // s += "2" + add() + "3" // This won't add the "Added" part
    const tmp = "2" + add() + "3"
    s += tmp
    console.log(s)

    assert.ok(s.indexOf("Added") !== -1)
  })
  it('test null byte in source', function () {
    // Note that a null byte may be present in source code:
    assert.equal(eval('"\\x00"'), eval('"\x00"'))
  })
  it('test unnecessary quote escape', function () {
    assert.equal("\"",'\"')
    assert.equal("\'",'\'')
  })
})

describe('safe mode', function () {
  serialise_test('undefined', undefined, 'undefined')
  serialise_test('null', null, 'null')
  serialise_test('boolean', true, 'true')
  serialise_test('number', 3.1415, '3.1415')
  serialise_test('zero', 0, '0')
  serialise_test('negative zero', -0, '-0')
  serialise_test('number int', 3, '3')
  serialise_test('number negative int', -13, '-13')
  serialise_test('number float', 0.1, '0.1')
  serialise_test('number negative float', -0.2, '-0.2')
  serialise_test('NaN', NaN, 'NaN')
  serialise_test('Infinity', Infinity, 'Infinity')
  serialise_test('simple string', "simple string", '"simple string"')
  serialise_test('string', "string's\n\"new\"   line", '"string\'s\\n\\"new\\"   line"')
  serialise_test('empty string', '', '""')
  // 3 ways to represent null char are all the same data: 
  serialise_test('null char 1', '\0', '"\\x00"')
  serialise_test('null char 2', '\u0000', '"\\x00"')
  serialise_test('null char 3', '\x00', '"\\x00"')
  serialise_test('string with unsafe characters',
    '<script type="application/javascript">\u2028\u2029\nvar a = 0;\nvar b = 1; a > 1;\n</script>',
    '"\\u003Cscript type=\\"application\\u002Fjavascript\\"\\u003E\\u2028\\u2029\\nvar a = 0;\\nvar b = 1; a \\u003E 1;\\n\\u003C\\u002Fscript\\u003E"'
  )
  serialise_test('string with all unsafe characters', '<>\\\\ \t\n/', '"\\u003C\\u003E\\u005C\\u005C \\t\\n\\u002F"')
  serialise_test('empty object', {}, '{}')
  serialise_test('object simple', {a: 1, b: 2}, '{a: 1, b: 2}')
  serialise_test('object with empty string property', {a: 1, "": 2}, '2')
  serialise_test('object with backslash', {backslash: '\\'}, '"\\u005C"')
  serialise_test('object of primitives',
    {one: true, two: false, 'thr-ee': undefined, four: 1, 5: 3.1415, six: -17, 'se ven': 'string'},
    '{"5": 3.1415, one: true, two: false, "thr-ee": undefined, four: 1, six: -17, "se ven": "string"}'
  )
  serialise_test('object with unsafe property name',
    {"</script><script>alert('xss')//": 0},
    '"\\u003C\\u002Fscript\\u003E\\u003Cscript\\u003Ealert(\'xss\')\\u002F\\u002F"'
  )
  serialise_test('object with backslash-escaped quote in property name',
    {'\\": 0}; alert(\'xss\')//': 0},
    '"\\u005C\\": 0}; alert(\'xss\')\\u002F\\u002F"'
  )
  serialise_test('function', jsonLog, jsonLog.toString(), null, null, false)
  serialise_test('async function', myAsyncFunction, myAsyncFunction.toString(), null, null, false)
  serialise_test('arrow function', {key: (a) => a + 1}, '(a) => a + 1', null, null, false)
  serialise_test('arrow function 2', {key: a => a + 1}, 'a => a + 1', null, null, false)
  serialise_test('function link', jsonLog, "fakeGlobal.jsonLog", null, {fakeGlobal}, false)

  serialise_test('date', new Date(24 * 12 * 3600000), 'new Date("1970-01-13T00:00:00.000Z")')
  serialise_test('invalid date', new Date('Invalid'), 'new Date("Invalid Date")', null, null, false)
  serialise_test('error', new Error('error'), 'new Error("error")')
  serialise_test('error with unsafe message',
    new Error("</script><script>alert('xss')"),
    'new Error("\\u003C\\u002Fscript\\u003E\\u003Cscript\\u003Ealert(\'xss\')")'
  )
  serialise_test('empty array', [], '[]')
  serialise_test('array',
    [true, false, undefined, 1, 3.1415, -17, 'string'],
    '[true, false, undefined, 1, 3.1415, -17, "string"]'
  )
  serialise_test('Int8Array',
    new Int8Array([1, 2, 3, 4, 5]),
    'new Int8Array([1, 2, 3, 4, 5])'
  )
  serialise_test('Uint8Array',
    new Uint8Array([1, 2, 3, 4, 5]),
    'new Uint8Array([1, 2, 3, 4, 5])'
  )
  serialise_test('Uint8ClampedArray',
    new Uint8ClampedArray([1, 2, 3, 4, 5]),
    'new Uint8ClampedArray([1, 2, 3, 4, 5])'
  )
  serialise_test('Int16Array',
    new Int16Array([-1, 0, 2, 3, 4, 5]),
    'new Int16Array([-1, 0, 2, 3, 4, 5])'
  )
  serialise_test('Uint16Array',
    new Uint16Array([1, 2, 3, 4, 5]),
    'new Uint16Array([1, 2, 3, 4, 5])'
  )
  serialise_test('Int32Array',
    new Int32Array([1, 2, 3, 4, 5]),
    'new Int32Array([1, 2, 3, 4, 5])'
  )
  serialise_test('Uint32Array',
    new Uint32Array([1, 2, 3, 4, 5]),
    'new Uint32Array([1, 2, 3, 4, 5])'
  )
  serialise_test('Float32Array',
    new Float32Array([1e10, 2000000, 3.1415, -4.9e2, 5]),
    'new Float32Array([10000000000, 2000000, 3.1414999961853027, -490, 5])'
  )
  serialise_test('Float64Array',
    new Float64Array([1e12, 2000000, 3.1415, -4.9e2, 5]),
    'new Float64Array([1000000000000, 2000000, 3.1415, -490, 5])'
  )
  serialise_test('regex no flags', /abc/, 'new RegExp("abc", "")')
  serialise_test('regex unsafe characters',
    /<>\/\\\t\n\r\b\0/migsu,
    'new RegExp("\\u003C\\u003E\\u005C\\u002F\\u005C\\u005C\\u005Ct\\u005Cn\\u005Cr\\u005Cb\\u005C0", "gimsu")'
  )
  serialise_test('regexXss',
    /[</script><script>alert('xss')//]/i,
    isLessV12
      ? 'new RegExp("[\\u003C\\u005C\\u002Fscript\\u003E\\u003Cscript\\u003Ealert(\'xss\')\\u005C\\u002F\\u005C\\u002F]", "i")'
      : 'new RegExp("[\\u003C\\u002Fscript\\u003E\\u003Cscript\\u003Ealert(\'xss\')\\u002F\\u002F]", "i")'
  )

  serialise_test('regexXss2',
    /[</ script><script>alert('xss')//]/i,
    isLessV12
      ? 'new RegExp("[\\u003C\\u005C\\u002F script\\u003E\\u003Cscript\\u003Ealert(\'xss\')\\u005C\\u002F\\u005C\\u002F]", "i")'
      : 'new RegExp("[\\u003C\\u002F script\\u003E\\u003Cscript\\u003Ealert(\'xss\')\\u002F\\u002F]", "i")'
  )
  serialise_test('Set',
    new Set(['a', 1.2, true, ['b', 3], {c: 4}]),
    'new Set(["a", 1.2, true, '
  )
  serialise_test('Map',
    new Map([['a', 'a'], [1.2, 1.2], [true, true], [['b', 3], ['b', 4]], [{c: 4}, {c: 5}]]),
    'new Map([["a", "a"], [1.2, 1.2], [true, true]'
  )

  // Is this a real world example for Symbol?
  serialise_test('Symbol', Symbol("hello there"), 'Symbol("hello there")', null, null, false)
})

describe('unsafe mode', function () {
  serialise_test('string with unsafe characters (unsafe mode)',
    '<script type="application/javascript">\u2028\u2029\nvar a = 0;\nvar b = 1; a > 1;\n</script>',
    '"<script type=\\"application/javascript\\">\u2028\u2029\\nvar a = 0;\\nvar b = 1; a > 1;\\n</script>"',
    true
  )
  serialise_test('object with unsafe property name (unsafe mode)',
    {"</script><script>alert('xss')//": 0},
    '"</script><script>alert(\'xss\')//"',
    true
  )
  serialise_test('object with backslash-escaped quote in property name (unsafe mode)',
    {'\\": 0}; alert(\'xss\')//': 0},
    '{"\\u005C\\": 0}; alert(\'xss\')//": 0}',
    true
  )
  serialise_test('error with unsafe message (unsafe mode)',
    new Error("</script><script>alert('xss')"),
    'new Error("</script><script>alert(\'xss\')")',
    true
  )
  serialise_test('regexXss (unsafe mode)',
    /[</script><script>alert('xss')//]/i,
    isLessV12
      ? 'new RegExp("[<\\u005C/script><script>alert(\'xss\')\\u005C/\\u005C/]", "i")'
      : 'new RegExp("[</script><script>alert(\'xss\')//]", "i")',
    true
  )
  serialise_test('regexXss2 (unsafe mode)',
    /[</ script><script>alert('xss')//]/i,
    isLessV12
      ? 'new RegExp("[<\\u005C/ script><script>alert(\'xss\')\\u005C/\\u005C/]", "i")'
      : 'new RegExp("[</ script><script>alert(\'xss\')//]", "i")',
    true
  )
})

describe.node('Buffer', function () {
  if(!isBrowser){
    serialise_test('buffer', Buffer.from('buffer'), 'Buffer.from("YnVmZmVy", "base64")')
    serialise_test('empty buffer', Buffer.from(''), 'Buffer.from("", "base64")')
  }
})

describe('others', function () {
  serialise_test('simple nested objects', {
    "a": {
      "a1": 0,
      "a2": 0,
    },
    "b": {
      "b1": 0,
      "b2": 0,
    }
  }, 'b2')

  it('converting an object of objects', function () {
    const ob1 = {
      one: true,
      'thr-ee': undefined,
      3: '3',
      '4 four': 'four\n<test></test>',
      'five"(5)': 5
    }
    const ob = {
      a: ob1,
      b: ob1
    }
    const res = serialize(ob)
    console.log("res", res)
    const exp = '{a: {"3": "3", one: true, "thr-ee": undefined, "4 four": "four\\n\\u003Ctest\\u003E\\u003C\\u002Ftest\\u003E", "five\\"(5)": 5}, b: {"3": "3", one: true, "thr-ee": undefined, "4 four": "four\\n\\u003Ctest\\u003E\\u003C\\u002Ftest\\u003E", "five\\"(5)": 5}}'
    // console.log(JSON.stringify(res))
    assert.deepStrictEqual(looseJsonParse(res), looseJsonParse(exp))
  })

  {
    const smallObj = {"key": "originalValue"}
    const ob = {
      "a": smallObj,
      "": smallObj,
    }
    serialise_test('converting an object with empty property name', ob)
    const ob2 = serialize(ob)
    const ob3 = looseJsonParse(ob2)
    ob3["a"]["key"] = "Changed!"
    assert.deepStrictEqual(ob3[""]["key"], ob3["a"]["key"])
  }

  const r = {
    'one': true,
    'thr-ee': undefined,
    3: '3',
    '4 four': {
      'four': 4
    }
  }
  const ob = {
    'a': r,
    'b': r,
    'c': {
      'd': r,
      0: r,
      'spa ce': r
    },
    0: r['4 four'],
    'spa ce': r
  }
  serialise_test('converting an object of objects using references', ob)

  it('converting an object of objects with opts.unsafe', function () {
    const o1 = {
      one: true,
      'thr-ee': undefined,
      3: '3',
      '4 four': 'four\n<test></test>',
      'five"(5)': 5
    }
    const ob = {
      a: o1,
      b: o1
    }
    const res = serialize(ob, {unsafe: true})
    const exp = '{a: {"3": "3", one: true, "thr-ee": undefined, "4 four": "four\\n<test></test>", "five\\"(5)": 5}, b: {"3": "3", one: true, "thr-ee": undefined, "4 four": "four\\n<test></test>", "five\\"(5)": 5}}'
    // assert.strictEqual(res, exp)
    assert.deepStrictEqual(looseJsonParse(res), looseJsonParse(exp))
  })
  it('correctly serializes regular expressions', function () {
    for (const re of [/\//, /[</script><script>alert('xss')//]/i, /abc/, /[< /script>]/]) {
      const re2 = looseJsonParse(serialize(re))
      assert.strictEqual(re.source, re2.source)
      assert.strictEqual(re.flags, re2.flags)
    }
  })

  {
    function xss() {
      const s = '</script><script>alert(\'xss\')//'
      const ob = {'\\": 0}; alert(\'xss\')//': 0, s}
      return ob
    }

    serialise_test('serializes function with unsafe chars 2', xss, 'function xss () {\n' +
      ' const s = \'\\u003C\\u002Fscript>\\u003Cscript>alert(\\\'xss\\\')//\'\n' +
      ' const ob = { \'\\\\": 0}; alert(\\\'xss\\\')//\': 0, s }\n' +
      ' return ob\n' +
      ' }', null, null, false)
  }

  {
    const map = new Map([
      ['a', 'val'],
      [1.2, "val"],
      [true, "val"],
      [['b', 3], "val"],
      [{c: 4}, "val"]
    ])
    serialise_test('shall unmarshal Map', map)
  }

  it('shall unmarshal to Invalid Date', function () {
    const res = looseJsonParse(serialize(new Date('Invalid')))
    assert.strictEqual(res.toString(), new Date('Invalid').toString())
  })

  const set = new Set(['a', 1.2, true, ['b', 3], {c: 4}])
  serialise_test('shall unmarshal Set', set)

  {
    const mapKey = {key: "value"}
    const map2 = new Map([
      [mapKey, 'val'],
      ["key2", mapKey],
    ])
    serialise_test('shall unmarshal Map2', map2)
  }

  {
    const fooBar = {foo: "bar"}

    const m = new Map()
    m.set('key1', fooBar)
    m.set(NaN, fooBar)

    const ob = {
      ref1: fooBar,
      ref2: fooBar,
      ref3: fooBar,
      m: m,
    }
    serialise_test('map and refs 1', ob)
  }

  {
    const apple = {appleKey: "appleValue"}
    const ob = {
      mApple: apple,
      set: new Set([1, 2, apple, new Set([new Set([5, 6]), 7, 8]), 3, 4])
    }
    serialise_test('map and refs 2', ob)
  }

  {
    const apple = {appleKey: "appleValue"}
    // const orange = { orangeKey: "orangeValue" }
    // const banana = { bananaKey: "bananaValue" }

    const mApple = new Map([
      ['apple', apple],
      [apple, "value"]
    ])

    // const mOrange = new Map()
    // mOrange.set('orange', orange)
    // mOrange.set(orange, "value")

    const ob = {
      mApple: mApple,
      // mOrange: mOrange,
      set: new Set([mApple])
    }
    serialise_test('map and refs 3', ob)
  }

  {
    const ob = {
      nativeLogProperty: console.log,
      randomKey: 'randomValue',
    }
    serialise_test(
      'global console.log copy',
      ob,
      'function',
      null,
      {console},
      false,
    )
  }

  {
    const ob = {
      nativeLogProperty: console.log,
      randomKey: 'randomValue',
    }
    serialise_test(
      'global console.log ref',
      ob,
      'console.log',
      null,
      {console},
      false
    )
  }

  {
    const apple = {appleKey: "appleValue"}
    const fakeGlobal = {}
    fakeGlobal.orangePropertyNameInGlobal = {orangeKey: "orangeValue"}

    const ob = {
      propertyThatLinksToGlobal: fakeGlobal.orangePropertyNameInGlobal,
      apple,
    }

    serialise_test(
      'global ref fakeGlobal',
      ob,
      'orangePropertyNameInGlobal',
      null,
      {fakeGlobal},
      false
    )
  }

  {
    const apple = {appleKey: "appleValue"}
    const arr = ['a', apple, 'c']
    const ob = {
      apple,
      arr
    }
    serialise_test('shared ob array', ob)
  }

  {
    const arrA = ['a1', 'a2']
    const arrB = ['b1', 'b2', arrA]
    // noinspection JSCheckFunctionSignatures
    arrA.push(arrB)
    const ob = {
      arrA,
    }
    serialise_test('cyclic array', ob)
  }

  {
    const arr = ['a', 'b', 'c']
    arr.dirtyProperty = 'hello there'
    serialise_test('dirty array', arr)
  }

  {
    const arr = new Map([['a', true], ['b', true], ['c', true]])
    arr.dirtyProperty1 = 0
    arr.dirtyProperty2 = 0
    serialise_test('dirty map', arr)
  }

  {
    const map = new Map([['a', true], ['b', true], ['c', true]])
    map.dirtyProperty = {s: 'hello there'}
    Object.defineProperty(map, 'dirtyGetter', {
      enumerable: true,
      get: function () {
        return "Dirty getter return value"
      },
    })
    Object.defineProperty(map, 'dirtySetter', {
      enumerable: true,
      set: function (value) {
        console.log("Dirty setter value: " + value)
      },
    })
    Object.defineProperty(map, 'dirtyGetSet', {
      enumerable: true,
      get: function () {
        return "dirtyGetSet return value"
      },
      set: function (value) {
        console.log("Dirty getSet value: " + value)
      },
    })
    const ob = {map}

    serialise_test('dirty map get and set', ob, 'dirtySetter', null, null, false)
  }

  {
    const set = new Set(['a', 'b', 'c'])
    set.dirtyProperty = 'hello there'
    serialise_test('dirty set', set)
  }

  {
    const set = new Set(['a', 'b', 'c'])
    set.dirtyProperty = new Set(['d', 'e', 'f'])
    set.dirtyProperty.dirtyProperty = 0
    serialise_test('dirty set nested', set)
  }

  {
    const reusedObject = {key: 'value'}
    reusedObject.cyclicSelf = reusedObject
    const ob = {
      s: 'hello world!',
      num: 3.1415,
      bool: true,
      nil: null,
      undef: undefined,
      ob: {foo: 'bar', reusedObject},
      arr: [1, '2', reusedObject],
      regexp: /^test?$/,
      date: new Date(),
      buffer: new Uint8Array([1, 2, 3]),
      set: new Set([1, 2, 3]),
      map: new Map([['a', 1], ['b', reusedObject]])
    }
    serialise_test('readme example', ob)
  }


  {
    const ob = {
      get someGetter() {
        throw Error("should not call this getter")
      },
      set someSetter(value) {
        throw Error("should not call this setter. value: " + value)
      }
    }
    serialise_test('getter and setter throws', ob, "someGetter", null, null, false)
  }

  {
    const ob = {
      get statefullGetterA() {
        ob.counter += 1
        return "counter increased A " + ob.counter
      },
      counter: 0,
      get statefullGetterB() {
        ob.counter += 1
        return "counter increased B " + ob.counter
      },
    }
    serialise_test('getter and setter statefull', ob, "counter", null, null, false)
  }
})

describe("object test", () => {
  class Car {
    constructor(name, year) {
      this.name = name
      this.year = year
    }

    age() {
      let date = new Date()
      return date.getFullYear() - this.year
    }
  }

  it("Car 1", () => {
    const yaris = new Car('Yaris', 2019)
    const ob = {
      // Car,
      yaris,
    }

    const codeStr = serialize(ob)
    console.log(codeStr)
    const res = looseJsonParse(codeStr)
    assert.notStrictEqual(res.yaris.age, null)
    const age = res.yaris.age()
    console.log("res.yaris.age(): ", age)
    assert.notStrictEqual(age, null)

    serialise_test('Car object', ob, "Yaris", null, null, false)
  })

  it("Car 2", () => {
    const yaris = new Car('Yaris', 2019)
    const ob = {
      yaris,
      Car,
    }

    const codeStr = serialize(ob)
    console.log(codeStr)
    const res = looseJsonParse(codeStr)
    assert.notStrictEqual(res.yaris.age, null)
    const age = res.yaris.age()
    console.log("res.yaris.age(): ", age)
    assert.notStrictEqual(age, null)

    serialise_test('Car object', ob, "Yaris", null, null, false)
  })

})

describe("getter and setter", () => {
  it("isSimpleGetter", () => {
    // Not a simple getter anymore, as it calls the concat function
    // assert.ok(utils.isSimpleGetter(function () {
    //  return [].concat(model[field])
    // }))

    assert.ok(utils.isSimpleGetter(function () {
      return model[field]
    }))

    assert.strictEqual(utils.isSimpleGetter(function () {
      if (model.deleted) {
        vtkErrorMacro('instance deleted - cannot call any method')
        return false
      }

      for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2]
      }
      // Skipped some content here

      return true
    }, 'setClippingRange '), false)
  })
})


// TODO: Should make selenium test to test iframe permissions.
// describe("iframe test", () => {
//   it("acces child iframe", () => {
//
//     const {createServer} = require("http")
//     const {createReadStream} = require("fs")
//     const path = require('path')
//
//     function createFileServer(root = ".", port = 8080) {
//       const server = createServer()
//       server.on("request", (request, response) => {
//         try {
//           createReadStream(path.join(root, request.url)).pipe(response)
//         } catch (err) {
//           response.writeHead(500, {'Content-Type': 'text/plain'})
//           response.write(err)
//           response.end()
//         }
//       })
//       server.listen(port)
//       return server
//     }
//
//     createFileServer(".", 44444)
//     createFileServer(".", 55555)
//   })
// })

