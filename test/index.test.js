/* eslint no-new-func: off */
'use strict'

const assert = require('assert')
const src = require('../src')
const {expect} = require("chai");
const serialize = src.serialize

if (typeof assert.deepStrictEqual === 'undefined') {
  assert.deepStrictEqual = assert.deepEqual // eslint-disable-line
}

const isBrowser = (typeof window !== 'undefined')

function jsonLog(arg) {
  console.log(JSON.stringify(arg))
}

const fakeGlobal = {jsonLog} // to find as reference

async function myAsyncFunction() {
  return Promise.resolve("Hello")
}

const isLessV12 = parseInt(process.versions.node.split('.')[0]) < 12
const isLessV10 = parseInt(process.versions.node.split('.')[0]) < 10

describe.node = isBrowser ? describe.skip : describe

function looseJsonParse(obj) {
  const content = '"use strict"; const fakeGlobal = {}; return (' + obj + ')'
  if (obj.indexOf('script') !== -1) {
    console.log(content) // Temporary debug
  }
  return Function(content)()
}

function strip(str) {
  return str.replace(/[\s;]/g, '');
}

function test(name, inp, expSubstring, unsafe, objectsToLinkTo, deepStrictEqual = true) {
  it(name, function () {

    console.log("------------ test -------------")
    // console.log("objectsToLinkTo", objectsToLinkTo)
    const str = serialize(inp, {unsafe, objectsToLinkTo})
    console.log("str:")
    console.log(str)
    if (isLessV10 && str.indexOf("\u2028") !== -1) return
    const res = looseJsonParse(str)

    console.log("instance:")
    console.log(inp)
    console.log("res:")
    console.log(res)
    if (expSubstring) {
      expSubstring = strip(expSubstring)
      console.log("exp:")
      console.log(expSubstring)
      const strCopy = strip(str)
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

    test(
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
    let str = "1"

    function add() {
      str += "Added"
      return "Ret"
    }

    // str += "2" + add() + "3" // This won't add the "Added" part
    const tmp = "2" + add() + "3"
    str += tmp
    console.log(str)

    assert.ok(str.indexOf("Added") !== -1)
  })
})

describe('safe mode', function () {
  test('undefined', undefined, 'undefined')
  test('null', null, 'null')
  test('boolean', true, 'true')
  test('number', 3.1415, '3.1415')
  test('zero', 0, '0')
  test('negative zero', -0, '-0')
  test('number int', 3, '3')
  test('number negative int', -13, '-13')
  test('number float', 0.1, '0.1')
  test('number negative float', -0.2, '-0.2')
  test('NaN', NaN, 'NaN')
  test('Infinity', Infinity, 'Infinity')
  test('string', "string's\n\"new\"   line", '"string\'s\\n\\"new\\"   line"')
  test('empty string', '', '""')
  test('nul string', '\0', '"\u0000"')
  test('string with unsafe characters',
    '<script type="application/javascript">\u2028\u2029\nvar a = 0;\nvar b = 1; a > 1;\n</script>',
    '"\\u003Cscript type=\\"application\\u002Fjavascript\\"\\u003E\\u2028\\u2029\\nvar a = 0;\\nvar b = 1; a \\u003E 1;\\n\\u003C\\u002Fscript\\u003E"'
  )
  test('string with all unsafe characters', '<>\\\\ \t\n/', '"\\u003C\\u003E\\u005C\\u005C \\t\\n\\u002F"')
  test('empty object', {}, '{}')
  test('object simple', {a: 1, b: 2}, '{a: 1, b: 2}')
  test('object with empty string property', {a: 1, "": 2}, '2')
  test('object with backslash', {backslash: '\\'}, '"\\u005C"')
  test('object of primitives',
    {one: true, two: false, 'thr-ee': undefined, four: 1, 5: 3.1415, six: -17, 'se ven': 'string'},
    '{"5": 3.1415, one: true, two: false, "thr-ee": undefined, four: 1, six: -17, "se ven": "string"}'
  )
  test('object with unsafe property name',
    {"</script><script>alert('xss')//": 0},
    '"\\u003C\\u002Fscript\\u003E\\u003Cscript\\u003Ealert(\'xss\')\\u002F\\u002F"'
  )
  test('object with backslash-escaped quote in property name',
    {'\\": 0}; alert(\'xss\')//': 0},
    '"\\u005C\\": 0}; alert(\'xss\')\\u002F\\u002F"'
  )
  test('function', jsonLog, jsonLog.toString(), null, null, false)
  test('async function', myAsyncFunction, myAsyncFunction.toString(), null, null, false)
  test('arrow function', {key: (a) => a + 1}, '(a) => a + 1', null, null, false)
  test('arrow function 2', {key: a => a + 1}, 'a => a + 1', null, null, false)
  test('function link', jsonLog, "fakeGlobal.jsonLog", null, {fakeGlobal}, false)

  test('date', new Date(24 * 12 * 3600000), 'new Date("1970-01-13T00:00:00.000Z")')
  test('invalid date', new Date('Invalid'), 'new Date("Invalid Date")', null, null, false)
  test('error', new Error('error'), 'new Error("error")')
  test('error with unsafe message',
    new Error("</script><script>alert('xss')"),
    'new Error("\\u003C\\u002Fscript\\u003E\\u003Cscript\\u003Ealert(\'xss\')")'
  )
  test('empty array', [], '[]')
  test('array',
    [true, false, undefined, 1, 3.1415, -17, 'string'],
    '[true, false, undefined, 1, 3.1415, -17, "string"]'
  )
  test('Int8Array',
    new Int8Array([1, 2, 3, 4, 5]),
    'new Int8Array([1, 2, 3, 4, 5])'
  )
  test('Uint8Array',
    new Uint8Array([1, 2, 3, 4, 5]),
    'new Uint8Array([1, 2, 3, 4, 5])'
  )
  test('Uint8ClampedArray',
    new Uint8ClampedArray([1, 2, 3, 4, 5]),
    'new Uint8ClampedArray([1, 2, 3, 4, 5])'
  )
  test('Int16Array',
    new Int16Array([-1, 0, 2, 3, 4, 5]),
    'new Int16Array([-1, 0, 2, 3, 4, 5])'
  )
  test('Uint16Array',
    new Uint16Array([1, 2, 3, 4, 5]),
    'new Uint16Array([1, 2, 3, 4, 5])'
  )
  test('Int32Array',
    new Int32Array([1, 2, 3, 4, 5]),
    'new Int32Array([1, 2, 3, 4, 5])'
  )
  test('Uint32Array',
    new Uint32Array([1, 2, 3, 4, 5]),
    'new Uint32Array([1, 2, 3, 4, 5])'
  )
  test('Float32Array',
    new Float32Array([1e10, 2000000, 3.1415, -4.9e2, 5]),
    'new Float32Array([10000000000, 2000000, 3.1414999961853027, -490, 5])'
  )
  test('Float64Array',
    new Float64Array([1e12, 2000000, 3.1415, -4.9e2, 5]),
    'new Float64Array([1000000000000, 2000000, 3.1415, -490, 5])'
  )
  test('regex no flags', /abc/, 'new RegExp("abc", "")')
  test('regex unsafe characters',
    /<>\/\\\t\n\r\b\0/migsu,
    'new RegExp("\\u003C\\u003E\\u005C\\u002F\\u005C\\u005C\\u005Ct\\u005Cn\\u005Cr\\u005Cb\\u005C0", "gimsu")'
  )
  test('regexXss',
    /[</script><script>alert('xss')//]/i,
    isLessV12
      ? 'new RegExp("[\\u003C\\u005C\\u002Fscript\\u003E\\u003Cscript\\u003Ealert(\'xss\')\\u005C\\u002F\\u005C\\u002F]", "i")'
      : 'new RegExp("[\\u003C\\u002Fscript\\u003E\\u003Cscript\\u003Ealert(\'xss\')\\u002F\\u002F]", "i")'
  )
  test('regexXss2',
    /[</ script><script>alert('xss')//]/i,
    isLessV12
      ? 'new RegExp("[\\u003C\\u005C\\u002F script\\u003E\\u003Cscript\\u003Ealert(\'xss\')\\u005C\\u002F\\u005C\\u002F]", "i")'
      : 'new RegExp("[\\u003C\\u002F script\\u003E\\u003Cscript\\u003Ealert(\'xss\')\\u002F\\u002F]", "i")'
  )
  test('Set',
    new Set(['a', 1.2, true, ['b', 3], {c: 4}]),
    'new Set(["a", 1.2, true, '
  )
  test('Map',
    new Map([['a', 'a'], [1.2, 1.2], [true, true], [['b', 3], ['b', 4]], [{c: 4}, {c: 5}]]),
    'new Map([["a", "a"], [1.2, 1.2], [true, true]'
  )

  // Is this a real world example for Symbol?
  test('Symbol', Symbol("hello there"), 'Symbol("hello there")', null, null, false)
})

describe('unsafe mode', function () {
  test('string with unsafe characters (unsafe mode)',
    '<script type="application/javascript">\u2028\u2029\nvar a = 0;\nvar b = 1; a > 1;\n</script>',
    '"<script type=\\"application/javascript\\">\u2028\u2029\\nvar a = 0;\\nvar b = 1; a > 1;\\n</script>"',
    true
  )
  test('object with unsafe property name (unsafe mode)',
    {"</script><script>alert('xss')//": 0},
    '"</script><script>alert(\'xss\')//"',
    true
  )
  test('object with backslash-escaped quote in property name (unsafe mode)',
    {'\\": 0}; alert(\'xss\')//': 0},
    '{"\\u005C\\": 0}; alert(\'xss\')//": 0}',
    true
  )
  test('error with unsafe message (unsafe mode)',
    new Error("</script><script>alert('xss')"),
    'new Error("</script><script>alert(\'xss\')")',
    true
  )
  test('regexXss (unsafe mode)',
    /[</script><script>alert('xss')//]/i,
    isLessV12
      ? 'new RegExp("[<\\u005C/script><script>alert(\'xss\')\\u005C/\\u005C/]", "i")'
      : 'new RegExp("[</script><script>alert(\'xss\')//]", "i")',
    true
  )
  test('regexXss2 (unsafe mode)',
    /[</ script><script>alert('xss')//]/i,
    isLessV12
      ? 'new RegExp("[<\\u005C/ script><script>alert(\'xss\')\\u005C/\\u005C/]", "i")'
      : 'new RegExp("[</ script><script>alert(\'xss\')//]", "i")',
    true
  )
})

describe.node('Buffer', function () {
  test('buffer', Buffer.from('buffer'), 'Buffer.from("YnVmZmVy", "base64")')
  test('empty buffer', Buffer.from(''), 'Buffer.from("", "base64")')
})

describe('others', function () {
  test('simple nested objects', {
    a: {
      a1: 0,
      a2: 0,
    },
    b: {
      b1: 0,
      b2: 0,
    }
  }, 'b2')

  it('converting an object of objects', function () {
    const o1 = {
      one: true,
      'thr-ee': undefined,
      3: '3',
      '4 four': 'four\n<test></test>',
      'five"(5)': 5
    }
    const o = {
      a: o1,
      b: o1
    }
    const res = serialize(o)
    console.log("res", res)
    const exp = '{a: {"3": "3", one: true, "thr-ee": undefined, "4 four": "four\\n\\u003Ctest\\u003E\\u003C\\u002Ftest\\u003E", "five\\"(5)": 5}, b: {"3": "3", one: true, "thr-ee": undefined, "4 four": "four\\n\\u003Ctest\\u003E\\u003C\\u002Ftest\\u003E", "five\\"(5)": 5}}'
    // console.log(JSON.stringify(res))
    assert.deepStrictEqual(looseJsonParse(res), looseJsonParse(exp))
  })

  {
    const smallObj = {key: "value"}
    const obj = {
      a: smallObj,
      "": smallObj,
    }
    test('converting an object with empty property name', obj)
  }

  const r = {
    one: true,
    'thr-ee': undefined,
    3: '3',
    '4 four': {
      four: 4
    }
  }
  const o = {
    a: r,
    b: r,
    c: {
      d: r,
      0: r,
      'spa ce': r
    },
    0: r['4 four'],
    'spa ce': r
  }
  test('converting an object of objects using references', o)

  it('converting an object of objects with opts.unsafe', function () {
    const o1 = {
      one: true,
      'thr-ee': undefined,
      3: '3',
      '4 four': 'four\n<test></test>',
      'five"(5)': 5
    }
    const o = {
      a: o1,
      b: o1
    }
    const res = serialize(o, {unsafe: true})
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
      const str = '</script><script>alert(\'xss\')//'
      const o = {'\\": 0}; alert(\'xss\')//': 0, str}
      return o
    }

    test('serializes function with unsafe chars 2', xss, 'function xss () {\n' +
      ' const str = \'\\u003C\\u002Fscript>\\u003Cscript>alert(\\\'xss\\\')//\'\n' +
      ' const o = { \'\\\\": 0}; alert(\\\'xss\\\')//\': 0, str }\n' +
      ' return o\n' +
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
    test('shall unmarshal Map', map)
  }

  it('shall unmarshal to Invalid Date', function () {
    const res = looseJsonParse(serialize(new Date('Invalid')))
    assert.strictEqual(res.toString(), new Date('Invalid').toString())
  })

  const set = new Set(['a', 1.2, true, ['b', 3], {c: 4}])
  test('shall unmarshal Set', set)

  {
    const mapKey = {key: "value"}
    const map2 = new Map([
      [mapKey, 'val'],
      ["key2", mapKey],
    ])
    test('shall unmarshal Map2', map2)
  }

  {
    const fooBar = {foo: "bar"}

    const m = new Map()
    m.set('key1', fooBar)
    m.set(NaN, fooBar)

    const obj = {
      ref1: fooBar,
      ref2: fooBar,
      ref3: fooBar,
      m: m,
    }
    test('map and refs 1', obj)
  }

  {
    const apple = {appleKey: "appleValue"}
    const obj = {
      mApple: apple,
      set: new Set([1, 2, apple, new Set([new Set([5, 6]), 7, 8]), 3, 4])
    }
    test('map and refs 2', obj)
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

    const obj = {
      mApple: mApple,
      // mOrange: mOrange,
      set: new Set([mApple])
    }
    test('map and refs 3', obj)
  }

  {
    const obj = {
      nativeLogProperty: console.log,
      randomKey: 'randomValue',
    }
    test(
      'global console.log copy',
      obj,
      'function',
      null,
      {console},
      false,
    )
  }

  {
    const obj = {
      nativeLogProperty: console.log,
      randomKey: 'randomValue',
    }
    test(
      'global console.log ref',
      obj,
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

    const obj = {
      propertyThatLinksToGlobal: fakeGlobal.orangePropertyNameInGlobal,
      apple,
    }

    test(
      'global ref fakeGlobal',
      obj,
      'orangePropertyNameInGlobal',
      null,
      {fakeGlobal},
      false
    )
  }

  {
    const apple = {appleKey: "appleValue"}
    const arr = ['a', apple, 'c']
    const obj = {
      apple,
      arr
    }
    test('shared obj array', obj)
  }

  {
    const arrA = ['a1', 'a2']
    const arrB = ['b1', 'b2', arrA]
    // noinspection JSCheckFunctionSignatures
    arrA.push(arrB)
    const obj = {
      arrA,
    }
    test('cyclic array', obj)
  }

  {
    const arr = ['a', 'b', 'c']
    arr.dirtyProperty = 'hello there'
    test('dirty array', arr)
  }

  {
    const arr = new Map([['a', true], ['b', true], ['c', true]])
    arr.dirtyProperty1 = 0
    arr.dirtyProperty2 = 0
    test('dirty map', arr)
  }

  {
    const map = new Map([['a', true], ['b', true], ['c', true]])
    map.dirtyProperty = {str: 'hello there'}
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
    const obj = {map}

    test('dirty map get and set', obj, 'dirtySetter', null, null, false)
  }

  {
    const set = new Set(['a', 'b', 'c'])
    set.dirtyProperty = 'hello there'
    test('dirty set', set)
  }

  {
    const set = new Set(['a', 'b', 'c'])
    set.dirtyProperty = new Set(['d', 'e', 'f'])
    set.dirtyProperty.dirtyProperty = 0
    test('dirty set nested', set)
  }

  {
    const reusedObject = {key: 'value'}
    reusedObject.cyclicSelf = reusedObject
    const obj = {
      str: 'hello world!',
      num: 3.1415,
      bool: true,
      nil: null,
      undef: undefined,
      obj: {foo: 'bar', reusedObject},
      arr: [1, '2', reusedObject],
      regexp: /^test?$/,
      date: new Date(),
      buffer: new Uint8Array([1, 2, 3]),
      set: new Set([1, 2, 3]),
      map: new Map([['a', 1], ['b', reusedObject]])
    }
    test('readme example', obj)
  }


  {
    const obj = {
      get someGetter() {
        throw Error("should not call this getter")
      },
      set someSetter(value) {
        throw Error("should not call this setter. value: " + value)
      }
    }
    test('getter and setter throws', obj, "someGetter", null, null, false)
  }

  {
    const obj = {
      get statefullGetterA() {
        obj.counter += 1
        return "counter increased A " + obj.counter
      },
      counter: 0,
      get statefullGetterB() {
        obj.counter += 1
        return "counter increased B " + obj.counter
      },
    }
    test('getter and setter statefull', obj, "counter", null, null, false)
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
    const obj = {
      // Car,
      yaris,
    }

    const str = serialize(obj)
    console.log(str)
    const res = looseJsonParse(str)
    assert.notStrictEqual(res.yaris.age, null)
    const age = res.yaris.age()
    console.log("res.yaris.age(): ", age)
    assert.notStrictEqual(age, null)

    test('Car object', obj, "Yaris", null, null, false)
  })

  it("Car 2", () => {
    const yaris = new Car('Yaris', 2019)
    const obj = {
      yaris,
      Car,
    }

    const str = serialize(obj)
    console.log(str)
    const res = looseJsonParse(str)
    assert.notStrictEqual(res.yaris.age, null)
    const age = res.yaris.age()
    console.log("res.yaris.age(): ", age)
    assert.notStrictEqual(age, null)

    test('Car object', obj, "Yaris", null, null, false)
  })

})

describe("getter and setter", () => {
  const utils = require('../src/internal/utils')

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

